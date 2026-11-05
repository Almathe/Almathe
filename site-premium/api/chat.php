<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée.']);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$payload = json_decode($raw, true);
$message = trim((string)($payload['message'] ?? ''));

if ($message === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Message manquant.']);
    exit;
}

if (strlen($message) > 1800) {
    http_response_code(400);
    echo json_encode(['error' => 'Message trop long.']);
    exit;
}

$apiKey = getenv('GEMINI_API_KEY') ?: '';
$localConfig = __DIR__ . '/config.php';
if ($apiKey === '' && is_file($localConfig)) {
    $config = require $localConfig;
    if (is_array($config) && !empty($config['GEMINI_API_KEY'])) {
        $apiKey = (string)$config['GEMINI_API_KEY'];
    }
}

if ($apiKey === '') {
    http_response_code(503);
    echo json_encode(['error' => 'Clé Gemini non configurée.']);
    exit;
}

$system = <<<TXT
Tu es l'assistant du site Almathe & Associés, cabinet d'expertise financière et de direction externalisée (DAF).
Réponds en français, avec des phrases courtes, professionnelles et utiles.
Tu aides les visiteurs sur : direction financière externalisée (DAF à temps partagé), conformité SFEC/E-TAX, audit fiscal, reporting IFRS/SYSCOHADA, due diligence, levée de fonds.
Toutes les missions sont sur devis. Le cabinet intervient à Brazzaville, Pointe-Noire et en France.
Pour une demande commerciale, oriente vers contact.html, contact@almathe.net, +33 6 38 88 84 02 ou +242 06 889 65 58.
Ne donne pas de conseil juridique, fiscal ou financier personnalisé définitif. Invite à prendre contact pour analyser la situation.
Ne JAMAIS présenter Almathe comme expert-comptable. C'est un cabinet d'expertise financière, pas un cabinet d'expertise comptable.
TXT;

$body = [
    'contents' => [[
        'role' => 'user',
        'parts' => [['text' => $message]],
    ]],
    'systemInstruction' => [
        'parts' => [['text' => $system]],
    ],
    'generationConfig' => [
        'temperature' => 0.4,
        'maxOutputTokens' => 350,
    ],
];

$endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . rawurlencode($apiKey);
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 20,
]);

$response = curl_exec($ch);
$status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false || $status < 200 || $status >= 300) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Réponse Gemini indisponible.',
        'details' => $curlError ?: ('HTTP ' . $status),
    ]);
    exit;
}

$data = json_decode($response, true);
$text = '';

if (!empty($data['candidates']) && is_array($data['candidates'])) {
    foreach ($data['candidates'] as $candidate) {
        if (!empty($candidate['content']['parts']) && is_array($candidate['content']['parts'])) {
            foreach ($candidate['content']['parts'] as $part) {
                if (!empty($part['text'])) {
                    $text .= (string)$part['text'];
                }
            }
        }
    }
}

if ($text === '') {
    $text = trim((string)($data['output_text'] ?? ''));
}

if ($text === '' && !empty($data['steps']) && is_array($data['steps'])) {
    foreach ($data['steps'] as $step) {
        foreach (($step['content'] ?? []) as $content) {
            if (($content['type'] ?? '') === 'text' && !empty($content['text'])) {
                $text .= (string)$content['text'];
            }
        }
    }
    $text = trim($text);
}

if ($text === '') {
    $detail = '';
    if (!empty($data['error']['message'])) {
        $detail = (string)$data['error']['message'];
    }

    http_response_code(502);
    echo json_encode([
        'error' => 'Réponse Gemini vide.',
        'details' => $detail !== '' ? $detail : 'Format de réponse inattendu.',
    ]);
    exit;
}

echo json_encode(['reply' => trim($text)], JSON_UNESCAPED_UNICODE);
