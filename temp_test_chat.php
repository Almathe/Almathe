<?php
$config = require 'c:\Almathe\site-premium\api\config.php';
$body = [
  'contents' => [[
    'role' => 'user',
    'parts' => [['text' => 'Bonjour']],
  ]],
  'systemInstruction' => [
    'parts' => [['text' => 'Tu es un assistant test.']],
  ],
  'generationConfig' => [
    'temperature' => 0.4,
    'maxOutputTokens' => 80,
  ],
];
$endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . rawurlencode($config['GEMINI_API_KEY']);
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
  CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CONNECTTIMEOUT => 8,
  CURLOPT_TIMEOUT => 20,
  CURLOPT_SSL_VERIFYPEER => false,
  CURLOPT_SSL_VERIFYHOST => false,
]);
$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);
if ($response === false) {
  fwrite(STDERR, "CURL_ERROR: $curlError\n");
  exit(1);
}
fwrite(STDOUT, "HTTP $status\n$response\n");
