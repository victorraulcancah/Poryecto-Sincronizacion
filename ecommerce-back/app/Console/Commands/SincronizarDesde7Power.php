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
    protected $signature = 'sync:7power {--force : Forzar sincronización completa} {--update-stock : Actualizar stock de productos existentes}';

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
        
        try {
            // Verificar conexión a 7Power
            $this->info(' Verificando conexión a 7Power...');
            DB::connection('mysql_7power')->getPdo();
            $this->info(' Conexión a 7Power exitosa');
            
            // Si se especifica --update-stock, solo actualizar stock
            if ($this->option('update-stock')) {
                $this->actualizarStockProductos();
                $this->info(' Actualización de stock completada exitosamente');
                return 0;
            }
            
            // Sincronizar marcas
            $this->sincronizarMarcas();
            
            // Sincronizar categorías
            $this->sincronizarCategorias();
            
            // Sincronizar productos
            $this->sincronizarProductos();
            
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
    private function sincronizarMarcas()
    {
        $this->info('  Sincronizando marcas...');
        
        // Obtener marcas de 7Power
        $marcas7Power = DB::connection('mysql_7power')
            ->table('brands')
            ->where('company_id', 1)
            ->get();
        
        $nuevas = 0;
        $actualizadas = 0;
        $errores = 0;
        
        foreach ($marcas7Power as $marca7Power) {
            try {
                // Verificar si ya existe el mapeo
                $mapeoExiste = DB::table('marca_mapeo_7power')
                    ->where('marca_7power', $marca7Power->id)
                    ->exists();
                
                if (!$mapeoExiste) {
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
                    } else {
                        $marcaMagusId = $marcaMagus->id;
                    }
                    
                    // Verificar que no exista mapeo con este marca_magus_id
                    $mapeoExistePorMagusId = DB::table('marca_mapeo_7power')
                        ->where('marca_magus_id', $marcaMagusId)
                        ->exists();
                    
                    if (!$mapeoExistePorMagusId) {
                        // Crear mapeo
                        DB::table('marca_mapeo_7power')->insert([
                            'marca_magus_id' => $marcaMagusId,
                            'marca_7power' => $marca7Power->id,
                            'nombre' => $marca7Power->name,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                        
                        $nuevas++;
                        $this->line("  Mapeo creado: {$marca7Power->name} (7Power: {$marca7Power->id} → Magus: {$marcaMagusId})");
                    } else {
                        $this->line("  Mapeo ya existe para Magus ID: {$marcaMagusId} - Saltando {$marca7Power->name}");
                        $actualizadas++;
                    }
                } else {
                    $actualizadas++;
                }
            } catch (\Exception $e) {
                $errores++;
                $this->error("   Error con marca {$marca7Power->name}: " . $e->getMessage());
            }
        }
        
        $this->info(" Marcas sincronizadas: {$nuevas} nuevas, {$actualizadas} existentes, {$errores} errores");
    }
    
    /**
     * Sincronizar categorías desde 7Power
     */
    private function sincronizarCategorias()
    {
        $this->info(' Sincronizando categorías...');
        
        // Obtener categorías de 7Power
        $categorias7Power = DB::connection('mysql_7power')
            ->table('categories')
            ->where('company_id', 1)
            ->get();
        
        $nuevas = 0;
        $actualizadas = 0;
        $errores = 0;
        
        foreach ($categorias7Power as $categoria7Power) {
            try {
                // Verificar si ya existe el mapeo
                $mapeoExiste = DB::table('categoria_mapeo_7power')
                    ->where('categoria_7power', $categoria7Power->id)
                    ->exists();
                
                if (!$mapeoExiste) {
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
                    } else {
                        $categoriaMagusId = $categoriaMagus->id;
                    }
                    
                    // Verificar que no exista mapeo con este categoria_magus_id
                    $mapeoExistePorMagusId = DB::table('categoria_mapeo_7power')
                        ->where('categoria_magus_id', $categoriaMagusId)
                        ->exists();
                    
                    if (!$mapeoExistePorMagusId) {
                        // Crear mapeo
                        DB::table('categoria_mapeo_7power')->insert([
                            'categoria_magus_id' => $categoriaMagusId,
                            'categoria_7power' => $categoria7Power->id,
                            'nombre' => $categoria7Power->name,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                        
                        $nuevas++;
                        $this->line("  Mapeo creado: {$categoria7Power->name} (7Power: {$categoria7Power->id} → Magus: {$categoriaMagusId})");
                    } else {
                        $this->line("  Mapeo ya existe para Magus ID: {$categoriaMagusId} - Saltando {$categoria7Power->name}");
                        $actualizadas++;
                    }
                } else {
                    $actualizadas++;
                }
            } catch (\Exception $e) {
                $errores++;
                $this->error("  Error con categoría {$categoria7Power->name}: " . $e->getMessage());
            }
        }
        
        $this->info(" Categorías sincronizadas: {$nuevas} nuevas, {$actualizadas} existentes, {$errores} errores");
    }
    
    /**
     * Sincronizar productos desde 7Power
     */
    private function sincronizarProductos()
    {
        $this->info(' Sincronizando productos...');
        
        // Obtener productos de 7Power con sus relaciones y stock
        $productos7Power = DB::connection('mysql_7power')
            ->table('products')
            ->where('company_id', 1)
            ->where('estado', 1) // Solo productos activos
            ->get();
        
        $nuevos = 0;
        $actualizados = 0;
        $errores = 0;
        $saltados = 0;
        
        foreach ($productos7Power as $producto7Power) {
            try {
                // Verificar si ya existe el mapeo
                $mapeoExiste = DB::table('producto_mapeo_7power')
                    ->where('producto_7power_id', $producto7Power->id)
                    ->exists();
                
                if ($mapeoExiste) {
                    $actualizados++;
                    continue;
                }
                
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
                    $this->line("  Producto sin categoría mapeada: {$producto7Power->name} - Saltando");
                    $saltados++;
                    continue;
                }
                
                // ✅ OBTENER STOCK REAL DE 7POWER (suma de todos los almacenes)
                $stockTotal = DB::connection('mysql_7power')
                    ->table('product_warehouse')
                    ->where('product_id', $producto7Power->id)
                    ->sum('stock');
                
                // Buscar o crear producto en Magus
                $productoMagus = DB::table('productos')
                    ->where('codigo_producto', $producto7Power->codigo)
                    ->first();
                
                if (!$productoMagus) {
                    // Crear producto en Magus con stock real
                    $productoMagusId = DB::table('productos')->insertGetId([
                        'nombre' => $producto7Power->name,
                        'descripcion' => $producto7Power->descripcion ?? 'Producto ' . $producto7Power->name,
                        'codigo_producto' => $producto7Power->codigo,
                        'categoria_id' => $categoriaMagusId,
                        'marca_id' => $marcaMagusId,
                        'precio_compra' => 0.00, // Se puede actualizar después
                        'precio_venta' => 0.00,  // Se puede actualizar después
                        'stock' => $stockTotal ?? 0, // ✅ Stock real de 7Power
                        'stock_minimo' => 5,
                        'activo' => true,
                        'destacado' => false,
                        'mostrar_igv' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    
                    $this->line("  Producto creado en Magus: {$producto7Power->name} (Stock: {$stockTotal})");
                } else {
                    $productoMagusId = $productoMagus->id;
                }
                
                // Verificar que no exista mapeo con este producto_id
                $mapeoExistePorMagusId = DB::table('producto_mapeo_7power')
                    ->where('producto_id', $productoMagusId)
                    ->exists();
                
                if (!$mapeoExistePorMagusId) {
                    // Crear mapeo
                    DB::table('producto_mapeo_7power')->insert([
                        'producto_id' => $productoMagusId,
                        'producto_7power_id' => $producto7Power->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    
                    $nuevos++;
                    $this->line("  Mapeo creado: {$producto7Power->name} (7Power: {$producto7Power->id} → Magus: {$productoMagusId})");
                } else {
                    $this->line("   Mapeo ya existe para Magus ID: {$productoMagusId} - Saltando {$producto7Power->name}");
                    $actualizados++;
                }
            } catch (\Exception $e) {
                $errores++;
                $this->error("  Error con producto {$producto7Power->name}: " . $e->getMessage());
            }
        }
        
        $this->info(" Productos sincronizados: {$nuevos} nuevos, {$actualizados} existentes, {$saltados} saltados, {$errores} errores");
    }
    
    /**
     * Actualizar stock de productos ya sincronizados
     */
    private function actualizarStockProductos()
    {
        $this->info('  Actualizando stock de productos...');
        
        // Obtener todos los mapeos de productos
        $mapeos = DB::table('producto_mapeo_7power')->get();
        
        $actualizados = 0;
        $errores = 0;
        $sinStock = 0;
        
        foreach ($mapeos as $mapeo) {
            try {
                // Obtener stock real de 7Power (suma de todos los almacenes)
                $stockTotal = DB::connection('mysql_7power')
                    ->table('product_warehouse')
                    ->where('product_id', $mapeo->producto_7power_id)
                    ->sum('stock');
                
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
