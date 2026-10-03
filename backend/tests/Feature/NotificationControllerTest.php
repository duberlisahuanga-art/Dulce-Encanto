<?php
namespace Tests\Feature;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
class NotificationControllerTest extends TestCase{
 use RefreshDatabase;protected bool $seed=true;
 public function test_user_lists_and_reads_own_notifications():void{
  $user=User::factory()->create();$user->assignRole('cliente');$note=$user->appNotifications()->create(['type'=>'order_status','title'=>'Pedido listo','message'=>'Tu pedido está listo.','link'=>'/mis-pedidos']);
  $this->actingAs($user)->getJson('/api/v1/notifications')->assertOk()->assertJsonPath('unread_count',1)->assertJsonPath('data.0.id',$note->id);
  $this->actingAs($user)->patchJson("/api/v1/notifications/{$note->id}/read")->assertOk()->assertJsonPath('data.read_at',fn($value)=>$value!==null);
 }
 public function test_user_cannot_read_another_users_notification():void{
  $owner=User::factory()->create();$other=User::factory()->create();$note=$owner->appNotifications()->create(['type'=>'x','title'=>'Privada','message'=>'Privada']);
  $this->actingAs($other)->patchJson("/api/v1/notifications/{$note->id}/read")->assertNotFound();
 }
}
