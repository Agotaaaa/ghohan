<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Validator;

class EntryController extends Controller
{
    /**
     * Store the time entries in a file.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'entries' => 'required|array',
            'entries.*.username' => 'required|string',
            'entries.*.workItemId' => 'required|integer',
            'entries.*.length' => 'required|numeric',
            'entries.*.timestamp' => 'required|date',
            'entries.*.comment' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $entries = $request->input('entries');
            $filePath = storage_path('app/entries.json');
            $currentEntries = [];

            if (File::exists($filePath)) {
                $currentEntries = json_decode(File::get($filePath), true) ?? [];
            }

            $maxId = collect($currentEntries)->max('id') ?? 0;

            foreach ($entries as &$entry) {
                $maxId++;
                $entry['id'] = $maxId;
            }

            $allEntries = array_merge($currentEntries, $entries);
            File::put($filePath, json_encode($allEntries, JSON_PRETTY_PRINT));

            return response()->json(['message' => 'Entries saved successfully'], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to save entries',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all time entries from the file.
     */
    public function getEntries()
    {
        try {
            $filePath = storage_path('app/entries.json');

            if (!File::exists($filePath)) {
                return response()->json([], 200);
            }

            $entries = json_decode(File::get($filePath), true) ?? [];
            return response()->json($entries);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch entries',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a specific entry from the file.
     */
    public function destroy($id)
    {
        try {
            $filePath = storage_path('app/entries.json');
        
            if (!File::exists($filePath)) {
                return response()->json([
                    'message' => 'No entries file found',
                ], 404);
            }
        
            $entries = json_decode(File::get($filePath), true) ?? [];
            $entryFound = false;
        
            // Filter out the entry to delete
            $updatedEntries = array_filter($entries, function ($entry) use ($id, &$entryFound) {
                if (isset($entry['id']) && $entry['id'] == $id) {
                    $entryFound = true;
                    return false;  // Exclude this entry from the new array
                }
                return true;  // Keep this entry
            });
        
            if (!$entryFound) {
                return response()->json([
                    'message' => 'Entry not found',
                ], 404);
            }
        
            // Reindex the array to reset keys
            $updatedEntries = array_values($updatedEntries);
        
            // Write the updated entries back to the file
            File::put($filePath, json_encode($updatedEntries, JSON_PRETTY_PRINT));
        
            return response()->json([
                'message' => 'Entry deleted successfully',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete entry',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    
    public function show($username)
    {
        try {
            $filePath = storage_path('app/entries.json');
    
            if (!File::exists($filePath)) {
                return response()->json(['message' => 'No entries file found'], 404);
            }
    
            // Read the entries from the JSON file
            $entries = json_decode(File::get($filePath), true) ?? [];
    
            // Search for an entry by username
            $entry = collect($entries)->firstWhere('username', $username);
    
            // Check if the entry exists
            if (!$entry) {
                return response()->json(['message' => 'Entry not found'], 404);
            }
    
            // Return the entry data as a JSON response
            return response()->json($entry, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch entry',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
         
//
    /**
     * Update a specific entry in the file.
     */
    public function edit(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string',
            'workItemId' => 'required|integer',
            'length' => 'required|numeric',
            'timestamp' => 'required|date',
            'comment' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $filePath = storage_path('app/entries.json');

            if (!File::exists($filePath)) {
                return response()->json([
                    'message' => 'No entries file found',
                ], 404);
            }

            $entries = json_decode(File::get($filePath), true) ?? [];
            $entryFound = false;

            // Iterate over entries to find the entry with the matching ID
            foreach ($entries as &$entry) {
                if (isset($entry['id']) && $entry['id'] == $id) {
                    $entry['username'] = $request->input('username');
                    $entry['workItemId'] = $request->input('workItemId');
                    $entry['length'] = $request->input('length');
                    $entry['timestamp'] = $request->input('timestamp');
                    $entry['comment'] = $request->input('comment', $entry['comment']);
                    $entryFound = true;
                    break;
                }
            }

            if (!$entryFound) {
                return response()->json([
                    'message' => 'Entry not found',
                ], 404);
            }

            // Write the updated entries back to the file
            File::put($filePath, json_encode($entries, JSON_PRETTY_PRINT));

            return response()->json([
                'message' => 'Entry updated successfully',
            ], 200);
        } catch (\Exception $e) {
            // Log the error to the Laravel log file
            \Log::error('Error updating entry: ' . $e->getMessage());

            return response()->json([
                'message' => 'Failed to update entry',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
