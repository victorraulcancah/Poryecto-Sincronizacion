<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentType extends Model
{
    use HasFactory;
    protected $fillable = ['nombre'];

    public function userProfiles()
    {
        return $this->hasMany(UserProfile::class, 'document_type');
    }
}
