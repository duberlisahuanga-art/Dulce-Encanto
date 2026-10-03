<?php

namespace App\Http\Requests;

use App\Models\CakeOption;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCakeOptionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('tortas.gestionar') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072', 'dimensions:max_width=6000,max_height=6000'],
            'remove_image' => ['sometimes', 'boolean'],
            'type' => ['required', 'string', Rule::in(CakeOption::TYPES)],
            'name' => ['required', 'string', 'max:140'],
            'slug' => [
                'required',
                'string',
                'max:160',
                'alpha_dash',
                Rule::unique('cake_options')->where(
                    fn ($query) => $query->where('type', $this->string('type')->toString())
                ),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'price_adjustment' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'servings' => ['nullable', 'required_if:type,size', 'integer', 'min:1', 'max:500'],
            'available_colors' => ['nullable', 'array', 'max:30'],
            'available_colors.*' => ['required', 'string', 'max:40', 'distinct'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
