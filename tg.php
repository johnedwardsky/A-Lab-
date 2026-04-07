<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['action']) || $data['action'] !== 'send_lead') {
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
    exit;
}

$BOT_TOKEN = '8643085801:AAEAhaXgg-RWy3KuKYziNjuqAE87m0zLmaI';
$CHAT_ID = '7209334862';

$url = "https://api.telegram.org/bot{$BOT_TOKEN}/sendMessage";

$postData = [
    'chat_id' => $CHAT_ID,
    'text' => $data['text']
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>
