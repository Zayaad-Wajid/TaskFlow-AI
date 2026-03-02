import { Search, Plus } from "lucide-react";

const Header = ({ taskCount, searchQuery, setSearchQuery, onAddTask }) => {
  return (
    <header className="h-[70px] px-8 flex items-center justify-between bg-slate-900 border-b border-slate-700 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold text-white">My Tasks</h1>
        <span className="px-3 py-1 bg-slate-800 rounded-full text-sm text-slate-400">
          {taskCount} tasks
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 pr-4 py-2.5 w-72 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <button
          onClick={onAddTask}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Add Task
        </button>
      </div>
    </header>
  );
};

export default Header;
