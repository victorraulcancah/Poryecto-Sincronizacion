<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Modo de prueba de la pasarela de pago
    |--------------------------------------------------------------------------
    |
    | Mientras Culqi no apruebe el comercio la pasarela es simulada: la pantalla
    | de pago muestra el aviso de "modo prueba" y no se cobra ninguna tarjeta.
    | Cuando exista el cobro real, se apaga con PASARELA_MODO_PRUEBA=false.
    |
    */
    'modo_prueba' => env('PASARELA_MODO_PRUEBA', true),

];
