import { Plus, UserRound, UsersRound } from "lucide-react";

const WorkspaceSwitcher = ({
  workspaces = [],
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onInvite,
}) => {
  return (
    <div className="mx-4 mt-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
          Workspace
        </h3>
        <button
          onClick={onCreateWorkspace}
          className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Create workspace"
          title="Create workspace"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1">
        <button
          onClick={() => onSelectWorkspace(null)}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
            !activeWorkspaceId
              ? "bg-cyan-400/10 text-cyan-700 ring-1 ring-cyan-400/20 dark:text-cyan-200"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <UserRound className="h-4 w-4" />
          <span className="min-w-0 flex-1 truncate">Personal</span>
        </button>

        {workspaces.map((workspace) => (
          <div key={workspace.id} className="flex items-center gap-1">
            <button
              onClick={() => onSelectWorkspace(workspace.id)}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                activeWorkspaceId === workspace.id
                  ? "bg-cyan-400/10 text-cyan-700 ring-1 ring-cyan-400/20 dark:text-cyan-200"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              <UsersRound className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
            </button>
            {workspace.role === "owner" && (
              <button
                onClick={() => onInvite(workspace)}
                className="rounded-md p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label={`Invite teammate to ${workspace.name}`}
                title="Invite teammate"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkspaceSwitcher;
