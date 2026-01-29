<?php

namespace App\Http\Controllers;

use App\Models\EmailTemplate;
use App\Models\EmpresaInfo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class EmailTemplateController extends Controller
{
    public function index()
    {
        $templates = EmailTemplate::all();
        return response()->json([
            'status' => 'success',
            'data' => $templates
        ]);
    }

    public function show($name)
    {
        $template = EmailTemplate::where('name', $name)->first();
        
        if (!$template) {
            return response()->json([
                'status' => 'error',
                'message' => 'Plantilla no encontrada'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $template
        ]);
    }

    public function update(Request $request, $name)
    {

        // ===== DEBUG: Ver qué datos llegan =====
        Log::info('EmailTemplate Update Debug', [
            'name' => $name,
            'all_data' => $request->all(),
            'product_images' => $request->input('product_images'),
            'product_images_type' => gettype($request->input('product_images')),
            'product_images_count' => is_array($request->input('product_images')) ? count($request->input('product_images')) : 'not array'
        ]);

        if ($request->has('product_images') && is_array($request->input('product_images'))) {
            foreach ($request->input('product_images') as $index => $image) {
                Log::info("Product Image $index", [
                    'url' => $image['url'] ?? 'NO_URL_KEY',
                    'url_type' => isset($image['url']) ? gettype($image['url']) : 'KEY_NOT_EXISTS',
                    'url_length' => isset($image['url']) ? strlen($image['url']) : 'N/A',
                    'url_empty' => isset($image['url']) ? empty($image['url']) : 'N/A',
                    'text' => $image['text'] ?? 'NO_TEXT_KEY',
                    'full_image' => $image
                ]);
            }
        }
        // ===== FIN DEBUG =====


        $validator = Validator::make($request->all(), [
            'subject' => 'nullable|string|max:255',
            'greeting' => 'nullable|string',
            'main_content' => 'nullable|string',
            'secondary_content' => 'nullable|string',
            'footer_text' => 'nullable|string',
            'button_text' => 'nullable|string|max:100',
            'button_url' => 'nullable|url',
            'benefits_list' => 'nullable|array',
            'benefits_list.*' => 'string',
            'product_images' => 'nullable|array',
            'product_images.*.url' => 'nullable|string',
            'product_images.*.text' => 'nullable|string',
            'global_colors' => 'nullable|array',
            'global_colors.primary' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'global_colors.secondary' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'global_colors.button_hover' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'global_colors.background' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'global_colors.content_bg' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'use_default' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Datos inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        $template = EmailTemplate::where('name', $name)->first();
        
        if (!$template) {
            return response()->json([
                'status' => 'error',
                'message' => 'Plantilla no encontrada'
            ], 404);
        }

        // Si se marca como usar por defecto, resetear a valores por defecto
        if ($request->use_default) {
            $this->resetToDefault($template);
        } else {
            $template->update($request->only([
                'subject', 'greeting', 'main_content', 'secondary_content', 
                'footer_text', 'button_text', 'button_url', 'benefits_list', 
                'product_images', 'global_colors', 'use_default'
            ]));
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Plantilla actualizada exitosamente',
            'data' => $template->fresh()
        ]);
    }

    public function uploadImage(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Imagen inválida',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $image = $request->file('image');
            $filename = time() . '_' . $this->sanitizeFilename($image->getClientOriginalName());
            $path = $image->storeAs('email-templates', $filename, 'public');
            
            $url = Storage::url($path);
            $fullUrl = url($url);

            return response()->json([
                'status' => 'success',
                'message' => 'Imagen subida exitosamente',
                'data' => [
                    'url' => $fullUrl,
                    'path' => $path
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al subir la imagen: ' . $e->getMessage()
            ], 500);
        }
    }

    public function preview(Request $request, $name)
    {
        $template = EmailTemplate::where('name', $name)->first();
        
        if (!$template) {
            return response()->json([
                'status' => 'error',
                'message' => 'Plantilla no encontrada'
            ], 404);
        }

        // Datos de ejemplo para el preview
        $mockUser = (object) [
            'nombres' => 'Juan',
            'apellidos' => 'Pérez',
            'email' => 'juan.perez@example.com'
        ];

        $mockData = [
            'user' => $mockUser,
            'template' => $template,
            'verificationUrl' => '#',
            'verificationCode' => 'ABC123',
            'resetUrl' => '#'
        ];

        $viewName = match($name) {
            'verification' => 'emails.email-verification-dynamic',
            'welcome' => 'emails.welcome-dynamic',
            'password_reset' => 'emails.password-reset-dynamic',
            default => 'emails.welcome-dynamic'
        };

        try {
            $html = view($viewName, $mockData)->render();
            
            return response()->json([
                'status' => 'success',
                'data' => [
                    'html' => $html
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error generando preview: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getEmpresaInfo()
    {
        $empresa = EmpresaInfo::first();
        
        return response()->json([
            'status' => 'success',
            'data' => $empresa
        ]);
    }

    private function resetToDefault($template)
    {
        $defaults = [
            'verification' => [
                'subject' => 'Verifica tu cuenta en MarketPro',
                'greeting' => '¡Hola {{nombres}}! 👋',
                'main_content' => 'Gracias por registrarte en <strong>MarketPro</strong>. Para completar tu registro y comenzar a disfrutar de las mejores ofertas en tecnología gaming, necesitamos verificar tu dirección de correo electrónico.',
                'button_text' => '✅ Verificar mi cuenta',
                'footer_text' => 'Si no solicitaste esta cuenta, simplemente ignora este correo.',
            ],
            'welcome' => [
                'subject' => '¡Bienvenido a MarketPro!',
                'greeting' => '¡Hola {{nombres}}! 👋',
                'main_content' => '¡Bienvenido a <strong>MarketPro</strong>! Nos emociona tenerte como parte de nuestra comunidad de gamers y tech lovers.',
                'secondary_content' => '🚀 ¿Qué puedes encontrar en MarketPro?',
                'button_text' => '🛒 Explorar Nuestra Tienda',
                'button_url' => 'https://magus-ecommerce.com/',
                'benefits_list' => [
                    '🎮 Gaming: Tarjetas gráficas de última generación, periféricos gaming, y accesorios',
                    '💻 Laptops: Equipos de alto rendimiento para gaming y trabajo profesional',
                    '🖥️ Componentes: Procesadores, RAM, almacenamiento y todo para tu build',
                    '⚡ Accesorios: Teclados mecánicos, mouse gaming, headsets y más'
                ],
                'product_images' => [
                    ['url' => 'https://images.pexels.com/photos/2399840/pexels-photo-2399840.jpeg?auto=compress&cs=tinysrgb&w=150', 'text' => 'Setups Gaming'],
                    ['url' => 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=150', 'text' => 'Laptops Gaming'],
                    ['url' => 'https://images.pexels.com/photos/2148217/pexels-photo-2148217.jpeg?auto=compress&cs=tinysrgb&w=150', 'text' => 'Componentes PC']
                ]
            ],
            'password_reset' => [
                'subject' => 'Recuperación de contraseña - MarketPro',
                'greeting' => 'Hola, {{nombres}}',
                'main_content' => 'Recibimos una solicitud para restablecer la contraseña de tu cuenta en MarketPro.',
                'secondary_content' => 'Para restablecer tu contraseña, haz clic en el siguiente botón:',
                'button_text' => 'Restablecer Contraseña',
                'footer_text' => 'Si no solicitaste este cambio, puedes ignorar este correo y tu contraseña permanecerá sin cambios.',
            ]
        ];

        $defaultColors = [
            'primary' => '#667eea',
            'secondary' => '#764ba2',
            'button_hover' => '#5a67d8',
            'background' => '#f4f4f4',
            'content_bg' => '#ffffff'
        ];

        $templateDefaults = $defaults[$template->name] ?? [];
        $templateDefaults['global_colors'] = $defaultColors;
        $templateDefaults['use_default'] = true;

        $template->update($templateDefaults);
    }

    /**
     * Limpia el nombre del archivo eliminando espacios y caracteres especiales
     */
    private function sanitizeFilename($filename)
    {
        // Obtener la extensión
        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        $name = pathinfo($filename, PATHINFO_FILENAME);
        
        // Limpiar el nombre: espacios por guiones bajos, eliminar caracteres especiales
        $cleanName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $name);
        $cleanName = preg_replace('/_+/', '_', $cleanName); // Múltiples guiones bajos por uno solo
        
        return $cleanName . '.' . $extension;
    }
    
}
