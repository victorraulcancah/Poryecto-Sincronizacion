<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_clientes', function (Blueprint $table) {
            $table->id();
            $table->string('nombres');
            $table->string('apellidos');
            $table->string('email')->unique();
            $table->string('telefono')->nullable();
            $table->date('fecha_nacimiento')->nullable();
            $table->string('genero')->nullable();
            $table->unsignedBigInteger('tipo_documento_id')->nullable();
            $table->string('numero_documento')->nullable()->unique();
            $table->string('password');
            $table->string('foto')->nullable();
            $table->boolean('estado')->default(true);
            $table->unsignedBigInteger('cliente_facturacion_id')->nullable();
            $table->unsignedBigInteger('tipo_precio_id')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('verification_token')->nullable();
            $table->string('verification_code')->nullable();
            $table->boolean('is_first_google_login')->default(false);
            $table->rememberToken();
            $table->timestamps();
            
            $table->foreign('tipo_documento_id')->references('id')->on('document_types')->onDelete('set null');
            $table->foreign('cliente_facturacion_id')->references('id')->on('clientes')->onDelete('set null');
            $table->foreign('tipo_precio_id')->references('id')->on('tipo_precios')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_clientes');
    }
};