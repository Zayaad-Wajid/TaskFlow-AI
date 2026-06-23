import axios from "axios";

const API_BASE = "/api";
const ACCESS_TOKEN_KEY = "taskflow-access-token";
const REFRESH_TOKEN_KEY = "taskflow-refresh-token";
const TASK_CACHE_KEY = "taskflow-offline-tasks";
const STATS_CACHE_KEY = "taskflow-offline-stats";

const http = axios.create();

export const tokenStore = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: ({ access_token, refresh_token }) => {
    if (access_token) localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
    if (refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

http.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = tokenStore.getRefreshToken();

    if (
      error.response?.status === 401 &&
      refreshToken &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register")
    ) {
      originalRequest._retry = true;
      try {
        const response = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        tokenStore.setTokens(response.data);
        originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
        return http(originalRequest);
      } catch (refreshError) {
        tokenStore.clear();
        throw refreshError;
      }
    }

    throw error;
  },
);

const cacheValue = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  return value;
};

const readCache = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};

const isNetworkError = (error) => !error.response;

const applyAuthResponse = (response) => {
  tokenStore.setTokens(response.data);
  return response.data;
};

export const api = {
  getTasks: async () => {
    try {
      const response = await http.get(`${API_BASE}/tasks`);
      return cacheValue(TASK_CACHE_KEY, response.data);
    } catch (error) {
      if (isNetworkError(error)) {
        return { ...readCache(TASK_CACHE_KEY, { tasks: [] }), offline: true };
      }
      throw error;
    }
  },

  getStats: async () => {
    try {
      const response = await http.get(`${API_BASE}/stats`);
      return cacheValue(STATS_CACHE_KEY, response.data);
    } catch (error) {
      if (isNetworkError(error)) {
        return { ...readCache(STATS_CACHE_KEY, { total: 0, todo: 0, in_progress: 0, done: 0, overdue: 0 }), offline: true };
      }
      throw error;
    }
  },

  addTask: async (task) => (await http.post(`${API_BASE}/tasks`, task)).data,
  updateTask: async (taskId, task) => (await http.put(`${API_BASE}/tasks/${taskId}`, task)).data,
  deleteTask: async (taskId) => (await http.delete(`${API_BASE}/tasks/${taskId}`)).data,
  updateTaskStatus: async (taskId, status) => (await http.patch(`${API_BASE}/tasks/${taskId}/status`, { status })).data,
  addTaskComment: async (taskId, comment) => (await http.post(`${API_BASE}/tasks/${taskId}/comments`, comment)).data,
  addTimeLog: async (taskId, log) => (await http.post(`${API_BASE}/tasks/${taskId}/time-logs`, log)).data,

  agentChat: async (message) => (await http.post(`${API_BASE}/agent/chat`, { message })).data,
  parseTask: async (text) => (await http.post(`${API_BASE}/agent/parse-task`, { text })).data,
  breakdownTask: async (title, description = "") => (await http.post(`${API_BASE}/agent/breakdown`, { title, description })).data,
  getDayPlan: async () => (await http.get(`${API_BASE}/agent/plan-day`)).data,
  getInsights: async () => (await http.get(`${API_BASE}/agent/insights`)).data,
  getPriorities: async () => (await http.get(`${API_BASE}/agent/prioritize`)).data,
  getSchedule: async () => (await http.get(`${API_BASE}/agent/schedule`)).data,
  applySchedule: async (blocks) => (await http.post(`${API_BASE}/agent/apply-schedule`, { blocks })).data,
  getDailySummary: async () => (await http.get(`${API_BASE}/agent/daily-summary`)).data,
  getWorkloadForecast: async () => (await http.get(`${API_BASE}/agent/workload-forecast`)).data,
  createTaskFromChat: async (taskData) => (await http.post(`${API_BASE}/agent/create-from-chat`, taskData)).data,
  createSubtasks: async (subtasks, parentTag = "") => (await http.post(`${API_BASE}/agent/create-subtasks`, { subtasks, parent_tag: parentTag })).data,

  getHabits: async () => (await http.get(`${API_BASE}/habits`)).data,
  addHabit: async (habit) => (await http.post(`${API_BASE}/habits`, habit)).data,
  toggleHabit: async (habitId, date) => (await http.patch(`${API_BASE}/habits/${habitId}/toggle`, { date })).data,
  deleteHabit: async (habitId) => (await http.delete(`${API_BASE}/habits/${habitId}`)).data,

  login: async (email, password) => applyAuthResponse(await http.post(`${API_BASE}/auth/login`, { email, password })),
  register: async (name, email, password) => applyAuthResponse(await http.post(`${API_BASE}/auth/register`, { name, email, password })),
  refresh: async () => applyAuthResponse(await http.post(`${API_BASE}/auth/refresh`, { refresh_token: tokenStore.getRefreshToken() })),
  logout: async () => {
    tokenStore.clear();
    return { success: true };
  },
  me: async () => (await http.get(`${API_BASE}/auth/me`)).data,
};
