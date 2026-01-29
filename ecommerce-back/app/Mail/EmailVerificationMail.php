<?php

namespace App\Mail;

use App\Models\UserCliente;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EmailVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public $cliente;
    public $verificationUrl;
    public $verificationCode;

    public $template;

    public function __construct(UserCliente $cliente, $verificationUrl, $verificationCode, $template = null)
    {
        $this->cliente = $cliente;
        $this->verificationUrl = $verificationUrl;
        $this->verificationCode = $verificationCode;
        $this->template = $template;
    }

    // Antes de: return $this->subject($subject)
    // Después de: public function build()
    public function build()
    {
        $empresaInfo = \App\Models\EmpresaInfo::first();
        $subject = $this->template ? $this->template->subject : "Verifica tu cuenta en {$empresaInfo->nombre_empresa}";
        
        return $this->subject($subject)
                    ->view('emails.email-verification-dynamic')
                    ->with([
                        'user' => $this->cliente,
                        'verificationUrl' => $this->verificationUrl,
                        'verificationCode' => $this->verificationCode,
                        'template' => $this->template,
                        'empresaInfo' => $empresaInfo
                    ]);
    }

}
