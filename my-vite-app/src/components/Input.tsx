import React, { useState } from 'react';
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

const AddEntryPage = () => {
  const [entries, setEntries] = useState(''); // User input field for entries
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    try {
      // Split multiple entries by comma
      const parsedEntries = entries
        .split(',')
        .map((entry) => {
          let [inputUsername, workItemId, length, timestamp, comment] = entry.trim().split(';');
  
          return {
            username: "Kaouthar Zhani", // Hardcoded username
            workItemId: parseInt(workItemId.trim()),
            length: parseFloat(length.trim()), // Store the hours as they are entered
            timestamp: timestamp.trim(),
            comment: `${comment?.trim() || ''} by: ${inputUsername.trim()}`, // Append original username to comment
          };
        });
  
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
            {loading ? 'Saving...' : 'Save Entries'}
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
              Time entries saved successfully!
            </Alert>
          </Snackbar>
        </Box>
      </Paper>
    </Container>
  );
};

export default AddEntryPage;
