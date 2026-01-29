-- ============================================
-- SCRIPT DE CORRECCIÓN PARA MÓDULO DE CAJAS
-- Fecha: 2026-01-09
-- Descripción: Mejoras en estructura de tablas de cajas
-- ============================================

-- IMPORTANTE: Ejecutar en orden y revisar cada paso

-- PASO 1: Asegurarse que todas las cajas tengan tienda_id
-- Si hay cajas sin tienda, asignarles una tienda por defecto primero:
UPDATE cajas SET tienda_id = 1 WHERE tienda_id IS NULL;

-- PASO 2: Eliminar la FK actual (tiene ON DELETE SET NULL)
ALTER TABLE cajas 
DROP FOREIGN KEY cajas_tienda_id_foreign;

-- PASO 3: Cambiar el campo a NOT NULL
ALTER TABLE cajas 
MODIFY tienda_id bigint(20) unsigned NOT NULL
COMMENT 'ID de la tienda - OBLIGATORIO';

-- PASO 4: Recrear la FK con ON DELETE RESTRICT (no permite eliminar tienda si tiene cajas)
ALTER TABLE cajas 
ADD CONSTRAINT cajas_tienda_id_foreign 
FOREIGN KEY (tienda_id) REFERENCES tiendas(id) 
ON DELETE RESTRICT 
ON UPDATE CASCADE;

-- ============================================
-- 2. TABLA CAJA_MOVIMIENTOS - Eliminar campo tipo (redundante)
-- ============================================

-- El campo 'tipo' es redundante porque 'estado' ya indica si está ABIERTA o CERRADA
-- NOTA: Si tienes datos, primero verifica que no afecte tu lógica actual

ALTER TABLE caja_movimientos 
DROP COLUMN tipo;

-- ============================================
-- 3. TABLA CAJA_CHICA_MOVIMIENTOS - Cambiar categoria a ENUM
-- ============================================

-- NOTA: Antes de ejecutar, verifica qué categorías existen actualmente:
-- SELECT DISTINCT categoria FROM caja_chica_movimientos;

-- Si hay categorías que no están en el ENUM, actualízalas primero:
-- UPDATE caja_chica_movimientos SET categoria = 'OTROS' WHERE categoria NOT IN ('VIATICOS','UTILES_OFICINA','SERVICIOS','MANTENIMIENTO','TRANSPORTE','OTROS');

ALTER TABLE caja_chica_movimientos 
MODIFY categoria ENUM(
    'VIATICOS',
    'UTILES_OFICINA',
    'SERVICIOS',
    'MANTENIMIENTO',
    'TRANSPORTE',
    'OTROS'
) NOT NULL
COMMENT 'Categoría del gasto';

-- ============================================
-- 4. TABLA FLUJO_CAJA_PROYECCIONES - Cambiar frecuencia a ENUM
-- ============================================

-- NOTA: Antes de ejecutar, verifica qué frecuencias existen:
-- SELECT DISTINCT frecuencia FROM flujo_caja_proyecciones WHERE frecuencia IS NOT NULL;

-- Si hay frecuencias que no están en el ENUM, actualízalas primero:
-- UPDATE flujo_caja_proyecciones SET frecuencia = 'MENSUAL' WHERE frecuencia NOT IN ('DIARIO','SEMANAL','QUINCENAL','MENSUAL','ANUAL') AND frecuencia IS NOT NULL;

ALTER TABLE flujo_caja_proyecciones 
MODIFY frecuencia ENUM(
    'DIARIO',
    'SEMANAL',
    'QUINCENAL',
    'MENSUAL',
    'ANUAL'
) NULL
COMMENT 'Frecuencia de recurrencia';

-- ============================================
-- 5. ÍNDICES ADICIONALES (OPCIONAL - Mejora performance)
-- ============================================

-- Índice para buscar cajas activas por tienda
CREATE INDEX idx_cajas_tienda_activo 
ON cajas(tienda_id, activo);

-- Índice para buscar movimientos abiertos (prevenir múltiples aperturas)
CREATE INDEX idx_caja_movimientos_estado_caja 
ON caja_movimientos(estado, caja_id);

-- Índice para gastos pendientes de aprobación
CREATE INDEX idx_caja_chica_mov_estado 
ON caja_chica_movimientos(estado, caja_chica_id);

-- ============================================
-- 6. VERIFICACIÓN POST-EJECUCIÓN
-- ============================================

-- Verificar estructura de cajas
DESCRIBE cajas;

-- Verificar estructura de caja_movimientos
DESCRIBE caja_movimientos;

-- Verificar estructura de caja_chica_movimientos
DESCRIBE caja_chica_movimientos;

-- Verificar estructura de flujo_caja_proyecciones
DESCRIBE flujo_caja_proyecciones;

-- Verificar índices creados
SHOW INDEX FROM cajas;
SHOW INDEX FROM caja_movimientos;
SHOW INDEX FROM caja_chica_movimientos;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

-- NOTAS IMPORTANTES:
-- 1. Hacer backup de la BD antes de ejecutar
-- 2. Ejecutar en ambiente de desarrollo primero
-- 3. Revisar que no haya datos que rompan las restricciones
-- 4. Los cambios son irreversibles (especialmente DROP COLUMN)
