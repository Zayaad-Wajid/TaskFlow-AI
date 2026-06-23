import { useState, useEffect, useCallback, useRef } from "react";
import { api, getTaskWebSocketUrl } from "./api";
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
import InviteTeammateModal from "./components/InviteTeammateModal";
import { AuthProvider, useAuth } from "./auth/AuthContext";

const calculateStats = (tasks) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    total: tasks.length,
    todo: tasks.filter((task) => task.status === "To Do").length,
    in_progress: tasks.filter((task) => task.status === "In Progress").length,
    done: tasks.filter((task) => task.status === "Done").length,
    high_priority: tasks.filter((task) => task.priority === "High").length,
    blocked: tasks.filter((task) => task.is_blocked).length,
    overdue: tasks.filter((task) => {
      if (!task.due_date || task.status === "Done") return false;
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length,
  };
};

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

function AppContent() {
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagsFilter, setTagsFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalTasks, setTotalTasks] = useState(0);
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
  const { user: currentUser, isAuthChecking, logout } = useAuth();
  const taskSocketRef = useRef(null);
  const activeWorkspaceIdRef = useRef(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [workspaceToInvite, setWorkspaceToInvite] = useState(null);

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
  const totalPages = Math.max(1, Math.ceil(totalTasks / pageSize));

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
        api.getTasks({
          workspaceId: activeWorkspaceId,
          search: searchQuery,
          priority: priorityFilter,
          status: statusFilter,
          tags: tagsFilter,
          sortBy,
          sortOrder,
          page,
          pageSize,
        }),
        api.getStats(activeWorkspaceId),
      ]);
      const taskItems = tasksData.items || tasksData.tasks || [];
      setTasks(taskItems);
      setTotalTasks(tasksData.total ?? taskItems.length);
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
  }, [
    activeWorkspaceId,
    page,
    pageSize,
    priorityFilter,
    searchQuery,
    sortBy,
    sortOrder,
    statusFilter,
    tagsFilter,
  ]);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = await api.getWorkspaces();
      setWorkspaces(response.workspaces || []);
    } catch (error) {
      console.error("Error fetching workspaces:", error);
      showToast("Error fetching workspaces", "error");
    }
  }, []);

  const replaceTasks = useCallback((updater) => {
    setTasks((currentTasks) => {
      const nextTasks = updater(currentTasks);
      setStats(calculateStats(nextTasks));
      return nextTasks;
    });
  }, []);

  const applyTaskEvent = useCallback((event) => {
    if (!event?.type) return;
    const eventWorkspaceId = event.task?.workspace_id || null;
    if (eventWorkspaceId !== activeWorkspaceIdRef.current) return;

    if (event.type === "task_deleted") {
      const deletedTaskId = event.task_id || event.task?.id;
      if (!deletedTaskId) return;
      replaceTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== deletedTaskId),
      );
      return;
    }

    if (
      ["task_created", "task_updated", "task_status_changed"].includes(
        event.type,
      ) &&
      event.task
    ) {
      replaceTasks((currentTasks) => {
        const taskExists = currentTasks.some((task) => task.id === event.task.id);
        if (!taskExists) return [...currentTasks, event.task];
        return currentTasks.map((task) =>
          task.id === event.task.id ? event.task : task,
        );
      });
    }
  }, [replaceTasks]);

  useEffect(() => {
    if (!currentUser) {
      setTasks([]);
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      setIsLoading(false);
      return;
    }
    fetchWorkspaces();
    fetchData();
  }, [currentUser, fetchData, fetchWorkspaces]);

  useEffect(() => {
    activeWorkspaceIdRef.current = activeWorkspaceId;
  }, [activeWorkspaceId]);

  useEffect(() => {
    setPage(1);
  }, [activeWorkspaceId, searchQuery, priorityFilter, statusFilter, tagsFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (!currentUser) return undefined;

    let isStopped = false;
    let retryCount = 0;
    let retryTimer = null;

    const connect = () => {
      const socketUrl = getTaskWebSocketUrl();
      if (!socketUrl || isStopped) return;

      const socket = new WebSocket(socketUrl);
      taskSocketRef.current = socket;

      socket.onopen = () => {
        retryCount = 0;
      };

      socket.onmessage = (message) => {
        try {
          applyTaskEvent(JSON.parse(message.data));
          fetchData();
        } catch (error) {
          console.error("Invalid task update message:", error);
        }
      };

      socket.onclose = () => {
        if (isStopped) return;
        const delay = Math.min(1000 * 2 ** retryCount, 10000);
        retryCount += 1;
        retryTimer = window.setTimeout(connect, delay);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      isStopped = true;
      window.clearTimeout(retryTimer);
      taskSocketRef.current?.close();
      taskSocketRef.current = null;
    };
  }, [currentUser, applyTaskEvent, fetchData]);

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
      const scopedTaskData = { ...taskData, workspace_id: activeWorkspaceId };
      if (taskId) {
        await api.updateTask(taskId, scopedTaskData);
        showToast("Task updated successfully");
      } else {
        await api.addTask(scopedTaskData);
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
    await logout();
    setIsSidebarOpen(false);
  };

  const handleSelectWorkspace = (workspaceId) => {
    setActiveWorkspaceId(workspaceId);
    setIsLoading(true);
  };

  const handleCreateWorkspace = async () => {
    const name = window.prompt("Workspace name");
    if (!name?.trim()) return;
    try {
      const response = await api.createWorkspace(name.trim());
      await fetchWorkspaces();
      setActiveWorkspaceId(response.workspace.id);
      showToast("Workspace created");
    } catch (error) {
      console.error("Error creating workspace:", error);
      showToast("Error creating workspace", "error");
    }
  };

  const handleInviteTeammate = async (email) => {
    if (!workspaceToInvite) return;
    try {
      await api.inviteWorkspaceMember(workspaceToInvite.id, email);
      showToast("Teammate invited");
      setWorkspaceToInvite(null);
    } catch (error) {
      console.error("Error inviting teammate:", error);
      showToast(error.response?.data?.error || "Error inviting teammate", "error");
    }
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
    return <AuthView />;
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
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        tagsFilter={tagsFilter}
        setTagsFilter={setTagsFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={handleSelectWorkspace}
        onCreateWorkspace={handleCreateWorkspace}
        onInviteWorkspace={setWorkspaceToInvite}
      />

      {/* Main Content */}
      <main className="relative z-10 flex flex-1 flex-col lg:ml-64">
        <Header
          taskCount={totalTasks}
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
                tasks={tasks}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onStatusChange={handleStatusChange}
              />
            )}

            {activeView === "list" && (
              <ListView
                tasks={tasks}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            )}

            {activeView === "calendar" && (
              <CalendarView tasks={tasks} onEditTask={handleEditTask} />
            )}

            {activeView === "productivity" && (
              <ProductivityView
                tasks={tasks}
                onRefresh={fetchData}
                onEditTask={handleEditTask}
                showToast={showToast}
              />
            )}
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:px-6 lg:px-8 dark:border-slate-800 dark:text-slate-400">
              <span>
                Page {page} of {totalPages} · {totalTasks} tasks
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium transition enabled:hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:enabled:hover:bg-slate-800"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium transition enabled:hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:enabled:hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            </div>
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

      <InviteTeammateModal
        isOpen={Boolean(workspaceToInvite)}
        workspace={workspaceToInvite}
        onClose={() => setWorkspaceToInvite(null)}
        onInvite={handleInviteTeammate}
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* AI Chat Assistant */}
      <AIChat onRefresh={fetchData} workspaceId={activeWorkspaceId} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
