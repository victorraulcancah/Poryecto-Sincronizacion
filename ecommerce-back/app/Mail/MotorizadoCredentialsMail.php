<?php

namespace App\Mail;

use App\Models\UserMotorizado;
use App\Models\Motorizado;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class MotorizadoCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    public $userMotorizado;
    public $motorizado;
    public $plainPassword;

    public function __construct(UserMotorizado $userMotorizado, Motorizado $motorizado, $plainPassword)
    {
        $this->userMotorizado = $userMotorizado;
        $this->motorizado = $motorizado;
        $this->plainPassword = $plainPassword;
    }

    public function build()
    {
        $empresaInfo = \App\Models\EmpresaInfo::first();

        return $this->subject("Credenciales de Acceso - {$empresaInfo->nombre_empresa}")
                    ->view('emails.motorizado-credentials')
                    ->with([
                        'userMotorizado' => $this->userMotorizado,
                        'motorizado' => $this->motorizado,
                        'plainPassword' => $this->plainPassword,
                        'empresaInfo' => $empresaInfo
                    ]);
    }
}