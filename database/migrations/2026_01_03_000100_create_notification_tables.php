<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('platform', 10)->default('web'); // web / ios / android
            // Web Push endpoint URL (for native apps later: the device token)
            $table->text('token');
            $table->string('p256dh')->nullable();
            $table->string('auth')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();

            $table->unique('token');
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->string('channel', 20)->default('push'); // push / whatsapp
            $table->string('type', 50);
            $table->jsonb('data')->nullable();
            $table->string('locale', 5);
            $table->string('status', 20)->default('pending'); // pending / sent / failed / skipped
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestamp('sent_at')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });

        Schema::table('shifts', function (Blueprint $table) {
            $table->timestamp('reminded_at')->nullable()->after('needs_review');
        });
    }

    public function down(): void
    {
        Schema::table('shifts', fn (Blueprint $table) => $table->dropColumn('reminded_at'));
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('push_subscriptions');
    }
};
