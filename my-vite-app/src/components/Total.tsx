import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Button,
  List,
  ListItem,
  Container,
  Paper,
  Chip,
  Avatar,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: 20,
  textTransform: 'none',
  padding: '8px 16px',
}));

const WorkLogsDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalHours, setTotalHours] = useState(0);

  const PAT = 'CCkiFoHGho94igvOCd1CPY4dUmtpADZ9lagmh6uuKt2ciWDN9aiyJQQJ99BBACAAAAAAAAAAAAASAZDO45cK';
  const encodedPat = btoa(`:${PAT}`);
  const headers = {
    'Authorization': `Basic ${encodedPat}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const response = await fetch('https://dev.azure.com/agota/_apis/projects?api-version=6.0', { headers });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const data = await response.json();
        setProjects(data.value || []);
      } catch (err) {
        console.error("Fetch Projects Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const fetchUsers = async (projectId, projectName) => {
    setLoading(true);
    setSelectedProject(projectId);
    setUsers([]);
    setSprints([]);
    setWorkItems([]);
    try {
      const teamsResponse = await fetch(
        `https://dev.azure.com/agota/_apis/projects/${projectId}/teams?api-version=6.0`,
        { headers }
      );
      const teamsData = await teamsResponse.json();
      
      if (teamsData.value && teamsData.value.length > 0) {
        const teamId = teamsData.value[0].id;
        
        const membersResponse = await fetch(
          `https://dev.azure.com/agota/_apis/projects/${projectId}/teams/${teamId}/members?api-version=6.0`,
          { headers }
        );
        const membersData = await membersResponse.json();
        setUsers(membersData.value?.map(member => member.identity) || []);
      } else {
        setError('No teams found in the project');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSprints = async (userId) => {
    if (!selectedProject) return;
    
    setLoading(true);
    const selectedUserObject = users.find(user => user.id === userId);
    setSelectedUser(selectedUserObject);
    setSprints([]);
    setWorkItems([]);
  
    try {
      const response = await fetch(
        `https://dev.azure.com/agota/${selectedProject}/_apis/work/teamsettings/iterations?api-version=6.0`,
        { headers }
      );
      const data = await response.json();
      setSprints(data.value || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkItems = async (sprintId, sprintPath) => {
    if (!selectedProject || !selectedUser) {
      console.log('Missing required data:', { selectedProject, selectedUser });
      return;
    }
    
    setLoading(true);
    setSelectedSprint(sprintId);
    
    try {
      const project = projects.find(p => p.id === selectedProject);
      if (!project) {
        throw new Error('Project not found');
      }

      const wiqlQuery = `
        SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], 
               [System.AssignedTo], [Microsoft.VSTS.Scheduling.CompletedWork]
        FROM WorkItems
        WHERE [System.TeamProject] = '${project.name}'
        AND [System.IterationPath] = '${sprintPath}'
        AND [System.AssignedTo] = '${selectedUser.uniqueName}'
        ORDER BY [System.ChangedDate] DESC
      `;

      const wiqlResponse = await fetch(
        `https://dev.azure.com/agota/${selectedProject}/_apis/wit/wiql?api-version=6.0`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ query: wiqlQuery })
        }
      );
      
      if (!wiqlResponse.ok) {
        const errorText = await wiqlResponse.text();
        throw new Error(`WIQL query failed: ${errorText}`);
      }

      const wiqlData = await wiqlResponse.json();
      
      if (!wiqlData.workItems || wiqlData.workItems.length === 0) {
        setWorkItems([]);
        setTotalHours(0);
        setError(`No work items found for ${selectedUser.displayName || selectedUser.uniqueName} in this sprint`);
        setLoading(false);
        return;
      }

      const workItemIds = wiqlData.workItems.map(wi => wi.id).join(',');

      const workItemsUrl = `https://dev.azure.com/agota/${selectedProject}/_apis/wit/workitems?ids=${workItemIds}&fields=System.Id,System.Title,System.State,System.WorkItemType,System.AssignedTo,Microsoft.VSTS.Scheduling.CompletedWork&api-version=6.0`;
      const workItemsResponse = await fetch(workItemsUrl, { headers });

      if (!workItemsResponse.ok) {
        const errorText = await workItemsResponse.text();
        throw new Error(`Work items fetch failed: ${errorText}`);
      }

      const workItemsData = await workItemsResponse.json();

      if (!workItemsData.value || workItemsData.value.length === 0) {
        setWorkItems([]);
        setTotalHours(0);
        setError(`No work items found for ${selectedUser.displayName || selectedUser.uniqueName}`);
        return;
      }

      const filteredWorkItems = workItemsData.value.filter(item => {
        const assignedTo = item.fields['System.AssignedTo']?.uniqueName || '';
        return assignedTo.toLowerCase() === selectedUser.uniqueName.toLowerCase();
      });

      if (filteredWorkItems.length > 0) {
        const totalHours = filteredWorkItems.reduce((sum, item) => {
          const completedWork = item.fields['Microsoft.VSTS.Scheduling.CompletedWork'] || 0;
          return sum + completedWork;
        }, 0);

        setWorkItems(filteredWorkItems);
        setTotalHours(totalHours);
        setError(null);
      } else {
        setWorkItems([]);
        setTotalHours(0);
        setError(`No work items found for ${selectedUser.displayName || selectedUser.uniqueName} in this sprint`);
      }

    } catch (err) {
      console.error("Error fetching work items:", err);
      setError(`Failed to fetch work items: ${err.message}`);
      setWorkItems([]);
      setTotalHours(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Paper elevation={0} sx={{ p: 4, bgcolor: 'transparent' }}>
          <Typography 
            variant="h4" 
            gutterBottom 
            sx={{ 
              mb: 4, 
              fontWeight: 'bold',
              color: (theme) => theme.palette.primary.main 
            }}
          >
            Azure DevOps Projects
          </Typography>

          {loading && (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress size={40} thickness={4} />
            </Box>
          )}

          {error && (
            <Alert 
              severity="error" 
              sx={{ m: 2 }} 
              onClose={() => setError(null)}
              variant="filled"
            >
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {projects.map((project) => (
              <Grid item xs={12} sm={6} md={4} key={project.id}>
                <StyledCard>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography 
                      variant="h6" 
                      gutterBottom 
                      sx={{ fontWeight: 500, color: 'primary.main' }}
                    >
                      {project.name}
                    </Typography>
                    <StyledButton 
                      variant="contained" 
                      onClick={() => fetchUsers(project.id, project.name)}
                      fullWidth
                    >
                      View Users
                    </StyledButton>
                  </CardContent>
                </StyledCard>
              </Grid>
            ))}
          </Grid>

          {selectedProject && (
            <Paper elevation={1} sx={{ mt: 4, p: 3, bgcolor: 'background.paper' }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 500 }}>
                Users in Project
              </Typography>
              <Grid container spacing={2}>
                {users.map((user) => (
                  <Grid item key={user.id}>
                    <StyledButton 
                      variant="outlined" 
                      onClick={() => fetchSprints(user.id)}
                      startIcon={
                        <Avatar sx={{ width: 24, height: 24 }}>
                          {(user.displayName || user.uniqueName || '')[0]}
                        </Avatar>
                      }
                    >
                      {user.displayName || user.uniqueName}
                    </StyledButton>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {selectedUser && (
            <Paper elevation={1} sx={{ mt: 4, p: 3, bgcolor: 'background.paper' }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 500 }}>
                Sprints for User
              </Typography>
              <Grid container spacing={2}>
                {sprints.map((sprint) => (
                  <Grid item key={sprint.id} xs={12} sm={6} md={4}>
                    <StyledCard>
                      <CardContent>
                        <Typography variant="h6" sx={{ color: 'primary.main' }}>
                          {sprint.name}
                        </Typography>
                        <StyledButton 
                          variant="contained" 
                          onClick={() => fetchWorkItems(sprint.id, sprint.path)}
                          sx={{ mt: 2 }}
                          fullWidth
                        >
                          View Work Items
                        </StyledButton>
                      </CardContent>
                    </StyledCard>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {selectedSprint && workItems.length > 0 && (
            <Paper elevation={1} sx={{ mt: 4, p: 3, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 500 }}>
                  Work Items in Sprint
                </Typography>
                <Chip 
                  label={`Total Hours: ${totalHours.toFixed(1)}`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              <List>
                {workItems.map((workItem) => (
                  <ListItem key={workItem.id} sx={{ px: 0, py: 1 }}>
                    <StyledCard sx={{ width: '100%' }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ color: 'primary.main' }}>
                          {workItem.fields['System.Title']}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                          <Chip 
                            label={workItem.fields['System.State']}
                            color="primary"
                            variant="outlined"
                            size="small"
                          />
                          <Chip 
                            label={workItem.fields['System.WorkItemType']}
                            color="secondary"
                            variant="outlined"
                            size="small"
                          />
                          <Chip 
                            label={`${workItem.fields['Microsoft.VSTS.Scheduling.CompletedWork']?.toFixed(1) || 0} hours`}
                            color="default"
                            variant="outlined"
                            size="small"
                          />
                        </Box>
                      </CardContent>
                    </StyledCard>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default WorkLogsDashboard;