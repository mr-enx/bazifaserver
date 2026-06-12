<?php
// Handle CORS
header('Access-Control-Allow-Origin: *');
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

// Ensure the input is JSON
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['url']) && !isset($_POST['url'])) {
    echo json_encode(['error' => 'No url provided']);
    exit;
}

$url = isset($input['url']) ? $input['url'] : $_POST['url'];

// Parse filename from url
$parts = parse_url($url);

// Handle cases where the URL might be a thumb.php URL
if (isset($parts['query'])) {
    parse_str($parts['query'], $query);
    if (isset($query['file'])) {
        $filename = basename($query['file']);
    } else {
        $filename = basename($parts['path']);
    }
} else {
    $filename = basename($parts['path']);
}

// The files are now in the profile_upload directory
$uploadDir = dirname(__DIR__) . '/profile_upload/';
$filePath = $uploadDir . $filename;

// Log for debugging
error_log("Attempting to delete: " . $filePath);

if (file_exists($filePath) && !is_dir($filePath)) {
    if (unlink($filePath)) {
        // Also try to delete the cached thumbnail if it exists
        $cacheDir = $uploadDir . 'cache/';
        $expectedMd5 = md5($filename . "50" . "50" . "40");
        $expectedCacheFile = $cacheDir . $expectedMd5 . '.' . pathinfo($filename, PATHINFO_EXTENSION);
        
        if (file_exists($expectedCacheFile)) {
            unlink($expectedCacheFile);
        }
        
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Failed to delete file']);
    }
} else {
    echo json_encode(['error' => 'File not found']);
}
