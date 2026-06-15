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
import AuthView from "./components/AuthView";

const AppShellSkeleton = ({ activeView }) => {
  if (activeView === "list") {
    return (
      <div className="flex-1 p-4 sm:p-6">
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-4 h-10 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`list-skeleton-${index}`}
                className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/80"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeView === "calendar") {
    return (
      <div className="flex-1 p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-7 gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          {Array.from({ length: 42 }).map((_, index) => (
            <div
              key={`calendar-skeleton-${index}`}
              className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/80"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 gap-5 overflow-x-auto p-4 sm:p-6">
      {Array.from({ length: 3 }).map((_, columnIndex) => (
        <div
          key={`board-skeleton-${columnIndex}`}
          className="min-w-[300px] max-w-[300px] rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
        >
          <div className="mb-4 h-6 w-2/3 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, cardIndex) => (
              <div
                key={`board-card-skeleton-${columnIndex}-${cardIndex}`}
                className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/80"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

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
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("taskflow-theme");
    if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

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
    setIsLoading(true);
    try {
      const [tasksData, statsData] = await Promise.all([
        api.getTasks(),
        api.getStats(),
      ]);
      setTasks(tasksData.tasks || []);
      setStats(statsData);
      setIsOffline(
        Boolean(tasksData.offline || statsData.offline || !navigator.onLine),
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast("Error fetching tasks", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const response = await api.me();
        if (response?.success && response?.user) {
          setCurrentUser(response.user);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    };

    bootstrapAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setTasks([]);
      setIsLoading(false);
      return;
    }
    fetchData();
  }, [currentUser, fetchData]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("taskflow-theme", theme);
  }, [theme]);

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

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Clear local auth state even if the server session already expired.
    }
    setCurrentUser(null);
    setIsSidebarOpen(false);
  };

  if (isAuthChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          Preparing your workspace...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView onAuthenticated={setCurrentUser} />;
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute -top-36 -left-24 h-80 w-80 rounded-full bg-indigo-400/25 blur-3xl dark:bg-indigo-600/20" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-96 w-96 rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-500/10" />
      <div className="pointer-events-none absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent dark:via-cyan-300/70" />

      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        stats={stats}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="relative z-10 flex flex-1 flex-col lg:ml-64">
        <Header
          taskCount={filteredTasks.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onAddTask={() => handleAddTask()}
          isOffline={isOffline}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          theme={theme}
          currentUser={currentUser}
          onLogout={handleLogout}
          onToggleTheme={() =>
            setTheme((currentTheme) =>
              currentTheme === "dark" ? "light" : "dark",
            )
          }
        />

        {/* Views */}
        {isLoading ? (
          <AppShellSkeleton activeView={activeView} />
        ) : (
          <>
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
          </>
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
