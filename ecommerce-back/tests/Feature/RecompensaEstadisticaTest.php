<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class RecompensaEstadisticaTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Crear usuario con permisos de recompensas
        $this->user = User::factory()->create();
        $this->user->givePermissionTo('recompensas.ver');
    }

    /**
     * Test para obtener estadísticas de recompensas
     */
    public function test_obtener_estadisticas_exitosamente()
    {
        // Limpiar cache
        Cache::forget('recompensas_estadisticas_' . now()->format('Y-m-d-H'));

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/admin/recompensas/estadisticas');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'message',
                    'data' => [
                        'resumen' => [
                            'total_recompensas',
                            'recompensas_activas',
                            'recompensas_vigentes',
                            'tasa_activacion'
                        ],
                        'por_tipo' => [
                            'puntos',
                            'descuento',
                            'envio_gratis',
                            'regalo'
                        ],
                        'mes_actual' => [
                            'aplicaciones',
                            'puntos_otorgados',
                            'clientes_beneficiados',
                            'promedio_puntos_por_aplicacion'
                        ],
                        'comparativa_mes_anterior' => [
                            'aplicaciones',
                            'clientes',
                            'puntos'
                        ],
                        'top_recompensas_mes',
                        'metadata'
                    ]
                ])
                ->assertJson([
                    'success' => true,
                    'message' => 'Estadísticas obtenidas exitosamente'
                ]);
    }

    /**
     * Test para obtener tipos de recompensas
     */
    public function test_obtener_tipos_exitosamente()
    {
        // Limpiar cache
        Cache::forget('recompensas_tipos_disponibles');

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/admin/recompensas/tipos');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'message',
                    'data' => [
                        'tipos' => [
                            '*' => [
                                'value',
                                'label',
                                'descripcion',
                                'campos_configuracion'
                            ]
                        ],
                        'estados' => [
                            '*' => [
                                'value',
                                'label',
                                'descripcion'
                            ]
                        ]
                    ]
                ])
                ->assertJson([
                    'success' => true,
                    'message' => 'Tipos de recompensas obtenidos exitosamente'
                ]);

        // Verificar que se incluyen todos los tipos
        $data = $response->json('data');
        $tipos = collect($data['tipos'])->pluck('value')->toArray();
        
        $this->assertContains('puntos', $tipos);
        $this->assertContains('descuento', $tipos);
        $this->assertContains('envio_gratis', $tipos);
        $this->assertContains('regalo', $tipos);
    }

    /**
     * Test para verificar que se requiere autenticación
     */
    public function test_requiere_autenticacion()
    {
        $response = $this->getJson('/api/admin/recompensas/estadisticas');
        $response->assertStatus(401);

        $response = $this->getJson('/api/admin/recompensas/tipos');
        $response->assertStatus(401);
    }

    /**
     * Test para verificar que se requiere permiso
     */
    public function test_requiere_permiso()
    {
        $userSinPermiso = User::factory()->create();

        $response = $this->actingAs($userSinPermiso, 'sanctum')
            ->getJson('/api/admin/recompensas/estadisticas');
        
        $response->assertStatus(403);

        $response = $this->actingAs($userSinPermiso, 'sanctum')
            ->getJson('/api/admin/recompensas/tipos');
        
        $response->assertStatus(403);
    }

    /**
     * Test para verificar cache de estadísticas
     */
    public function test_cache_estadisticas()
    {
        // Limpiar cache
        Cache::forget('recompensas_estadisticas_' . now()->format('Y-m-d-H'));

        // Primera llamada
        $response1 = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/admin/recompensas/estadisticas');

        $response1->assertStatus(200);

        // Segunda llamada (debería usar cache)
        $response2 = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/admin/recompensas/estadisticas');

        $response2->assertStatus(200);

        // Verificar que el contenido es el mismo
        $this->assertEquals(
            $response1->json('data'),
            $response2->json('data')
        );
    }

    /**
     * Test para verificar cache de tipos
     */
    public function test_cache_tipos()
    {
        // Limpiar cache
        Cache::forget('recompensas_tipos_disponibles');

        // Primera llamada
        $response1 = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/admin/recompensas/tipos');

        $response1->assertStatus(200);

        // Segunda llamada (debería usar cache)
        $response2 = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/admin/recompensas/tipos');

        $response2->assertStatus(200);

        // Verificar que el contenido es el mismo
        $this->assertEquals(
            $response1->json('data'),
            $response2->json('data')
        );
    }

    /**
     * Test para verificar estructura de respuesta de estadísticas
     */
    public function test_estructura_estadisticas()
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/admin/recompensas/estadisticas');

        $data = $response->json('data');

        // Verificar resumen
        $this->assertArrayHasKey('total_recompensas', $data['resumen']);
        $this->assertArrayHasKey('recompensas_activas', $data['resumen']);
        $this->assertArrayHasKey('recompensas_vigentes', $data['resumen']);
        $this->assertArrayHasKey('tasa_activacion', $data['resumen']);

        // Verificar por tipo
        $this->assertArrayHasKey('puntos', $data['por_tipo']);
        $this->assertArrayHasKey('descuento', $data['por_tipo']);
        $this->assertArrayHasKey('envio_gratis', $data['por_tipo']);
        $this->assertArrayHasKey('regalo', $data['por_tipo']);

        // Verificar mes actual
        $this->assertArrayHasKey('aplicaciones', $data['mes_actual']);
        $this->assertArrayHasKey('puntos_otorgados', $data['mes_actual']);
        $this->assertArrayHasKey('clientes_beneficiados', $data['mes_actual']);
        $this->assertArrayHasKey('promedio_puntos_por_aplicacion', $data['mes_actual']);

        // Verificar comparativa
        $this->assertArrayHasKey('aplicaciones', $data['comparativa_mes_anterior']);
        $this->assertArrayHasKey('clientes', $data['comparativa_mes_anterior']);
        $this->assertArrayHasKey('puntos', $data['comparativa_mes_anterior']);

        // Verificar metadata
        $this->assertArrayHasKey('generado_en', $data['metadata']);
        $this->assertArrayHasKey('cache_hasta', $data['metadata']);
        $this->assertArrayHasKey('periodo_analisis', $data['metadata']);
    }

    /**
     * Test para verificar estructura de respuesta de tipos
     */
    public function test_estructura_tipos()
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/admin/recompensas/tipos');

        $data = $response->json('data');

        // Verificar que hay 4 tipos
        $this->assertCount(4, $data['tipos']);

        // Verificar estructura de cada tipo
        foreach ($data['tipos'] as $tipo) {
            $this->assertArrayHasKey('value', $tipo);
            $this->assertArrayHasKey('label', $tipo);
            $this->assertArrayHasKey('descripcion', $tipo);
            $this->assertArrayHasKey('campos_configuracion', $tipo);
        }

        // Verificar que hay 5 estados
        $this->assertCount(5, $data['estados']);

        // Verificar estructura de cada estado
        foreach ($data['estados'] as $estado) {
            $this->assertArrayHasKey('value', $estado);
            $this->assertArrayHasKey('label', $estado);
            $this->assertArrayHasKey('descripcion', $estado);
        }
    }
}
