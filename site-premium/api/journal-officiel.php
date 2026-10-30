<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$sourceUrl = 'https://sgg.cg/en/journal-officiel/le-journal-officiel.html';

function fetchRemotePage(string $url): string
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => [
            'Accept: text/html,application/xhtml+xml',
        ],
        CURLOPT_USERAGENT => 'Almathe-JO-Feed/1.0 (+https://almathe.net/)',
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

function absoluteUrl(string $baseUrl, string $href): string
{
    if ($href === '') {
        return '';
    }

    if (preg_match('~^https?://~i', $href)) {
        return $href;
    }

    if (str_starts_with($href, '//')) {
        return 'https:' . $href;
    }

    if ($href[0] === '/') {
        $parts = parse_url($baseUrl);
        if (!$parts || empty($parts['scheme']) || empty($parts['host'])) {
            return $href;
        }

        return $parts['scheme'] . '://' . $parts['host'] . $href;
    }

    $base = rtrim(dirname($baseUrl), '/');
    return $base . '/' . ltrim($href, '/');
}

function normalizeText(string $text): string
{
    $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
    return trim($text);
}

function extractItems(string $html, string $sourceUrl, int $limit = 10): array
{
    $items = [];
    $seen = [];

    libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    $dom->loadHTML($html);
    libxml_clear_errors();

    $xpath = new DOMXPath($dom);
    $links = $xpath->query('//a[@href]');
    if ($links === false) {
        return [];
    }

    foreach ($links as $link) {
        if (!($link instanceof DOMElement)) {
            continue;
        }

        $href = trim((string)$link->getAttribute('href'));
        $text = normalizeText((string)$link->textContent);
        $url = absoluteUrl($sourceUrl, $href);

        if ($url === '' || $text === '') {
            continue;
        }

        if (!preg_match('/\/JO\//i', $url)) {
            continue;
        }

        if (!preg_match('/journal\s+officiel/i', $text)) {
            continue;
        }

        $key = strtolower($url);
        if (isset($seen[$key])) {
            continue;
        }
        $seen[$key] = true;

        $numero = '';
        $date = '';

        if (preg_match('/n[°o]?\s*([0-9]{4}-[0-9]+)/iu', $text, $m)) {
            $numero = $m[1];
        }

        if (preg_match('/du\s+([0-9]{2}\/[0-9]{2}\/[0-9]{4})/iu', $text, $m)) {
            $date = $m[1];
        }

        $items[] = [
            'title' => $text,
            'url' => $url,
            'numero' => $numero,
            'date' => $date,
        ];

        if (count($items) >= $limit) {
            break;
        }
    }

    return $items;
}

try {
    $html = fetchRemotePage($sourceUrl);
    $items = extractItems($html, $sourceUrl, 10);

    if (count($items) === 0) {
        throw new RuntimeException('No journal links found on source page.');
    }

    echo json_encode([
        'source' => $sourceUrl,
        'fetchedAt' => gmdate('c'),
        'count' => count($items),
        'items' => $items,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Unable to fetch journal updates.',
        'details' => $e->getMessage(),
        'source' => $sourceUrl,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
