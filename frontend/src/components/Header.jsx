import { Download, LogOut, Menu, Moon, Plus, Search, Sun, WifiOff } from "lucide-react";
import { useState } from "react";

const Header = ({
  taskCount,
  searchQuery,
  setSearchQuery,
  onAddTask,
  isOffline,
  onOpenSidebar,
  theme,
  onToggleTheme,
  currentUser,
  onLogout,
  onExport,
}) => {
  const [exportFormat, setExportFormat] = useState("csv");

  return (
    <header className="sticky top-0 z-40 flex min-h-[76px] flex-col gap-4 border-b border-slate-200/80 bg-white/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-100 lg:hidden dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="display-font text-xl font-semibold text-slate-900 sm:text-2xl dark:text-white">
              TaskFlow-AI Dashboard
            </h1>
            <p className="mt-0.5 text-xs text-slate-600 sm:text-sm dark:text-slate-400">
              Real-time task collaboration with focused execution.
            </p>
          </div>
          <span className="hidden rounded-full bg-slate-900 px-3 py-1 text-sm font-medium text-slate-300 ring-1 ring-slate-800 sm:inline-flex dark:bg-slate-900">
            {taskCount} tasks
          </span>
          {isOffline && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-sm font-medium text-amber-300 ring-1 ring-amber-400/20">
              <WifiOff className="h-4 w-4" /> Offline
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4" /> Light
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" /> Dark
              </>
            )}
          </button>

          <div className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:block">
            {currentUser?.name || currentUser?.email}
          </div>

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <div className="flex w-full items-center gap-3">
        <div className="relative flex-1 sm:flex-none">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search tasks"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-4 pl-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-400/10 sm:w-80 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex shrink-0 items-center">
          <select
            value={exportFormat}
            onChange={(event) => setExportFormat(event.target.value)}
            aria-label="Export format"
            className="h-10 rounded-l-lg border border-r-0 border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
          <button
            onClick={() => onExport(exportFormat)}
            title={`Export filtered tasks as ${exportFormat.toUpperCase()}`}
            className="inline-flex h-10 items-center gap-2 rounded-r-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>

        <button
          onClick={onAddTask}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 hover:shadow-md"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Add Task</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
