import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useEffect } from "react";

const Toast = ({ message, type = "success", isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-400" />,
  };

  const borderColors = {
    success: "border-emerald-500",
    error: "border-red-500",
    warning: "border-amber-500",
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 rounded-xl border ${borderColors[type]} bg-white/95 px-5 py-4 text-slate-900 shadow-2xl backdrop-blur animate-in slide-in-from-right duration-300 dark:bg-slate-900/95 dark:text-white`}
    >
      {icons[type]}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

export default Toast;
