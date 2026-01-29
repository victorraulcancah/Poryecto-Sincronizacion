<?php

namespace App\Http\Controllers\Recompensas;

use App\Http\Controllers\Controller;
use App\Models\Recompensa;
use App\Models\RecompensaEnvio;
use App\Models\UbigeoInei;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class RecompensaEnviosController extends Controller
{
    /**
     * Obtener configuración de envíos de una recompensa
     */
    public function index($recompensaId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            // Verificar que sea una recompensa de tipo envío gratis
            if ($recompensa->tipo !== Recompensa::TIPO_ENVIO_GRATIS) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta recompensa no es de tipo envío gratis'
                ], 422);
            }

            $configuraciones = RecompensaEnvio::where('recompensa_id', $recompensaId)
                ->get()
                ->map(function($config) {
                    return [
                        'id' => $config->id,
                        'minimo_compra' => $config->minimo_compra,
                        'tiene_monto_minimo' => $config->tiene_monto_minimo,
                        'zonas_aplicables' => $config->zonas_aplicables,
                        'codigos_zona' => $config->codigos_zona,
                        'cantidad_zonas' => $config->cantidad_zonas,
                        'aplica_todas_zonas' => $config->aplica_todas_zonas,
                        'configuracion_valida' => $config->esConfiguracionValida(),
                        'descripcion' => $config->descripcion_envio,
                        'informacion_zonas' => $config->getInformacionZonas(),
                        'resumen' => $config->getResumenConfiguracion()
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Configuración de envíos obtenida exitosamente',
                'data' => [
                    'recompensa' => [
                        'id' => $recompensa->id,
                        'nombre' => $recompensa->nombre,
                        'tipo' => $recompensa->tipo
                    ],
                    'configuraciones' => $configuraciones
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener la configuración de envíos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear configuración de envío
     */
    public function store(Request $request, $recompensaId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            // Verificar que sea una recompensa de tipo envío gratis
            if ($recompensa->tipo !== Recompensa::TIPO_ENVIO_GRATIS) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta recompensa no es de tipo envío gratis'
                ], 422);
            }

            $validator = Validator::make($request->all(), [
                'minimo_compra' => 'nullable|numeric|min:0',
                'zonas_aplicables' => 'nullable|array',
                'zonas_aplicables.*' => 'string|exists:ubigeo_inei,id_ubigeo'
            ], [
                'minimo_compra.numeric' => 'El mínimo de compra debe ser un número',
                'minimo_compra.min' => 'El mínimo de compra no puede ser negativo',
                'zonas_aplicables.array' => 'Las zonas aplicables deben ser un array',
                'zonas_aplicables.*.exists' => 'Una o más zonas seleccionadas no existen'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Verificar que no exista ya una configuración para esta recompensa
            $existeConfiguracion = RecompensaEnvio::where('recompensa_id', $recompensaId)->exists();
            if ($existeConfiguracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ya existe una configuración de envío para esta recompensa. Use el método de actualización.'
                ], 422);
            }

            DB::beginTransaction();

            $configuracion = RecompensaEnvio::create([
                'recompensa_id' => $recompensaId,
                'minimo_compra' => $request->minimo_compra ?? 0,
                'zonas_aplicables' => $request->zonas_aplicables
            ]);

            DB::commit();

            $data = [
                'id' => $configuracion->id,
                'minimo_compra' => $configuracion->minimo_compra,
                'tiene_monto_minimo' => $configuracion->tiene_monto_minimo,
                'zonas_aplicables' => $configuracion->zonas_aplicables,
                'codigos_zona' => $configuracion->codigos_zona,
                'cantidad_zonas' => $configuracion->cantidad_zonas,
                'aplica_todas_zonas' => $configuracion->aplica_todas_zonas,
                'configuracion_valida' => $configuracion->esConfiguracionValida(),
                'descripcion' => $configuracion->descripcion_envio,
                'informacion_zonas' => $configuracion->getInformacionZonas(),
                'resumen' => $configuracion->getResumenConfiguracion()
            ];

            return response()->json([
                'success' => true,
                'message' => 'Configuración de envío creada exitosamente',
                'data' => $data
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al crear la configuración de envío',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar configuración de envío
     */
    public function update(Request $request, $recompensaId, $configId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $configuracion = RecompensaEnvio::where('recompensa_id', $recompensaId)
                ->where('id', $configId)
                ->first();

            if (!$configuracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configuración de envío no encontrada'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'minimo_compra' => 'sometimes|nullable|numeric|min:0',
                'zonas_aplicables' => 'sometimes|nullable|array',
                'zonas_aplicables.*' => 'string|exists:ubigeo_inei,id_ubigeo'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $configuracion->update($request->only([
                'minimo_compra',
                'zonas_aplicables'
            ]));

            DB::commit();

            $data = [
                'id' => $configuracion->id,
                'minimo_compra' => $configuracion->minimo_compra,
                'tiene_monto_minimo' => $configuracion->tiene_monto_minimo,
                'zonas_aplicables' => $configuracion->zonas_aplicables,
                'codigos_zona' => $configuracion->codigos_zona,
                'cantidad_zonas' => $configuracion->cantidad_zonas,
                'aplica_todas_zonas' => $configuracion->aplica_todas_zonas,
                'configuracion_valida' => $configuracion->esConfiguracionValida(),
                'descripcion' => $configuracion->descripcion_envio,
                'informacion_zonas' => $configuracion->getInformacionZonas(),
                'resumen' => $configuracion->getResumenConfiguracion()
            ];

            return response()->json([
                'success' => true,
                'message' => 'Configuración de envío actualizada exitosamente',
                'data' => $data
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar la configuración de envío',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar configuración de envío
     */
    public function destroy($recompensaId, $configId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $configuracion = RecompensaEnvio::where('recompensa_id', $recompensaId)
                ->where('id', $configId)
                ->first();

            if (!$configuracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configuración de envío no encontrada'
                ], 404);
            }

            DB::beginTransaction();

            $configuracion->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Configuración de envío eliminada exitosamente'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la configuración de envío',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validar si aplica envío gratuito
     */
    public function validar(Request $request, $recompensaId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $configuracion = RecompensaEnvio::where('recompensa_id', $recompensaId)->first();

            if (!$configuracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay configuración de envío para esta recompensa'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'monto_compra' => 'required|numeric|min:0.01',
                'codigo_zona' => 'nullable|string|exists:ubigeo_inei,id_ubigeo'
            ], [
                'monto_compra.required' => 'El monto de compra es obligatorio',
                'monto_compra.numeric' => 'El monto de compra debe ser un número',
                'monto_compra.min' => 'El monto de compra debe ser mayor a 0',
                'codigo_zona.exists' => 'El código de zona no existe'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $montoCompra = $request->monto_compra;
            $codigoZona = $request->codigo_zona;

            $cumpleMontoMinimo = $configuracion->cumpleMontoMinimo($montoCompra);
            $incluyeZona = $configuracion->incluyeZona($codigoZona);
            $aplicaEnvioGratuito = $configuracion->aplicaEnvioGratuito($montoCompra, $codigoZona);

            // Obtener información de la zona si se proporciona
            $infoZona = null;
            if ($codigoZona) {
                $ubigeo = UbigeoInei::where('id_ubigeo', $codigoZona)->first();
                $infoZona = $ubigeo ? [
                    'codigo' => $codigoZona,
                    'nombre' => $ubigeo->nombre
                ] : null;
            }

            $validacion = [
                'aplica_envio_gratuito' => $aplicaEnvioGratuito,
                'parametros' => [
                    'monto_compra' => $montoCompra,
                    'codigo_zona' => $codigoZona,
                    'zona_info' => $infoZona
                ],
                'validaciones' => [
                    'cumple_monto_minimo' => [
                        'resultado' => $cumpleMontoMinimo,
                        'requerido' => $configuracion->minimo_compra,
                        'mensaje' => $cumpleMontoMinimo ? 
                            'Cumple con el monto mínimo' : 
                            "Requiere compra mínima de S/ {$configuracion->minimo_compra}"
                    ],
                    'incluye_zona' => [
                        'resultado' => $incluyeZona,
                        'aplica_todas_zonas' => $configuracion->aplica_todas_zonas,
                        'mensaje' => $incluyeZona ? 
                            'La zona está incluida en el envío gratuito' : 
                            'La zona no está incluida en el envío gratuito'
                    ]
                ],
                'configuracion' => [
                    'minimo_compra' => $configuracion->minimo_compra,
                    'tiene_monto_minimo' => $configuracion->tiene_monto_minimo,
                    'aplica_todas_zonas' => $configuracion->aplica_todas_zonas,
                    'cantidad_zonas_configuradas' => $configuracion->cantidad_zonas,
                    'descripcion' => $configuracion->descripcion_envio
                ]
            ];

            return response()->json([
                'success' => true,
                'message' => 'Validación de envío gratuito completada exitosamente',
                'data' => $validacion
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al validar el envío gratuito',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Buscar zonas (ubigeo) para configuración
     */
    public function buscarZonas(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'buscar' => 'nullable|string|min:2',
                'limite' => 'nullable|integer|min:1|max:100',
                'departamento' => 'nullable|string|size:2',
                'provincia' => 'nullable|string|size:2'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $buscar = $request->get('buscar', '');
            $limite = $request->get('limite', 50);
            $departamento = $request->departamento;
            $provincia = $request->provincia;

            $query = UbigeoInei::query();

            if (!empty($buscar)) {
                $query->where('nombre', 'like', "%{$buscar}%");
            }

            if ($departamento) {
                $query->where('departamento', $departamento);
            }

            if ($provincia) {
                $query->where('provincia', $provincia);
            }

            $zonas = $query->limit($limite)
                ->get(['id_ubigeo', 'departamento', 'provincia', 'distrito', 'nombre'])
                ->map(function($zona) {
                    return [
                        'codigo' => $zona->id_ubigeo,
                        'nombre' => $zona->nombre,
                        'departamento' => $zona->departamento,
                        'provincia' => $zona->provincia,
                        'distrito' => $zona->distrito,
                        'nombre_completo' => $zona->nombre
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Zonas encontradas exitosamente',
                'data' => $zonas
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al buscar zonas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener departamentos disponibles
     */
    public function departamentos(): JsonResponse
    {
        try {
            $departamentos = UbigeoInei::select('departamento')
                ->distinct()
                ->orderBy('departamento')
                ->get()
                ->map(function($item) {
                    // Mapear códigos de departamento a nombres (simplificado)
                    $nombres = [
                        '01' => 'Amazonas',
                        '02' => 'Áncash',
                        '03' => 'Apurímac',
                        '04' => 'Arequipa',
                        '05' => 'Ayacucho',
                        '06' => 'Cajamarca',
                        '07' => 'Callao',
                        '08' => 'Cusco',
                        '09' => 'Huancavelica',
                        '10' => 'Huánuco',
                        '11' => 'Ica',
                        '12' => 'Junín',
                        '13' => 'La Libertad',
                        '14' => 'Lambayeque',
                        '15' => 'Lima',
                        '16' => 'Loreto',
                        '17' => 'Madre de Dios',
                        '18' => 'Moquegua',
                        '19' => 'Pasco',
                        '20' => 'Piura',
                        '21' => 'Puno',
                        '22' => 'San Martín',
                        '23' => 'Tacna',
                        '24' => 'Tumbes',
                        '25' => 'Ucayali'
                    ];

                    return [
                        'codigo' => $item->departamento,
                        'nombre' => $nombres[$item->departamento] ?? "Departamento {$item->departamento}"
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Departamentos obtenidos exitosamente',
                'data' => $departamentos
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los departamentos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de cobertura de envío
     */
    public function estadisticasCobertura($recompensaId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $configuracion = RecompensaEnvio::where('recompensa_id', $recompensaId)->first();

            if (!$configuracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay configuración de envío para esta recompensa'
                ], 404);
            }

            $totalZonas = UbigeoInei::count();
            $zonasConfiguradas = $configuracion->cantidad_zonas;
            $porcentajeCobertura = $configuracion->aplica_todas_zonas ? 100 : 
                ($totalZonas > 0 ? ($zonasConfiguradas / $totalZonas) * 100 : 0);

            $estadisticas = [
                'cobertura' => [
                    'aplica_todas_zonas' => $configuracion->aplica_todas_zonas,
                    'zonas_configuradas' => $zonasConfiguradas,
                    'total_zonas_disponibles' => $totalZonas,
                    'porcentaje_cobertura' => round($porcentajeCobertura, 2)
                ],
                'configuracion' => [
                    'minimo_compra' => $configuracion->minimo_compra,
                    'tiene_monto_minimo' => $configuracion->tiene_monto_minimo,
                    'descripcion' => $configuracion->descripcion_envio
                ],
                'informacion_zonas' => $configuracion->getInformacionZonas()
            ];

            return response()->json([
                'success' => true,
                'message' => 'Estadísticas de cobertura obtenidas exitosamente',
                'data' => $estadisticas
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las estadísticas de cobertura',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}