<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pay_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->string('model', 10); // hourly / per_job / mixed / fixed
            $table->integer('hourly_cents')->default(0);
            $table->integer('per_job_cents')->default(0);
            $table->integer('monthly_cents')->default(0);
            $table->date('valid_from');
            $table->date('valid_to')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['user_id', 'valid_from']);
        });

        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained();
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month');
            $table->string('status', 10)->default('open'); // open / closed
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->unique(['company_id', 'year', 'month']);
        });

        Schema::create('payroll_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->constrained('payroll_periods');
            $table->foreignId('user_id')->constrained();
            $table->string('type', 12); // bonus / deduction / advance
            $table->integer('amount_cents'); // always positive; the type decides + or −
            $table->string('reason', 500);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['period_id', 'user_id']);
        });

        Schema::create('payroll_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->constrained('payroll_periods');
            $table->foreignId('user_id')->constrained();
            $table->decimal('hours', 8, 2);
            $table->unsignedInteger('trips');
            $table->integer('gross_cents');
            $table->integer('payable_cents');
            $table->jsonb('details');
            $table->timestamps();

            $table->unique(['period_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_results');
        Schema::dropIfExists('payroll_adjustments');
        Schema::dropIfExists('payroll_periods');
        Schema::dropIfExists('pay_rates');
    }
};
