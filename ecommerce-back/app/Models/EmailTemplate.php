<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'subject',
        'greeting',
        'main_content',
        'secondary_content',
        'footer_text',
        'benefits_list',
        'product_images',
        'button_text',
        'button_url',
        'global_colors',
        'is_active',
        'use_default'
    ];

    protected $casts = [
        'benefits_list' => 'array',
        'product_images' => 'array',
        'global_colors' => 'array',
        'is_active' => 'boolean',
        'use_default' => 'boolean'
    ];

    public function getColorsAttribute()
    {
        return $this->global_colors ?? [
            'primary' => '#667eea',
            'secondary' => '#764ba2',
            'button_hover' => '#5a67d8',
            'background' => '#f4f4f4',
            'content_bg' => '#ffffff'
        ];
    }

    public function replaceVariables($text, $variables = [])
    {
        foreach ($variables as $key => $value) {
            $text = str_replace('{{' . $key . '}}', $value, $text);
        }
        return $text;
    }
}
