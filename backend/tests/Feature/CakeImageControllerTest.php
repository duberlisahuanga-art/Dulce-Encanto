<?php

namespace Tests\Feature;

use App\Models\CakeOption;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CakeImageControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ThrottleRequests::class);
    }

    public function test_authenticated_client_generates_and_stores_a_reference_image(): void
    {
        Storage::fake('public');
        Http::preventStrayRequests();
        Http::fake([
            'api.openai.com/v1/images/generations' => Http::response([
                'data' => [['b64_json' => base64_encode('fake-png-content')]],
            ]),
        ]);
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $options = $this->createRequiredOptions();

        $response = $this->postJson('/api/v1/cake-designer/image', $this->validPayload($options));

        $response->assertOk()->assertJsonPath('data.model', 'gpt-image-2');
        $imagePath = $response->json('data.image_path');
        Storage::disk('public')->assertExists($imagePath);
        $this->assertSame('fake-png-content', Storage::disk('public')->get($imagePath));
        Http::assertSent(fn (Request $request): bool => $request->url() === 'https://api.openai.com/v1/images/generations'
            && $request['model'] === 'gpt-image-2'
            && $request['quality'] === 'low'
            && str_contains($request['prompt'], 'Chocolate'));
    }

    public function test_unauthenticated_client_receives_401(): void
    {
        $this->postJson('/api/v1/cake-designer/image', [])->assertUnauthorized();
    }

    public function test_openai_failure_returns_502_without_storing_a_file(): void
    {
        Storage::fake('public');
        Http::preventStrayRequests();
        Http::fake(['api.openai.com/*' => Http::response(['error' => ['message' => 'failed']], 500)]);
        Sanctum::actingAs(User::factory()->create());
        $options = $this->createRequiredOptions();

        $this->postJson('/api/v1/cake-designer/image', $this->validPayload($options))
            ->assertStatus(502)
            ->assertJsonPath('message', 'No se pudo generar la imagen en este momento. Inténtalo nuevamente.');

        Storage::disk('public')->assertDirectoryEmpty('cake-designs');
    }

    /** @return array<string, CakeOption> */
    private function createRequiredOptions(): array
    {
        return [
            'size' => CakeOption::factory()->create(['type' => 'size', 'slug' => 'image-size', 'servings' => 15]),
            'flavor' => CakeOption::factory()->create(['type' => 'flavor', 'slug' => 'image-flavor', 'name' => 'Chocolate']),
            'filling' => CakeOption::factory()->create(['type' => 'filling', 'slug' => 'image-filling']),
            'covering' => CakeOption::factory()->create(['type' => 'covering', 'slug' => 'image-covering']),
            'decoration' => CakeOption::factory()->create(['type' => 'decoration', 'slug' => 'image-decoration']),
        ];
    }

    /**
     * @param  array<string, CakeOption>  $options
     * @return array<string, mixed>
     */
    private function validPayload(array $options): array
    {
        return [
            'size_id' => $options['size']->id,
            'flavor_id' => $options['flavor']->id,
            'filling_id' => $options['filling']->id,
            'covering_id' => $options['covering']->id,
            'decoration_id' => $options['decoration']->id,
            'extra_ids' => [],
            'color' => 'Rosado',
            'theme' => 'Floral',
            'dedication' => 'Feliz cumpleaños',
            'delivery_date' => now()->toDateString(),
        ];
    }
}
