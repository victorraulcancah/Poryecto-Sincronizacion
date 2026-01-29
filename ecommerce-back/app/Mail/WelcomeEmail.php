<?php

namespace App\Mail;

use App\Models\User;
use App\Models\UserCliente;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $userType;
    public $template;
    
    /**
     * Create a new message instance.
     */
    // Modificar el constructor:
    public function __construct($user, $template = null)
    {
        $this->user = $user;
        $this->template = $template;
        $this->userType = $user instanceof UserCliente ? 'cliente' : 'admin';
    }

    public function build()
    {
        $empresaInfo = \App\Models\EmpresaInfo::first();
        $subject = $this->template ? $this->template->subject : "¡Bienvenido a {$empresaInfo->nombre_empresa} - Tu tienda especializada en tecnología!";
        
        return $this->subject($subject)
                    ->view('emails.welcome-dynamic')
                    ->with([
                        'user' => $this->user,
                        'userType' => $this->userType,
                        'template' => $this->template,
                        'empresaInfo' => $empresaInfo
                    ]);
    }

}
