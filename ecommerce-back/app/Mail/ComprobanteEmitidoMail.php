<?php

namespace App\Mail;

use App\Models\EmpresaInfo;
use App\Models\PagoEnLinea;
use Illuminate\Mail\Mailable;

/**
 * Comprobante (boleta o factura) de una compra en línea.
 *
 * El PDF lo emite el personal en el ERP y lo sube al panel; este correo solo
 * lo entrega al cliente, con un mensaje opcional.
 */
class ComprobanteEmitidoMail extends Mailable
{
    public function __construct(
        public PagoEnLinea $pago,
        public ?string $mensaje,
        public string $rutaPdf,
        public string $nombrePdf
    ) {
    }

    public function build()
    {
        $empresa = EmpresaInfo::first();
        $nombreEmpresa = $empresa->nombre_empresa ?? config('app.name');

        return $this->subject("Tu comprobante de la compra {$this->pago->codigo} - {$nombreEmpresa}")
            ->view('emails.comprobante-emitido')
            ->with([
                'pago' => $this->pago,
                'empresa' => $empresa,
                'mensaje' => $this->mensaje,
            ])
            ->attach($this->rutaPdf, [
                'as' => $this->nombrePdf,
                'mime' => 'application/pdf',
            ]);
    }
}
