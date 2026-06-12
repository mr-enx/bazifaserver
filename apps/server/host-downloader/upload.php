<?php
// We remove Access-Control-Allow-Origin from here because it's already handled in .htaccess
// to avoid "multiple values" error.
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Only POST requests are allowed']);
    exit;
}

if (!isset($_FILES['file'])) {
    echo json_encode(['error' => 'No file uploaded']);
    exit;
}

$file = $_FILES['file'];
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$maxSize = 5 * 1024 * 1024; // 5MB

if (!in_array($file['type'], $allowedTypes)) {
    echo json_encode(['error' => 'Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.']);
    exit;
}

if ($file['size'] > $maxSize) {
    echo json_encode(['error' => 'File size too large. Maximum size is 5MB.']);
    exit;
}

$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = uniqid('', true) . '.webp';
$uploadDir = dirname(__DIR__) . '/profile_upload/';

// Create directory if it doesn't exist
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$uploadPath = $uploadDir . $filename;

// Image processing logic
$tmpPath = $file['tmp_name'];
$inputExtension = strtolower($extension);

// Load the source image
switch ($inputExtension) {
    case 'jpg':
    case 'jpeg':
        $src = @imagecreatefromjpeg($tmpPath);
        break;
    case 'png':
        $src = @imagecreatefrompng($tmpPath);
        break;
    case 'gif':
        $src = @imagecreatefromgif($tmpPath);
        break;
    case 'webp':
        $src = @imagecreatefromwebp($tmpPath);
        break;
    default:
        echo json_encode(['error' => 'Unsupported image type']);
        exit;
}

if (!$src) {
    echo json_encode(['error' => 'Failed to process image']);
    exit;
}

$origW = imagesx($src);
$origH = imagesy($src);
$maxWidth = 1080;

// Calculate new dimensions
if ($origW > $maxWidth) {
    $newW = $maxWidth;
    $newH = (int)($origH * ($maxWidth / $origW));
} else {
    $newW = $origW;
    $newH = $origH;
}

$dst = imagecreatetruecolor($newW, $newH);

// Handle transparency for WebP
imagealphablending($dst, false);
imagesavealpha($dst, true);
$transparent = imagecolorallocatealpha($dst, 255, 255, 255, 127);
imagefilledrectangle($dst, 0, 0, $newW, $newH, $transparent);

imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $origW, $origH);

$quality = 80;
// Always save as WebP
$saved = imagewebp($dst, $uploadPath, $quality);

imagedestroy($src);
imagedestroy($dst);

if ($saved) {
    // URL points to the profile_upload folder
    $baseUrl = 'https://dl-genius.ir/Bazifa/profile_upload';
    $finalUrl = rtrim($baseUrl, '/') . '/' . $filename;
    echo json_encode([
        'success' => true,
        'url' => $finalUrl
    ]);
} else {
    echo json_encode(['error' => 'Failed to save processed image']);
}
