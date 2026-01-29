-- Migración para agregar campos adicionales del checkout a la tabla pedidos

ALTER TABLE `pedidos` 
ADD COLUMN `numero_documento` VARCHAR(20) NULL AFTER `telefono_contacto`,
ADD COLUMN `cliente_nombre` VARCHAR(255) NULL AFTER `numero_documento`,
ADD COLUMN `cliente_email` VARCHAR(255) NULL AFTER `cliente_nombre`,
ADD COLUMN `forma_envio` VARCHAR(50) NULL AFTER `cliente_email`,
ADD COLUMN `costo_envio` DECIMAL(10,2) DEFAULT 0.00 AFTER `forma_envio`,
ADD COLUMN `departamento_id` VARCHAR(2) NULL AFTER `costo_envio`,
ADD COLUMN `provincia_id` VARCHAR(2) NULL AFTER `departamento_id`,
ADD COLUMN `distrito_id` VARCHAR(2) NULL AFTER `provincia_id`,
ADD COLUMN `departamento_nombre` VARCHAR(100) NULL AFTER `distrito_id`,
ADD COLUMN `provincia_nombre` VARCHAR(100) NULL AFTER `departamento_nombre`,
ADD COLUMN `distrito_nombre` VARCHAR(100) NULL AFTER `provincia_nombre`,
ADD COLUMN `ubicacion_completa` VARCHAR(500) NULL AFTER `distrito_nombre`;