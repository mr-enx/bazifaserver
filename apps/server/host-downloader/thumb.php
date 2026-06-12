<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$file = $_GET['file'] ?? '';
$w = isset($_GET['w']) ? (int)$_GET['w'] : 250;
$h = isset($_GET['h']) ? (int)$_GET['h'] : 250;
$q = isset($_GET['q']) ? (int)$_GET['q'] : 70;

if (!$file) {
    http_response_code(400);
    exit('No file specified');
}

// Parse filename if it's a full URL
if (filter_var($file, FILTER_VALIDATE_URL)) {
    $parts = parse_url($file);
    $file = basename($parts['path']);
} else {
    $file = basename($file);
}

$filePath = dirname(__DIR__) . '/profile_upload/' . $file;
if (!file_exists($filePath) || is_dir($filePath)) {
    http_response_code(404);
    exit('File not found');
}

$extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

// Setup cache directory
$cacheDir = dirname(__DIR__) . '/profile_upload/cache';
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0777, true);
}

$cacheFile = $cacheDir . '/' . md5($file . $w . $h . $q) . '.' . $extension;

if (file_exists($cacheFile)) {
    // Output cache
    $mime = mime_content_type($cacheFile);
    header('Content-Type: ' . $mime);
    header('Cache-Control: public, max-age=31536000');
    readfile($cacheFile);
    exit;
}

// Create image from original
switch ($extension) {
    case 'jpg':
    case 'jpeg':
        $src = @imagecreatefromjpeg($filePath);
        break;
    case 'png':
        $src = @imagecreatefrompng($filePath);
        break;
    case 'gif':
        $src = @imagecreatefromgif($filePath);
        break;
    case 'webp':
        $src = @imagecreatefromwebp($filePath);
        break;
    default:
        http_response_code(415);
        exit('Unsupported type');
}

if (!$src) {
    http_response_code(500);
    exit('Error reading image');
}

$origW = imagesx($src);
$origH = imagesy($src);

// Calculate aspect ratio
$ratio = min($w / $origW, $h / $origH);
// If the image is smaller than the requested size, don't upscale it unless forced (here we just allow it or keep original size)
if ($ratio > 1) {
    $ratio = 1;
}

$newW = (int)($origW * $ratio);
$newH = (int)($origH * $ratio);

$dst = imagecreatetruecolor($newW, $newH);

if ($extension == 'png' || $extension == 'webp') {
    imagealphablending($dst, false);
    imagesavealpha($dst, true);
    $transparent = imagecolorallocatealpha($dst, 255, 255, 255, 127);
    imagefilledrectangle($dst, 0, 0, $newW, $newH, $transparent);
}

imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $origW, $origH);

header('Cache-Control: public, max-age=31536000');

// Output and save cache
switch ($extension) {
    case 'jpg':
    case 'jpeg':
        imagejpeg($dst, $cacheFile, $q);
        header('Content-Type: image/jpeg');
        imagejpeg($dst, null, $q);
        break;
    case 'png':
        // PNG quality is 0-9 (compression level)
        $pngQ = (int)(9 - ($q * 9 / 100));
        imagepng($dst, $cacheFile, $pngQ);
        header('Content-Type: image/png');
        imagepng($dst, null, $pngQ);
        break;
    case 'gif':
        imagegif($dst, $cacheFile);
        header('Content-Type: image/gif');
        imagegif($dst);
        break;
    case 'webp':
        imagewebp($dst, $cacheFile, $q);
        header('Content-Type: image/webp');
        imagewebp($dst, null, $q);
        break;
}

imagedestroy($src);
imagedestroy($dst);
