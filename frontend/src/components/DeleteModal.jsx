import { AlertTriangle, X } from "lucide-react";

const DeleteModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200]">
      <div className="w-full max-w-md animate-in rounded-2xl border border-slate-200 bg-white shadow-2xl fade-in zoom-in duration-200 dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="display-font flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Delete Task
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-slate-600 dark:text-slate-400">
            Are you sure you want to delete this task? This action cannot be
            undone.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
