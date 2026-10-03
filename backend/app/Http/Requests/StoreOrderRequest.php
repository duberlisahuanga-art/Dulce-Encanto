<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'delivery_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'delivery_method' => ['required', 'string', 'in:pickup,delivery'],
            'delivery_zone_id' => ['nullable', 'required_if:delivery_method,delivery', 'integer', 'exists:delivery_zones,id'],
            'phone' => ['required', 'string', 'regex:/^\d{9}$/'],
            'address' => ['nullable', 'required_if:delivery_method,delivery', 'string', 'max:255'],
            'latitude' => ['exclude_unless:delivery_method,delivery', 'required_if:delivery_method,delivery', 'numeric', 'between:-90,90'],
            'longitude' => ['exclude_unless:delivery_method,delivery', 'required_if:delivery_method,delivery', 'numeric', 'between:-180,180'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'payment_method' => ['required', 'string', 'in:cash,yape,plin,transfer'],
        ];
    }

    /**
     * Return clear validation messages to the checkout form.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'delivery_date.required' => 'Selecciona una fecha de entrega.',
            'delivery_date.date_format' => 'La fecha de entrega no es válida.',
            'delivery_date.after_or_equal' => 'La fecha de entrega no puede estar en el pasado.',
            'delivery_method.required' => 'Selecciona un método de entrega.',
            'delivery_method.in' => 'El método de entrega seleccionado no es válido.',
            'delivery_zone_id.required_if' => 'Selecciona una zona de reparto.',
            'delivery_zone_id.exists' => 'La zona de reparto seleccionada no está disponible.',
            'phone.required' => 'Ingresa tu número de teléfono.',
            'phone.regex' => 'El teléfono debe tener exactamente 9 números.',
            'address.required_if' => 'Ingresa la dirección de entrega.',
            'address.max' => 'La dirección no puede superar los 255 caracteres.',
            'latitude.required_if' => 'Selecciona la ubicación de entrega en el mapa.',
            'longitude.required_if' => 'Selecciona la ubicación de entrega en el mapa.',
            'notes.max' => 'Las notas no pueden superar los 1000 caracteres.',
            'payment_method.required' => 'Selecciona una forma de pago.',
            'payment_method.in' => 'La forma de pago seleccionada no es válida.',
        ];
    }
}
