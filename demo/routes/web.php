<?php

declare(strict_types=1);

use App\Http\Controllers\DemoPostController;
use Illuminate\Support\Facades\Route;

Route::get('/', [DemoPostController::class, 'edit'])->name('demo.edit');
Route::post('/', [DemoPostController::class, 'update'])->name('demo.update');
Route::get('/post', [DemoPostController::class, 'show'])->name('demo.post');
