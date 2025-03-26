<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Entry extends Model
{
    use HasFactory;

    protected $table = 'time_entries'; // Make sure this matches your table name

    protected $fillable = [
        'username',
        'project_id',
        'hours',
        'timestamp',
        'description',
    ];
}
