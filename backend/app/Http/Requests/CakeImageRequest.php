<?php

namespace App\Http\Requests;

class CakeImageRequest extends CakeQuoteRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }
}
