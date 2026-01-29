<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Información de la Empresa
    |--------------------------------------------------------------------------
    |
    | Configuración de los datos de la empresa para facturación electrónica
    | y generación de PDFs compliant con SUNAT.
    |
    */

    'ruc' => trim(env('EMPRESA_RUC', '10427993120')),

    'razon_social' => trim(env('EMPRESA_RAZON_SOCIAL', 'AGUADO SIERRA MANUEL HIPOLITO')),

    'nombre_comercial' => trim(env('EMPRESA_NOMBRE_COMERCIAL', 'MAGUS TEC')),

    'direccion' => trim(env('EMPRESA_DIRECCION', 'Urb. Primavera, Mz A20 Lte. 2 Calle Los Portales')),

    'distrito' => trim(env('EMPRESA_DISTRITO', 'Santa Anita')),

    'provincia' => trim(env('EMPRESA_PROVINCIA', 'Lima')),

    'departamento' => trim(env('EMPRESA_DEPARTAMENTO', 'Lima')),

    'ubigeo' => env('EMPRESA_UBIGEO', '150301'), // Lima-Lima-Santa Anita

    /*
    |--------------------------------------------------------------------------
    | Información de Contacto
    |--------------------------------------------------------------------------
    */

    'telefono' => env('EMPRESA_TELEFONO', '+51 972 781 904'),

    'email' => env('EMPRESA_EMAIL', 'manuel.aguado@magustechnologies.com'),

    'web' => env('EMPRESA_WEB', 'https://magustechnologies.com'),

    'whatsapp' => env('EMPRESA_WHATSAPP', '+51972781904'),

    /*
    |--------------------------------------------------------------------------
    | Logo y Branding
    |--------------------------------------------------------------------------
    */

    'logo_path' => env('EMPRESA_LOGO_PATH', 'images/logo-empresa.png'),

    /*
    |--------------------------------------------------------------------------
    | Configuración PDF
    |--------------------------------------------------------------------------
    */

    'pdf' => [
        'default_engine' => env('PDF_DEFAULT_ENGINE', 'dompdf'),
        'template_path' => env('PDF_TEMPLATE_PATH', 'resources/views/pdf'),
        'cache_enabled' => env('PDF_CACHE_ENABLED', true),
        'cache_ttl' => env('PDF_CACHE_TTL', 3600),

        'templates' => [
            'primary' => 'pdf.comprobante-sunat',
            'fallback' => 'pdf.comprobante-simple',
            'emergency' => 'pdf.comprobante-minimo',
        ],

        'options' => [
            'paper_size' => 'A4',
            'orientation' => 'portrait',
            'margin' => '10mm',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Configuración QR
    |--------------------------------------------------------------------------
    */

    'qr' => [
        'enabled' => env('QR_ENABLED', true),
        'size' => env('QR_SIZE', 150),
        'margin' => env('QR_MARGIN', 1),
        'verification_url' => env('QR_VERIFICATION_URL', 'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp'),
    ],
];
