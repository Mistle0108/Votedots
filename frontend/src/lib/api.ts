import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000',
  withCredentials: true, // 세션 쿠키 자동 전송
});

export default api;