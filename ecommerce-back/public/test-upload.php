<?php
echo "<h2>Test de configuración de PHP</h2>";
echo "<pre>";
echo "upload_tmp_dir: " . ini_get('upload_tmp_dir') . "\n";
echo "sys_temp_dir: " . sys_get_temp_dir() . "\n";
echo "file_uploads: " . (ini_get('file_uploads') ? 'On' : 'Off') . "\n";
echo "upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "post_max_size: " . ini_get('post_max_size') . "\n";
echo "\n--- Test de escritura ---\n";

$tmpDir = ini_get('upload_tmp_dir') ?: sys_get_temp_dir();
echo "Intentando escribir en: $tmpDir\n";

if (is_writable($tmpDir)) {
    echo "✓ El directorio es escribible\n";
    
    $testFile = $tmpDir . '/test_' . time() . '.tmp';
    if (file_put_contents($testFile, 'test')) {
        echo "✓ Archivo de prueba creado exitosamente\n";
        unlink($testFile);
        echo "✓ Archivo de prueba eliminado\n";
    } else {
        echo "✗ No se pudo crear archivo de prueba\n";
    }
} else {
    echo "✗ El directorio NO es escribible\n";
}

echo "</pre>";

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['test'])) {
    echo "<h3>Resultado de upload:</h3><pre>";
    print_r($_FILES);
    echo "</pre>";
}
?>

<h3>Probar upload:</h3>
<form method="post" enctype="multipart/form-data">
    <input type="file" name="test">
    <button type="submit">Subir</button>
</form>
