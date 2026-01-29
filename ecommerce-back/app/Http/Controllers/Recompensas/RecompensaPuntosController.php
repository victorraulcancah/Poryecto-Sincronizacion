<?php

namespace App\Http\Controllers\Recompensas;

use App\Http\Controllers\Controller;
use App\Models\Recompensa;
use App\Models\RecompensaPuntos;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class RecompensaPuntosController extends Controller
{
    /**
     * Obtener configuración de puntos de una recompensa
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

            // Verificar que sea una recompensa de tipo puntos
            if ($recompensa->tipo !== Recompensa::TIPO_PUNTOS) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta recompensa no es de tipo puntos'
                ], 422);
            }

            $configuraciones = RecompensaPuntos::where('recompensa_id', $recompensaId)
                ->get()
                ->map(function($config) {
                    return [
                        'id' => $config->id,
                        'puntos_por_compra' => $config->puntos_por_compra,
                        'puntos_por_monto' => $config->puntos_por_monto,
                        'puntos_registro' => $config->puntos_registro,
                        'configuracion_valida' => $config->esConfiguracionValida(),
                        'descripcion' => $config->descripcion_configuracion,
                        'resumen' => $config->getResumenConfiguracion()
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Configuración de puntos obtenida exitosamente',
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
                'message' => 'Error al obtener la configuración de puntos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear o actualizar configuración de puntos
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

            // Verificar que sea una recompensa de tipo puntos
            if ($recompensa->tipo !== Recompensa::TIPO_PUNTOS) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta recompensa no es de tipo puntos'
                ], 422);
            }

            $validator = Validator::make($request->all(), [
                'puntos_por_compra' => 'required|numeric|min:0|max:9999.99',
                'puntos_por_monto' => 'required|numeric|min:0|max:9999.99',
                'puntos_registro' => 'required|numeric|min:0|max:9999.99'
            ], [
                'puntos_por_compra.required' => 'Los puntos por compra son obligatorios',
                'puntos_por_compra.numeric' => 'Los puntos por compra deben ser un número',
                'puntos_por_compra.min' => 'Los puntos por compra no pueden ser negativos',
                'puntos_por_compra.max' => 'Los puntos por compra no pueden exceder 9999.99',
                'puntos_por_monto.required' => 'Los puntos por monto son obligatorios',
                'puntos_por_monto.numeric' => 'Los puntos por monto deben ser un número',
                'puntos_por_monto.min' => 'Los puntos por monto no pueden ser negativos',
                'puntos_por_monto.max' => 'Los puntos por monto no pueden exceder 9999.99',
                'puntos_registro.required' => 'Los puntos por registro son obligatorios',
                'puntos_registro.numeric' => 'Los puntos por registro deben ser un número',
                'puntos_registro.min' => 'Los puntos por registro no pueden ser negativos',
                'puntos_registro.max' => 'Los puntos por registro no pueden exceder 9999.99'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Validar que al menos una configuración sea mayor a 0
            $totalPuntos = $request->puntos_por_compra + $request->puntos_por_monto + $request->puntos_registro;
            if ($totalPuntos <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debe configurar al menos un tipo de puntos mayor a 0'
                ], 422);
            }

            DB::beginTransaction();

            // Eliminar configuraciones existentes
            RecompensaPuntos::where('recompensa_id', $recompensaId)->delete();

            // Crear nueva configuración
            $configuracion = RecompensaPuntos::create([
                'recompensa_id' => $recompensaId,
                'puntos_por_compra' => $request->puntos_por_compra,
                'puntos_por_monto' => $request->puntos_por_monto,
                'puntos_registro' => $request->puntos_registro
            ]);

            DB::commit();

            $data = [
                'id' => $configuracion->id,
                'puntos_por_compra' => $configuracion->puntos_por_compra,
                'puntos_por_monto' => $configuracion->puntos_por_monto,
                'puntos_registro' => $configuracion->puntos_registro,
                'configuracion_valida' => $configuracion->esConfiguracionValida(),
                'descripcion' => $configuracion->descripcion_configuracion,
                'resumen' => $configuracion->getResumenConfiguracion()
            ];

            return response()->json([
                'success' => true,
                'message' => 'Configuración de puntos guardada exitosamente',
                'data' => $data
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al guardar la configuración de puntos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar configuración específica de puntos
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

            $configuracion = RecompensaPuntos::where('recompensa_id', $recompensaId)
                ->where('id', $configId)
                ->first();

            if (!$configuracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configuración de puntos no encontrada'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'puntos_por_compra' => 'sometimes|numeric|min:0|max:9999.99',
                'puntos_por_monto' => 'sometimes|numeric|min:0|max:9999.99',
                'puntos_registro' => 'sometimes|numeric|min:0|max:9999.99'
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
                'puntos_por_compra',
                'puntos_por_monto',
                'puntos_registro'
            ]));

            DB::commit();

            $data = [
                'id' => $configuracion->id,
                'puntos_por_compra' => $configuracion->puntos_por_compra,
                'puntos_por_monto' => $configuracion->puntos_por_monto,
                'puntos_registro' => $configuracion->puntos_registro,
                'configuracion_valida' => $configuracion->esConfiguracionValida(),
                'descripcion' => $configuracion->descripcion_configuracion,
                'resumen' => $configuracion->getResumenConfiguracion()
            ];

            return response()->json([
                'success' => true,
                'message' => 'Configuración de puntos actualizada exitosamente',
                'data' => $data
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar la configuración de puntos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar configuración de puntos
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

            $configuracion = RecompensaPuntos::where('recompensa_id', $recompensaId)
                ->where('id', $configId)
                ->first();

            if (!$configuracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configuración de puntos no encontrada'
                ], 404);
            }

            DB::beginTransaction();

            $configuracion->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Configuración de puntos eliminada exitosamente'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la configuración de puntos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Simular cálculo de puntos
     */
    public function simular(Request $request, $recompensaId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $configuracion = RecompensaPuntos::where('recompensa_id', $recompensaId)->first();

            if (!$configuracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay configuración de puntos para esta recompensa'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'monto_compra' => 'required|numeric|min:0.01',
                'cantidad_items' => 'nullable|integer|min:1',
                'es_registro' => 'nullable|boolean'
            ], [
                'monto_compra.required' => 'El monto de compra es obligatorio',
                'monto_compra.numeric' => 'El monto de compra debe ser un número',
                'monto_compra.min' => 'El monto de compra debe ser mayor a 0',
                'cantidad_items.integer' => 'La cantidad de items debe ser un número entero',
                'cantidad_items.min' => 'La cantidad de items debe ser mayor a 0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $montoCompra = $request->monto_compra;
            $cantidadItems = $request->get('cantidad_items', 1);
            $esRegistro = $request->get('es_registro', false);

            // Calcular puntos
            $puntosPorCompra = $configuracion->calcularPuntosPorCompra($montoCompra, $cantidadItems);
            $puntosPorRegistro = $esRegistro ? $configuracion->calcularPuntosPorRegistro() : 0;
            $puntosTotal = $puntosPorCompra + $puntosPorRegistro;

            // Desglose detallado
            $desglose = [
                'puntos_por_compra_fija' => $configuracion->otorga_puntos_por_compra ? $configuracion->puntos_por_compra : 0,
                'puntos_por_monto_gastado' => $configuracion->otorga_puntos_por_monto ? ($montoCompra * $configuracion->puntos_por_monto) : 0,
                'puntos_por_registro' => $puntosPorRegistro,
                'total_puntos' => $puntosTotal
            ];

            $simulacion = [
                'parametros' => [
                    'monto_compra' => $montoCompra,
                    'cantidad_items' => $cantidadItems,
                    'es_registro' => $esRegistro
                ],
                'configuracion' => [
                    'puntos_por_compra' => $configuracion->puntos_por_compra,
                    'puntos_por_monto' => $configuracion->puntos_por_monto,
                    'puntos_registro' => $configuracion->puntos_registro
                ],
                'resultado' => $desglose,
                'descripcion' => [
                    'compra_fija' => $configuracion->otorga_puntos_por_compra ? "{$configuracion->puntos_por_compra} puntos por realizar la compra" : 'Sin puntos por compra',
                    'monto_gastado' => $configuracion->otorga_puntos_por_monto ? 
                        ($configuracion->puntos_por_monto >= 1 ? 
                            "{$configuracion->puntos_por_monto} puntos por cada sol gastado" : 
                            "1 punto por cada " . round(1 / $configuracion->puntos_por_monto, 0) . " soles gastados") : 
                        'Sin puntos por monto',
                    'registro' => $esRegistro && $configuracion->otorga_puntos_por_registro ? "{$configuracion->puntos_registro} puntos por registro" : 'Sin puntos por registro'
                ]
            ];

            return response()->json([
                'success' => true,
                'message' => 'Simulación de puntos calculada exitosamente',
                'data' => $simulacion
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al simular el cálculo de puntos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener ejemplos de configuración de puntos
     */
    public function ejemplos(): JsonResponse
    {
        try {
            $ejemplos = [
                [
                    'nombre' => 'Configuración Básica',
                    'descripcion' => 'Puntos simples por compra',
                    'configuracion' => [
                        'puntos_por_compra' => 10,
                        'puntos_por_monto' => 0,
                        'puntos_registro' => 50
                    ],
                    'ejemplo_calculo' => '10 puntos por cada compra + 50 puntos al registrarse'
                ],
                [
                    'nombre' => 'Configuración por Monto',
                    'descripcion' => 'Puntos basados en el monto gastado',
                    'configuracion' => [
                        'puntos_por_compra' => 0,
                        'puntos_por_monto' => 1,
                        'puntos_registro' => 100
                    ],
                    'ejemplo_calculo' => '1 punto por cada sol gastado + 100 puntos al registrarse'
                ],
                [
                    'nombre' => 'Configuración Mixta',
                    'descripcion' => 'Combinación de puntos fijos y por monto',
                    'configuracion' => [
                        'puntos_por_compra' => 5,
                        'puntos_por_monto' => 0.5,
                        'puntos_registro' => 25
                    ],
                    'ejemplo_calculo' => '5 puntos por compra + 0.5 puntos por sol + 25 puntos al registrarse'
                ],
                [
                    'nombre' => 'Configuración Generosa',
                    'descripción' => 'Para clientes VIP o promociones especiales',
                    'configuracion' => [
                        'puntos_por_compra' => 20,
                        'puntos_por_monto' => 2,
                        'puntos_registro' => 200
                    ],
                    'ejemplo_calculo' => '20 puntos por compra + 2 puntos por sol + 200 puntos al registrarse'
                ]
            ];

            return response()->json([
                'success' => true,
                'message' => 'Ejemplos de configuración obtenidos exitosamente',
                'data' => $ejemplos
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los ejemplos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validar configuración de puntos
     */
    public function validar(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'puntos_por_compra' => 'required|numeric|min:0|max:9999.99',
                'puntos_por_monto' => 'required|numeric|min:0|max:9999.99',
                'puntos_registro' => 'required|numeric|min:0|max:9999.99'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $totalPuntos = $request->puntos_por_compra + $request->puntos_por_monto + $request->puntos_registro;
            $esValida = $totalPuntos > 0;

            $validacion = [
                'es_valida' => $esValida,
                'total_puntos_configurados' => $totalPuntos,
                'validaciones' => [
                    'puntos_por_compra' => [
                        'valor' => $request->puntos_por_compra,
                        'activo' => $request->puntos_por_compra > 0,
                        'valido' => $request->puntos_por_compra >= 0 && $request->puntos_por_compra <= 9999.99
                    ],
                    'puntos_por_monto' => [
                        'valor' => $request->puntos_por_monto,
                        'activo' => $request->puntos_por_monto > 0,
                        'valido' => $request->puntos_por_monto >= 0 && $request->puntos_por_monto <= 9999.99
                    ],
                    'puntos_registro' => [
                        'valor' => $request->puntos_registro,
                        'activo' => $request->puntos_registro > 0,
                        'valido' => $request->puntos_registro >= 0 && $request->puntos_registro <= 9999.99
                    ]
                ],
                'recomendaciones' => []
            ];

            // Agregar recomendaciones
            if (!$esValida) {
                $validacion['recomendaciones'][] = 'Debe configurar al menos un tipo de puntos mayor a 0';
            }

            if ($request->puntos_por_monto > 0 && $request->puntos_por_monto < 0.01) {
                $validacion['recomendaciones'][] = 'Los puntos por monto muy bajos pueden no ser atractivos para los clientes';
            }

            if ($request->puntos_por_compra > 100) {
                $validacion['recomendaciones'][] = 'Los puntos por compra muy altos pueden afectar la rentabilidad';
            }

            return response()->json([
                'success' => true,
                'message' => 'Validación completada exitosamente',
                'data' => $validacion
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al validar la configuración',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}