import axios from "axios";

const API_BASE = "/api";
const ACCESS_TOKEN_KEY = "taskflow-access-token";
const REFRESH_TOKEN_KEY = "taskflow-refresh-token";
const TASK_CACHE_KEY = "taskflow-offline-tasks";
const STATS_CACHE_KEY = "taskflow-offline-stats";

const http = axios.create();

export const getTaskWebSocketUrl = () => {
  const token = tokenStore.getAccessToken();
  if (!token) return null;

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const isViteDevServer = window.location.port === "5173";
  const host = isViteDevServer ? `${window.location.hostname}:5000` : window.location.host;
  return `${protocol}//${host}/ws/tasks?token=${encodeURIComponent(token)}`;
};

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

const taskQueryParams = ({
  workspaceId,
  search,
  priority,
  status,
  tags,
  sortBy,
  sortOrder,
  page,
  pageSize,
} = {}) => {
  const params = {
    workspace_id: workspaceId || undefined,
    search: search || undefined,
    priority: priority && priority !== "all" ? priority : undefined,
    status: status && status !== "all" ? status : undefined,
    tags: tags || undefined,
    sort_by: sortBy || undefined,
    sort_order: sortOrder || undefined,
    page: page || undefined,
    page_size: pageSize || undefined,
  };
  return { params };
};

const workspaceParams = (workspaceId) =>
  workspaceId ? { params: { workspace_id: workspaceId } } : {};

const scopedCacheKey = (key, workspaceId) =>
  `${key}:${workspaceId || "personal"}`;

export const api = {
  getTasks: async (filters = {}) => {
    try {
      const response = await http.get(`${API_BASE}/tasks`, taskQueryParams(filters));
      const workspaceId = filters.workspaceId || null;
      return cacheValue(scopedCacheKey(TASK_CACHE_KEY, workspaceId), response.data);
    } catch (error) {
      const workspaceId = filters.workspaceId || null;
      if (isNetworkError(error)) {
        return { ...readCache(scopedCacheKey(TASK_CACHE_KEY, workspaceId), { tasks: [] }), offline: true };
      }
      throw error;
    }
  },

  getStats: async (workspaceId = null) => {
    try {
      const response = await http.get(`${API_BASE}/stats`, workspaceParams(workspaceId));
      return cacheValue(scopedCacheKey(STATS_CACHE_KEY, workspaceId), response.data);
    } catch (error) {
      if (isNetworkError(error)) {
        return { ...readCache(scopedCacheKey(STATS_CACHE_KEY, workspaceId), { total: 0, todo: 0, in_progress: 0, done: 0, overdue: 0 }), offline: true };
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
  getTaskAttachments: async (taskId) => (await http.get(`${API_BASE}/tasks/${taskId}/attachments`)).data,
  uploadTaskAttachment: async (taskId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return (await http.post(`${API_BASE}/tasks/${taskId}/attachments`, formData)).data;
  },
  downloadTaskAttachment: async (taskId, attachmentId) => (
    await http.get(`${API_BASE}/tasks/${taskId}/attachments/${attachmentId}/download`, {
      responseType: "blob",
    })
  ).data,
  deleteTaskAttachment: async (taskId, attachmentId) => (
    await http.delete(`${API_BASE}/tasks/${taskId}/attachments/${attachmentId}`)
  ).data,

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
  createTaskFromChat: async (taskData, workspaceId = null) => (
    await http.post(`${API_BASE}/agent/create-from-chat`, { ...taskData, workspace_id: workspaceId })
  ).data,
  createSubtasks: async (subtasks, parentTag = "", workspaceId = null) => (
    await http.post(`${API_BASE}/agent/create-subtasks`, { subtasks, parent_tag: parentTag, workspace_id: workspaceId })
  ).data,

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

  getWorkspaces: async () => (await http.get(`${API_BASE}/workspaces`)).data,
  createWorkspace: async (name) => (await http.post(`${API_BASE}/workspaces`, { name })).data,
  inviteWorkspaceMember: async (workspaceId, email) => (
    await http.post(`${API_BASE}/workspaces/${workspaceId}/invite`, { email })
  ).data,
  getWorkspaceMembers: async (workspaceId) => (await http.get(`${API_BASE}/workspaces/${workspaceId}/members`)).data,
  removeWorkspaceMember: async (workspaceId, userId) => (
    await http.delete(`${API_BASE}/workspaces/${workspaceId}/members/${userId}`)
  ).data,
  deleteWorkspace: async (workspaceId) => (await http.delete(`${API_BASE}/workspaces/${workspaceId}`)).data,
};
