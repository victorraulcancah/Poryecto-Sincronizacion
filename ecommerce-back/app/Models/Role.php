<?php

    namespace App\Models;

    use Illuminate\Database\Eloquent\Model;
    use Illuminate\Database\Eloquent\Factories\HasFactory;

    class Role extends Model
    {
        use HasFactory;

        protected $table = 'roles'; // Especifica la tabla (opcional si sigue convención)

        protected $fillable = [
            'nombre',
        ];

        public function users()
        {
            return $this->hasMany(User::class);
        }
    }
