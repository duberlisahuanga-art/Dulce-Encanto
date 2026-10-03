<?php

return [
    'store_latitude' => (float) env('STORE_LATITUDE', -12.0464),
    'store_longitude' => (float) env('STORE_LONGITUDE', -77.0428),
    'maximum_distance_km' => (float) env('DELIVERY_MAX_DISTANCE_KM', 15),
];
