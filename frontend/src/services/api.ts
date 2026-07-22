import axios from 'axios';

// Usa o mesmo hostname que o browser está acessando (funciona tanto em localhost quanto via IP na rede)
const baseURL = `${window.location.protocol}//${window.location.hostname}:3000/api/v1`;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
