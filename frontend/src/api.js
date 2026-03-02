import axios from "axios";

const API_BASE = "/api";

export const api = {
  // Get all tasks
  getTasks: async () => {
    const response = await axios.get(`${API_BASE}/tasks`);
    return response.data;
  },

  // Get stats
  getStats: async () => {
    const response = await axios.get(`${API_BASE}/stats`);
    return response.data;
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
};
