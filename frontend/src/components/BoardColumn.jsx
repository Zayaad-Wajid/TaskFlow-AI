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
    <div className="flex max-h-[calc(100vh-124px)] min-w-[320px] max-w-[320px] flex-col rounded-lg border border-slate-800 bg-slate-900/70">
      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`}></span>
          <h2 className="font-semibold text-white">{status}</h2>
          <span className="rounded-full bg-slate-950 px-2 py-0.5 text-xs font-medium text-slate-400 ring-1 ring-slate-800">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-cyan-300 hover:ring-1 hover:ring-cyan-400/20"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Tasks Container */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-3 transition-colors ${isOver ? "bg-cyan-400/10" : ""}`}
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
