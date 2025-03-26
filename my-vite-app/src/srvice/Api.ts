import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api', // Update the Laravel server's URL
});

export default api;



