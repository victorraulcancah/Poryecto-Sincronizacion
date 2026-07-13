<?php

try {
    $conn = new PDO('mysql:host=173.212.244.217;port=3306;dbname=back_ecommerce', 'root', 'c4p1cu4%%$$$$');
    echo "Connected to 7power DB\n";
    
    $stmt = $conn->query('SHOW TABLES LIKE "user_clientes"');
    echo $stmt->rowCount() ? "user_clientes EXISTS\n" : "user_clientes MISSING\n";
    
    $stmt = $conn->query('DESCRIBE user_clientes');
    if ($stmt->rowCount()) {
        echo "Columns:\n";
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "  {$row['Field']} {$row['Type']}\n";
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}