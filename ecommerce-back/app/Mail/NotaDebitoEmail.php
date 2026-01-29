<?php

namespace App\Mail;

use App\Models\NotaDebito;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NotaDebitoEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $notaDebito;
    public $mensaje;

    /**
     * Create a new message instance.
     */
    public function __construct(NotaDebito $notaDebito, $mensaje = null)
    {
        $this->notaDebito = $notaDebito;
        $this->mensaje = $mensaje;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        $numero = $this->notaDebito->serie . '-' . $this->notaDebito->numero;

        $email = $this->subject("Nota de Débito Electrónica {$numero}")
                      ->view('emails.nota-debito')
                      ->with([
                          'nota' => $this->notaDebito,
                          'mensaje_personalizado' => $this->mensaje,
                          'numero_completo' => $numero
                      ]);

        // Adjuntar PDF si existe
        if ($this->notaDebito->pdf) {
            $pdfContent = base64_decode($this->notaDebito->pdf);
            $filename = 'nota-debito-' . $this->notaDebito->serie . '-' . $this->notaDebito->numero . '.pdf';

            $email->attachData($pdfContent, $filename, [
                'mime' => 'application/pdf',
            ]);
        }

        // Adjuntar XML si existe
        if ($this->notaDebito->xml) {
            $filename = 'nota-debito-' . $this->notaDebito->serie . '-' . $this->notaDebito->numero . '.xml';

            $email->attachData($this->notaDebito->xml, $filename, [
                'mime' => 'application/xml',
            ]);
        }

        return $email;
    }
}
