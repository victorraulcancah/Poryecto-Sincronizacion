<?php

namespace App\Http\Controllers\Recompensas;

use App\Http\Controllers\Controller;
use App\Models\Recompensa;
use App\Models\RecompensaDescuento;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class RecompensaDescuentosController extends Controller
{
    /**
     * Obtener configuración de descuentos de una recompensa
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

            // Verificar que sea una recompensa de tipo descuento
            if ($recompensa->tipo !== Recompensa::TIPO_DESCUENTO) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta recompensa no es de tipo descuento'
                ], 422);
            }

            $configuraciones = RecompensaDescuento::where('recompensa_id', $recompensaId)
                ->get()
                ->map(function($config) {
                    return [
                        'id' => $config->id,
                        'tipo_descuento' => $config->tipo_descuento,
                        'tipo_descuento_nombre' => $config->tipo_descuento_nombre,
                        'valor_descuento' => $config->valor_descuento,
                        'compra_minima' => $config->compra_minima,
                        'tiene_compra_minima' => $config->tiene_compra_minima,
                        'configuracion_valida' => $config->esConfiguracionValida(),
                        'descripcion' => $config->descripcion_descuento,
                        'resumen' => $config->getResumenConfiguracion()
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Configuración de descuentos obtenida exitosamente',
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
                'message' => 'Error al obtener la configuración de descuentos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear configuración de descuento
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

            // Verificar que sea una recompensa de tipo descuento
            if ($recompensa->tipo !== Recompensa::TIPO_DESCUENTO) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta recompensa no es de tipo descuento'
                ], 422);
            }

            $validator = Validator::make($request->all(), [
                'tipo_descuento' => 'required|in:' . implode(',', RecompensaDescuento::getTiposDescuento()),
                'valor_descuento' => 'required|numeric|min:0.01',
                'compra_minima' => 'nullable|numeric|min:0'
            ], [
                'tipo_descuento.required' => 'El tipo de descuento es obligatorio',
                'tipo_descuento.in' => 'El tipo de descuento no es válido',
                'valor_descuento.required' => 'El valor del descuento es obligatorio',
                'valor_descuento.numeric' => 'El valor del descuento debe ser un número',
                'valor_descuento.min' => 'El valor del descuento debe ser mayor a 0',
                'compra_minima.numeric' => 'La compra mínima debe ser un número',
                'compra_minima.min' => 'La compra mínima no puede ser negativa'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Validaciones adicionales
            if ($request->tipo_descuento === RecompensaDescuento::TIPO_PORCENTAJE && $request->valor_descuento > 100) {
                return response()->json([
                    'success' => false,
                    'message' => 'El porcentaje de descuento no puede ser mayor a 100%'
                ], 422);
            }

            // Verificar que no exista ya una configuración para esta recompensa
            $existeConfiguracion = RecompensaDescuento::where('recompensa_id', $recompensaId)->exists();
            if ($existeConfiguracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ya existe una configuración de descuento para esta recompensa. Use el método de actualización.'
                ], 422);
            }

            DB::beginTransaction();

            $configuracion = RecompensaDescuento::create([
                'recompensa_id' => $recompensaId,
                'tipo_descuento' => $request->tipo_descuento,
                'valor_descuento' => $request->valor_descuento,
                'compra_minima' => $request->compra_minima
            ]);

            DB::commit();

            $data = [
                'id' => $configuracion->id,
                'tipo_descuento' => $configuracion->tipo_descuento,
                'tipo_descuento_nombre' => $configuracion->tipo_descuento_nombre,
                'valor_descuento' => $configuracion->valor_descuento,
                'compra_minima' => $configuracion->compra_minima,
                'tiene_compra_minima' => $configuracion->tiene_compra_minima,
                'configuracion_valida' => $configuracion->esConfiguracionValida(),
                'descripcion' => $configuracion->descripcion_descuento,
                'resumen' => $configuracion->getResumenConfiguracion()
            ];

            return response()->json([
                'success' => true,
                'message' => 'Configuración de descuento creada exitosamente',
                'data' => $data
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al crear la configuración de descuento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar configuración de descuento
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

            $configuracion = RecompensaDescuento::where('recompensa_id', $recompensaId)
                ->where('id', $configId)
                ->first();

            if (!$configuracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configuración de descuento no encontrada'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'tipo_descuento' => 'sometimes|in:' . implode(',', RecompensaDescuento::getTiposDescuento()),
                'valor_descuento' => 'sometimes|numeric|min:0.01',
                'compra_minima' => 'nullable|numeric|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Validaciones adicionales
            if ($request->has('tipo_descuento') && $request->tipo_descuento === RecompensaDescuento::TIPO_PORCENTAJE) {
                $valorDescuento = $request->get('valor_descuento', $configuracion->valor_descuento);
                if ($valorDescuento > 100) {
                    return response()->json([
                        'success' => false,
                        'message' => 'El porcentaje de descuento no puede ser mayor a 100%'
                    ], 422);
                }
            }

            DB::beginTransaction();

            $configuracion->update($request->only([
                'tipo_descuento',
                'valor_descuento',
                'compra_minima'
            ]));

            DB::commit();

            $data = [
                'id' => $configuracion->id,
                'tipo_descuento' => $configuracion->tipo_descuento,
                'tipo_descuento_nombre' => $configuracion->tipo_descuento_nombre,
                'valor_descuento' => $configuracion->valor_descuento,
                'compra_minima' => $configuracion->compra_minima,
                'tiene_compra_minima' => $configuracion->tiene_compra_minima,
                'configuracion_valida' => $configuracion->esConfiguracionValida(),
                'descripcion' => $configuracion->descripcion_descuento,
                'resumen' => $configuracion->getResumenConfiguracion()
            ];

            return response()->json([
                'success' => true,
                'message' => 'Configuración de descuento actualizada exitosamente',
                'data' => $data
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar la configuración de descuento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar configuración de descuento
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

            $configuracion = RecompensaDescuento::where('recompensa_id', $recompensaId)
                ->where('id', $configId)
                ->first();

            if (!$configuracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configuración de descuento no encontrada'
                ], 404);
            }

            DB::beginTransaction();

            $configuracion->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Configuración de descuento eliminada exitosamente'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la configuración de descuento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Simular cálculo de descuento
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

            $configuracion = RecompensaDescuento::where('recompensa_id', $recompensaId)->first();

            if (!$configuracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay configuración de descuento para esta recompensa'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'montos' => 'required|array|min:1',
                'montos.*' => 'numeric|min:0.01'
            ], [
                'montos.required' => 'Los montos son obligatorios',
                'montos.array' => 'Los montos deben ser un array',
                'montos.min' => 'Debe proporcionar al menos un monto',
                'montos.*.numeric' => 'Cada monto debe ser un número',
                'montos.*.min' => 'Cada monto debe ser mayor a 0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $montos = $request->montos;
            $simulaciones = $configuracion->simularDescuentos($montos);

            $resultado = [
                'configuracion' => [
                    'tipo_descuento' => $configuracion->tipo_descuento,
                    'tipo_descuento_nombre' => $configuracion->tipo_descuento_nombre,
                    'valor_descuento' => $configuracion->valor_descuento,
                    'compra_minima' => $configuracion->compra_minima,
                    'descripcion' => $configuracion->descripcion_descuento
                ],
                'simulaciones' => $simulaciones,
                'resumen' => [
                    'total_simulaciones' => count($simulaciones),
                    'simulaciones_con_descuento' => collect($simulaciones)->where('cumple_minima', true)->count(),
                    'descuento_promedio' => collect($simulaciones)->where('cumple_minima', true)->avg('descuento'),
                    'ahorro_total' => collect($simulaciones)->where('cumple_minima', true)->sum('descuento')
                ]
            ];

            return response()->json([
                'success' => true,
                'message' => 'Simulación de descuentos calculada exitosamente',
                'data' => $resultado
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al simular el cálculo de descuentos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calcular descuento para un monto específico
     */
    public function calcular(Request $request, $recompensaId): JsonResponse
    {
        try {
            $recompensa = Recompensa::find($recompensaId);

            if (!$recompensa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recompensa no encontrada'
                ], 404);
            }

            $configuracion = RecompensaDescuento::where('recompensa_id', $recompensaId)->first();

            if (!$configuracion) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay configuración de descuento para esta recompensa'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'monto_compra' => 'required|numeric|min:0.01'
            ], [
                'monto_compra.required' => 'El monto de compra es obligatorio',
                'monto_compra.numeric' => 'El monto de compra debe ser un número',
                'monto_compra.min' => 'El monto de compra debe ser mayor a 0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $montoCompra = $request->monto_compra;
            $cumpleMinima = $configuracion->cumpleCompraMinima($montoCompra);
            $descuento = $configuracion->calcularDescuento($montoCompra);
            $montoFinal = $configuracion->calcularMontoFinal($montoCompra);
            $porcentajeEfectivo = $configuracion->getPorcentajeDescuentoEfectivo($montoCompra);

            $calculo = [
                'monto_original' => $montoCompra,
                'cumple_compra_minima' => $cumpleMinima,
                'descuento_aplicado' => $descuento,
                'monto_final' => $montoFinal,
                'ahorro' => $descuento,
                'porcentaje_descuento_efectivo' => round($porcentajeEfectivo, 2),
                'configuracion' => [
                    'tipo_descuento' => $configuracion->tipo_descuento_nombre,
                    'valor_descuento' => $configuracion->valor_descuento,
                    'compra_minima' => $configuracion->compra_minima,
                    'descripcion' => $configuracion->descripcion_descuento
                ],
                'detalles' => [
                    'mensaje' => $cumpleMinima ? 
                        "Descuento aplicado: S/ {$descuento} ({$porcentajeEfectivo}% de descuento)" : 
                        ($configuracion->tiene_compra_minima ? 
                            "No cumple con la compra mínima de S/ {$configuracion->compra_minima}" : 
                            'Descuento no aplicable'),
                    'formula_calculo' => $configuracion->es_porcentaje ? 
                        "({$montoCompra} × {$configuracion->valor_descuento}%) = {$descuento}" : 
                        "Descuento fijo: {$configuracion->valor_descuento}"
                ]
            ];

            return response()->json([
                'success' => true,
                'message' => 'Cálculo de descuento realizado exitosamente',
                'data' => $calculo
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al calcular el descuento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener tipos de descuento disponibles
     */
    public function tiposDisponibles(): JsonResponse
    {
        try {
            $tipos = collect(RecompensaDescuento::getTiposDescuento())->map(function($tipo) {
                $nombres = [
                    'porcentaje' => 'Porcentaje (%)',
                    'cantidad_fija' => 'Cantidad Fija (S/)'
                ];

                $descripciones = [
                    'porcentaje' => 'Descuento basado en un porcentaje del total de la compra',
                    'cantidad_fija' => 'Descuento de una cantidad fija en soles'
                ];

                return [
                    'value' => $tipo,
                    'label' => $nombres[$tipo] ?? ucfirst($tipo),
                    'descripcion' => $descripciones[$tipo] ?? '',
                    'ejemplo' => $tipo === 'porcentaje' ? '15% de descuento' : 'S/ 50 de descuento'
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Tipos de descuento obtenidos exitosamente',
                'data' => $tipos
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los tipos de descuento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validar configuración de descuento
     */
    public function validar(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'tipo_descuento' => 'required|in:' . implode(',', RecompensaDescuento::getTiposDescuento()),
                'valor_descuento' => 'required|numeric|min:0.01',
                'compra_minima' => 'nullable|numeric|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $esValida = true;
            $errores = [];
            $advertencias = [];

            // Validaciones específicas
            if ($request->tipo_descuento === 'porcentaje' && $request->valor_descuento > 100) {
                $esValida = false;
                $errores[] = 'El porcentaje no puede ser mayor a 100%';
            }

            if ($request->tipo_descuento === 'porcentaje' && $request->valor_descuento > 50) {
                $advertencias[] = 'Un descuento mayor al 50% puede afectar significativamente la rentabilidad';
            }

            if ($request->tipo_descuento === 'cantidad_fija' && $request->valor_descuento > 500) {
                $advertencias[] = 'Un descuento fijo muy alto puede no ser sostenible';
            }

            if ($request->compra_minima && $request->tipo_descuento === 'cantidad_fija' && $request->compra_minima < $request->valor_descuento) {
                $advertencias[] = 'La compra mínima es menor al descuento fijo, esto podría generar pérdidas';
            }

            $validacion = [
                'es_valida' => $esValida,
                'configuracion' => [
                    'tipo_descuento' => $request->tipo_descuento,
                    'valor_descuento' => $request->valor_descuento,
                    'compra_minima' => $request->compra_minima
                ],
                'errores' => $errores,
                'advertencias' => $advertencias,
                'recomendaciones' => [
                    'Para porcentajes: Entre 5% y 25% suelen ser atractivos y sostenibles',
                    'Para cantidades fijas: Entre S/ 10 y S/ 100 según el ticket promedio',
                    'Considere establecer una compra mínima para proteger la rentabilidad'
                ]
            ];

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