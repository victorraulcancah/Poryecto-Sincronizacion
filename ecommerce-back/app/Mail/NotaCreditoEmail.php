<?php

namespace App\Mail;

use App\Models\NotaCredito;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NotaCreditoEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $notaCredito;
    public $mensaje;

    /**
     * Create a new message instance.
     */
    public function __construct(NotaCredito $notaCredito, $mensaje = null)
    {
        $this->notaCredito = $notaCredito;
        $this->mensaje = $mensaje;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        $numero = $this->notaCredito->serie . '-' . $this->notaCredito->numero;

        $email = $this->subject("Nota de Crédito Electrónica {$numero}")
                      ->view('emails.nota-credito')
                      ->with([
                          'nota' => $this->notaCredito,
                          'mensaje_personalizado' => $this->mensaje,
                          'numero_completo' => $numero
                      ]);

        // Adjuntar PDF si existe
        if ($this->notaCredito->pdf) {
            $pdfContent = base64_decode($this->notaCredito->pdf);
            $filename = 'nota-credito-' . $this->notaCredito->serie . '-' . $this->notaCredito->numero . '.pdf';

            $email->attachData($pdfContent, $filename, [
                'mime' => 'application/pdf',
            ]);
        }

        // Adjuntar XML si existe
        if ($this->notaCredito->xml) {
            $filename = 'nota-credito-' . $this->notaCredito->serie . '-' . $this->notaCredito->numero . '.xml';

            $email->attachData($this->notaCredito->xml, $filename, [
                'mime' => 'application/xml',
            ]);
        }

        return $email;
    }
}
