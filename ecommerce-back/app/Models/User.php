<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles; // Add this import

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    /**
     * The guard name for Spatie permissions
     */
    protected $guard_name = 'api';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'is_enabled',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    // public function isSuperadmin()
    // {
    //    return $this->hasRole('superadmin');
    // }

    public function profile()
    {
        return $this->hasOne(UserProfile::class);
    }

    public function addresses()
    {
        return $this->hasMany(UserAddress::class);
    }

    public function horarios()
    {
        return $this->hasMany(UserHorario::class);
    }

    /**
     * Verificar si el usuario está disponible ahora
     */
    public function isDisponibleAhora()
    {
        return UserHorario::estaDisponible($this->id);
    }

    /**
     * Obtener usuarios disponibles por rol
     */
    public static function usuariosDisponiblesPorRol($roleName = 'vendedor')
    {
        return self::whereHas('roles', function ($query) use ($roleName) {
            $query->where('name', $roleName);
        })
            ->where('is_enabled', true)
            ->get()
            ->filter(function ($user) {
                return $user->isDisponibleAhora();
            });
    }

    public function getRoleAttribute()
    {
        $role = $this->roles->first();
        if ($role) {
            return (object) ['nombre' => $role->name];
        }

        return null;
    }

    // Añadido: Relación con roles a través de Spatie Laravel-Permission
    public function getRoleIdAttribute()
    {
        $role = $this->roles->first();

        return $role ? $role->id : null;
    }

    public function getRoleNombreAttribute()
    {
        $role = $this->roles->first();

        return $role ? $role->name : '';
    }
}
