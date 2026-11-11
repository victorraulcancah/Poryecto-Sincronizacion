<?php

namespace Tests\Feature;

use App\Models\DispositivoCliente;
use App\Models\PagoEnLinea;
use App\Models\UserCliente;
use App\Services\FcmService;
use App\Support\NotificarCompra;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PushNotificacionesTest extends TestCase
{
    private string $archivoCuenta;

    /**
     * Las migraciones del proyecto no corren en SQLite (la base de las pruebas),
     * así que se crean solo las tablas que usan estas pruebas.
     */
    private function crearTablas(): void
    {
        Schema::create('user_clientes', function (Blueprint $t) {
            $t->id();
            $t->string('nombres');
            $t->string('apellidos')->nullable();
            $t->string('email')->unique();
            $t->string('password');
            $t->boolean('estado')->default(true);
            $t->timestamps();
        });

        Schema::create('dispositivos_cliente', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('user_cliente_id')->index();
            $t->string('token', 512)->unique();
            $t->string('plataforma', 20)->default('android');
            $t->timestamp('ultimo_uso_at')->nullable();
            $t->timestamps();
        });
    }

    /** Una cuenta de servicio de mentira, con una llave RSA de verdad. */
    private function crearCuentaDeServicio(): void
    {
        $opciones = ['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA];

        // En Windows (Laragon) PHP no encuentra solo el archivo de configuración
        // de OpenSSL; en el servidor sí.
        $llave = @openssl_pkey_new($opciones);
        if ($llave === false) {
            $cnf = dirname(PHP_BINARY).'/extras/ssl/openssl.cnf';
            if (! is_file($cnf)) {
                $this->markTestSkipped('OpenSSL no puede generar una llave en este equipo.');
            }
            $opciones['config'] = $cnf;
            $llave = openssl_pkey_new($opciones);
        }
        openssl_pkey_export($llave, $privada, null, array_intersect_key($opciones, ['config' => true]));

        $this->archivoCuenta = tempnam(sys_get_temp_dir(), 'fcm').'.json';
        file_put_contents($this->archivoCuenta, json_encode([
            'client_email' => 'push@proyecto.iam.gserviceaccount.com',
            'private_key' => $privada,
            'project_id' => 'siete-power',
        ]));
        config(['services.fcm.credentials' => $this->archivoCuenta]);
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->crearTablas();
        Cache::flush();
        config(['services.fcm.credentials' => null]);
    }

    protected function tearDown(): void
    {
        if (isset($this->archivoCuenta) && is_file($this->archivoCuenta)) {
            unlink($this->archivoCuenta);
        }

        parent::tearDown();
    }

    private function cliente(string $email = 'ana@correo.com'): UserCliente
    {
        $cliente = new UserCliente([
            'nombres' => 'Ana',
            'apellidos' => 'Pérez',
            'email' => $email,
            'password' => 'x',
        ]);
        $cliente->save();

        return $cliente;
    }

    // ------------------------------------------------------------------
    // Registro de teléfonos
    // ------------------------------------------------------------------

    public function test_el_cliente_registra_el_token_de_su_telefono(): void
    {
        $ana = $this->cliente();
        Sanctum::actingAs($ana);

        $this->postJson('/api/cliente/dispositivos', ['token' => 'tok-1', 'plataforma' => 'android'])
            ->assertOk();

        $this->assertDatabaseHas('dispositivos_cliente', [
            'token' => 'tok-1',
            'user_cliente_id' => $ana->id,
        ]);
    }

    public function test_registrar_dos_veces_no_duplica_y_el_telefono_cambia_de_dueno(): void
    {
        $ana = $this->cliente('ana@correo.com');
        $luis = $this->cliente('luis@correo.com');

        Sanctum::actingAs($ana);
        $this->postJson('/api/cliente/dispositivos', ['token' => 'tok-1'])->assertOk();
        $this->postJson('/api/cliente/dispositivos', ['token' => 'tok-1'])->assertOk();
        $this->assertSame(1, DispositivoCliente::count());

        // Luis inicia sesión en el mismo teléfono.
        Sanctum::actingAs($luis);
        $this->postJson('/api/cliente/dispositivos', ['token' => 'tok-1'])->assertOk();

        $this->assertSame(1, DispositivoCliente::count());
        $this->assertSame($luis->id, DispositivoCliente::first()->user_cliente_id);
    }

    public function test_pide_el_token(): void
    {
        Sanctum::actingAs($this->cliente());

        $this->postJson('/api/cliente/dispositivos', [])->assertUnprocessable();
    }

    public function test_al_cerrar_sesion_se_quita_solo_el_token_propio(): void
    {
        $ana = $this->cliente('ana@correo.com');
        $luis = $this->cliente('luis@correo.com');
        DispositivoCliente::create(['user_cliente_id' => $ana->id, 'token' => 'de-ana']);
        DispositivoCliente::create(['user_cliente_id' => $luis->id, 'token' => 'de-luis']);

        Sanctum::actingAs($ana);
        $this->deleteJson('/api/cliente/dispositivos', ['token' => 'de-ana'])->assertOk();
        // Un token ajeno no se puede borrar.
        $this->deleteJson('/api/cliente/dispositivos', ['token' => 'de-luis'])->assertOk();

        $this->assertSame(['de-luis'], DispositivoCliente::pluck('token')->all());
    }

    public function test_sin_sesion_no_se_registra(): void
    {
        $this->postJson('/api/cliente/dispositivos', ['token' => 'tok-1'])->assertUnauthorized();
    }

    // ------------------------------------------------------------------
    // Envío por Firebase
    // ------------------------------------------------------------------

    public function test_sin_cuenta_de_servicio_no_se_envia_nada(): void
    {
        Http::fake();
        $ana = $this->cliente();
        DispositivoCliente::create(['user_cliente_id' => $ana->id, 'token' => 'tok-1']);

        $enviados = app(FcmService::class)->enviarACliente($ana->id, 'Hola', 'Mundo');

        $this->assertSame(0, $enviados);
        $this->assertFalse(app(FcmService::class)->configurado());
        Http::assertNothingSent();
    }

    public function test_envia_a_todos_los_telefonos_del_cliente_con_el_token_de_acceso(): void
    {
        $this->crearCuentaDeServicio();
        Http::fake([
            'oauth2.googleapis.com/*' => Http::response(['access_token' => 'acceso-123', 'expires_in' => 3600]),
            'fcm.googleapis.com/*' => Http::response(['name' => 'projects/siete-power/messages/1']),
        ]);

        $ana = $this->cliente();
        DispositivoCliente::create(['user_cliente_id' => $ana->id, 'token' => 'tel-1']);
        DispositivoCliente::create(['user_cliente_id' => $ana->id, 'token' => 'tel-2']);
        DispositivoCliente::create(['user_cliente_id' => $this->cliente('otro@correo.com')->id, 'token' => 'ajeno']);

        $enviados = app(FcmService::class)->enviarACliente(
            $ana->id, 'Tu pedido va en camino', 'Tu compra PE-1 salió a entrega.', ['compra_id' => 15, 'tipo' => 'compra'],
        );

        $this->assertSame(2, $enviados);

        // Un solo pedido de token de acceso (se reutiliza), firmado con RS256.
        Http::assertSent(function (ClientRequest $r) {
            if (! str_contains($r->url(), 'oauth2.googleapis.com')) {
                return false;
            }
            $jwt = $r['assertion'];
            $partes = explode('.', $jwt);
            $claims = json_decode(base64_decode(strtr($partes[1], '-_', '+/')), true);

            return $r['grant_type'] === 'urn:ietf:params:oauth:grant-type:jwt-bearer'
                && count($partes) === 3
                && $claims['iss'] === 'push@proyecto.iam.gserviceaccount.com'
                && $claims['scope'] === 'https://www.googleapis.com/auth/firebase.messaging';
        });
        Http::assertSentCount(3); // 1 token de acceso + 2 mensajes

        Http::assertSent(function (ClientRequest $r) {
            if (! str_contains($r->url(), 'fcm.googleapis.com/v1/projects/siete-power/messages:send')) {
                return false;
            }
            $m = $r['message'];

            return $r->hasHeader('Authorization', 'Bearer acceso-123')
                && $m['notification']['title'] === 'Tu pedido va en camino'
                && $m['data'] === ['compra_id' => '15', 'tipo' => 'compra']
                && in_array($m['token'], ['tel-1', 'tel-2'], true);
        });
    }

    public function test_un_telefono_que_ya_no_existe_se_olvida(): void
    {
        $this->crearCuentaDeServicio();
        Http::fake([
            'oauth2.googleapis.com/*' => Http::response(['access_token' => 'acceso-123', 'expires_in' => 3600]),
            'fcm.googleapis.com/*' => Http::response(['error' => ['status' => 'NOT_FOUND']], 404),
        ]);

        $ana = $this->cliente();
        DispositivoCliente::create(['user_cliente_id' => $ana->id, 'token' => 'desinstalado']);

        $enviados = app(FcmService::class)->enviarACliente($ana->id, 'Hola', 'Mundo');

        $this->assertSame(0, $enviados);
        $this->assertSame(0, DispositivoCliente::count());
    }

    public function test_si_google_rechaza_la_cuenta_de_servicio_no_se_envia(): void
    {
        $this->crearCuentaDeServicio();
        Http::fake(['oauth2.googleapis.com/*' => Http::response(['error' => 'invalid_grant'], 400)]);

        $ana = $this->cliente();
        DispositivoCliente::create(['user_cliente_id' => $ana->id, 'token' => 'tel-1']);

        $this->assertSame(0, app(FcmService::class)->enviarACliente($ana->id, 'Hola', 'Mundo'));
        $this->assertSame(1, DispositivoCliente::count(), 'el teléfono se conserva');
    }

    // ------------------------------------------------------------------
    // Avisos de la compra
    // ------------------------------------------------------------------

    public function test_cada_etapa_tiene_su_mensaje_y_la_inicial_no_avisa(): void
    {
        $this->assertNull(NotificarCompra::mensaje('pendiente_facturar', 'PE-1'));

        foreach (['facturado', 'en_delivery', 'entregado', 'cancelado'] as $etapa) {
            [$titulo, $cuerpo] = NotificarCompra::mensaje($etapa, 'PE-9');
            $this->assertNotSame('', $titulo);
            $this->assertStringContainsString('PE-9', $cuerpo, $etapa);
        }
    }

    public function test_cambiar_la_etapa_avisa_al_cliente_con_los_datos_para_abrir_la_compra(): void
    {
        $this->crearCuentaDeServicio();
        Http::fake([
            'oauth2.googleapis.com/*' => Http::response(['access_token' => 'acceso-123', 'expires_in' => 3600]),
            'fcm.googleapis.com/*' => Http::response(['name' => 'ok']),
        ]);
        $ana = $this->cliente();
        DispositivoCliente::create(['user_cliente_id' => $ana->id, 'token' => 'tel-1']);

        $pago = new PagoEnLinea;
        $pago->forceFill(['id' => 15, 'codigo' => 'PE-15', 'user_cliente_id' => $ana->id, 'estado_proceso' => 'en_delivery']);

        $enviados = NotificarCompra::estadoCambio($pago, app(FcmService::class));

        $this->assertSame(1, $enviados);
        Http::assertSent(fn (ClientRequest $r) => str_contains($r->url(), 'messages:send')
            && $r['message']['data'] === ['tipo' => 'compra', 'compra_id' => '15', 'estado' => 'en_delivery']
            && str_contains($r['message']['notification']['body'], 'PE-15'));
    }

    public function test_un_fallo_de_firebase_nunca_rompe_el_seguimiento(): void
    {
        $this->crearCuentaDeServicio();
        Http::fake(fn () => throw new \RuntimeException('sin internet'));
        $ana = $this->cliente();
        DispositivoCliente::create(['user_cliente_id' => $ana->id, 'token' => 'tel-1']);

        $pago = new PagoEnLinea;
        $pago->forceFill(['id' => 1, 'codigo' => 'PE-1', 'user_cliente_id' => $ana->id, 'estado_proceso' => 'entregado']);

        $this->assertSame(0, NotificarCompra::estadoCambio($pago, app(FcmService::class)));
    }
}
