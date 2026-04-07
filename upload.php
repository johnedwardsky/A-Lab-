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
$uploadType = isset($_POST['type']) ? $_POST['type'] : 'portfolio'; // portfolio, avatar, resident_case

$filenameInfo = pathinfo($file['name']);
// Sanitize filename
$cleanName = preg_replace('/[^a-zA-Z0-9_\-]/', '', $filenameInfo['filename']);
$ext = strtolower($filenameInfo['extension']);

// Allow only safe images
$allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
if (!in_array($ext, $allowedExts)) {
    echo json_encode(['success' => false, 'error' => 'Invalid file extension: ' . $ext]);
    exit;
}

// Determine directory and prefix based on type
if ($uploadType === 'avatar') {
    $prefix = 'avatar_';
    $targetDir = __DIR__ . '/assets/avatars/';
    $webPath = 'assets/avatars/';
} else {
    $prefix = 'design_case_';
    $targetDir = __DIR__ . '/assets/img/';
    $webPath = 'assets/img/';
}

$newFileName = $prefix . time() . '_' . $cleanName . '.' . $ext;

// Create dir if somehow doesn't exist
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0755, true);
}

$targetPath = $targetDir . $newFileName;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    // Determine the host for absolute URL generation since this will be used by Residents and Main site.
    // We return absolute path starting with / for local references or full URL if needed.
    // We will just return the absolute path starting from root, so it works on any subdirectory
    echo json_encode(['success' => true, 'url' => '/' . $webPath . $newFileName]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to move uploaded file. Check folder permissions.']);
}
?>
