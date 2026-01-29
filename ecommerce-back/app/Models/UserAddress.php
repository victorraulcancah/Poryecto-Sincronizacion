<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserAddress extends Model
{

    use HasFactory;

    // UserAddress.php
    protected $fillable = [
        'user_id',
        'label',
        'district', // si decides tenerlo
        'address_line',
        'city',
        'province',
        'department',
        'postal_code',
        'country',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];
    
    // app/Models/UserAddress.php
    public function user() {
        return $this->belongsTo(User::class);
    }
}
