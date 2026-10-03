<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->default('Entrega Dulce');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('max_daily_attempts')->default(5);
            $table->unsignedSmallInteger('max_daily_prizes')->default(3);
            $table->unsignedSmallInteger('max_weekly_prizes')->default(10);
            $table->decimal('points_multiplier', 5, 2)->default(1);
            $table->unsignedTinyInteger('initial_cake_health')->default(100);
            $table->json('messages')->nullable();
            $table->timestamps();
        });

        Schema::create('game_levels', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('difficulty', 20)->default('facil');
            $table->unsignedSmallInteger('time_limit')->default(70);
            $table->unsignedTinyInteger('initial_cake_health')->default(100);
            $table->unsignedTinyInteger('obstacle_count')->default(5);
            $table->unsignedSmallInteger('completion_points')->default(300);
            $table->unsignedSmallInteger('dulce_points_reward')->default(90);
            $table->unsignedSmallInteger('one_star_score')->default(350);
            $table->unsignedSmallInteger('two_star_score')->default(500);
            $table->unsignedSmallInteger('three_star_score')->default(650);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('game_obstacles', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('type', 40)->unique();
            $table->unsignedTinyInteger('damage');
            $table->unsignedSmallInteger('score_penalty')->default(20);
            $table->decimal('speed', 5, 2)->default(0);
            $table->string('sprite', 20)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('game_rewards', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('points_required');
            $table->string('reward_type', 25);
            $table->decimal('reward_value', 10, 2)->default(0);
            $table->decimal('minimum_purchase', 10, 2)->default(0);
            $table->unsignedSmallInteger('expiration_days')->default(30);
            $table->unsignedInteger('max_redemptions')->nullable();
            $table->unsignedSmallInteger('max_per_user')->default(1);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('game_attempts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('game_level_id')->constrained()->restrictOnDelete();
            $table->timestamp('started_at');
            $table->timestamp('finished_at')->nullable();
            $table->timestamp('paused_at')->nullable();
            $table->unsignedInteger('paused_milliseconds')->default(0);
            $table->string('status', 20)->default('started');
            $table->unsignedSmallInteger('duration_seconds')->nullable();
            $table->unsignedTinyInteger('cake_health')->nullable();
            $table->unsignedSmallInteger('coins')->default(0);
            $table->unsignedInteger('final_score')->default(0);
            $table->unsignedSmallInteger('dulce_points_earned')->default(0);
            $table->unsignedTinyInteger('stars')->default(0);
            $table->json('scenario');
            $table->timestamps();
            $table->index(['user_id', 'started_at']);
            $table->index(['status', 'started_at']);
        });

        Schema::create('game_point_transactions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('game_attempt_id')->nullable()->constrained('game_attempts')->nullOnDelete();
            $table->string('type', 20);
            $table->integer('points');
            $table->unsignedInteger('balance_after');
            $table->string('description');
            $table->timestamps();
            $table->index(['user_id', 'id']);
            $table->unique(['game_attempt_id', 'type']);
        });

        Schema::create('game_reward_redemptions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('game_reward_id')->constrained()->restrictOnDelete();
            $table->foreignId('promotion_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('points_spent');
            $table->string('status', 20)->default('issued');
            $table->timestamp('redeemed_at');
            $table->timestamps();
            $table->index(['user_id', 'redeemed_at']);
        });

        Schema::table('promotions', function (Blueprint $table): void {
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedSmallInteger('max_uses')->nullable();
            $table->unsignedSmallInteger('uses_count')->default(0);
            $table->boolean('is_game_reward')->default(false);
        });

        $now = now();
        DB::table('game_settings')->insert([
            'name' => 'Entrega Dulce',
            'description' => 'Lleva una torta hasta el cliente y gana Dulce Puntos.',
            'is_active' => true,
            'max_daily_attempts' => 5,
            'max_daily_prizes' => 3,
            'max_weekly_prizes' => 10,
            'points_multiplier' => 1,
            'initial_cake_health' => 100,
            'messages' => json_encode(['start' => '¡Cuida la torta durante el reparto!', 'success' => '¡Entrega completada!', 'failure' => 'Inténtalo otra vez.']),
            'created_at' => $now, 'updated_at' => $now,
        ]);
        foreach ([
            ['Barrio Dulce', 'barrio-dulce', 'facil', 75, 5, 90, 0],
            ['Hora Punta', 'hora-punta', 'media', 65, 8, 110, 1],
            ['Día Lluvioso', 'dia-lluvioso', 'media', 60, 9, 120, 2],
            ['Pedido Urgente', 'pedido-urgente', 'dificil', 55, 10, 140, 3],
            ['Entrega Premium', 'entrega-premium', 'dificil', 50, 12, 160, 4],
        ] as [$name, $slug, $difficulty, $time, $count, $points, $sort]) {
            DB::table('game_levels')->insert([
                'name' => $name, 'slug' => $slug, 'description' => 'Lleva la torta a salvo hasta el cliente.',
                'difficulty' => $difficulty, 'time_limit' => $time, 'initial_cake_health' => 100,
                'obstacle_count' => $count, 'completion_points' => 300, 'dulce_points_reward' => $points,
                'one_star_score' => 350, 'two_star_score' => 500, 'three_star_score' => 650,
                'sort_order' => $sort, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        foreach (['juego.ver', 'juego.gestionar'] as $name) {
            $permission = Permission::findOrCreate($name, 'web');
            Role::query()->whereIn('name', ['superadministrador', 'administrador'])->get()
                ->each(fn (Role $role) => $role->givePermissionTo($permission));
        }
        foreach ([
            ['Hueco', 'pothole', 10, '🕳️'], ['Charco', 'puddle', 5, '💧'],
            ['Conos', 'cone', 5, '🚧'], ['Vehículo', 'vehicle', 20, '🚙'],
            ['Rompemuelles', 'bump', 8, '〰️'],
        ] as [$name, $type, $damage, $sprite]) {
            DB::table('game_obstacles')->insert([
                'name' => $name, 'type' => $type, 'damage' => $damage,
                'score_penalty' => 20, 'speed' => 0, 'sprite' => $sprite,
                'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }
        foreach ([
            ['S/ 3 de descuento', 500, 'fixed_discount', 3],
            ['5 % de descuento', 800, 'percentage_discount', 5],
            ['Delivery gratis', 1200, 'free_delivery', 0],
        ] as [$name, $points, $type, $value]) {
            DB::table('game_rewards')->insert([
                'name' => $name, 'points_required' => $points, 'reward_type' => $type,
                'reward_value' => $value, 'minimum_purchase' => 20, 'expiration_days' => 30,
                'max_per_user' => 2, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('promotions', fn (Blueprint $table) => $table->dropConstrainedForeignId('owner_user_id'));
        Schema::table('promotions', fn (Blueprint $table) => $table->dropColumn(['max_uses', 'uses_count', 'is_game_reward']));
        Schema::dropIfExists('game_reward_redemptions');
        Schema::dropIfExists('game_point_transactions');
        Schema::dropIfExists('game_attempts');
        Schema::dropIfExists('game_rewards');
        Schema::dropIfExists('game_obstacles');
        Schema::dropIfExists('game_levels');
        Schema::dropIfExists('game_settings');
    }
};
