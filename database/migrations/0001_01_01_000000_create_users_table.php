<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('default_locale', 5)->default('de');
            $table->string('timezone')->default('Europe/Berlin');
            $table->string('plan')->default('basic');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained();
            $table->string('role', 20);
            $table->string('name');
            $table->string('login')->unique();
            $table->string('password');
            $table->string('phone')->nullable();
            // null until first sign-in, then taken from the browser language
            $table->string('locale', 5)->nullable();
            $table->string('ics_token', 64)->nullable()->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_login_at')->nullable();
            // null = the user still has the start password from the owner
            $table->timestamp('password_changed_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'role']);
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('users');
        Schema::dropIfExists('companies');
    }
};
