-- Crear tabla para registrar el historial de estados de pedidos
-- Esto permitirá tracking completo con fechas

CREATE TABLE `pedido_tracking` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `pedido_id` bigint(20) UNSIGNED NOT NULL,
  `estado_pedido_id` bigint(20) UNSIGNED NOT NULL,
  `comentario` text DEFAULT NULL,
  `usuario_id` bigint(20) UNSIGNED NOT NULL,
  `fecha_cambio` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pedido_tracking_pedido_id_foreign` (`pedido_id`),
  KEY `pedido_tracking_estado_pedido_id_foreign` (`estado_pedido_id`),
  KEY `pedido_tracking_usuario_id_foreign` (`usuario_id`),
  CONSTRAINT `pedido_tracking_pedido_id_foreign` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pedido_tracking_estado_pedido_id_foreign` FOREIGN KEY (`estado_pedido_id`) REFERENCES `estados_pedido` (`id`),
  CONSTRAINT `pedido_tracking_usuario_id_foreign` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;