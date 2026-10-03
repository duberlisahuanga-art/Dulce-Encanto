<?php

namespace Tests\Feature;

use App\Models\CakeOption;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CakeQuoteControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_selection_returns_server_calculated_total(): void
    {
        $options = $this->createRequiredOptions();
        $topper = CakeOption::factory()->create([
            'type' => 'extra', 'slug' => 'topper-test', 'price_adjustment' => 5,
        ]);
        $candles = CakeOption::factory()->create([
            'type' => 'extra', 'slug' => 'candles-test', 'price_adjustment' => 3,
        ]);

        $this->postJson('/api/v1/cake-designer/quote', [
            'size_id' => $options['size']->id,
            'flavor_id' => $options['flavor']->id,
            'filling_id' => $options['filling']->id,
            'covering_id' => $options['covering']->id,
            'decoration_id' => $options['decoration']->id,
            'extra_ids' => [$topper->id, $candles->id],
            'color' => 'Rosado',
            'secondary_color' => 'Crema',
            'detail_color' => 'Dorado',
            'shape' => 'Corazón',
            'product_type' => 'cake',
            'theme' => 'Flores',
            'dedication' => 'Feliz cumpleaños Andrea',
            'delivery_date' => now()->toDateString(),
            'total' => '1.00',
        ])->assertOk()
            ->assertJsonPath('data.total', '89.00')
            ->assertJsonPath('data.currency', 'PEN')
            ->assertJsonPath('data.color', 'Rosado')
            ->assertJsonPath('data.secondary_color', 'Crema')
            ->assertJsonPath('data.shape', 'Corazón')
            ->assertJsonCount(7, 'data.selections');
    }

    public function test_option_from_wrong_type_returns_422(): void
    {
        $options = $this->createRequiredOptions();

        $this->postJson('/api/v1/cake-designer/quote', [
            'size_id' => $options['size']->id,
            'flavor_id' => $options['filling']->id,
            'filling_id' => $options['filling']->id,
            'covering_id' => $options['covering']->id,
            'decoration_id' => $options['decoration']->id,
            'delivery_date' => now()->toDateString(),
        ])->assertUnprocessable()->assertJsonValidationErrors('flavor_id');
    }

    public function test_inactive_extra_returns_422(): void
    {
        $options = $this->createRequiredOptions();
        $inactiveExtra = CakeOption::factory()->create([
            'type' => 'extra', 'slug' => 'inactive-extra-test', 'is_active' => false,
        ]);

        $this->postJson('/api/v1/cake-designer/quote', [
            'size_id' => $options['size']->id,
            'flavor_id' => $options['flavor']->id,
            'filling_id' => $options['filling']->id,
            'covering_id' => $options['covering']->id,
            'decoration_id' => $options['decoration']->id,
            'extra_ids' => [$inactiveExtra->id],
            'delivery_date' => now()->toDateString(),
        ])->assertUnprocessable()->assertJsonValidationErrors('extra_ids');
    }

    /**
     * @return array<string, CakeOption>
     */
    private function createRequiredOptions(): array
    {
        return [
            'size' => CakeOption::factory()->create(['type' => 'size', 'slug' => 'size-test', 'price_adjustment' => 50, 'servings' => 15]),
            'flavor' => CakeOption::factory()->create(['type' => 'flavor', 'slug' => 'flavor-test', 'price_adjustment' => 5]),
            'filling' => CakeOption::factory()->create(['type' => 'filling', 'slug' => 'filling-test', 'price_adjustment' => 4]),
            'covering' => CakeOption::factory()->create(['type' => 'covering', 'slug' => 'covering-test', 'price_adjustment' => 7]),
            'decoration' => CakeOption::factory()->create(['type' => 'decoration', 'slug' => 'decoration-test', 'price_adjustment' => 15]),
        ];
    }
}
