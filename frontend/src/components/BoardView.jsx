import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import BoardColumn from "./BoardColumn";

const BoardView = ({
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onStatusChange,
}) => {
  const statuses = ["To Do", "In Progress", "Done"];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id;
    const newStatus = over.id;

    // Check if dropped on a column
    if (statuses.includes(newStatus)) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== newStatus) {
        onStatusChange(taskId, newStatus);
      }
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter((task) => task.status === status);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 p-6 overflow-x-auto flex-1">
        {statuses.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={getTasksByStatus(status)}
            onAddTask={onAddTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>
    </DndContext>
  );
};

export default BoardView;
