import { Download, FileText, Paperclip, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { api } from "../api";

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
  const [attachments, setAttachments] = useState([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState({});
  const [attachmentError, setAttachmentError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (task) {
      // Keep the editable form synchronized when a different task is opened.
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

  useEffect(() => {
    if (!isOpen || !task?.id) {
      setAttachments([]);
      return;
    }

    let active = true;
    api.getTaskAttachments(task.id)
      .then((data) => {
        if (active) setAttachments(data.attachments || []);
      })
      .catch(() => {
        if (active) setAttachmentError("Could not load attachments.");
      });
    return () => {
      active = false;
    };
  }, [isOpen, task?.id]);

  useEffect(() => {
    let active = true;
    const urls = [];
    const loadPreviews = async () => {
      const imageAttachments = attachments.filter((item) =>
        item.content_type?.startsWith("image/"));
      const previews = {};
      await Promise.all(imageAttachments.map(async (attachment) => {
        try {
          const blob = await api.downloadTaskAttachment(task.id, attachment.id);
          const url = URL.createObjectURL(blob);
          urls.push(url);
          previews[attachment.id] = url;
        } catch {
          // The file remains downloadable even if its inline preview fails.
        }
      }));
      if (active) {
        setAttachmentPreviews(previews);
      } else {
        urls.forEach((url) => URL.revokeObjectURL(url));
      }
    };

    if (task?.id && attachments.length) {
      loadPreviews();
    } else {
      setAttachmentPreviews({});
    }
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [attachments, task?.id]);

  const handleAttachmentUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !task?.id) return;
    if (file.size > 10 * 1024 * 1024) {
      setAttachmentError("Files must be 10 MB or smaller.");
      return;
    }

    setAttachmentError("");
    setIsUploading(true);
    try {
      const data = await api.uploadTaskAttachment(task.id, file);
      setAttachments(data.task?.attachments || [...attachments, data.attachment]);
    } catch (error) {
      setAttachmentError(error.response?.data?.error || "Could not upload this file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAttachmentDownload = async (attachment) => {
    setAttachmentError("");
    try {
      const blob = await api.downloadTaskAttachment(task.id, attachment.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setAttachmentError("Could not download this file.");
    }
  };

  const handleAttachmentDelete = async (attachment) => {
    setAttachmentError("");
    try {
      const data = await api.deleteTaskAttachment(task.id, attachment.id);
      setAttachments(data.task?.attachments || attachments.filter((item) => item.id !== attachment.id));
    } catch {
      setAttachmentError("Could not remove this attachment.");
    }
  };

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

          <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Attachments
                </h3>
              </div>
              {task?.id && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    onChange={handleAttachmentUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Upload className="h-4 w-4" />
                    {isUploading ? "Uploading..." : "Upload"}
                  </button>
                </>
              )}
            </div>

            {!task?.id ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Save the task before adding attachments.
              </p>
            ) : attachments.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No attachments yet.
              </p>
            ) : (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                  >
                    {attachmentPreviews[attachment.id] ? (
                      <img
                        src={attachmentPreviews[attachment.id]}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-slate-100 dark:bg-slate-800">
                        <FileText className="h-5 w-5 text-slate-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                        {attachment.filename}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {attachment.content_type}
                      </p>
                    </div>
                    <button
                      type="button"
                      title={`Download ${attachment.filename}`}
                      onClick={() => handleAttachmentDownload(attachment)}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title={`Delete ${attachment.filename}`}
                      onClick={() => handleAttachmentDelete(attachment)}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {attachmentError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {attachmentError}
              </p>
            )}
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
