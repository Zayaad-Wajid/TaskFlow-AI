import {
  Pencil,
  Trash2,
  Calendar,
  GripVertical,
  User,
  Clock,
  Link2,
  Repeat,
  Timer,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const TaskCard = ({ task, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityColors = {
    High: "bg-red-400/10 text-red-300 ring-red-400/20",
    Medium: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
    Low: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isOverdue = () => {
    if (!task.due_date || task.status === "Done") return false;
    return new Date(task.due_date) < new Date();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group mb-3 cursor-grab rounded-lg border border-slate-200 bg-white/85 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-400/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/80 dark:hover:shadow-cyan-950/20 ${
        isDragging ? "opacity-50 rotate-2" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab rounded-md p-1 text-slate-500 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-900 dark:hover:text-slate-300"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium leading-tight text-slate-900 dark:text-slate-100">
              {task.title}
            </h3>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(task)}
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-200"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-400/10 hover:text-red-300"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {task.description && (
            <p className="mb-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
              {task.description}
            </p>
          )}

          {(task.assigned_to || task.scheduled_start || task.focus_minutes) && (
            <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
              {task.assigned_to && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" /> {task.assigned_to}
                </span>
              )}
              {task.scheduled_start && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(task.scheduled_start).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {task.focus_minutes > 0 && (
                <span className="flex items-center gap-1">
                  <Timer className="w-3 h-3" /> {task.focus_minutes}m logged
                </span>
              )}
            </div>
          )}

          {(task.is_blocked || task.recurring?.enabled) && (
            <div className="flex gap-2 text-xs mb-3 flex-wrap">
              {task.is_blocked && (
                <span className="inline-flex items-center gap-1 rounded bg-red-400/10 px-2 py-1 text-red-300 ring-1 ring-red-400/20">
                  <Link2 className="w-3 h-3" /> Blocked
                </span>
              )}
              {task.recurring?.enabled && (
                <span className="inline-flex items-center gap-1 rounded bg-cyan-400/10 px-2 py-1 text-cyan-300 ring-1 ring-cyan-400/20">
                  <Repeat className="w-3 h-3" /> {task.recurring.cadence}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-1.5 flex-wrap">
              {task.tags?.map((tag, idx) => (
                <span
                  key={idx}
                  className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${priorityColors[task.priority]}`}
              >
                {task.priority}
              </span>

              {task.due_date && (
                <span
                  className={`flex items-center gap-1 text-xs ${isOverdue() ? "text-red-500 dark:text-red-300" : "text-slate-600 dark:text-slate-400"}`}
                >
                  <Calendar className="w-3 h-3" />
                  {formatDate(task.due_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
