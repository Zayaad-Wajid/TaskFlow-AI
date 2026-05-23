import { useState, useEffect, useCallback } from "react";
import { api } from "./api";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import BoardView from "./components/BoardView";
import ListView from "./components/ListView";
import CalendarView from "./components/CalendarView";
import TaskModal from "./components/TaskModal";
import DeleteModal from "./components/DeleteModal";
import Toast from "./components/Toast";
import AIChat from "./components/AIChat";
import ProductivityView from "./components/ProductivityView";

function App() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    todo: 0,
    in_progress: 0,
    done: 0,
    overdue: 0,
  });
  const [activeView, setActiveView] = useState("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [defaultStatus, setDefaultStatus] = useState("To Do");
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Toast state
  const [toast, setToast] = useState({
    isVisible: false,
    message: "",
    type: "success",
  });

  const showToast = (message, type = "success") => {
    setToast({ isVisible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, isVisible: false });
  };

  // Fetch tasks and stats
  const fetchData = useCallback(async () => {
    try {
      const [tasksData, statsData] = await Promise.all([
        api.getTasks(),
        api.getStats(),
      ]);
      setTasks(tasksData.tasks || []);
      setStats(statsData);
      setIsOffline(Boolean(tasksData.offline || statsData.offline || !navigator.onLine));
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast("Error fetching tasks", "error");
    }
  }, []);

  useEffect(() => {
    // Initial API/cache hydration for the app shell.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const goOnline = () => {
      setIsOffline(false);
      fetchData();
    };
    const goOffline = () => setIsOffline(true);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [fetchData]);

  // Filter tasks based on search and priority
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  // Task operations
  const handleAddTask = (status = "To Do") => {
    setCurrentTask(null);
    setDefaultStatus(status);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task) => {
    setCurrentTask(task);
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = (taskId) => {
    setTaskToDelete(taskId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.deleteTask(taskToDelete);
      await fetchData();
      showToast("Task deleted successfully");
    } catch (error) {
      console.error("Error deleting task:", error);
      showToast("Error deleting task", "error");
    }
    setIsDeleteModalOpen(false);
    setTaskToDelete(null);
  };

  const handleSaveTask = async (taskData, taskId) => {
    try {
      if (taskId) {
        await api.updateTask(taskId, taskData);
        showToast("Task updated successfully");
      } else {
        await api.addTask(taskData);
        showToast("Task added successfully");
      }
      await fetchData();
    } catch (error) {
      console.error("Error saving task:", error);
      showToast("Error saving task", "error");
    }
    setIsTaskModalOpen(false);
    setCurrentTask(null);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.updateTaskStatus(taskId, newStatus);
      await fetchData();
      showToast("Task moved successfully");
    } catch (error) {
      console.error("Error updating task status:", error);
      showToast("Error moving task", "error");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        stats={stats}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
      />

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col">
        <Header
          taskCount={filteredTasks.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onAddTask={() => handleAddTask()}
          isOffline={isOffline}
        />

        {/* Views */}
        {activeView === "board" && (
          <BoardView
            tasks={filteredTasks}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
          />
        )}

        {activeView === "list" && (
          <ListView
            tasks={filteredTasks}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeView === "calendar" && (
          <CalendarView tasks={filteredTasks} onEditTask={handleEditTask} />
        )}

        {activeView === "productivity" && (
          <ProductivityView
            tasks={filteredTasks}
            onRefresh={fetchData}
            onEditTask={handleEditTask}
            showToast={showToast}
          />
        )}
      </main>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setCurrentTask(null);
        }}
        onSave={handleSaveTask}
        task={currentTask}
        defaultStatus={defaultStatus}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={confirmDelete}
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* AI Chat Assistant */}
      <AIChat onRefresh={fetchData} />
    </div>
  );
}

export default App;
