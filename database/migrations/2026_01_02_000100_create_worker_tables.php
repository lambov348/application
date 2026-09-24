<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checklist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained();
            $table->string('text', 500);
            $table->unsignedInteger('position')->default(0);
            $table->foreignId('done_by')->nullable()->constrained('users');
            $table->timestamp('done_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['order_id', 'position']);
        });

        Schema::create('order_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained();
            $table->foreignId('user_id')->constrained();
            $table->text('text');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['order_id', 'created_at']);
        });

        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained();
            $table->foreignId('user_id')->constrained();
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->boolean('auto_closed')->default(false);
            $table->boolean('needs_review')->default(false);
            $table->timestamps();

            $table->index(['company_id', 'started_at']);
            $table->index(['user_id', 'started_at']);
        });

        Schema::create('work_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_id')->constrained();
            $table->foreignId('order_id')->constrained();
            $table->foreignId('user_id')->constrained();
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'user_id']);
        });

        Schema::table('order_files', function (Blueprint $table) {
            $table->string('original_name')->nullable()->after('mime');
        });

        // At most one open shift and one open work log per person.
        DB::statement('CREATE UNIQUE INDEX shifts_one_open_per_user ON shifts (user_id) WHERE ended_at IS NULL');
        DB::statement('CREATE UNIQUE INDEX work_logs_one_open_per_user ON work_logs (user_id) WHERE ended_at IS NULL');
    }

    public function down(): void
    {
        Schema::table('order_files', fn (Blueprint $table) => $table->dropColumn('original_name'));
        Schema::dropIfExists('work_logs');
        Schema::dropIfExists('shifts');
        Schema::dropIfExists('order_comments');
        Schema::dropIfExists('checklist_items');
    }
};
