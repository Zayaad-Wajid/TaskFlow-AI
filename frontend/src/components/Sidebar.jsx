import {
  X,
  CheckCircle,
  LayoutDashboard,
  List,
  Calendar,
  Filter,
  Sparkles,
} from "lucide-react";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

const Sidebar = ({
  activeView,
  setActiveView,
  stats,
  priorityFilter,
  setPriorityFilter,
  isOpen,
  onClose,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onInviteWorkspace,
}) => {
  const navItems = [
    { id: "board", icon: LayoutDashboard, label: "Board" },
    { id: "list", icon: List, label: "List" },
    { id: "calendar", icon: Calendar, label: "Calendar" },
    { id: "productivity", icon: Sparkles, label: "Focus" },
  ];

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/60 transition-opacity lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:translate-x-0 lg:border-slate-800 lg:bg-slate-950 lg:shadow-none dark:border-slate-800 dark:bg-slate-950 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-slate-200 p-6 lg:border-slate-800 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/20 dark:text-cyan-300 dark:ring-cyan-400/20">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-lg font-semibold text-slate-900 dark:text-white">
                TaskFlow-AI
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Collab workspace
              </span>
            </div>
            <button
              onClick={onClose}
              className="ml-auto rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100 lg:hidden dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Close navigation menu"
            >
              <X className="h-4 w-4" />
            </button>
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
                    onClick={() => {
                      setActiveView(item.id);
                      onClose?.();
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-cyan-400/10 text-cyan-700 ring-1 ring-cyan-400/20 dark:text-cyan-200"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
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

        <WorkspaceSwitcher
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={(workspaceId) => {
            onSelectWorkspace(workspaceId);
            onClose?.();
          }}
          onCreateWorkspace={onCreateWorkspace}
          onInvite={onInviteWorkspace}
        />

        <div className="mx-4 mt-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
            <Filter className="h-4 w-4" />
            Filter
          </h3>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="all">All priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div className="mx-4 mt-auto mb-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
            Overview
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Total</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {stats.total}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                In progress
              </span>
              <span className="font-semibold text-amber-600">
                {stats.in_progress}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                Completed
              </span>
              <span className="font-semibold text-emerald-600">
                {stats.done}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                Overdue
              </span>
              <span className="font-semibold text-red-600">
                {stats.overdue}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
