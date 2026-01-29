<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

// Configurar directorio temporal para uploads (Herd)
$tmpDir = getenv('USERPROFILE') . '\.config\herd\tmp';
if (!is_dir($tmpDir)) {
    mkdir($tmpDir, 0777, true);
}
ini_set('upload_tmp_dir', $tmpDir);
putenv('TMPDIR=' . $tmpDir);
putenv('TEMP=' . $tmpDir);
putenv('TMP=' . $tmpDir);

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
