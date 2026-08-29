<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Sincronización con Novik (7Power)
|--------------------------------------------------------------------------
|
| Se parte en dos ritmos porque no todo cambia igual de seguido:
|
|   - El stock se mueve todo el día y es lo que hace que la web muestre como
|     agotado algo que ya llegó, o disponible algo que ya se vendió en el ERP.
|     Va cada minuto: la corrida son ~1,6 s y 182 consultas, así que ocupa
|     menos del 3% del tiempo. Antes iba cada 15 minutos y ese era el desfase
|     máximo con el que trabajaba la tienda.
|   - Productos, marcas, categorías y precios van cada 5 minutos. La corrida
|     son ~7,4 s, 613 consultas a Novik y 4.100 a la tienda: sobre 300 s eso es
|     un 2,5% del tiempo. Antes iba dos veces al día, así que un precio nuevo o
|     un producto recién creado podía tardar hasta 12 horas en aparecer.
|
| Para que esto corra, el servidor necesita el cron de Laravel:
|
|   * * * * * cd /ruta/del/proyecto && php artisan schedule:run >> /dev/null 2>&1
|
| Sin esa línea no se ejecuta nada, por más que esté agendado acá.
*/

Schedule::command('sync:7power --update-stock')
    ->everyMinute()
    // Si una corrida se atrasa, no se lanza otra encima. El candado se suelta
    // solo a los 10 minutos por si el proceso muere sin liberarlo. Con la
    // corrida cada minuto esto es lo que impide que se apilen.
    ->withoutOverlapping(10)
    ->runInBackground()
    // Cada tarea a su propio archivo: corriendo las dos tan seguido, escribir
    // en el mismo log entrelazaba las líneas y no se entendía nada.
    ->appendOutputTo(storage_path('logs/sync-7power-stock.log'));

Schedule::command('sync:7power')
    ->everyFiveMinutes()
    // El candado dura lo mismo que el intervalo: si una corrida muere sin
    // liberarlo, a los 5 minutos se vuelve a intentar. Con los 30 de antes se
    // perdían seis corridas seguidas.
    ->withoutOverlapping(5)
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/sync-7power-completa.log'));
