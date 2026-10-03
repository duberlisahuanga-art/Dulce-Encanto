<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliverySetting extends Model
{
    protected $fillable = ['max_units_per_product', 'max_units_per_order', 'minimum_lead_days', 'daily_capacity', 'opening_time', 'closing_time'];
}
