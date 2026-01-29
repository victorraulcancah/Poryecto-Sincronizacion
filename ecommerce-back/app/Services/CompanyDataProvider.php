<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class CompanyDataProvider
{
    /**
     * Obtener información completa de la empresa desde config/empresa.php (ENV)
     */
    public function getCompanyInfo(): array
    {
        try {
            // Obtener datos desde config/empresa.php que lee del .env
            $ruc = config('empresa.ruc');
            $razonSocial = config('empresa.razon_social');
            $nombreComercial = config('empresa.nombre_comercial');
            $direccion = config('empresa.direccion');
            $distrito = config('empresa.distrito');
            $provincia = config('empresa.provincia');
            $departamento = config('empresa.departamento');
            $ubigeo = config('empresa.ubigeo');
            $telefono = config('empresa.telefono');
            $email = config('empresa.email');
            $web = config('empresa.web');

            // Validar que los datos esenciales existan
            if (empty($ruc) || empty($razonSocial)) {
                Log::warning('Datos de empresa no configurados en .env, usando valores por defecto');
                return $this->getDefaultCompanyInfo();
            }

            return [
                'ruc' => $ruc,
                'razon_social' => $razonSocial,
                'nombre_comercial' => $nombreComercial ?? $razonSocial,
                'direccion_fiscal' => $direccion,
                'distrito' => $distrito,
                'provincia' => $provincia,
                'departamento' => $departamento,
                'ubigeo' => $ubigeo,
                'telefono' => $telefono,
                'email' => $email,
                'web' => $web,
                'logo_path' => $this->getLogoPath(),
            ];

        } catch (\Exception $e) {
            Log::error('Error al obtener información de empresa desde config', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->getDefaultCompanyInfo();
        }
    }

    /**
     * Valores por defecto si no hay datos en config
     */
    private function getDefaultCompanyInfo(): array
    {
        return [
            'ruc' => '20123456789',
            'razon_social' => 'MI EMPRESA SAC',
            'nombre_comercial' => 'MI EMPRESA',
            'direccion_fiscal' => 'Av. Principal 123, Lima, Perú',
            'distrito' => 'Lima',
            'provincia' => 'Lima',
            'departamento' => 'Lima',
            'ubigeo' => '150101',
            'telefono' => '+51 1 234-5678',
            'email' => 'contacto@miempresa.com',
            'web' => 'www.miempresa.com',
            'logo_path' => null,
        ];
    }

    /**
     * Obtener ruta del logo de la empresa
     */
    public function getLogoPath(): ?string
    {
        // Rutas posibles para el logo (ordenadas por prioridad)
        $possiblePaths = [
            public_path('imagenes/logo3.png'),
            public_path('imagenes/logo - Magus.png'),
            public_path('assets/images/logo/logo3.png'),
            public_path('assets/images/logo.png'),
            public_path('images/logo.png'),
            storage_path('app/public/logo.png'),
            public_path('logo.png'),
        ];

        foreach ($possiblePaths as $path) {
            if (file_exists($path)) {
                Log::info('Logo encontrado: ' . $path);
                return $path;
            }
        }

        Log::warning('Logo no encontrado en ninguna ruta. Rutas buscadas: ' . implode(', ', $possiblePaths));
        return null;
    }

    /**
     * Obtener información de contacto desde config
     */
    public function getContactInfo(): array
    {
        try {
            return [
                'telefono' => config('empresa.telefono'),
                'email' => config('empresa.email'),
                'web' => config('empresa.web'),
                'whatsapp' => config('empresa.whatsapp'),
            ];
        } catch (\Exception $e) {
            Log::error('Error al obtener contacto de empresa', ['error' => $e->getMessage()]);
            return [
                'telefono' => null,
                'email' => null,
                'web' => null,
                'whatsapp' => null,
            ];
        }
    }

    /**
     * Verificar si la configuración de empresa está completa
     */
    public function isConfigurationComplete(): array
    {
        $companyInfo = $this->getCompanyInfo();
        $missing = [];

        if (empty($companyInfo['ruc'])) {
            $missing[] = 'RUC de la empresa';
        }

        if (empty($companyInfo['razon_social'])) {
            $missing[] = 'Razón social';
        }

        if (empty($companyInfo['direccion_fiscal'])) {
            $missing[] = 'Dirección fiscal';
        }

        return [
            'complete' => empty($missing),
            'missing' => $missing,
            'has_logo' => ! is_null($companyInfo['logo_path']),
        ];
    }
}
