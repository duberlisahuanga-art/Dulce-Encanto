<?php
namespace Database\Seeders;
use App\Models\DeliverySetting;
use App\Models\DeliveryZone;
use Illuminate\Database\Seeder;
class DeliveryConfigurationSeeder extends Seeder
{
    public function run(): void
    {
        DeliverySetting::firstOrCreate([], ['minimum_lead_days'=>1,'daily_capacity'=>20,'opening_time'=>'09:00','closing_time'=>'18:00']);
        foreach ([['name'=>'Centro','fee'=>5],['name'=>'Zona urbana','fee'=>8],['name'=>'Zona periférica','fee'=>12]] as $zone) DeliveryZone::firstOrCreate(['name'=>$zone['name']], $zone+['is_active'=>true]);
    }
}
