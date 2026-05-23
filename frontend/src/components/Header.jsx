import { Search, Plus, WifiOff } from "lucide-react";

const Header = ({ taskCount, searchQuery, setSearchQuery, onAddTask, isOffline }) => {
  return (
    <header className="sticky top-0 z-40 flex min-h-[76px] items-center justify-between border-b border-slate-200 bg-white/90 px-8 backdrop-blur">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-950">My Tasks</h1>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
            {taskCount} tasks
          </span>
          {isOffline && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 ring-1 ring-amber-100">
              <WifiOff className="h-4 w-4" /> Offline
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">A clean place to plan, focus, and finish.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-72 rounded-lg border border-slate-200 bg-slate-50 py-2.5 pr-4 pl-11 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
          />
        </div>

        <button
          onClick={onAddTask}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 hover:shadow-md"
        >
          <Plus className="h-5 w-5" />
          Add Task
        </button>
      </div>
    </header>
  );
};

export default Header;
