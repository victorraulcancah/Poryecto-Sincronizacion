<?php

namespace App\Mail;

use App\Models\Comprobante;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ComprobanteEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $comprobante;
    public $mensaje;

    /**
     * Create a new message instance.
     */
    public function __construct(Comprobante $comprobante, $mensaje = null)
    {
        $this->comprobante = $comprobante;
        $this->mensaje = $mensaje;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        $tipoDoc = $this->comprobante->tipo_comprobante === '01' ? 'Factura' : 'Boleta';
        $numero = $this->comprobante->serie . '-' . str_pad($this->comprobante->correlativo, 8, '0', STR_PAD_LEFT);

        $email = $this->subject("{$tipoDoc} Electrónica {$numero}")
                      ->view('emails.comprobante')
                      ->with([
                          'comprobante' => $this->comprobante,
                          'mensaje_personalizado' => $this->mensaje,
                          'tipo_documento' => $tipoDoc,
                          'numero_completo' => $numero
                      ]);

        // Adjuntar PDF si existe
        if ($this->comprobante->pdf_base64) {
            $pdfContent = base64_decode($this->comprobante->pdf_base64);
            $filename = strtolower($tipoDoc) . '-' . $this->comprobante->serie . '-' . str_pad($this->comprobante->correlativo, 8, '0', STR_PAD_LEFT) . '.pdf';

            $email->attachData($pdfContent, $filename, [
                'mime' => 'application/pdf',
            ]);
        }

        // NO adjuntar XML - Solo PDF para el cliente

        return $email;
    }
}
