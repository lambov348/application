<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained();
            $table->string('number', 20);
            $table->foreignId('client_id')->constrained();
            $table->foreignId('address_id')->nullable()->constrained();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status', 20)->default('new');
            // appointment ("Termin"): calendar date and wall-clock times in the company timezone
            $table->date('date')->nullable();
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->integer('price_cents')->default(0);
            $table->integer('material_cents')->default(0);
            $table->string('source')->nullable();
            $table->string('offer_no')->nullable();
            $table->text('reject_reason')->nullable();
            $table->string('payment_status', 20)->default('unpaid');
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'number']);
            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'date']);
        });

        Schema::create('order_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained();
            $table->foreignId('user_id')->constrained();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('declined_at')->nullable();
            $table->timestamps();

            $table->unique(['order_id', 'user_id']);
        });

        Schema::create('order_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->string('kind', 20);
            $table->string('path');
            $table->string('thumb_path')->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('mime')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['order_id', 'kind']);
        });

        Schema::create('order_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained();
            $table->foreignId('user_id')->nullable()->constrained();
            $table->string('type', 40);
            $table->jsonb('data')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['order_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_events');
        Schema::dropIfExists('order_files');
        Schema::dropIfExists('order_assignments');
        Schema::dropIfExists('orders');
    }
};
