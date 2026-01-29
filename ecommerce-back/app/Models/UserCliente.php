<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class UserCliente extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'user_clientes';

    protected $fillable = [
        'nombres',
        'apellidos', 
        'email',
        'telefono',
        'fecha_nacimiento',
        'genero',
        'tipo_documento_id',
        'numero_documento',
        'password',
        'foto',
        'estado',
        'cliente_facturacion_id',
        'email_verified_at',        // NUEVO
        'verification_token',       // NUEVO
        'verification_code', 
        'is_first_google_login', 
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'fecha_nacimiento' => 'date',
        'estado' => 'boolean',
        'email_verified_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relaciones
    public function tipoDocumento()
    {
        return $this->belongsTo(DocumentType::class, 'tipo_documento_id');
    }

    public function direcciones()
    {
        return $this->hasMany(UserClienteDireccion::class, 'user_cliente_id');
    }

    public function direccionPredeterminada()
    {
        return $this->hasOne(UserClienteDireccion::class, 'user_cliente_id')
                    ->where('predeterminada', true);
    }

    public function clienteFacturacion()
    {
        return $this->belongsTo(Cliente::class, 'cliente_facturacion_id');
    }

    public function ventas()
    {
        return $this->hasMany(Venta::class, 'user_cliente_id');
    }

    public function pedidos()
    {
        return $this->hasMany(Pedido::class, 'user_cliente_id');
    }

    // Relaciones del módulo de recompensas
    public function recompensasHistorial()
    {
        return $this->hasMany(RecompensaHistorial::class, 'cliente_id');
    }

    public function recompensasClientes()
    {
        return $this->hasMany(RecompensaCliente::class, 'cliente_id');
    }

    // Scopes
    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }

    // Accessors
    public function getNombreCompletoAttribute()
    {
        return $this->nombres . ' ' . $this->apellidos;
    }


    public function getFotoUrlAttribute()
    {
        if ($this->foto) {
            return asset('storage/clientes/' . $this->foto);
        }
        return null;
    }

    // Métodos de utilidad
    public function crearClienteFacturacion($datosFacturacion)
    {
        // Crear cliente para facturación si no existe
        if (!$this->cliente_facturacion_id) {
            $cliente = Cliente::create([
                'tipo_documento' => $datosFacturacion['tipo_documento'],
                'numero_documento' => $datosFacturacion['numero_documento'],
                'razon_social' => $datosFacturacion['razon_social'],
                'direccion' => $datosFacturacion['direccion'],
                'email' => $this->email,
                'telefono' => $this->telefono,
                'activo' => true
            ]);

            $this->update(['cliente_facturacion_id' => $cliente->id]);
            return $cliente;
        }

        return $this->clienteFacturacion;
    }

    public function puedeFacturar()
    {
        return $this->cliente_facturacion_id !== null;
    }

    // Métodos del módulo de recompensas
    public function getTotalPuntosGanados()
    {
        return $this->recompensasHistorial()->sum('puntos_otorgados') ?? 0;
    }

    public function getRecompensasDelMes()
    {
        return $this->recompensasHistorial()
            ->whereMonth('fecha_aplicacion', now()->month)
            ->whereYear('fecha_aplicacion', now()->year)
            ->count();
    }

    public function esClienteNuevo()
    {
        return $this->created_at >= now()->subDays(30);
    }

    public function esClienteRecurrente()
    {
        return $this->pedidos()->count() > 1;
    }

    public function esClienteVip()
    {
        $totalCompras = $this->pedidos()->sum('total');
        return $totalCompras >= 1000; // Configurable
    }

    public function getSegmentoCliente(): string
    {
        if ($this->esClienteVip()) {
            return 'vip';
        }
        
        if ($this->esClienteRecurrente()) {
            return 'recurrentes';
        }
        
        if ($this->esClienteNuevo()) {
            return 'nuevos';
        }
        
        return 'todos';
    }
    
}