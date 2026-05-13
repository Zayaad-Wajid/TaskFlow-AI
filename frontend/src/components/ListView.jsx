import { Pencil, Trash2, Calendar } from "lucide-react";

const ListView = ({ tasks, onEditTask, onDeleteTask }) => {
  const priorityColors = {
    High: "bg-red-500/20 text-red-400",
    Medium: "bg-amber-500/20 text-amber-400",
    Low: "bg-emerald-500/20 text-emerald-400",
  };

  const statusColors = {
    "To Do": "bg-indigo-500/20 text-indigo-400",
    "In Progress": "bg-amber-500/20 text-amber-400",
    Done: "bg-emerald-500/20 text-emerald-400",
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isOverdue = (task) => {
    if (!task.due_date || task.status === "Done") return false;
    return new Date(task.due_date) < new Date();
  };

  return (
    <div className="p-6 flex-1">
      <div className="bg-slate-900/50 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-800/50">
              <th className="px-6 py-4 text-left text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Task
              </th>
              <th className="px-6 py-4 text-left text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Priority
              </th>
              <th className="px-6 py-4 text-left text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Due Date
              </th>
              <th className="px-6 py-4 text-left text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Assignee
              </th>
              <th className="px-6 py-4 text-left text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  No tasks found
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr
                  key={task.id}
                  className="border-t border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${statusColors[task.status]}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          task.status === "To Do"
                            ? "bg-indigo-400"
                            : task.status === "In Progress"
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                        }`}
                      ></span>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <h3 className="font-medium text-white">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-slate-400 mt-1 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-medium ${priorityColors[task.priority]}`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`flex items-center gap-2 text-sm ${isOverdue(task) ? "text-red-400" : "text-slate-400"}`}
                    >
                      <Calendar className="w-4 h-4" />
                      {formatDate(task.due_date)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {task.assigned_to || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEditTask(task)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListView;
