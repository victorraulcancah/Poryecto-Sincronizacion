<?php

namespace Tests\Feature;

use App\Models\UserCliente;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class GoogleMobileAuthTest extends TestCase
{
    private const WEB_CLIENT = 'web-client.apps.googleusercontent.com';

    /**
     * Las migraciones del proyecto no corren en SQLite (la base de las pruebas),
     * así que se crean solo las tablas que usa este endpoint.
     */
    private function crearTablas(): void
    {
        Schema::create('user_clientes', function (Blueprint $t) {
            $t->id();
            $t->string('codigo_erp')->nullable();
            $t->decimal('credito_disponible', 12, 2)->nullable();
            $t->timestamp('credito_actualizado_at')->nullable();
            $t->string('nombres');
            $t->string('apellidos')->nullable();
            $t->string('email')->unique();
            $t->string('telefono')->nullable();
            $t->date('fecha_nacimiento')->nullable();
            $t->string('genero')->nullable();
            $t->unsignedBigInteger('tipo_documento_id')->nullable();
            $t->string('numero_documento')->nullable();
            $t->string('password');
            $t->string('foto')->nullable();
            $t->boolean('estado')->default(true);
            $t->unsignedBigInteger('cliente_facturacion_id')->nullable();
            $t->unsignedBigInteger('tipo_precio_id')->nullable();
            $t->unsignedBigInteger('tipo_precio_id_usd')->nullable();
            $t->timestamp('email_verified_at')->nullable();
            $t->string('verification_token')->nullable();
            $t->string('verification_code')->nullable();
            $t->boolean('is_first_google_login')->default(false);
            $t->rememberToken();
            $t->timestamps();
        });

        Schema::create('document_types', function (Blueprint $t) {
            $t->id();
            $t->string('nombre');
            $t->timestamps();
        });

        Schema::create('personal_access_tokens', function (Blueprint $t) {
            $t->id();
            $t->morphs('tokenable');
            $t->text('name');
            $t->string('token', 64)->unique();
            $t->text('abilities')->nullable();
            $t->timestamp('last_used_at')->nullable();
            $t->timestamp('expires_at')->nullable();
            $t->timestamps();
        });
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->crearTablas();

        config([
            'services.google.client_id' => self::WEB_CLIENT,
            'services.google.mobile_client_ids' => [],
        ]);
        Mail::fake();
    }

    private function googleResponde(array $datos, int $estado = 200): void
    {
        Http::fake(['oauth2.googleapis.com/*' => Http::response(array_merge([
            'iss' => 'https://accounts.google.com',
            'aud' => self::WEB_CLIENT,
            'email' => 'ana@gmail.com',
            'email_verified' => 'true',
            'name' => 'Ana Pérez',
            'exp' => (string) (time() + 3600),
        ], $datos), $estado)]);
    }

    public function test_un_token_valido_crea_al_cliente_y_devuelve_la_misma_respuesta_que_login(): void
    {
        $this->googleResponde([]);

        $respuesta = $this->postJson('/api/auth/google/token', ['id_token' => 'abc']);

        $respuesta->assertOk()
            ->assertJsonPath('tipo_usuario', 'cliente')
            ->assertJsonPath('user.email', 'ana@gmail.com')
            ->assertJsonPath('es_nuevo', true)
            ->assertJsonStructure(['token', 'user' => ['id', 'nombre_completo', 'email', 'foto_url']]);

        $cliente = UserCliente::where('email', 'ana@gmail.com')->firstOrFail();
        $this->assertNotNull($cliente->email_verified_at, 'Google ya verificó el correo');
        $this->assertTrue((bool) $cliente->estado);
        Mail::assertSent(\App\Mail\WelcomeEmail::class);
    }

    public function test_un_cliente_que_ya_existe_entra_sin_duplicarse(): void
    {
        $existente = UserCliente::create([
            'nombres' => 'Ana',
            'apellidos' => 'Pérez',
            'email' => 'ana@gmail.com',
            'password' => bcrypt('secreto'),
            'tipo_documento_id' => 1,
            'numero_documento' => '12345678',
            'estado' => true,
            'email_verified_at' => now(),
        ]);
        $this->googleResponde(['email' => 'ANA@gmail.com']);

        $this->postJson('/api/auth/google/token', ['id_token' => 'abc'])
            ->assertOk()
            ->assertJsonPath('user.id', $existente->id)
            ->assertJsonPath('es_nuevo', false);

        $this->assertSame(1, UserCliente::count());
        Mail::assertNothingSent();
    }

    public function test_rechaza_un_token_de_otra_aplicacion(): void
    {
        $this->googleResponde(['aud' => 'otra-app.apps.googleusercontent.com']);

        $this->postJson('/api/auth/google/token', ['id_token' => 'abc'])->assertUnauthorized();
        $this->assertSame(0, UserCliente::count());
    }

    public function test_acepta_el_cliente_de_la_app_si_se_configura(): void
    {
        config(['services.google.mobile_client_ids' => ['app-movil.apps.googleusercontent.com']]);
        $this->googleResponde(['aud' => 'app-movil.apps.googleusercontent.com']);

        $this->postJson('/api/auth/google/token', ['id_token' => 'abc'])->assertOk();
    }

    public function test_rechaza_un_correo_que_google_no_verifico_o_un_token_vencido(): void
    {
        $this->googleResponde(['email_verified' => 'false']);
        $this->postJson('/api/auth/google/token', ['id_token' => 'abc'])->assertUnauthorized();

        $this->googleResponde(['exp' => (string) (time() - 10)]);
        $this->postJson('/api/auth/google/token', ['id_token' => 'abc'])->assertUnauthorized();

        $this->googleResponde(['iss' => 'https://falso.example.com']);
        $this->postJson('/api/auth/google/token', ['id_token' => 'abc'])->assertUnauthorized();
    }

    public function test_si_google_rechaza_el_token_no_se_entra(): void
    {
        $this->googleResponde(['error' => 'invalid_token'], 400);

        $this->postJson('/api/auth/google/token', ['id_token' => 'abc'])->assertUnauthorized();
    }

    public function test_una_cuenta_deshabilitada_no_entra(): void
    {
        UserCliente::create([
            'nombres' => 'Ana',
            'apellidos' => 'Pérez',
            'email' => 'ana@gmail.com',
            'password' => bcrypt('secreto'),
            'tipo_documento_id' => 1,
            'numero_documento' => '12345678',
            'estado' => false,
            'email_verified_at' => now(),
        ]);
        $this->googleResponde([]);

        $this->postJson('/api/auth/google/token', ['id_token' => 'abc'])->assertUnauthorized();
    }

    public function test_pide_el_id_token(): void
    {
        $this->postJson('/api/auth/google/token', [])->assertUnprocessable();
    }

    public function test_abrir_sesion_cierra_la_anterior(): void
    {
        $this->googleResponde([]);

        $primero = $this->postJson('/api/auth/google/token', ['id_token' => 'abc'])->json('token');
        $segundo = $this->postJson('/api/auth/google/token', ['id_token' => 'abc'])->json('token');

        $this->assertNotSame($primero, $segundo);
        $cliente = UserCliente::firstOrFail();
        $this->assertSame(1, $cliente->tokens()->count(), 'una sola sesión por cuenta');
    }
}
