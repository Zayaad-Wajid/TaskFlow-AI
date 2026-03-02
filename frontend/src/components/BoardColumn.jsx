import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import TaskCard from "./TaskCard";

const BoardColumn = ({
  status,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const statusConfig = {
    "To Do": { dot: "bg-indigo-500", color: "indigo" },
    "In Progress": { dot: "bg-amber-500", color: "amber" },
    Done: { dot: "bg-emerald-500", color: "emerald" },
  };

  const config = statusConfig[status] || statusConfig["To Do"];

  return (
    <div className="min-w-[320px] max-w-[320px] bg-slate-900/50 rounded-xl flex flex-col max-h-[calc(100vh-118px)]">
      {/* Column Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`}></span>
          <h2 className="font-semibold text-white">{status}</h2>
          <span className="px-2 py-0.5 bg-slate-800 rounded-full text-xs text-slate-400">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Tasks Container */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-3 transition-colors ${isOver ? "bg-violet-500/10" : ""}`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            No tasks yet
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardColumn;
