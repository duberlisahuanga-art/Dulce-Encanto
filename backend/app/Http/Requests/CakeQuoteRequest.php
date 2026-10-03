<?php

namespace App\Http\Requests;

use App\Models\CakeOption;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class CakeQuoteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'size_id' => ['required', 'integer'],
            'flavor_id' => ['required', 'integer'],
            'filling_id' => ['required', 'integer'],
            'covering_id' => ['required', 'integer'],
            'decoration_id' => ['required', 'integer'],
            'extra_ids' => ['sometimes', 'array', 'max:20'],
            'extra_ids.*' => ['required', 'integer', 'distinct'],
            'color' => ['nullable', 'string', 'max:40'],
            'secondary_color' => ['nullable', 'string', 'max:40'],
            'detail_color' => ['nullable', 'string', 'max:40'],
            'shape' => ['nullable', 'string', 'max:40'],
            'product_type' => ['nullable', 'string', 'in:cake'],
            'theme' => ['nullable', 'string', 'max:120'],
            'dedication' => ['nullable', 'string', 'max:120'],
            'delivery_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $typedFields = [
                'size_id' => 'size',
                'flavor_id' => 'flavor',
                'filling_id' => 'filling',
                'covering_id' => 'covering',
                'decoration_id' => 'decoration',
            ];

            foreach ($typedFields as $field => $type) {
                $isValid = CakeOption::query()
                    ->whereKey($this->integer($field))
                    ->where('type', $type)
                    ->where('is_active', true)
                    ->exists();

                if (! $isValid) {
                    $validator->errors()->add($field, 'La opción seleccionada no está disponible.');
                }
            }

            $extraIds = $this->input('extra_ids', []);
            $validExtraCount = CakeOption::query()
                ->whereKey($extraIds)
                ->where('type', 'extra')
                ->where('is_active', true)
                ->count();

            if ($validExtraCount !== count($extraIds)) {
                $validator->errors()->add('extra_ids', 'Uno o más extras no están disponibles.');
            }
        }];
    }
}
