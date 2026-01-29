-- Agregar nuevos estados específicos para envíos a provincia
-- Estos estados se usarán solo cuando forma_envio = 'envio_provincia'

INSERT INTO `estados_pedido` (`id`, `nombre`, `descripcion`, `color`, `orden`, `created_at`, `updated_at`) VALUES
(7, 'En Recepción', 'Pedido recibido en almacén para envío a provincia', '#fd7e14', 7, NOW(), NOW()),
(8, 'Enviado a Provincia', 'Pedido enviado por agencia a provincia', '#6610f2', 8, NOW(), NOW());

-- Actualizar el orden de los estados existentes para el flujo de provincia
-- Flujo para provincia: Pendiente -> Confirmado -> En Recepción -> Enviado a Provincia -> Entregado