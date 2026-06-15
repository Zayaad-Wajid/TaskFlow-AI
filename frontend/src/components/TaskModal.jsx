import { X } from "lucide-react";
import { useEffect, useState } from "react";

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 transition placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-400/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const emptyForm = (defaultStatus = "To Do") => ({
  title: "",
  description: "",
  status: defaultStatus,
  priority: "Medium",
  due_date: "",
  assigned_to: "",
  estimate_minutes: 30,
  subtasks: "",
  recurring_enabled: false,
  recurring_cadence: "",
  recurring_next_due_date: "",
  tags: "",
});

const TaskModal = ({ isOpen, onClose, onSave, task, defaultStatus }) => {
  const [formData, setFormData] = useState(emptyForm(defaultStatus));

  useEffect(() => {
    if (task) {
      // Keep the editable form synchronized when a different task is opened.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "To Do",
        priority: task.priority || "Medium",
        due_date: task.due_date || "",
        assigned_to: task.assigned_to || "",
        estimate_minutes: task.estimate_minutes || 30,
        subtasks:
          task.subtasks?.map((item) => item.title || item).join("\n") || "",
        recurring_enabled: Boolean(task.recurring?.enabled),
        recurring_cadence: task.recurring?.cadence || "",
        recurring_next_due_date: task.recurring?.next_due_date || "",
        tags: task.tags?.join(", ") || "",
      });
    } else {
      setFormData(emptyForm(defaultStatus || "To Do"));
    }
  }, [task, defaultStatus, isOpen]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const taskData = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.due_date,
      assigned_to: formData.assigned_to,
      estimate_minutes: Number(formData.estimate_minutes) || 30,
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      subtasks: formData.subtasks
        .split("\n")
        .map((title) => title.trim())
        .filter(Boolean)
        .map((title, index) => ({
          id: task?.subtasks?.[index]?.id || `${Date.now()}-${index}`,
          title,
          done: task?.subtasks?.[index]?.done || false,
        })),
      recurring: {
        enabled: formData.recurring_enabled,
        cadence: formData.recurring_enabled
          ? formData.recurring_cadence || "Daily"
          : "",
        next_due_date: formData.recurring_enabled
          ? formData.recurring_next_due_date || formData.due_date
          : "",
      },
    };
    onSave(taskData, task?.id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in duration-200 max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="display-font text-lg font-semibold text-slate-900 dark:text-white">
              {task ? "Edit task" : "Add task"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Keep the task clear enough to act on.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(event) =>
                setFormData({ ...formData, title: event.target.value })
              }
              placeholder="Enter task title"
              required
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(event) =>
                setFormData({ ...formData, description: event.target.value })
              }
              placeholder="Add helpful details"
              rows={3}
              className={`${fieldClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(event) =>
                  setFormData({ ...formData, status: event.target.value })
                }
                className={fieldClass}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(event) =>
                  setFormData({ ...formData, priority: event.target.value })
                }
                className={fieldClass}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Due date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(event) =>
                  setFormData({ ...formData, due_date: event.target.value })
                }
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Estimate
              </label>
              <input
                type="number"
                min="15"
                step="15"
                value={formData.estimate_minutes}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    estimate_minutes: Number(event.target.value),
                  })
                }
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Assignee
              </label>
              <input
                type="text"
                value={formData.assigned_to}
                onChange={(event) =>
                  setFormData({ ...formData, assigned_to: event.target.value })
                }
                placeholder="Name"
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Subtasks
            </label>
            <textarea
              value={formData.subtasks}
              onChange={(event) =>
                setFormData({ ...formData, subtasks: event.target.value })
              }
              placeholder={"Draft outline\nReview with team\nShip final"}
              rows={3}
              className={`${fieldClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-950/70">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={formData.recurring_enabled}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    recurring_enabled: event.target.checked,
                  })
                }
                className="accent-cyan-600"
              />
              Recurring
            </label>
            <select
              value={formData.recurring_cadence}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  recurring_cadence: event.target.value,
                })
              }
              disabled={!formData.recurring_enabled}
              className={`${fieldClass} disabled:opacity-50`}
            >
              <option value="">Cadence</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
            </select>
            <input
              type="date"
              value={formData.recurring_next_due_date}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  recurring_next_due_date: event.target.value,
                })
              }
              disabled={!formData.recurring_enabled}
              className={`${fieldClass} disabled:opacity-50`}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(event) =>
                setFormData({ ...formData, tags: event.target.value })
              }
              placeholder="design, urgent, review"
              className={fieldClass}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-cyan-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-cyan-700"
            >
              {task ? "Update task" : "Add task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
