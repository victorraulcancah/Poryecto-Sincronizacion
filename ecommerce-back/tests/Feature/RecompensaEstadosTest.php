<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Recompensa;
use Carbon\Carbon;

class RecompensaEstadosTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $user;
    protected $recompensa;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Crear usuario con permisos de recompensas
        $this->user = User::factory()->create();
        $this->user->givePermissionTo([
            'recompensas.ver',
            'recompensas.create',
            'recompensas.edit',
            'recompensas.activate',
            'recompensas.delete'
        ]);

        // Crear recompensa de prueba
        $this->recompensa = Recompensa::create([
            'nombre' => 'Recompensa de Prueba',
            'descripcion' => 'Descripción de prueba',
            'tipo' => Recompensa::TIPO_PUNTOS,
            'fecha_inicio' => Carbon::now()->addDay(),
            'fecha_fin' => Carbon::now()->addDays(30),
            'estado' => Recompensa::ESTADO_PROGRAMADA,
            'creado_por' => $this->user->id
        ]);
    }

    /**
     * Test para actualizar recompensa (debe pausar si está activa)
     */
    public function test_update_recompensa_pausa_si_esta_activa()
    {
        // Cambiar recompensa a activa
        $this->recompensa->update(['estado' => Recompensa::ESTADO_ACTIVA]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/admin/recompensas/{$this->recompensa->id}", [
                'nombre' => 'Recompensa Actualizada'
            ]);

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Recompensa actualizada exitosamente'
                ]);

        // Verificar que se pausó automáticamente
        $this->recompensa->refresh();
        $this->assertEquals(Recompensa::ESTADO_PAUSADA, $this->recompensa->estado);
    }

    /**
     * Test para actualizar recompensa con estado específico
     */
    public function test_update_recompensa_con_estado_especifico()
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/admin/recompensas/{$this->recompensa->id}", [
                'nombre' => 'Recompensa Actualizada',
                'estado' => Recompensa::ESTADO_ACTIVA
            ]);

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Recompensa actualizada exitosamente'
                ]);

        // Verificar que se actualizó el estado
        $this->recompensa->refresh();
        $this->assertEquals(Recompensa::ESTADO_ACTIVA, $this->recompensa->estado);
    }

    /**
     * Test para activar recompensa exitosamente
     */
    public function test_activate_recompensa_exitosamente()
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->patchJson("/api/admin/recompensas/{$this->recompensa->id}/activate");

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Recompensa activada exitosamente'
                ]);

        // Verificar que se activó
        $this->recompensa->refresh();
        $this->assertEquals(Recompensa::ESTADO_ACTIVA, $this->recompensa->estado);
    }

    /**
     * Test para activar recompensa desde estado pausada
     */
    public function test_activate_recompensa_desde_pausada()
    {
        // Cambiar a pausada
        $this->recompensa->update(['estado' => Recompensa::ESTADO_PAUSADA]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->patchJson("/api/admin/recompensas/{$this->recompensa->id}/activate");

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Recompensa activada exitosamente'
                ]);

        // Verificar que se activó
        $this->recompensa->refresh();
        $this->assertEquals(Recompensa::ESTADO_ACTIVA, $this->recompensa->estado);
    }

    /**
     * Test para pausar recompensa exitosamente
     */
    public function test_pause_recompensa_exitosamente()
    {
        // Cambiar a activa
        $this->recompensa->update(['estado' => Recompensa::ESTADO_ACTIVA]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->patchJson("/api/admin/recompensas/{$this->recompensa->id}/pause");

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Recompensa pausada exitosamente'
                ]);

        // Verificar que se pausó
        $this->recompensa->refresh();
        $this->assertEquals(Recompensa::ESTADO_PAUSADA, $this->recompensa->estado);
    }

    /**
     * Test para cancelar recompensa exitosamente
     */
    public function test_cancel_recompensa_exitosamente()
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/admin/recompensas/{$this->recompensa->id}");

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Recompensa cancelada exitosamente'
                ]);

        // Verificar que se canceló
        $this->recompensa->refresh();
        $this->assertEquals(Recompensa::ESTADO_CANCELADA, $this->recompensa->estado);
    }

    /**
     * Test para activar recompensa desde estado inválido
     */
    public function test_activate_recompensa_desde_estado_invalido()
    {
        // Cambiar a cancelada
        $this->recompensa->update(['estado' => Recompensa::ESTADO_CANCELADA]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->patchJson("/api/admin/recompensas/{$this->recompensa->id}/activate");

        $response->assertStatus(422)
                ->assertJson([
                    'success' => false,
                    'message' => 'No se puede activar la recompensa desde el estado actual: Cancelada'
                ]);
    }

    /**
     * Test para pausar recompensa desde estado inválido
     */
    public function test_pause_recompensa_desde_estado_invalido()
    {
        // Mantener en programada
        $response = $this->actingAs($this->user, 'sanctum')
            ->patchJson("/api/admin/recompensas/{$this->recompensa->id}/pause");

        $response->assertStatus(422)
                ->assertJson([
                    'success' => false,
                    'message' => 'No se puede pausar la recompensa desde el estado actual: Programada'
                ]);
    }

    /**
     * Test para cancelar recompensa desde estado inválido
     */
    public function test_cancel_recompensa_desde_estado_invalido()
    {
        // Cambiar a expirada
        $this->recompensa->update(['estado' => Recompensa::ESTADO_EXPIRADA]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/admin/recompensas/{$this->recompensa->id}");

        $response->assertStatus(422)
                ->assertJson([
                    'success' => false,
                    'message' => 'No se puede cancelar la recompensa desde el estado actual: Expirada'
                ]);
    }

    /**
     * Test para crear recompensa con estado específico
     */
    public function test_create_recompensa_con_estado_especifico()
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/admin/recompensas', [
                'nombre' => 'Nueva Recompensa',
                'descripcion' => 'Descripción de nueva recompensa',
                'tipo' => Recompensa::TIPO_DESCUENTO,
                'fecha_inicio' => Carbon::now()->addDay()->format('Y-m-d H:i:s'),
                'fecha_fin' => Carbon::now()->addDays(30)->format('Y-m-d H:i:s'),
                'estado' => Recompensa::ESTADO_ACTIVA
            ]);

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Recompensa creada exitosamente'
                ]);

        // Verificar que se creó con el estado correcto
        $recompensa = Recompensa::where('nombre', 'Nueva Recompensa')->first();
        $this->assertEquals(Recompensa::ESTADO_ACTIVA, $recompensa->estado);
    }

    /**
     * Test para crear recompensa sin estado (debe usar programada por defecto)
     */
    public function test_create_recompensa_sin_estado_usar_programada()
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/admin/recompensas', [
                'nombre' => 'Recompensa Sin Estado',
                'descripcion' => 'Descripción de recompensa sin estado',
                'tipo' => Recompensa::TIPO_PUNTOS,
                'fecha_inicio' => Carbon::now()->addDay()->format('Y-m-d H:i:s'),
                'fecha_fin' => Carbon::now()->addDays(30)->format('Y-m-d H:i:s')
            ]);

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Recompensa creada exitosamente'
                ]);

        // Verificar que se creó con estado programada por defecto
        $recompensa = Recompensa::where('nombre', 'Recompensa Sin Estado')->first();
        $this->assertEquals(Recompensa::ESTADO_PROGRAMADA, $recompensa->estado);
    }

    /**
     * Test para validar estado inválido en actualización
     */
    public function test_update_recompensa_estado_invalido()
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/admin/recompensas/{$this->recompensa->id}", [
                'estado' => 'estado_invalido'
            ]);

        $response->assertStatus(422)
                ->assertJson([
                    'success' => false,
                    'message' => 'Errores de validación'
                ])
                ->assertJsonStructure([
                    'errors' => [
                        'estado'
                    ]
                ]);
    }

    /**
     * Test para validar estado inválido en creación
     */
    public function test_create_recompensa_estado_invalido()
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/admin/recompensas', [
                'nombre' => 'Recompensa Estado Inválido',
                'descripcion' => 'Descripción',
                'tipo' => Recompensa::TIPO_PUNTOS,
                'fecha_inicio' => Carbon::now()->addDay()->format('Y-m-d H:i:s'),
                'fecha_fin' => Carbon::now()->addDays(30)->format('Y-m-d H:i:s'),
                'estado' => 'estado_invalido'
            ]);

        $response->assertStatus(422)
                ->assertJson([
                    'success' => false,
                    'message' => 'Errores de validación'
                ])
                ->assertJsonStructure([
                    'errors' => [
                        'estado'
                    ]
                ]);
    }
}
