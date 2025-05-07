import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Import QueryClient and QueryClientProvider
import AddEntryPage from './components/Input';

import { Button, Box } from '@mui/material';

import WorklogSync from './components/Conpair';
import Total from './components/Total';
import WorkLogsDashboard from './components/Total';


// Create a QueryClient instance
const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}> {/* Wrap your app with QueryClientProvider */}
      <Router>
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          style={{ padding: '20px' }}
        >
          <Button 
            component={Link} 
            to="/" 
            variant="contained" 
            style={{ margin: '0 10px' }}
          >
            Multiple Entry
          </Button>
          <Button 
            component={Link} 
            to="/WorklogSync" 
            variant="contained" 
            style={{ margin: '0 10px' }}
          >
            View Entries
          </Button>
          <Button 
            component={Link} 
            to="/WorkLogsDashboard" 
            variant="contained" 
            style={{ margin: '0 10px' }}
          >
            Total still not working
          </Button>
          
        </Box>
        
        <Routes>
          <Route path="/" element={<AddEntryPage />} />
          <Route path="/WorklogSync" element={<WorklogSync />} />
          <Route path="/WorkLogsDashboard" element={<WorkLogsDashboard />} />
          
          
        </Routes>
      </Router>
    </QueryClientProvider>
  );
};
//teeeeeeest
export default App;
