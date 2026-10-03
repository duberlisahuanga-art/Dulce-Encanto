<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ShoppingAssistantControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_recommendations_only_include_real_available_products_within_budget(): void
    {
        config()->set('services.gemini.api_key', 'test-key');
        $valid = Product::factory()->create(['name' => 'Torta de chocolate', 'price' => 80]);
        $expensive = Product::factory()->create(['price' => 150]);
        $unavailable = Product::factory()->create(['is_available' => false]);
        Http::preventStrayRequests();
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [['content' => ['parts' => [['text' => json_encode([
                    'message' => 'Encontré estas opciones.',
                    'recommendations' => [
                        ['product_id' => $valid->id, 'reason' => 'Ideal para compartir.'],
                        ['product_id' => $expensive->id, 'reason' => 'Supera el presupuesto.'],
                        ['product_id' => $unavailable->id, 'reason' => 'No disponible.'],
                        ['product_id' => 999999, 'reason' => 'Inventado.'],
                        ['product_id' => $valid->id, 'reason' => 'Duplicado.'],
                    ],
                ])]]]]],
            ]),
        ]);

        $this->postJson('/api/v1/catalog/recommendations', [
            'request' => 'Una torta para un cumpleaños', 'budget' => 100,
        ])->assertOk()
            ->assertJsonPath('recommendations.0.product.id', $valid->id)
            ->assertJsonPath('recommendations.0.reason', 'Ideal para compartir.')
            ->assertJsonCount(1, 'recommendations');

        Http::assertSent(fn (Request $request): bool =>
            $request->url() === 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent'
            && $request->hasHeader('x-goog-api-key', 'test-key')
            && str_contains($request['contents'][0]['parts'][0]['text'], 'Torta de chocolate')
            && ! str_contains($request['contents'][0]['parts'][0]['text'], $unavailable->name)
        );
    }

    public function test_missing_key_does_not_call_provider(): void
    {
        config()->set('services.gemini.api_key', null);
        Http::preventStrayRequests();
        $this->postJson('/api/v1/catalog/recommendations', [
            'request' => 'Quiero una torta de chocolate',
        ])->assertStatus(503);
        Http::assertNothingSent();
    }

    public function test_invalid_request_is_rejected_before_provider_call(): void
    {
        config()->set('services.gemini.api_key', 'test-key');
        Http::preventStrayRequests();
        $this->postJson('/api/v1/catalog/recommendations', [
            'request' => 'Torta', 'budget' => -10,
        ])->assertUnprocessable()->assertJsonValidationErrors(['request', 'budget']);
        Http::assertNothingSent();
    }

    public function test_provider_failure_is_reported_without_exposing_provider_response(): void
    {
        config()->set('services.gemini.api_key', 'test-key');
        Product::factory()->create();
        Http::preventStrayRequests();
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response(['error' => ['message' => 'private']], 429)]);

        $this->postJson('/api/v1/catalog/recommendations', [
            'request' => 'Un regalo de cumpleaños',
        ])->assertStatus(502)->assertDontSee('private');
    }
}
