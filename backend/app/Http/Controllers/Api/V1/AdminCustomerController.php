<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AdminCustomerController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $customers = User::query()
            ->role('cliente')
            ->withCount('orders')
            ->withSum(['orders as total_spent' => fn ($query) => $query->where('status', 'delivered')], 'total')
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = $request->string('search')->toString();
                $query->where(function ($query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->get();

        return CustomerResource::collection($customers);
    }

    public function show(User $customer): CustomerResource
    {
        abort_unless($customer->hasRole('cliente'), 404);

        return new CustomerResource(
            $customer->load(['orders' => fn ($query) => $query->with(['items', 'payment'])->latest('placed_at')])
                ->loadCount('orders')
                ->loadSum(['orders as total_spent' => fn ($query) => $query->where('status', 'delivered')], 'total')
        );
    }
}
