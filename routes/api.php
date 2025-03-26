<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EntryController;


// Route to store work log entries


Route::post('/save-entries', [EntryController::class, 'store']);
Route::delete('/entries/{id}', [EntryController::class, 'destroy']);
Route::get('/entries/{username}', [EntryController::class, 'show']);

Route::put('entries/{id}', [EntryController::class, 'edit']);



// Route to fetch all work log entries
Route::get('/entries', [EntryController::class, 'getEntries']);
