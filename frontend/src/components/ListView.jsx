import { Pencil, Trash2, Calendar } from "lucide-react";

const ListView = ({ tasks, onEditTask, onDeleteTask }) => {
  const priorityColors = {
    High: "bg-red-50 text-red-700 ring-red-100",
    Medium: "bg-amber-50 text-amber-700 ring-amber-100",
    Low: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  };

  const statusColors = {
    "To Do": "bg-cyan-50 text-cyan-700 ring-cyan-100",
    "In Progress": "bg-amber-50 text-amber-700 ring-amber-100",
    Done: "bg-emerald-50 text-emerald-700 ring-emerald-100",
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
    <div className="flex-1 bg-slate-50 p-6">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Task
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Priority
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Due Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Assignee
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                  className="border-t border-slate-100 transition-colors hover:bg-cyan-50/40"
                >
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ${statusColors[task.status]}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          task.status === "To Do"
                            ? "bg-cyan-500"
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
                      <h3 className="font-medium text-slate-950">{task.title}</h3>
                      {task.description && (
                        <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${priorityColors[task.priority]}`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`flex items-center gap-2 text-sm ${isOverdue(task) ? "text-red-600" : "text-slate-500"}`}
                    >
                      <Calendar className="w-4 h-4" />
                      {formatDate(task.due_date)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {task.assigned_to || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEditTask(task)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
