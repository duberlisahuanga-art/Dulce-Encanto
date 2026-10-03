<?php
namespace Tests\Feature;
use App\Models\DeliveryZone;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
class DeliveryConfigurationControllerTest extends TestCase
{
 use RefreshDatabase; protected bool $seed=true;
 public function test_public_sees_active_zones_and_admin_updates_settings():void
 {
  $this->getJson('/api/v1/delivery-configuration')->assertOk()->assertJsonCount(3,'data.zones')->assertJsonPath('data.store.maximum_distance_km',15);
  $admin=User::role('administrador')->firstOrFail();
  $this->actingAs($admin)->putJson('/api/v1/admin/delivery-configuration/settings',['minimum_lead_days'=>2,'daily_capacity'=>10,'opening_time'=>'08:00','closing_time'=>'17:00'])->assertOk()->assertJsonPath('data.settings.daily_capacity',10);
 }
 public function test_admin_manages_zones_and_blocked_dates():void
 {
  $admin=User::role('administrador')->firstOrFail();
  $this->actingAs($admin)->postJson('/api/v1/admin/delivery-configuration/zones',['name'=>'Zona nueva','fee'=>9,'is_active'=>true])->assertCreated()->assertJsonPath('data.fee','9.00');
  $this->actingAs($admin)->postJson('/api/v1/admin/delivery-configuration/blocked-dates',['date'=>today()->addDays(3)->toDateString(),'reason'=>'Feriado'])->assertCreated();
 }
}
