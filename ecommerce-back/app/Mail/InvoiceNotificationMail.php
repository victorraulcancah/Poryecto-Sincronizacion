<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\Comprobante;

class InvoiceNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public $comprobante;

    /**
     * Create a new message instance.
     */
    public function __construct(Comprobante $comprobante)
    {
        $this->comprobante = $comprobante;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $tipoComprobante = $this->comprobante->tipo_comprobante === '01' ? 'Factura' : 'Boleta';
        
        return new Envelope(
            subject: "{$tipoComprobante} Electrónica {$this->comprobante->serie}-{$this->comprobante->correlativo} - {$this->comprobante->cliente->razon_social}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $tipoComprobante = $this->comprobante->tipo_comprobante === '01' ? 'Factura' : 'Boleta';
        $estadoTexto = $this->getEstadoTexto($this->comprobante->estado);
        
        $htmlContent = $this->generarContenidoHtml($tipoComprobante, $estadoTexto);
        
        return new Content(
            htmlString: $htmlContent
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        $attachments = [];

        // Adjuntar PDF si está disponible
        if ($this->comprobante->pdf_base64) {
            $attachments[] = \Illuminate\Mail\Mailables\Attachment::fromData(
                base64_decode($this->comprobante->pdf_base64),
                "{$this->comprobante->serie}-{$this->comprobante->correlativo}.pdf"
            )->withMime('application/pdf');
        }

        // Adjuntar XML si está disponible
        if ($this->comprobante->xml_firmado) {
            $attachments[] = \Illuminate\Mail\Mailables\Attachment::fromData(
                $this->comprobante->xml_firmado,
                "{$this->comprobante->serie}-{$this->comprobante->correlativo}.xml"
            )->withMime('application/xml');
        }

        return $attachments;
    }

    /**
     * Obtener color del estado
     */
    private function getEstadoColor($estado)
    {
        return match($estado) {
            'ACEPTADO' => '#28a745',
            'RECHAZADO' => '#dc3545',
            'PENDIENTE' => '#ffc107',
            'ERROR' => '#dc3545',
            default => '#6c757d'
        };
    }

    /**
     * Obtener texto del estado
     */
    private function getEstadoTexto($estado)
    {
        return match($estado) {
            'ACEPTADO' => 'Aceptado por SUNAT',
            'RECHAZADO' => 'Rechazado por SUNAT',
            'PENDIENTE' => 'Enviado a SUNAT',
            'ERROR' => 'Error en el proceso',
            default => 'Estado desconocido'
        };
    }

    /**
     * Generar contenido HTML del email
     */
    private function generarContenidoHtml($tipoComprobante, $estadoTexto)
    {
        $estadoColor = $this->getEstadoColor($this->comprobante->estado);
        
        return "
        <!DOCTYPE html>
        <html lang='es'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>{$tipoComprobante} Electrónica</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; background-color: {$estadoColor}; }
                .total-section { background: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; padding: 20px; color: #6c757d; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class='header'>
                <h1>🎉 {$tipoComprobante} Electrónica Generada</h1>
                <p>Su comprobante ha sido procesado exitosamente</p>
            </div>

            <div class='content'>
                <h2>Hola {$this->comprobante->cliente->razon_social},</h2>
                
                <p>Le informamos que su " . strtolower($tipoComprobante) . " electrónica ha sido generada y procesada:</p>

                <div class='invoice-details'>
                    <h3>📋 Detalles del Comprobante</h3>
                    <p><strong>Número:</strong> {$this->comprobante->serie}-{$this->comprobante->correlativo}</p>
                    <p><strong>Fecha de Emisión:</strong> " . \Carbon\Carbon::parse($this->comprobante->fecha_emision)->format('d/m/Y') . "</p>
                    <p><strong>Cliente:</strong> {$this->comprobante->cliente->razon_social}</p>
                    <p><strong>RUC/DNI:</strong> {$this->comprobante->cliente->numero_documento}</p>
                    <p><strong>Estado:</strong> <span class='status-badge'>{$estadoTexto}</span></p>
                </div>

                <div class='total-section'>
                    <h3>💰 Resumen de Totales</h3>
                    <p><strong>Subtotal:</strong> S/ " . number_format($this->comprobante->operacion_gravada, 2) . "</p>
                    <p><strong>IGV (18%):</strong> S/ " . number_format($this->comprobante->total_igv, 2) . "</p>
                    <p><strong>Total a Pagar:</strong> S/ " . number_format($this->comprobante->importe_total, 2) . "</p>
                </div>

                <div class='footer'>
                    <p><strong>Backend API - Sistema de Facturación Electrónica</strong></p>
                    <p>Este es un correo automático generado por el backend.</p>
                </div>
            </div>
        </body>
        </html>";
    }
}