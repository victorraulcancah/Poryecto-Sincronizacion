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
|   - Productos, marcas, categorías y precios cambian de vez en cuando. Van
|     dos veces al día, de madrugada y al mediodía (~8 s por corrida).
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
    ->appendOutputTo(storage_path('logs/sync-7power.log'));

Schedule::command('sync:7power')
    ->twiceDailyAt(3, 13, 10) // 03:10 y 13:10
    ->withoutOverlapping(30)
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/sync-7power.log'));
