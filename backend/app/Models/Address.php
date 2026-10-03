<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Address extends Model { protected $fillable=['user_id','label','address','reference','latitude','longitude','is_default']; public function user(): BelongsTo{return $this->belongsTo(User::class);} protected function casts():array{return ['latitude'=>'float','longitude'=>'float','is_default'=>'boolean'];} }
