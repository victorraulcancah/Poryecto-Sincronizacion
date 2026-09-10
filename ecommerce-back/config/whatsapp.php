<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Envío de WhatsApp
    |--------------------------------------------------------------------------
    |
    | Habla con el microservicio propio (whatsapp-service/, Baileys) en vez
    | de una API paga de terceros. Mismo mecanismo que ya usa el proyecto
    | "bautista" para sus avisos.
    |
    */

    'habilitado' => env('WHATSAPP_HABILITADO', false),

    'url' => env('WHATSAPP_URL', 'http://127.0.0.1:3334'),

    'token' => env('WHATSAPP_TOKEN'),

    'timeout' => env('WHATSAPP_TIMEOUT', 10),

    /*
    | Link que se completa en el placeholder {link} de las plantillas de
    | WhatsApp. Fijo — no es editable desde el texto de la plantilla, para
    | que nunca quede un link roto o apuntando a otro sitio por error.
    */
    'link_ecommerce' => env('FRONTEND_URL', 'http://localhost:4200'),

];
