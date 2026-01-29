-- =================================================================
-- Tabla para almacenar los items del carrito de compras
-- de los usuarios autenticados (tanto users como user_clientes).
-- Creada en lugar de ejecutar la migración:
-- 2025_08_21_210640_create_cart_items_table.php
-- =================================================================

-- Primero eliminar la tabla si existe (para recrearla correctamente)
DROP TABLE IF EXISTS `cart_items`;

CREATE TABLE `cart_items` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) UNSIGNED NULL COMMENT 'ID del usuario del sistema (admin, vendedor)',
  `user_cliente_id` bigint(20) UNSIGNED NULL COMMENT 'ID del cliente del e-commerce',
  `producto_id` bigint(20) UNSIGNED NOT NULL,
  `cantidad` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cart_items_user_id_foreign` (`user_id`),
  KEY `cart_items_user_cliente_id_foreign` (`user_cliente_id`),
  KEY `cart_items_producto_id_foreign` (`producto_id`),
  CONSTRAINT `cart_items_producto_id_foreign` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cart_items_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cart_items_user_cliente_id_foreign` FOREIGN KEY (`user_cliente_id`) REFERENCES `user_clientes` (`id`) ON DELETE CASCADE,
  -- Asegurar que solo uno de los dos campos de usuario esté lleno
  CONSTRAINT `check_user_type` CHECK (
    (user_id IS NOT NULL AND user_cliente_id IS NULL) OR 
    (user_id IS NULL AND user_cliente_id IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =================================================================
-- EXPLICACIÓN DE LA ESTRUCTURA:
-- =================================================================
-- user_id: Se llena cuando el usuario es del sistema (admin, vendedor)
-- user_cliente_id: Se llena cuando el usuario es un cliente del e-commerce
-- Solo uno de los dos puede estar lleno (constraint check_user_type)
-- producto_id: ID del producto en el carrito
-- cantidad: Cantidad del producto
-- =================================================================

-- =================================================================
-- SOLUCIÓN AL ERROR: Usuario con ID 2 faltante
-- =================================================================
-- El sistema está intentando usar user_id = 2, pero no existe
-- Ejecuta esta consulta para crear el usuario faltante:


-- =================================================================
-- ALTERNATIVA: Si prefieres usar un usuario existente
-- =================================================================
-- En lugar de crear el usuario 2, puedes modificar el frontend para usar
-- uno de los usuarios existentes (1, 28, 29, 31, o 32)


-- =================================================================
-- AGREGAR COLUMNA TELEFONO A USER_CLIENTE_DIRECCIONES
-- =================================================================
-- Esta columna es necesaria para el sistema de direcciones del e-commerce
ALTER TABLE `user_cliente_direcciones` 
ADD COLUMN `telefono` VARCHAR(20) NULL AFTER `direccion_completa`;

-- Comentario explicativo
-- La columna telefono permite que cada dirección tenga su propio teléfono
-- diferente al teléfono principal del cliente