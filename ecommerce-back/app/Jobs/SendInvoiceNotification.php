<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\Comprobante;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\InvoiceNotificationMail;

class SendInvoiceNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $comprobanteId;
    public $email;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The maximum number of seconds the job can run.
     *
     * @var int
     */
    public $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(int $comprobanteId, string $email)
    {
        $this->comprobanteId = $comprobanteId;
        $this->email = $email;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Log::info("Enviando notificación de comprobante", [
                'comprobante_id' => $this->comprobanteId,
                'email' => $this->email
            ]);

            $comprobante = Comprobante::with(['cliente', 'detalles'])->findOrFail($this->comprobanteId);

            // Esperar a que el comprobante esté procesado por SUNAT
            $maxAttempts = 10;
            $attempt = 0;

            while ($comprobante->estado === 'PENDIENTE' && $attempt < $maxAttempts) {
                sleep(5); // Esperar 5 segundos
                $comprobante->refresh();
                $attempt++;
            }

            // Enviar email
            Mail::to($this->email)->send(new InvoiceNotificationMail($comprobante));

            Log::info("Notificación enviada exitosamente", [
                'comprobante_id' => $this->comprobanteId,
                'email' => $this->email,
                'estado_comprobante' => $comprobante->estado
            ]);

        } catch (\Exception $e) {
            Log::error("Error al enviar notificación", [
                'comprobante_id' => $this->comprobanteId,
                'email' => $this->email,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("Job SendInvoiceNotification falló definitivamente", [
            'comprobante_id' => $this->comprobanteId,
            'email' => $this->email,
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts()
        ]);
    }
}