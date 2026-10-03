<?php

namespace App\Models;

use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    public const STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];

    /** @use HasFactory<OrderFactory> */
    use HasFactory;

    protected $fillable = ['user_id', 'delivery_user_id', 'delivery_zone_id', 'number', 'status', 'total', 'delivery_fee', 'delivery_date', 'delivery_method', 'phone', 'address', 'notes', 'latitude', 'longitude', 'cancellation_request', 'placed_at', 'dispatched_at', 'delivered_at', 'delivery_issue', 'delivery_issue_note', 'delivery_issue_at'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function courier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delivery_user_id');
    }

    public function deliveryZone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    public function statusChanges(): HasMany
    {
        return $this->hasMany(OrderChange::class)
            ->where('field', 'status')
            ->orderBy('created_at');
    }

    protected function casts(): array
    {
        return ['latitude' => 'float', 'longitude' => 'float', 'total' => 'decimal:2', 'delivery_fee' => 'decimal:2', 'delivery_date' => 'date', 'placed_at' => 'datetime', 'dispatched_at' => 'datetime', 'delivered_at' => 'datetime', 'delivery_issue_at' => 'datetime'];
    }
}
