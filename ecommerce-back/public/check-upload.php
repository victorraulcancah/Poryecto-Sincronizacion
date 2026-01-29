<?php
header('Content-Type: application/json');

$info = [
    'upload_tmp_dir' => ini_get('upload_tmp_dir'),
    'sys_temp_dir' => sys_get_temp_dir(),
    'file_uploads' => ini_get('file_uploads'),
    'upload_max_filesize' => ini_get('upload_max_filesize'),
    'post_max_size' => ini_get('post_max_size'),
    'php_ini_loaded' => php_ini_loaded_file(),
    'tmp_dir_exists' => is_dir(ini_get('upload_tmp_dir') ?: sys_get_temp_dir()),
    'tmp_dir_writable' => is_writable(ini_get('upload_tmp_dir') ?: sys_get_temp_dir()),
];

echo json_encode($info, JSON_PRETTY_PRINT);
