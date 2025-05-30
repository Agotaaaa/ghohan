import React, { useState, useCallback } from 'react';
import {
  Button,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Container,
  Paper,
  Typography,
  Box,
} from '@mui/material';
import { Upload, FileText, X } from 'lucide-react';

const AddEntryPage = () => {
  const [entries, setEntries] = useState(''); // User input field for entries
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Manual CSV parsing function
  const parseCSVToEntries = (csvData) => {
    const lines = csvData.trim().split('\n');
    if (lines.length < 1) {
      throw new Error('CSV file appears to be empty');
    }

    const parsedEntries = [];
    
    // Check if first line looks like headers
    const firstLine = lines[0].trim();
    const hasHeaders = firstLine.toLowerCase().includes('assignement') || 
                      firstLine.toLowerCase().includes('assignment') ||
                      firstLine.toLowerCase().includes('hours') ||
                      firstLine.toLowerCase().includes('date');
    
    if (hasHeaders) {
      // Parse with headers (original format)
      const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
      
      const assignementIndex = headers.findIndex(h => h.toLowerCase().includes('assignement') || h.toLowerCase().includes('assignment'));
      const taskIdIndex = headers.findIndex(h => h.toLowerCase().includes('taskid') || h.toLowerCase().includes('task'));
      const hoursIndex = headers.findIndex(h => h.toLowerCase().includes('hours') || h.toLowerCase().includes('hour'));
      const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'));
      const commentIndex = headers.findIndex(h => h.toLowerCase().includes('comment'));

      if (assignementIndex === -1 || hoursIndex === -1 || dateIndex === -1) {
        throw new Error('CSV must contain Assignement, Hours, and Date columns');
      }

      // Parse data rows starting from line 1
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLine(line);
        
        const assignement = values[assignementIndex]?.replace(/"/g, '') || '';
        const taskId = values[taskIdIndex]?.replace(/"/g, '') || '1';
        const hours = values[hoursIndex]?.replace(/"/g, '') || '';
        const date = values[dateIndex]?.replace(/"/g, '') || '';
        const comment = values[commentIndex]?.replace(/"/g, '') || '';
        
        if (!assignement || !hours || !date) continue;
        
        parsedEntries.push(`${assignement}; ${taskId}; ${hours}; ${date}; ${comment}`);
      }
    } else {
      // Parse without headers (new format: username, taskId, hours, date, comment)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLine(line);
        
        // Skip lines with all empty values
        if (values.every(val => !val || val.trim() === '')) continue;
        
        // Expected format: username, taskId, hours, date, comment
        const assignement = values[0]?.replace(/"/g, '').trim() || '';
        const taskId = values[1]?.replace(/"/g, '').trim() || '1';
        const hours = values[2]?.replace(/"/g, '').trim() || '';
        const date = values[3]?.replace(/"/g, '').trim() || '';
        const comment = values[4]?.replace(/"/g, '').trim() || '';
        
        // Skip rows without required data (username, hours, and date)
        if (!assignement || !hours || !date) continue;
        
        // Format: username; workItemId; hours; timestamp; comment
        parsedEntries.push(`${assignement}; ${taskId}; ${hours}; ${date}; ${comment}`);
      }
    }

    if (parsedEntries.length === 0) {
      throw new Error('No valid entries found in CSV file');
    }

    return parsedEntries.join(', ');
  };

  // Helper function to parse a single CSV line
  const parseCSVLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add the last value
    
    return values;
  };

  // Function to validate username exists in the API
  const validateUsername = async (username) => {
    try {
      const response = await fetch(
        `https://adnanechlih0.timehub.7pace.com/api/odata/v3.2/workLogsOnly?$select=AddedByUser/name&$filter=AddedByUser/name eq '${username}'`,
        {
          headers: {
            Authorization: "Bearer IUR9-gZ22bhBbo7EM5RHmyPULmXkRMKVlH1gVNdTKsM",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const data = await response.json();
      // Check if any records were returned (meaning username exists)
      return data.value && data.value.length > 0;
    } catch (error) {
      console.error(`Error validating username ${username}:`, error);
      throw new Error(`Failed to validate username "${username}": ${error.message}`);
    }
  };

  // Function to validate all usernames before saving
  const validateAllUsernames = async (parsedEntries) => {
    const uniqueUsernames = [...new Set(parsedEntries.map(entry => entry.username))];
    const invalidUsernames = [];

    for (const username of uniqueUsernames) {
      const isValid = await validateUsername(username);
      if (!isValid) {
        invalidUsernames.push(username);
      }
    }

    if (invalidUsernames.length > 0) {
      throw new Error(`The following usernames are not valid: ${invalidUsernames.join(', ')}`);
    }
  };

  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }

      setUploadedFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvData = e.target.result;
          const parsedEntries = parseCSVToEntries(csvData);
          setEntries(parsedEntries);
          setSuccess(true);
        } catch (err) {
          setError(err.message);
        }
      };
      reader.readAsText(file);
    }
  }, []);

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle file input change
  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }

      setUploadedFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvData = e.target.result;
          const parsedEntries = parseCSVToEntries(csvData);
          setEntries(parsedEntries);
          setSuccess(true);
        } catch (err) {
          setError(err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  // Remove uploaded file
  const removeFile = () => {
    setUploadedFile(null);
    setEntries('');
  };

  // Updated handleSubmit function with username validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Split multiple entries by comma
      const parsedEntries = entries
        .split(',')
        .map((entry) => {
          let [inputUsername, workItemId, length, timestamp, comment] = entry.trim().split(';');

          // Handle comment logic: if empty, use just the username; otherwise keep the original comment
          const trimmedComment = comment?.trim() || '';
          const finalComment = trimmedComment === '' 
            ? inputUsername.trim()  // If comment is empty, use just the username
            : trimmedComment;       // If comment is not empty, keep it as is (don't add username)

          return {
            username: inputUsername.trim(), // Use the parsed username instead of hardcoded
            workItemId: parseInt(workItemId.trim()),
            length: parseFloat(length.trim()), // Store the hours as they are entered
            timestamp: timestamp.trim(),
            comment: finalComment,
          };
        });

      // Validate all usernames before saving
      await validateAllUsernames(parsedEntries);

      // Send the data to the backend
      const response = await fetch('http://localhost:8000/api/save-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: parsedEntries,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save entries');
      }

      setSuccess(true);
      setEntries(''); // Clear the form after success
      setUploadedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entries');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setError(null);
    setSuccess(false);
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Add Time Tracking Entries
        </Typography>

        {/* Drag and Drop Area */}
        <Box
          sx={{
            border: dragActive ? '2px dashed #1976d2' : '2px dashed #ccc',
            borderRadius: 2,
            p: 4,
            mb: 3,
            textAlign: 'center',
            backgroundColor: dragActive ? '#f3f8ff' : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative',
            '&:hover': {
              borderColor: '#999',
            }
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer'
            }}
          />
          
          <Upload size={48} style={{ color: '#999', marginBottom: 16 }} />
          <Typography variant="h6" sx={{ mb: 1, color: '#333' }}>
            Drop your CSV file here
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
            or click to browse and select a file
          </Typography>
          <Typography variant="caption" sx={{ color: '#999' }}>
            Expected format: Assignement, TaskID, Hours, Date, Comment, Link
          </Typography>
        </Box>

        {/* Uploaded File Display */}
        {uploadedFile && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#e8f5e8',
              border: '1px solid #4caf50',
              borderRadius: 1,
              p: 2,
              mb: 3
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FileText size={20} style={{ color: '#4caf50', marginRight: 12 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#2e7d32' }}>
                  {uploadedFile.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#4caf50' }}>
                  File uploaded successfully
                </Typography>
              </Box>
            </Box>
            <Button
              onClick={removeFile}
              size="small"
              sx={{ minWidth: 'auto', p: 0.5, color: '#4caf50' }}
            >
              <X size={20} />
            </Button>
          </Box>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            label="Time Entries"
            multiline
            rows={6}
            value={entries}
            onChange={(e) => setEntries(e.target.value)}
            required
            fullWidth
            placeholder="Example: adnanechlih0; 1; 4; 2025-01-17T09:00; Worked on feature X"
            helperText="Format: username; projectId; hours; timestamp; description (separate multiple entries with commas)"
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} color="inherit" />}
          >
            {loading ? 'Validating & Saving...' : 'Save Entries'}
          </Button>

          <Snackbar
            open={!!error}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
          >
            <Alert
              onClose={handleCloseSnackbar}
              severity="error"
              variant="filled"
            >
              {error}
            </Alert>
          </Snackbar>

          <Snackbar
            open={success}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
          >
            <Alert
              onClose={handleCloseSnackbar}
              severity="success"
              variant="filled"
            >
              {uploadedFile ? 'CSV file processed successfully!' : 'Time entries saved successfully!'}
            </Alert>
          </Snackbar>
        </Box>
      </Paper>
    </Container>
  );
};

export default AddEntryPage;