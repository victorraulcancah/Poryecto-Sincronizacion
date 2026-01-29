<?php

namespace App\Mail;

use App\Models\UserMotorizado;
use App\Models\Motorizado;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class MotorizadoPasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public $userMotorizado;
    public $motorizado;
    public $newPassword;

    public function __construct(UserMotorizado $userMotorizado, Motorizado $motorizado, $newPassword)
    {
        $this->userMotorizado = $userMotorizado;
        $this->motorizado = $motorizado;
        $this->newPassword = $newPassword;
    }

    public function build()
    {
        $empresaInfo = \App\Models\EmpresaInfo::first();

        return $this->subject("Nueva Contraseña - {$empresaInfo->nombre_empresa}")
                    ->view('emails.motorizado-password-reset')
                    ->with([
                        'userMotorizado' => $this->userMotorizado,
                        'motorizado' => $this->motorizado,
                        'newPassword' => $this->newPassword,
                        'empresaInfo' => $empresaInfo
                    ]);
    }
}