<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\SunatErrorCode;

class SunatErrorCodesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $errores = [
            // Errores de Autenticación (01xx)
            ['codigo' => '0100', 'descripcion' => 'El sistema no puede responder su solicitud. Intente nuevamente o comuníquese con su Administrador', 'categoria' => 'autenticacion', 'tipo' => 'error', 'solucion_sugerida' => 'Reintentar la operación o contactar al administrador'],
            ['codigo' => '0101', 'descripcion' => 'El encabezado de seguridad es incorrecto', 'categoria' => 'autenticacion', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar la configuración del certificado digital'],
            ['codigo' => '0102', 'descripcion' => 'Usuario o contraseña incorrectos', 'categoria' => 'autenticacion', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar las credenciales de acceso a SUNAT'],
            ['codigo' => '0103', 'descripcion' => 'El Usuario ingresado no existe', 'categoria' => 'autenticacion', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar que el usuario esté registrado en SUNAT'],
            ['codigo' => '0104', 'descripcion' => 'La Clave ingresada es incorrecta', 'categoria' => 'autenticacion', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar la contraseña de acceso'],
            ['codigo' => '0105', 'descripcion' => 'El Usuario no está activo', 'categoria' => 'autenticacion', 'tipo' => 'error', 'solucion_sugerida' => 'Contactar a SUNAT para activar el usuario'],
            ['codigo' => '0106', 'descripcion' => 'El Usuario no es válido', 'categoria' => 'autenticacion', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar el estado del usuario en SUNAT'],
            ['codigo' => '0109', 'descripcion' => 'El sistema no puede responder su solicitud. (El servicio de autenticación no está disponible)', 'categoria' => 'autenticacion', 'tipo' => 'error', 'solucion_sugerida' => 'Reintentar más tarde, el servicio está temporalmente no disponible'],
            ['codigo' => '0110', 'descripcion' => 'No se pudo obtener la informacion del tipo de usuario', 'categoria' => 'autenticacion', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar permisos del usuario en SUNAT'],
            ['codigo' => '0111', 'descripcion' => 'No tiene el perfil para enviar comprobantes electronicos', 'categoria' => 'autenticacion', 'tipo' => 'error', 'solucion_sugerida' => 'Solicitar habilitación para facturación electrónica'],
            ['codigo' => '0112', 'descripcion' => 'El usuario debe ser secundario', 'categoria' => 'autenticacion', 'tipo' => 'error', 'solucion_sugerida' => 'Usar un usuario secundario para esta operación'],
            ['codigo' => '0113', 'descripcion' => 'El usuario no esta afiliado a Factura Electronica', 'categoria' => 'autenticacion', 'tipo' => 'error', 'solucion_sugerida' => 'Afiliarse al servicio de facturación electrónica'],
            
            // Errores de Procesamiento (02xx)
            ['codigo' => '0200', 'descripcion' => 'No se pudo procesar su solicitud. (Ocurrio un error en el batch)', 'categoria' => 'procesamiento', 'tipo' => 'error', 'solucion_sugerida' => 'Reintentar el envío del comprobante'],
            ['codigo' => '0201', 'descripcion' => 'No se pudo procesar su solicitud. (Llego un requerimiento nulo al batch)', 'categoria' => 'procesamiento', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar que el comprobante tenga datos válidos'],
            ['codigo' => '0202', 'descripcion' => 'No se pudo procesar su solicitud. (No llego información del archivo ZIP)', 'categoria' => 'procesamiento', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar la integridad del archivo ZIP'],
            ['codigo' => '0203', 'descripcion' => 'No se pudo procesar su solicitud. (No se encontro archivos en la informacion del archivo ZIP)', 'categoria' => 'procesamiento', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar que el ZIP contenga archivos XML'],
            ['codigo' => '0204', 'descripcion' => 'No se pudo procesar su solicitud. (Este tipo de requerimiento solo acepta 1 archivo)', 'categoria' => 'procesamiento', 'tipo' => 'error', 'solucion_sugerida' => 'Enviar solo un archivo por solicitud'],
            
            // Errores de XML (03xx)
            ['codigo' => '0300', 'descripcion' => 'No se encontró la raíz documento xml', 'categoria' => 'xml', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar la estructura del XML'],
            ['codigo' => '0301', 'descripcion' => 'Elemento raiz del xml no esta definido', 'categoria' => 'xml', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar el elemento raíz del XML'],
            ['codigo' => '0302', 'descripcion' => 'Codigo del tipo de comprobante no registrado', 'categoria' => 'xml', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar el código del tipo de comprobante'],
            ['codigo' => '0303', 'descripcion' => 'No existe el directorio de schemas', 'categoria' => 'xml', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar la configuración de schemas'],
            ['codigo' => '0304', 'descripcion' => 'No existe el archivo de schema', 'categoria' => 'xml', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar que el schema esté disponible'],
            ['codigo' => '0305', 'descripcion' => 'El sistema no puede procesar el archivo xml', 'categoria' => 'xml', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar la validez del XML'],
            ['codigo' => '0306', 'descripcion' => 'No se puede leer (parsear) el archivo XML', 'categoria' => 'xml', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar la sintaxis del XML'],
            ['codigo' => '0307', 'descripcion' => 'No se pudo recuperar la constancia', 'categoria' => 'xml', 'tipo' => 'error', 'solucion_sugerida' => 'Reintentar la consulta de constancia'],
            
            // Errores de Validación (04xx)
            ['codigo' => '0400', 'descripcion' => 'No tiene permiso para enviar casos de pruebas', 'categoria' => 'validacion', 'tipo' => 'error', 'solucion_sugerida' => 'Solicitar permisos para casos de prueba'],
            ['codigo' => '0401', 'descripcion' => 'El caso de prueba no existe', 'categoria' => 'validacion', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar el caso de prueba'],
            ['codigo' => '0402', 'descripcion' => 'La numeracion o nombre del documento ya ha sido enviado anteriormente', 'categoria' => 'validacion', 'tipo' => 'error', 'solucion_sugerida' => 'Usar una numeración diferente'],
            ['codigo' => '0403', 'descripcion' => 'El documento afectado por la nota no existe', 'categoria' => 'validacion', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar que el documento afectado exista'],
            ['codigo' => '0404', 'descripcion' => 'El documento afectado por la nota se encuentra rechazado', 'categoria' => 'validacion', 'tipo' => 'error', 'solucion_sugerida' => 'El documento debe estar aceptado para crear la nota'],
            
            // Errores de Archivo (01xx - Archivos)
            ['codigo' => '0151', 'descripcion' => 'El nombre del archivo ZIP es incorrecto', 'categoria' => 'archivo', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar el nombre del archivo ZIP'],
            ['codigo' => '0152', 'descripcion' => 'No se puede enviar por este método un archivo de resumen', 'categoria' => 'archivo', 'tipo' => 'error', 'solucion_sugerida' => 'Usar el método correcto para resúmenes'],
            ['codigo' => '0153', 'descripcion' => 'No se puede enviar por este método un archivo por lotes', 'categoria' => 'archivo', 'tipo' => 'error', 'solucion_sugerida' => 'Usar el método correcto para lotes'],
            ['codigo' => '0154', 'descripcion' => 'El RUC del archivo no corresponde al RUC del usuario o el proveedor no esta autorizado a enviar comprobantes del contribuyente', 'categoria' => 'archivo', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar el RUC y autorización'],
            ['codigo' => '0155', 'descripcion' => 'El archivo ZIP esta vacio', 'categoria' => 'archivo', 'tipo' => 'error', 'solucion_sugerida' => 'Incluir archivos en el ZIP'],
            ['codigo' => '0156', 'descripcion' => 'El archivo ZIP esta corrupto', 'categoria' => 'archivo', 'tipo' => 'error', 'solucion_sugerida' => 'Regenerar el archivo ZIP'],
            ['codigo' => '0157', 'descripcion' => 'El archivo ZIP no contiene comprobantes', 'categoria' => 'archivo', 'tipo' => 'error', 'solucion_sugerida' => 'Incluir comprobantes en el ZIP'],
            ['codigo' => '0158', 'descripcion' => 'El archivo ZIP contiene demasiados comprobantes para este tipo de envío', 'categoria' => 'archivo', 'tipo' => 'error', 'solucion_sugerida' => 'Reducir la cantidad de comprobantes'],
            ['codigo' => '0159', 'descripcion' => 'El nombre del archivo XML es incorrecto', 'categoria' => 'archivo', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar el nombre del archivo XML'],
            ['codigo' => '0160', 'descripcion' => 'El archivo XML esta vacio', 'categoria' => 'archivo', 'tipo' => 'error', 'solucion_sugerida' => 'Generar contenido para el XML'],
            ['codigo' => '0161', 'descripcion' => 'El nombre del archivo XML no coincide con el nombre del archivo ZIP', 'categoria' => 'archivo', 'tipo' => 'error', 'solucion_sugerida' => 'Verificar la coincidencia de nombres'],
        ];

        foreach ($errores as $error) {
            SunatErrorCode::updateOrCreate(
                ['codigo' => $error['codigo']],
                $error
            );
        }
    }
}
