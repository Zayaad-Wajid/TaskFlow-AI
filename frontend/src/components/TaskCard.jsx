import {
  Pencil,
  Trash2,
  Calendar,
  GripVertical,
  User,
  Clock,
  Link2,
  Repeat,
  Bell,
  Paperclip,
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
    High: "bg-red-500/20 text-red-400",
    Medium: "bg-amber-500/20 text-amber-400",
    Low: "bg-emerald-500/20 text-emerald-400",
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
      className={`group bg-slate-800/80 rounded-xl p-4 mb-3 cursor-grab border border-transparent hover:border-violet-500/50 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        isDragging ? "opacity-50 rotate-2" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 p-1 text-slate-500 hover:text-slate-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-white leading-tight">
              {task.title}
            </h3>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(task)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-md transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {task.description && (
            <p className="text-sm text-slate-400 mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {(task.assigned_to || task.scheduled_start || task.focus_minutes) && (
            <div className="flex gap-3 text-xs text-slate-500 mb-3 flex-wrap">
              {task.assigned_to && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" /> {task.assigned_to}
                </span>
              )}
              {task.scheduled_start && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(task.scheduled_start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              )}
              {task.focus_minutes > 0 && (
                <span className="flex items-center gap-1">
                  <Timer className="w-3 h-3" /> {task.focus_minutes}m logged
                </span>
              )}
            </div>
          )}

          {(task.is_blocked || task.recurring?.enabled || task.reminder?.enabled || task.attachments?.length > 0) && (
            <div className="flex gap-2 text-xs mb-3 flex-wrap">
              {task.is_blocked && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/15 text-red-300">
                  <Link2 className="w-3 h-3" /> Blocked
                </span>
              )}
              {task.recurring?.enabled && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/15 text-cyan-300">
                  <Repeat className="w-3 h-3" /> {task.recurring.cadence}
                </span>
              )}
              {task.reminder?.enabled && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/15 text-amber-300">
                  <Bell className="w-3 h-3" /> Reminder
                </span>
              )}
              {task.attachments?.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-700 text-slate-300">
                  <Paperclip className="w-3 h-3" /> {task.attachments.length}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-1.5 flex-wrap">
              {task.tags?.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority]}`}
              >
                {task.priority}
              </span>

              {task.due_date && (
                <span
                  className={`flex items-center gap-1 text-xs ${isOverdue() ? "text-red-400" : "text-slate-500"}`}
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
