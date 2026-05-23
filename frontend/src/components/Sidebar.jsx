import {
  CheckCircle,
  LayoutDashboard,
  List,
  Calendar,
  Filter,
  Sparkles,
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
    { id: "list", icon: List, label: "List" },
    { id: "calendar", icon: Calendar, label: "Calendar" },
    { id: "productivity", icon: Sparkles, label: "Focus" },
  ];

  return (
    <aside className="fixed z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-lg font-semibold text-slate-950">TaskFlow</span>
            <span className="text-xs font-medium text-slate-500">AI workspace</span>
          </div>
        </div>
      </div>

      <nav className="p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveView(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mx-4 mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Filter className="h-4 w-4" />
          Filter
        </h3>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
        >
          <option value="all">All priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <div className="mx-4 mt-auto mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Overview
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total</span>
            <span className="font-semibold text-slate-950">{stats.total}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">In progress</span>
            <span className="font-semibold text-amber-600">{stats.in_progress}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Completed</span>
            <span className="font-semibold text-emerald-600">{stats.done}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Overdue</span>
            <span className="font-semibold text-red-600">{stats.overdue}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
