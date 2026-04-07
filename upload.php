<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid method']);
    exit;
}

// Check for valid upload
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'error' => 'No file uploaded or upload error code: ' . ($_FILES['file']['error'] ?? 'unknown')]);
    exit;
}

$file = $_FILES['file'];
$filenameInfo = pathinfo($file['name']);
// Sanitize filename: allow letters, numbers, dash, underscore
$cleanName = preg_replace('/[^a-zA-Z0-9_\-]/', '', $filenameInfo['filename']);
$ext = strtolower($filenameInfo['extension']);

// Allow only safe images
$allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
if (!in_array($ext, $allowedExts)) {
    echo json_encode(['success' => false, 'error' => 'Invalid file extension: ' . $ext]);
    exit;
}

$newFileName = 'design_case_' . time() . '_' . $cleanName . '.' . $ext;
$targetDir = __DIR__ . '/assets/img/';

// Create dir if somehow doesn't exist
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0755, true);
}

$targetPath = $targetDir . $newFileName;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    // Return the relative URL string that standard CMS DB logic understands
    echo json_encode(['success' => true, 'url' => 'assets/img/' . $newFileName]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to move uploaded file. Check folder permissions.']);
}
?>
