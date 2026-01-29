<?php

namespace App\Mail;

use App\Models\UserCliente;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $resetUrl;
    public $template;

    /**
     * Create a new message instance.
     */
    public function __construct(UserCliente $user, $resetUrl, $template = null)
    {
        $this->user = $user;
        $this->resetUrl = $resetUrl;
        $this->template = $template;
    }

    public function build()
    {
        $empresaInfo = \App\Models\EmpresaInfo::first();
        $subject = $this->template ? $this->template->subject : "Recuperación de contraseña - {$empresaInfo->nombre_empresa}";
        
        return $this->subject($subject)
                    ->view('emails.password-reset-dynamic')
                    ->with([
                        'user' => $this->user,
                        'resetUrl' => $this->resetUrl,
                        'template' => $this->template,
                        'empresaInfo' => $empresaInfo
                    ]);
    }
}
