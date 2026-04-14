<?php
declare(strict_types=1);

header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["ok" => false, "error" => "Method not allowed"]);
    exit;
}

$remoteAddr = $_SERVER["REMOTE_ADDR"] ?? "";
$allowed = ["127.0.0.1", "::1"];
if (!in_array($remoteAddr, $allowed, true)) {
    http_response_code(403);
    echo json_encode(["ok" => false, "error" => "Saving is allowed only from localhost"]);
    exit;
}

$raw = file_get_contents("php://input");
if ($raw === false || trim($raw) === "") {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "Empty payload"]);
    exit;
}

$decoded = json_decode($raw, true);
if (!is_array($decoded)) {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "Invalid JSON payload"]);
    exit;
}

$requiredKeys = ["old", "new", "settings"];
foreach ($requiredKeys as $key) {
    if (!array_key_exists($key, $decoded) || !is_array($decoded[$key])) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "Missing or invalid config section: " . $key]);
        exit;
    }
}

$baseDir = __DIR__ . DIRECTORY_SEPARATOR . "data";
$targets = [
    "old" => $baseDir . DIRECTORY_SEPARATOR . "old-regime.json",
    "new" => $baseDir . DIRECTORY_SEPARATOR . "new-regime.json",
    "settings" => $baseDir . DIRECTORY_SEPARATOR . "settings.json",
];

foreach ($targets as $key => $path) {
    $json = json_encode($decoded[$key], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => "Encoding failed for " . $key]);
        exit;
    }
    $jsonWithNewline = $json . PHP_EOL;
    $bytes = @file_put_contents($path, $jsonWithNewline, LOCK_EX);
    if ($bytes === false) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => "Failed writing file for " . $key]);
        exit;
    }
}

echo json_encode(["ok" => true, "message" => "Configs saved"]);
