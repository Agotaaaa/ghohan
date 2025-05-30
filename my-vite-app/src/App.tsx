import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppBar, Toolbar, Button, Box, Typography } from '@mui/material';
import AddEntryPage from './components/Input';
import WorklogSync from './components/Conpair';
import Total from './components/Total';
import WorkLogsDashboard from './components/Total';

// Create a QueryClient instance
const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Box sx={{ flexGrow: 1 }}>
          {/* Navigation Bar */}
          <AppBar position="static" sx={{ backgroundColor: '#2c3e50' }}>
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Work Log Manager
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  component={Link}
                  to="/"
                  variant="contained"
                  color="primary"
                >
                  Multiple Entry
                </Button>
                
                <Button
                  component={Link}
                  to="/WorklogSync"
                  variant="contained"
                  color="primary"
                >
                  View Entries
                </Button>
                
                <Button
                  component={Link}
                  to="/WorkLogsDashboard"
                  variant="contained"
                  color="primary"
                >
                  Dashboard
                </Button>
              </Box>
            </Toolbar>
          </AppBar>
          
          {/* Main Content Area */}
          <Box sx={{ mt: 2, p: 2 }}>
            <Routes>
              <Route path="/" element={<AddEntryPage />} />
              <Route path="/WorklogSync" element={<WorklogSync />} />
              <Route path="/WorkLogsDashboard" element={<WorkLogsDashboard />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </QueryClientProvider>
  );
};

export default App;