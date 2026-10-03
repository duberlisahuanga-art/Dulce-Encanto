<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePromotionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('promociones.gestionar') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'discount_type' => ['required', 'in:percentage,fixed'],
            'discount_value' => ['required', 'numeric', 'gt:0', 'max:100000', Rule::when($this->input('discount_type') === 'percentage', ['lte:100'])],
            'starts_at' => ['required', 'date_format:Y-m-d'],
            'ends_at' => ['required', 'date_format:Y-m-d', 'after_or_equal:starts_at'],
            'is_active' => ['required', 'boolean'],
            'applies_to_all' => ['required', 'boolean'],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['integer', 'distinct', 'exists:products,id'],
            'banner' => ['nullable', 'image', 'max:5120'],
            'accent_color' => ['required', 'regex:/^#[A-Fa-f0-9]{6}$/'],
            'cta_label' => ['required', 'string', 'max:60'],
            'coupon_code' => ['nullable', 'required_if:requires_coupon,true', 'string', 'max:40', Rule::unique('promotions', 'coupon_code')->ignore($this->route('promotion'))],
            'requires_coupon' => ['required', 'boolean'],
            'minimum_purchase' => ['required', 'numeric', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'coupon_code' => $this->filled('coupon_code')
                ? strtoupper(trim((string) $this->input('coupon_code')))
                : null,
        ]);
    }
}
