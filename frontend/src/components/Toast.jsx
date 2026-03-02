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
      className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-4 bg-slate-800 border ${borderColors[type]} rounded-xl shadow-2xl z-[300] animate-in slide-in-from-right duration-300`}
    >
      {icons[type]}
      <span className="text-sm text-white">{message}</span>
    </div>
  );
};

export default Toast;
