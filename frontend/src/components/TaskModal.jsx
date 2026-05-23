import { X } from "lucide-react";
import { useState, useEffect } from "react";

const TaskModal = ({ isOpen, onClose, onSave, task, defaultStatus }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "To Do",
    priority: "Medium",
    due_date: "",
    assigned_to: "",
    estimate_minutes: 30,
    subtasks: "",
    recurring_enabled: false,
    recurring_cadence: "",
    recurring_next_due_date: "",
    reminder_enabled: false,
    reminder_remind_at: "",
    reminder_snooze_minutes: 15,
    tags: "",
  });

  useEffect(() => {
    // Keep the editable form synchronized when a different task is opened.
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "To Do",
        priority: task.priority || "Medium",
        due_date: task.due_date || "",
        assigned_to: task.assigned_to || "",
        estimate_minutes: task.estimate_minutes || 30,
        subtasks: task.subtasks?.map((item) => item.title || item).join("\n") || "",
        recurring_enabled: Boolean(task.recurring?.enabled),
        recurring_cadence: task.recurring?.cadence || "",
        recurring_next_due_date: task.recurring?.next_due_date || "",
        reminder_enabled: Boolean(task.reminder?.enabled),
        reminder_remind_at: task.reminder?.remind_at || "",
        reminder_snooze_minutes: task.reminder?.snooze_minutes || 15,
        tags: task.tags?.join(", ") || "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        status: defaultStatus || "To Do",
        priority: "Medium",
        due_date: "",
        assigned_to: "",
        estimate_minutes: 30,
        subtasks: "",
        recurring_enabled: false,
        recurring_cadence: "",
        recurring_next_due_date: "",
        reminder_enabled: false,
        reminder_remind_at: "",
        reminder_snooze_minutes: 15,
        tags: "",
      });
    }
  }, [task, defaultStatus, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const taskData = {
      ...formData,
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t),
      subtasks: formData.subtasks
        .split("\n")
        .map((title) => title.trim())
        .filter(Boolean)
        .map((title, index) => ({ id: task?.subtasks?.[index]?.id || `${Date.now()}-${index}`, title, done: false })),
      recurring: {
        enabled: formData.recurring_enabled,
        cadence: formData.recurring_enabled ? formData.recurring_cadence || "Daily" : "",
        next_due_date: formData.recurring_enabled
          ? formData.recurring_next_due_date || formData.due_date
          : "",
      },
      reminder: {
        enabled: formData.reminder_enabled,
        remind_at: formData.reminder_remind_at,
        snoozed_until: task?.reminder?.snoozed_until || "",
        snooze_minutes: Number(formData.reminder_snooze_minutes) || 15,
      },
    };
    delete taskData.recurring_enabled;
    delete taskData.recurring_cadence;
    delete taskData.recurring_next_due_date;
    delete taskData.reminder_enabled;
    delete taskData.reminder_remind_at;
    delete taskData.reminder_snooze_minutes;
    onSave(taskData, task?.id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200]">
      <div className="bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">
            {task ? "Edit Task" : "Add New Task"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Enter task title..."
              required
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Add a description..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Estimate (minutes)
              </label>
              <input
                type="number"
                min="15"
                step="15"
                value={formData.estimate_minutes}
                onChange={(e) =>
                  setFormData({ ...formData, estimate_minutes: Number(e.target.value) })
                }
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Assignee
            </label>
            <input
              type="text"
              value={formData.assigned_to}
              onChange={(e) =>
                setFormData({ ...formData, assigned_to: e.target.value })
              }
              placeholder="Assign to a teammate..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Subtasks (one per line)
            </label>
            <textarea
              value={formData.subtasks}
              onChange={(e) =>
                setFormData({ ...formData, subtasks: e.target.value })
              }
              placeholder="Draft outline&#10;Review with team&#10;Ship final"
              rows={3}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-slate-700 rounded-xl">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <input
                type="checkbox"
                checked={formData.recurring_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, recurring_enabled: e.target.checked })
                }
                className="accent-violet-500"
              />
              Recurring
            </label>
            <select
              value={formData.recurring_cadence}
              onChange={(e) =>
                setFormData({ ...formData, recurring_cadence: e.target.value })
              }
              disabled={!formData.recurring_enabled}
              className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white disabled:opacity-50 focus:outline-none focus:border-violet-500 transition-colors"
            >
              <option value="">Cadence</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
            </select>
            <input
              type="date"
              value={formData.recurring_next_due_date}
              onChange={(e) =>
                setFormData({ ...formData, recurring_next_due_date: e.target.value })
              }
              disabled={!formData.recurring_enabled}
              className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white disabled:opacity-50 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-slate-700 rounded-xl">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <input
                type="checkbox"
                checked={formData.reminder_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, reminder_enabled: e.target.checked })
                }
                className="accent-violet-500"
              />
              Reminder
            </label>
            <input
              type="datetime-local"
              value={formData.reminder_remind_at}
              onChange={(e) =>
                setFormData({ ...formData, reminder_remind_at: e.target.value })
              }
              disabled={!formData.reminder_enabled}
              className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white disabled:opacity-50 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <input
              type="number"
              min="5"
              step="5"
              value={formData.reminder_snooze_minutes}
              onChange={(e) =>
                setFormData({ ...formData, reminder_snooze_minutes: Number(e.target.value) })
              }
              disabled={!formData.reminder_enabled}
              className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white disabled:opacity-50 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              placeholder="design, urgent, review"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
            >
              {task ? "Update Task" : "Add Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
