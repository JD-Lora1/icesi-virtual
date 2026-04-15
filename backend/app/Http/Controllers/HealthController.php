<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'service' => 'icesi-virtual-backend',
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
