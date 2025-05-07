import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Typography, 
  Box, 
  Card, 
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Alert,
  TablePagination
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';


const WorklogSync = () => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [localEntries, setLocalEntries] = useState([]);
  const [serverEntries, setServerEntries] = useState([]);
  const [syncStatus, setSyncStatus] = useState([]);
  const [verificationResults, setVerificationResults] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchId, setSearchId] = useState('');
  const [page, setPage] = useState(0); // Current page
  const [rowsPerPage, setRowsPerPage] = useState(5); // Items per page
  const API_KEY = "CCghGc4KNLhRo25ZhCywNK95SNpvQzzZ6EFdAhjxNHs";
  const fetchLocalEntries = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/entries");
      const entries = await response.json();
      const validEntries = entries.filter(
        (entry) => entry && entry.workItemId && entry.length && entry.timestamp
      );
      const normalizedEntries = validEntries.map(entry => ({
        ...entry,
        workItemId: String(entry.workItemId),
        timestamp: new Date(entry.timestamp).toISOString(),
      }));
      setLocalEntries(normalizedEntries);
    } catch (error) {
      console.error("Error fetching local entries:", error);
      setError("Failed to fetch local entries");
    }
  };
//https://agota.timehub.7pace.com/api/odata/v3.2/workLogsOnly?$select=Timestamp,PeriodLength,WorkItemId,Comment"
  const fetchServerEntries = async () => {
    try {
      const response = await fetch(
        "https://kapitalkontroll.timehub.7pace.com/api/odata/v3.2/workLogsOnly?$select=Timestamp,PeriodLength,WorkItemId,Comment",
        {
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
          },
        }
      );
  
      if (response.ok) {
        const data = await response.json();
        const normalizedEntries = (data.value || []).map(entry => {
          const periodLengthInHours = entry.PeriodLength / 3600; // Convert PeriodLength from seconds to hours
          return {
            ...entry,
            WorkItemId: String(entry.WorkItemId),
            Timestamp: new Date(entry.Timestamp).toISOString(),
            PeriodLength: periodLengthInHours, // Updated to hours
          };
        });
        setServerEntries(normalizedEntries);
      }
    } catch (error) {
      console.error("Error fetching server entries:", error);
      setError("Failed to fetch server entries");
    }
  };
  

  const handleDelete = async (id: number) => {
    setLoading(true);
    setError(null);
  
    try {
      const response = await fetch(`http://localhost:8000/api/entries/${id}`, {
        method: "DELETE",
      });
  
      if (!response.ok) {
        throw new Error("Failed to delete entry");
      }
  
      // Update state by filtering out the deleted entry
      setEntries((prevEntries) => prevEntries.filter((entry) => entry.id !== id));
      setSuccess("Entry deleted successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entry");
    } finally {
      setLoading(false);
    }
  };
  

  const updateEntry = async (entry) => {
    try {
      console.log("Entry being sent:", JSON.stringify(entry)); // Debugging log
  
      const response = await fetch(`http://localhost:8000/api/entries/${entry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(entry),
      });
  
      if (!response.ok) {
        const errorData = await response.json(); // Get Laravel error messages
        console.error("Backend error:", errorData);
        throw new Error(errorData.message || "Failed to update entry");
      }
  
      const updatedEntry = await response.json();
      setLocalEntries(entries =>
        entries.map(e => e.id === updatedEntry.id ? updatedEntry : e)
      );
  
      setIsEditDialogOpen(false);
      setSuccess("Entry updated successfully");
    } catch (error) {
      console.error("Error updating entry:", error);
      setError(error.message);
    }
  };
  

  const verifyEntries = () => {
    if (!localEntries.length && !serverEntries.length) {
      setError("No entries available for verification");
      return;
    }
  
    const duplicates = [];
    const newEntries = [];
    const existingEntriesMap = new Map();
  
    // Normalize server entries: Convert length to hours if it's in minutes (assuming > 60 means minutes)
    serverEntries.forEach(serverEntry => {
      let serverLengthInHours = serverEntry.PeriodLength;
  
      // Check if the length is in minutes (e.g., value > 60) and convert to hours
      if (serverLengthInHours > 60) {
        serverLengthInHours = serverLengthInHours / 60; // Convert length from minutes to hours
      }
  
      const key = `${serverEntry.WorkItemId}-${serverLengthInHours}-${serverEntry.Timestamp}-${serverEntry.Comment.trim().toLowerCase()}`;
      existingEntriesMap.set(key, serverEntry);
    });
  
    // Check local entries for duplicates or new entries
    localEntries.forEach(localEntry => {
      const localLengthInHours = localEntry.length;  // Local length is already in hours
      const localKey = `${localEntry.workItemId}-${localLengthInHours}-${localEntry.timestamp}-${localEntry.comment.trim().toLowerCase()}`;
  
      if (existingEntriesMap.has(localKey)) {
        duplicates.push({
          local: localEntry,
          server: existingEntriesMap.get(localKey),
        });
      } else {
        newEntries.push(localEntry);
      }
    });
  
    setVerificationResults({ duplicates, newEntries });
  };
  
  
  

  const syncVerifiedEntries = async () => {
    if (!verificationResults?.newEntries?.length) {
      setError("No new entries to sync");
      return;
    }
  
    const results = [];
    setLoading(true);
  
    for (const entry of verificationResults.newEntries) {
      try {
        const lengthInSeconds = entry.length * 3600; // Convert length from hours to seconds
  //https://terabytesoftware.timehub.7pace.com/api/rest/worklogs?api-version=3.2"
        const response = await fetch("https://kapitalkontroll.timehub.7pace.com/api/rest/worklogs?api-version=3.2", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workItemId: parseInt(entry.workItemId),
            length: lengthInSeconds,  // Send length in seconds
            Timestamp: entry.timestamp,
            Comment: entry.comment
          }),
        });
  
        if (response.ok) {
          results.push({ entry, status: "SYNCED", message: "Successfully synced" });
        } else {
          throw new Error("Sync failed");
        }
      } catch (error) {
        results.push({ entry, status: "ERROR", message: error.message });
      }
    }
  
    setSyncStatus(results);
    setLoading(false);
    const successCount = results.filter(r => r.status === "SYNCED").length;
    if (successCount > 0) {
      setSuccess(`Successfully synced ${successCount} entries`);
    }
  };
  

 ////// }, []);

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button 
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchLocalEntries}
          disabled={loading}
        >
          Load Local Entries
        </Button>

        <Button
          variant="contained"
          color="secondary"
          startIcon={<CheckCircleIcon />}
          onClick={verifyEntries}
          disabled={loading}
        >
          Verify Entries
        </Button>

        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={syncVerifiedEntries}
          disabled={loading || !verificationResults?.newEntries?.length}
        >
          Sync Verified Entries
        </Button>
      </Box>

      {/* Local Entries Table */}
      {localEntries.length > 0 && (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Local Entries
        </Typography>
        <TextField
          size="small"
          placeholder="Search by ID..."
          variant="outlined"
          onChange={(e) => setSearchId(e.target.value)}
          sx={{ width: 200 }}
        />
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>User Name</TableCell>
              <TableCell>Work Item ID</TableCell>
              <TableCell>Timestamp</TableCell>
              <TableCell>Length (Hour)</TableCell>
              <TableCell>Comment</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {localEntries
              .filter(entry => !searchId || entry.id.toString().includes(searchId))
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) // Pagination
              .map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.id}</TableCell>
                  <TableCell>{entry.username}</TableCell>
                  <TableCell>{entry.workItemId}</TableCell>
                  <TableCell>{formatDateTime(entry.timestamp)}</TableCell>
                  <TableCell>{entry.length}</TableCell>
                  <TableCell>{entry.comment}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        onClick={() => {
                          setEditEntry(entry);
                          setIsEditDialogOpen(true);
                        }}
                        disabled={loading}
                      >
                        <EditIcon fontSize="small" />
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDelete(entry.id)}
                        disabled={loading}
                      >
                        <DeleteIcon fontSize="small" />
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={localEntries.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(event, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
      />
    </CardContent>
  </Card>
)}


      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)}>
        <DialogTitle>Edit Entry</DialogTitle>
        <DialogContent>
          {editEntry && (
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Work Item ID"
                fullWidth
                value={editEntry.workItemId}
                onChange={(e) => setEditEntry({...editEntry, workItemId: e.target.value})}
              />
              <TextField
                label="Length (minutes)"
                type="number"
                fullWidth
                value={editEntry.length}
                onChange={(e) => setEditEntry({...editEntry, length: parseInt(e.target.value)})}
              />
              <TextField
                label="Comment"
                fullWidth
                value={editEntry.comment}
                onChange={(e) => setEditEntry({...editEntry, comment: e.target.value})}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => updateEntry(editEntry)} variant="contained" disabled={loading}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>


      {/* Verification Results */}
      {verificationResults && (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      bgcolor: 'white',
      p: 2,
      borderRadius: 2,
      boxShadow: 1,
    }}
  >
    {/* Duplicates Section */}
    {verificationResults.duplicates.length > 0 && (
  <Accordion>
    <AccordionSummary
      expandIcon={<ExpandMoreIcon />}
      aria-controls="duplicates-content"
      id="duplicates-header"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ErrorOutlineIcon color="error" />
        <Typography variant="h6" color="error">
          Duplicates
        </Typography>
      </Box>
    </AccordionSummary>
    <AccordionDetails>
      {verificationResults.duplicates.map((item, index) => (
        <Typography key={index} sx={{ color: 'black', fontSize: 'small' }}>
          The Duplicate items: {item.local.id}.
        </Typography>
      ))}
    </AccordionDetails>
  </Accordion>
)}

    {/* New Entries Section */}
    {verificationResults.newEntries.length > 0 && (
  <Accordion>
    <AccordionSummary
      expandIcon={<ExpandMoreIcon />}
      aria-controls="new-entries-content"
      id="new-entries-header"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <InfoOutlined color="primary" />
        <Typography variant="h6" color="info">
          New Entries
        </Typography>
      </Box>
    </AccordionSummary>
    <AccordionDetails>
      {verificationResults.newEntries.map((entry, index) => (
        <Typography key={index} sx={{ color: 'black', fontSize: 'small' }}>
          New Work Item: {entry.id}.
        </Typography>
      ))}
    </AccordionDetails>
  </Accordion>
)}

  </Box>
)}




      {/* Sync Results */}
 {syncStatus.length > 0 && (
  <Alert severity={syncStatus.some(result => result.status !== "SYNCED") ? "error" : "success"}>
    {syncStatus.map((result, index) => (
      <Typography key={index}>
        {result.entry?.workItemId || "Unknown Entry"}: {result.message}
      </Typography>
    ))}
  </Alert>
)}

    </Box>
  );
};

export default WorklogSync;