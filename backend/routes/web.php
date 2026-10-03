<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'Dulce Encanto API',
        'status' => 'ok',
    ]);
});
