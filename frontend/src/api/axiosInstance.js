import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeRefresh = (cb) => refreshSubscribers.push(cb);
const onRefreshed = (token) => { refreshSubscribers.forEach((cb) => cb(token)); refreshSubscribers = []; };

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = `${import.meta.env.BASE_URL}login`;
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh-token`,
          { refreshToken }
        );
        const { accessToken, refreshToken: newRefreshToken } = data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        onRefreshed(accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.clear();
        window.location.href = `${import.meta.env.BASE_URL}login`;
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    const message = error.response?.data?.message || 'Something went wrong';
    if (error.response?.status !== 401) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;
