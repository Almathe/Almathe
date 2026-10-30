<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$sourceUrl = 'https://acpce.cg/liste-des-entreprises/';
$cacheTtlSeconds = 12 * 60 * 60;
$cacheFile = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'almathe-acpce-entreprises-cache.json';
$forceRefresh = isset($_GET['refresh']) && $_GET['refresh'] === '1';

function fetchRemoteHtml(string $url): string
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => ['Accept: text/html,application/xhtml+xml'],
        CURLOPT_USERAGENT => 'Almathe-ACPCE-Directory/1.0 (+https://almathe.net/)',
    ]);

    $response = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false || $status < 200 || $status >= 300) {
        throw new RuntimeException($error !== '' ? $error : ('HTTP ' . $status));
    }

    return (string)$response;
}

function cleanText(string $value): string
{
    $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $value = preg_replace('/\s+/u', ' ', $value) ?? $value;
    return trim($value);
}

function parseRows(string $html): array
{
    libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    $dom->loadHTML($html);
    libxml_clear_errors();

    $xpath = new DOMXPath($dom);

    // ACPCE currently renders data rows as <tr id="table_3_row_*" data-row-index="...">.
    // We also keep a generic fallback on data-row-index in case the table id changes.
    $rows = $xpath->query('//tr[starts-with(@id,"table_3_row_") or @data-row-index]');
    if ($rows === false) {
        return [];
    }

    $companies = [];

    foreach ($rows as $row) {
        if (!($row instanceof DOMElement)) {
            continue;
        }

        $cells = $xpath->query('./td', $row);
        if ($cells === false || $cells->length < 14) {
            continue;
        }

        $values = [];
        foreach ($cells as $cell) {
            $values[] = cleanText((string)$cell->textContent);
        }

        // Expected ACPCE column order (14 columns):
        // code, forme, denomination, capital, adresse, activite, codeActivite, duree,
        // rccm, dateRccm, nom, prenom, nationalite, dateCreation.
        $companies[] = [
            'code' => $values[0] ?? '',
            'formeJuridique' => $values[1] ?? '',
            'denomination' => $values[2] ?? '',
            'capital' => $values[3] ?? '',
            'adresse' => $values[4] ?? '',
            'activite' => $values[5] ?? '',
            'codeActivite' => $values[6] ?? '',
            'duree' => $values[7] ?? '',
            'rccm' => $values[8] ?? '',
            'dateRccm' => $values[9] ?? '',
            'nom' => $values[10] ?? '',
            'prenom' => $values[11] ?? '',
            'nationalite' => $values[12] ?? '',
            'dateCreation' => $values[13] ?? '',
        ];
    }

    return $companies;
}

function readCache(string $cacheFile, int $ttl): ?array
{
    if (!is_file($cacheFile)) {
        return null;
    }

    $age = time() - (int)filemtime($cacheFile);
    if ($age > $ttl) {
        return null;
    }

    $raw = file_get_contents($cacheFile);
    if ($raw === false || $raw === '') {
        return null;
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : null;
}

function writeCache(string $cacheFile, array $payload): void
{
    @file_put_contents(
        $cacheFile,
        json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

try {
    if (!$forceRefresh) {
        $cached = readCache($cacheFile, $cacheTtlSeconds);
        if ($cached !== null) {
            echo json_encode($cached, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }
    }

    $html = fetchRemoteHtml($sourceUrl);
    $items = parseRows($html);

    if (count($items) === 0) {
        throw new RuntimeException('No company rows parsed from ACPCE source.');
    }

    $payload = [
        'source' => $sourceUrl,
        'fetchedAt' => gmdate('c'),
        'count' => count($items),
        'items' => $items,
    ];

    writeCache($cacheFile, $payload);

    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Unable to fetch ACPCE data.',
        'details' => $e->getMessage(),
        'source' => $sourceUrl,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
