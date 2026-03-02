import {
  CheckCircle,
  LayoutDashboard,
  List,
  Calendar,
  Filter,
} from "lucide-react";

const Sidebar = ({
  activeView,
  setActiveView,
  stats,
  priorityFilter,
  setPriorityFilter,
}) => {
  const navItems = [
    { id: "board", icon: LayoutDashboard, label: "Board" },
    { id: "list", icon: List, label: "List View" },
    { id: "calendar", icon: Calendar, label: "Calendar" },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-700 fixed h-screen flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-violet-500" />
          <span className="text-xl font-bold text-violet-500">TaskFlow</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === item.id
                      ? "bg-violet-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Filters */}
      <div className="px-6 py-4 border-t border-slate-700">
        <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-400 block mb-2">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
            >
              <option value="all">All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-auto px-6 py-4 border-t border-slate-700">
        <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-4">
          Overview
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Total Tasks</span>
            <span className="font-semibold text-white">{stats.total}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">In Progress</span>
            <span className="font-semibold text-amber-500">
              {stats.in_progress}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Completed</span>
            <span className="font-semibold text-emerald-500">{stats.done}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Overdue</span>
            <span className="font-semibold text-red-500">{stats.overdue}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
