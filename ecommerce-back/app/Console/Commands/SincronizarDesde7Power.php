<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SincronizarDesde7Power extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync:7power {--force : Forzar sincronización completa} {--update-stock : Actualizar stock de productos existentes} {--company=1 : ID de la empresa en 7Power} {--warehouse=1 : ID del almacén en 7Power}';

    /**
     * The description of the console command.
     *
     * @var string
     */
    protected $description = 'Sincroniza marcas, categorías y productos desde 7Power a Magus automáticamente';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info(' Iniciando sincronización desde 7Power...');

        $companyId   = (int) $this->option('company');
        $warehouseId = (int) $this->option('warehouse');

        try {
            // Verificar conexión a 7Power
            $this->info(' Verificando conexión a 7Power...');
            DB::connection('mysql_7power')->getPdo();
            $this->info(' Conexión a 7Power exitosa');

            // Si se especifica --update-stock, solo actualizar stock
            if ($this->option('update-stock')) {
                $this->actualizarStockProductos($companyId, $warehouseId);
                $this->info(' Actualización de stock completada exitosamente');
                return 0;
            }

            // Sincronizar marcas
            $this->sincronizarMarcas($companyId);

            // Sincronizar categorías
            $this->sincronizarCategorias($companyId);

            // Sincronizar productos
            $this->sincronizarProductos($companyId, $warehouseId);

            $this->info(' Sincronización completada exitosamente');

        } catch (\Exception $e) {
            $this->error(' Error en la sincronización: ' . $e->getMessage());
            Log::error('Error en sincronización 7Power', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 1;
        }
        
        return 0;
    }
    
    /**
     * Sincronizar marcas desde 7Power
     */
    private function sincronizarMarcas(int $companyId)
    {
        $this->info('  Sincronizando marcas...');

        // Obtener marcas de 7Power
        $marcas7Power = DB::connection('mysql_7power')
            ->table('brands')
            ->where('company_id', $companyId)
            ->get();
        
        $nuevas = 0;
        $actualizadas = 0;
        $errores = 0;
        
        // IDs de marcas activas en 7Power
        $marcas7PowerIds = $marcas7Power->pluck('id')->toArray();
        
        foreach ($marcas7Power as $marca7Power) {
            try {
                // Buscar mapeo existente
                $mapeo = DB::table('marca_mapeo_7power')
                    ->where('marca_7power', $marca7Power->id)
                    ->first();
                
                if (!$mapeo) {
                    // Buscar o crear marca en Magus por codigo_externo
                    $marcaMagus = DB::table('marcas_productos')
                        ->where('codigo_externo', $marca7Power->id)
                        ->first();
                    
                    if (!$marcaMagus) {
                        // Crear marca en Magus
                        $marcaMagusId = DB::table('marcas_productos')->insertGetId([
                            'codigo_externo' => $marca7Power->id,
                            'nombre' => $marca7Power->name,
                            'descripcion' => 'Marca ' . $marca7Power->name,
                            'activo' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                        
                        $this->line("  Marca creada en Magus: {$marca7Power->name}");
                        $nuevas++;
                    } else {
                        $marcaMagusId = $marcaMagus->id;
                        
                        // Actualizar datos de la marca existente
                        DB::table('marcas_productos')
                            ->where('id', $marcaMagusId)
                            ->update([
                                'nombre' => $marca7Power->name,
                                'activo' => true,
                                'updated_at' => now(),
                            ]);
                        
                        $actualizadas++;
                    }
                    
                    // Crear mapeo
                    DB::table('marca_mapeo_7power')->insert([
                        'marca_magus_id' => $marcaMagusId,
                        'marca_7power' => $marca7Power->id,
                        'nombre' => $marca7Power->name,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    // Actualizar marca existente
                    DB::table('marcas_productos')
                        ->where('id', $mapeo->marca_magus_id)
                        ->update([
                            'nombre' => $marca7Power->name,
                            'activo' => true,
                            'updated_at' => now(),
                        ]);
                    
                    // Actualizar mapeo
                    DB::table('marca_mapeo_7power')
                        ->where('id', $mapeo->id)
                        ->update([
                            'nombre' => $marca7Power->name,
                            'updated_at' => now(),
                        ]);
                    
                    $actualizadas++;
                }
            } catch (\Exception $e) {
                $errores++;
                $this->error("   Error con marca {$marca7Power->name}: " . $e->getMessage());
            }
        }
        
        // Desactivar marcas que ya no existen en 7Power
        $marcasDesactivadas = DB::table('marca_mapeo_7power')
            ->whereNotIn('marca_7power', $marcas7PowerIds)
            ->get();
        
        foreach ($marcasDesactivadas as $mapeo) {
            DB::table('marcas_productos')
                ->where('id', $mapeo->marca_magus_id)
                ->update([
                    'activo' => false,
                    'updated_at' => now(),
                ]);
        }
        
        if ($marcasDesactivadas->count() > 0) {
            $this->line("  Marcas desactivadas: {$marcasDesactivadas->count()}");
        }
        
        $this->info(" Marcas sincronizadas: {$nuevas} nuevas, {$actualizadas} actualizadas, {$errores} errores");
    }
    
    /**
     * Sincronizar categorías desde 7Power
     */
    private function sincronizarCategorias(int $companyId)
    {
        $this->info(' Sincronizando categorías...');

        // Obtener categorías de 7Power
        $categorias7Power = DB::connection('mysql_7power')
            ->table('categories')
            ->where('company_id', $companyId)
            ->get();
        
        $nuevas = 0;
        $actualizadas = 0;
        $errores = 0;
        
        // IDs de categorías activas en 7Power
        $categorias7PowerIds = $categorias7Power->pluck('id')->toArray();
        
        foreach ($categorias7Power as $categoria7Power) {
            try {
                // Buscar mapeo existente
                $mapeo = DB::table('categoria_mapeo_7power')
                    ->where('categoria_7power', $categoria7Power->id)
                    ->first();
                
                if (!$mapeo) {
                    // Buscar o crear categoría en Magus por codigo_externo
                    $categoriaMagus = DB::table('categorias')
                        ->where('codigo_externo', $categoria7Power->id)
                        ->first();
                    
                    if (!$categoriaMagus) {
                        // Crear categoría en Magus con sección por defecto
                        $categoriaMagusId = DB::table('categorias')->insertGetId([
                            'codigo_externo' => $categoria7Power->id,
                            'nombre' => $categoria7Power->name,
                            'descripcion' => 'Categoría ' . $categoria7Power->name,
                            'id_seccion' => 1, // Asignar sección 1 por defecto
                            'activo' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                        
                        $this->line("  Categoría creada en Magus: {$categoria7Power->name}");
                        $nuevas++;
                    } else {
                        $categoriaMagusId = $categoriaMagus->id;
                        
                        // Actualizar datos de la categoría existente
                        DB::table('categorias')
                            ->where('id', $categoriaMagusId)
                            ->update([
                                'nombre' => $categoria7Power->name,
                                'activo' => true,
                                'updated_at' => now(),
                            ]);
                        
                        $actualizadas++;
                    }
                    
                    // Crear mapeo
                    DB::table('categoria_mapeo_7power')->insert([
                        'categoria_magus_id' => $categoriaMagusId,
                        'categoria_7power' => $categoria7Power->id,
                        'nombre' => $categoria7Power->name,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    // Actualizar categoría existente
                    DB::table('categorias')
                        ->where('id', $mapeo->categoria_magus_id)
                        ->update([
                            'nombre' => $categoria7Power->name,
                            'activo' => true,
                            'updated_at' => now(),
                        ]);
                    
                    // Actualizar mapeo
                    DB::table('categoria_mapeo_7power')
                        ->where('id', $mapeo->id)
                        ->update([
                            'nombre' => $categoria7Power->name,
                            'updated_at' => now(),
                        ]);
                    
                    $actualizadas++;
                }
            } catch (\Exception $e) {
                $errores++;
                $this->error("  Error con categoría {$categoria7Power->name}: " . $e->getMessage());
            }
        }
        
        // Desactivar categorías que ya no existen en 7Power
        $categoriasDesactivadas = DB::table('categoria_mapeo_7power')
            ->whereNotIn('categoria_7power', $categorias7PowerIds)
            ->get();
        
        foreach ($categoriasDesactivadas as $mapeo) {
            DB::table('categorias')
                ->where('id', $mapeo->categoria_magus_id)
                ->update([
                    'activo' => false,
                    'updated_at' => now(),
                ]);
        }
        
        if ($categoriasDesactivadas->count() > 0) {
            $this->line("  Categorías desactivadas: {$categoriasDesactivadas->count()}");
        }
        
        $this->info(" Categorías sincronizadas: {$nuevas} nuevas, {$actualizadas} actualizadas, {$errores} errores");
    }
    
    /**
     * Sincronizar productos desde 7Power
     */
    private function sincronizarProductos(int $companyId, int $warehouseId)
    {
        $this->info(' Sincronizando productos...');

        // Obtener TODOS los productos de 7Power (activos e inactivos)
        $productos7Power = DB::connection('mysql_7power')
            ->table('products')
            ->where('company_id', $companyId)
            ->get();
        
        $nuevos = 0;
        $actualizados = 0;
        $errores = 0;
        $saltados = 0;
        $desactivados = 0;
        
        // IDs de productos activos en 7Power
        $productos7PowerIds = $productos7Power->pluck('id')->toArray();
        
        foreach ($productos7Power as $producto7Power) {
            try {
                // Buscar mapeo existente
                $mapeo = DB::table('producto_mapeo_7power')
                    ->where('producto_7power_id', $producto7Power->id)
                    ->first();
                
                // Obtener mapeo de marca
                $marcaMagusId = null;
                if ($producto7Power->brand_id) {
                    $mapeoMarca = DB::table('marca_mapeo_7power')
                        ->where('marca_7power', $producto7Power->brand_id)
                        ->first();
                    
                    if ($mapeoMarca) {
                        $marcaMagusId = $mapeoMarca->marca_magus_id;
                    }
                }
                
                // Obtener mapeo de categoría
                $categoriaMagusId = null;
                if ($producto7Power->category_id) {
                    $mapeoCategoria = DB::table('categoria_mapeo_7power')
                        ->where('categoria_7power', $producto7Power->category_id)
                        ->first();
                    
                    if ($mapeoCategoria) {
                        $categoriaMagusId = $mapeoCategoria->categoria_magus_id;
                    }
                }
                
                // Si no tiene categoría, saltar
                if (!$categoriaMagusId) {
                    $this->line("  Producto sin categoría mapeada: {$producto7Power->name} (Cat ID: {$producto7Power->category_id}) - Saltando");
                    $saltados++;
                    continue;
                }
                
                // Obtener stock disponible de 7Power del almacén indicado
                $stockTotal = DB::connection('mysql_7power')
                    ->table('product_warehouse')
                    ->where('product_id', $producto7Power->id)
                    ->where('warehouse_id', $warehouseId)
                    ->value('stock') ?? 0;
                
                // Determinar si el producto está activo en 7Power
                $activoEn7Power = $producto7Power->estado == 1;
                
                if (!$mapeo) {
                    // Buscar o crear producto en Magus
                    $productoMagus = DB::table('productos')
                        ->where('codigo_producto', $producto7Power->codigo)
                        ->first();
                    
                    if (!$productoMagus) {
                        // Crear producto en Magus
                        $productoMagusId = DB::table('productos')->insertGetId([
                            'nombre' => $producto7Power->name,
                            'descripcion' => $producto7Power->descripcion ?? 'Producto ' . $producto7Power->name,
                            'codigo_producto' => $producto7Power->codigo,
                            'categoria_id' => $categoriaMagusId,
                            'marca_id' => $marcaMagusId,
                            'precio_compra' => 0.00,
                            'precio_venta' => 0.00,
                            'stock' => $stockTotal ?? 0,
                            'stock_minimo' => 5,
                            'activo' => $activoEn7Power,
                            'destacado' => false,
                            'mostrar_igv' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                        
                        $estado = $activoEn7Power ? 'activo' : 'inactivo';
                        $this->line("  Producto creado en Magus: {$producto7Power->name} (Stock: {$stockTotal}, Estado: {$estado})");
                        $nuevos++;
                    } else {
                        $productoMagusId = $productoMagus->id;
                        
                        // Actualizar producto existente
                        DB::table('productos')
                            ->where('id', $productoMagusId)
                            ->update([
                                'nombre' => $producto7Power->name,
                                'descripcion' => $producto7Power->descripcion ?? 'Producto ' . $producto7Power->name,
                                'categoria_id' => $categoriaMagusId,
                                'marca_id' => $marcaMagusId,
                                'stock' => $stockTotal ?? 0,
                                'activo' => $activoEn7Power,
                                'updated_at' => now(),
                            ]);
                        
                        $actualizados++;
                    }
                    
                    // Crear mapeo
                    DB::table('producto_mapeo_7power')->insert([
                        'producto_id' => $productoMagusId,
                        'producto_7power_id' => $producto7Power->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    // Actualizar producto existente
                    DB::table('productos')
                        ->where('id', $mapeo->producto_id)
                        ->update([
                            'nombre' => $producto7Power->name,
                            'descripcion' => $producto7Power->descripcion ?? 'Producto ' . $producto7Power->name,
                            'categoria_id' => $categoriaMagusId,
                            'marca_id' => $marcaMagusId,
                            'stock' => $stockTotal ?? 0,
                            'activo' => $activoEn7Power,
                            'updated_at' => now(),
                        ]);
                    
                    $actualizados++;
                    
                    if (!$activoEn7Power) {
                        $desactivados++;
                    }
                }
            } catch (\Exception $e) {
                $errores++;
                $this->error("  Error con producto {$producto7Power->name}: " . $e->getMessage());
            }
        }
        
        // Desactivar productos que ya no existen en 7Power
        $productosEliminados = DB::table('producto_mapeo_7power')
            ->whereNotIn('producto_7power_id', $productos7PowerIds)
            ->get();
        
        foreach ($productosEliminados as $mapeo) {
            DB::table('productos')
                ->where('id', $mapeo->producto_id)
                ->update([
                    'activo' => false,
                    'updated_at' => now(),
                ]);
            $desactivados++;
        }
        
        $this->info(" Productos sincronizados: {$nuevos} nuevos, {$actualizados} actualizados, {$desactivados} desactivados, {$saltados} saltados, {$errores} errores");
    }
    
    /**
     * Actualizar stock de productos ya sincronizados
     */
    private function actualizarStockProductos(int $companyId, int $warehouseId)
    {
        $this->info('  Actualizando stock de productos...');

        // Obtener todos los mapeos de productos
        $mapeos = DB::table('producto_mapeo_7power')->get();

        $actualizados = 0;
        $errores = 0;
        $sinStock = 0;

        foreach ($mapeos as $mapeo) {
            try {
                // Obtener stock disponible de 7Power del almacén indicado
                $stockTotal = DB::connection('mysql_7power')
                    ->table('product_warehouse')
                    ->where('product_id', $mapeo->producto_7power_id)
                    ->where('warehouse_id', $warehouseId)
                    ->value('stock') ?? 0;
                
                if ($stockTotal === null) {
                    $stockTotal = 0;
                    $sinStock++;
                }
                
                // Actualizar stock en Magus
                DB::table('productos')
                    ->where('id', $mapeo->producto_id)
                    ->update([
                        'stock' => $stockTotal,
                        'updated_at' => now(),
                    ]);
                
                $actualizados++;
                
                // Obtener nombre del producto para el log
                $producto = DB::table('productos')
                    ->where('id', $mapeo->producto_id)
                    ->first();
                
                if ($actualizados % 50 == 0) {
                    $this->line("  Actualizados: {$actualizados} productos...");
                }
                
            } catch (\Exception $e) {
                $errores++;
                $this->error("  Error actualizando producto ID {$mapeo->producto_id}: " . $e->getMessage());
            }
        }
        
        $this->info(" Stock actualizado: {$actualizados} productos, {$sinStock} sin stock en 7Power, {$errores} errores");
    }
}
