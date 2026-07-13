<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "user_clientes: " . (DB::getSchemaBuilder()->hasTable('user_clientes') ? 'exists' : 'missing') . "\n";
echo "password_reset_tokens: " . (DB::getSchemaBuilder()->hasTable('password_reset_tokens') ? 'exists' : 'missing') . "\n";
echo "jobs: " . (DB::getSchemaBuilder()->hasTable('jobs') ? 'exists' : 'missing') . "\n";

$tables = DB::select('SHOW TABLES');
foreach($tables as $t) {
    echo array_values((array)$t)[0] . "\n";
}