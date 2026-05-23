import axios from "axios";

const API_BASE = "/api";
const TASK_CACHE_KEY = "taskflow-offline-tasks";
const STATS_CACHE_KEY = "taskflow-offline-stats";

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

export const api = {
  // Get all tasks with offline cache fallback
  getTasks: async () => {
    try {
      const response = await axios.get(`${API_BASE}/tasks`);
      return cacheValue(TASK_CACHE_KEY, response.data);
    } catch (error) {
      if (isNetworkError(error)) {
        return { ...readCache(TASK_CACHE_KEY, { tasks: [] }), offline: true };
      }
      throw error;
    }
  },

  // Get stats with offline cache fallback
  getStats: async () => {
    try {
      const response = await axios.get(`${API_BASE}/stats`);
      return cacheValue(STATS_CACHE_KEY, response.data);
    } catch (error) {
      if (isNetworkError(error)) {
        return { ...readCache(STATS_CACHE_KEY, { total: 0, todo: 0, in_progress: 0, done: 0, overdue: 0 }), offline: true };
      }
      throw error;
    }
  },

  // Add a new task
  addTask: async (task) => {
    const response = await axios.post(`${API_BASE}/tasks`, task);
    return response.data;
  },

  // Update a task
  updateTask: async (taskId, task) => {
    const response = await axios.put(`${API_BASE}/tasks/${taskId}`, task);
    return response.data;
  },

  // Delete a task
  deleteTask: async (taskId) => {
    const response = await axios.delete(`${API_BASE}/tasks/${taskId}`);
    return response.data;
  },

  // Update task status
  updateTaskStatus: async (taskId, status) => {
    const response = await axios.patch(`${API_BASE}/tasks/${taskId}/status`, {
      status,
    });
    return response.data;
  },

  addTaskComment: async (taskId, comment) => {
    const response = await axios.post(`${API_BASE}/tasks/${taskId}/comments`, comment);
    return response.data;
  },

  updateTaskDependencies: async (taskId, dependencyIds) => {
    const response = await axios.put(`${API_BASE}/tasks/${taskId}/dependencies`, {
      dependency_ids: dependencyIds,
    });
    return response.data;
  },

  addTimeLog: async (taskId, log) => {
    const response = await axios.post(`${API_BASE}/tasks/${taskId}/time-logs`, log);
    return response.data;
  },

  addAttachment: async (taskId, attachment) => {
    const response = await axios.post(`${API_BASE}/tasks/${taskId}/attachments`, attachment);
    return response.data;
  },

  deleteAttachment: async (taskId, attachmentId) => {
    const response = await axios.delete(`${API_BASE}/tasks/${taskId}/attachments/${attachmentId}`);
    return response.data;
  },

  snoozeReminder: async (taskId, minutes) => {
    const response = await axios.patch(`${API_BASE}/tasks/${taskId}/reminder/snooze`, { minutes });
    return response.data;
  },

  getDueReminders: async () => {
    const response = await axios.get(`${API_BASE}/reminders/due`);
    return response.data;
  },

  getActivity: async () => {
    const response = await axios.get(`${API_BASE}/activity`);
    return response.data;
  },

  getTemplates: async () => {
    const response = await axios.get(`${API_BASE}/templates`);
    return response.data;
  },

  addTemplate: async (template) => {
    const response = await axios.post(`${API_BASE}/templates`, template);
    return response.data;
  },

  createTaskFromTemplate: async (templateId, overrides = {}) => {
    const response = await axios.post(`${API_BASE}/templates/${templateId}/create-task`, overrides);
    return response.data;
  },

  updateIntegrations: async (integrations) => {
    const response = await axios.put(`${API_BASE}/integrations`, integrations);
    return response.data;
  },

  syncGoogleCalendar: async () => {
    const response = await axios.post(`${API_BASE}/integrations/google-calendar/sync`);
    return response.data;
  },

  sendSlackNotification: async (message) => {
    const response = await axios.post(`${API_BASE}/integrations/slack/notify`, { message });
    return response.data;
  },

  // ==================== AI Agent Endpoints ====================

  // Send a chat message to the AI agent
  agentChat: async (message) => {
    const response = await axios.post(`${API_BASE}/agent/chat`, { message });
    return response.data;
  },

  // Parse natural language into task data
  parseTask: async (text) => {
    const response = await axios.post(`${API_BASE}/agent/parse-task`, { text });
    return response.data;
  },

  // Break down a task into subtasks
  breakdownTask: async (title, description = "") => {
    const response = await axios.post(`${API_BASE}/agent/breakdown`, {
      title,
      description,
    });
    return response.data;
  },

  // Get daily plan
  getDayPlan: async () => {
    const response = await axios.get(`${API_BASE}/agent/plan-day`);
    return response.data;
  },

  // Get productivity insights
  getInsights: async () => {
    const response = await axios.get(`${API_BASE}/agent/insights`);
    return response.data;
  },

  getPriorities: async () => {
    const response = await axios.get(`${API_BASE}/agent/prioritize`);
    return response.data;
  },

  getSchedule: async () => {
    const response = await axios.get(`${API_BASE}/agent/schedule`);
    return response.data;
  },

  applySchedule: async (blocks) => {
    const response = await axios.post(`${API_BASE}/agent/apply-schedule`, { blocks });
    return response.data;
  },

  getDailySummary: async () => {
    const response = await axios.get(`${API_BASE}/agent/daily-summary`);
    return response.data;
  },

  getWorkloadForecast: async () => {
    const response = await axios.get(`${API_BASE}/agent/workload-forecast`);
    return response.data;
  },

  // Create task from chat
  createTaskFromChat: async (taskData) => {
    const response = await axios.post(
      `${API_BASE}/agent/create-from-chat`,
      taskData
    );
    return response.data;
  },

  // Create multiple subtasks
  createSubtasks: async (subtasks, parentTag = "") => {
    const response = await axios.post(`${API_BASE}/agent/create-subtasks`, {
      subtasks,
      parent_tag: parentTag,
    });
    return response.data;
  },

  getHabits: async () => {
    const response = await axios.get(`${API_BASE}/habits`);
    return response.data;
  },

  addHabit: async (habit) => {
    const response = await axios.post(`${API_BASE}/habits`, habit);
    return response.data;
  },

  toggleHabit: async (habitId, date) => {
    const response = await axios.patch(`${API_BASE}/habits/${habitId}/toggle`, { date });
    return response.data;
  },

  deleteHabit: async (habitId) => {
    const response = await axios.delete(`${API_BASE}/habits/${habitId}`);
    return response.data;
  },
};
