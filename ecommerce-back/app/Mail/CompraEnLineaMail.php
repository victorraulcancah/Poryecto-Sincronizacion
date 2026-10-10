<?php

namespace App\Mail;

use App\Models\EmpresaInfo;
use App\Models\PagoEnLinea;
use Illuminate\Mail\Mailable;

/**
 * Confirmación de una compra pagada por la pasarela. La misma vista sirve para
 * el cliente y para el aviso interno a la empresa.
 */
class CompraEnLineaMail extends Mailable
{
    public function __construct(
        public PagoEnLinea $pago,
        public bool $paraEmpresa = false
    ) {
    }

    public function build()
    {
        $empresa = EmpresaInfo::first();
        $nombreEmpresa = $empresa->nombre_empresa ?? config('app.name');

        $asunto = $this->paraEmpresa
            ? "Nueva compra en línea {$this->pago->codigo}" . ($this->pago->simulado ? ' (PRUEBA)' : '')
            : "Confirmación de tu compra {$this->pago->codigo} - {$nombreEmpresa}";

        return $this->subject($asunto)
            ->view('emails.compra-en-linea')
            ->with([
                'pago' => $this->pago,
                'empresa' => $empresa,
                'paraEmpresa' => $this->paraEmpresa,
            ]);
    }
}
