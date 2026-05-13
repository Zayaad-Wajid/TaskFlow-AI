import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Brain,
  CalendarClock,
  Check,
  Flame,
  MessageSquare,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";
import { api } from "../api";

const today = new Date().toISOString().slice(0, 10);

const formatTime = (isoString) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const ProductivityView = ({ tasks, onRefresh, onEditTask, showToast }) => {
  const [priorities, setPriorities] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [habits, setHabits] = useState([]);
  const [newHabit, setNewHabit] = useState("");
  const [commentText, setCommentText] = useState({});
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const collaborationTasks = useMemo(
    () => tasks.filter((task) => task.assigned_to || task.comments?.length),
    [tasks]
  );

  const loadAiPanels = useCallback(async () => {
    try {
      const [priorityData, scheduleData, habitData] = await Promise.all([
        api.getPriorities(),
        api.getSchedule(),
        api.getHabits(),
      ]);
      setPriorities(priorityData.prioritized_tasks || []);
      setSchedule(scheduleData.blocks || []);
      setHabits(habitData.habits || []);
    } catch (error) {
      console.error("Error loading productivity panels:", error);
      showToast?.("Unable to refresh AI productivity panels", "error");
    }
  }, [showToast]);

  useEffect(() => {
    // Refresh derived AI panels whenever the visible task set changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAiPanels();
  }, [loadAiPanels, tasks]);

  useEffect(() => {
    if (!isTimerRunning) return undefined;
    const timer = setInterval(() => {
      setPomodoroSeconds((seconds) => {
        if (seconds <= 1) {
          setIsTimerRunning(false);
          showToast?.("Pomodoro complete! Take a short break.");
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, showToast]);

  const timerLabel = `${String(Math.floor(pomodoroSeconds / 60)).padStart(2, "0")}:${String(
    pomodoroSeconds % 60
  ).padStart(2, "0")}`;

  const addHabit = async (event) => {
    event.preventDefault();
    if (!newHabit.trim()) return;

    await api.addHabit({ name: newHabit.trim(), frequency: "Daily" });
    setNewHabit("");
    await loadAiPanels();
    showToast?.("Habit added");
  };

  const toggleHabit = async (habitId) => {
    await api.toggleHabit(habitId, today);
    await loadAiPanels();
  };

  const deleteHabit = async (habitId) => {
    await api.deleteHabit(habitId);
    await loadAiPanels();
    showToast?.("Habit deleted");
  };

  const applySchedule = async () => {
    await api.applySchedule(schedule);
    await onRefresh();
    showToast?.("AI schedule applied to tasks");
  };

  const addComment = async (taskId) => {
    const text = commentText[taskId]?.trim();
    if (!text) return;

    await api.addTaskComment(taskId, { author: "You", text });
    setCommentText({ ...commentText, [taskId]: "" });
    await onRefresh();
    showToast?.("Comment added");
  };

  return (
    <div className="p-6 flex-1 space-y-6 overflow-auto">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Brain className="w-5 h-5 text-violet-400" /> AI Task Prioritization
            </h2>
            <button onClick={loadAiPanels} className="text-sm text-violet-300 hover:text-violet-200">
              Refresh
            </button>
          </div>
          <div className="space-y-3">
            {priorities.length === 0 ? (
              <p className="text-slate-400">No active tasks to prioritize.</p>
            ) : (
              priorities.slice(0, 6).map((item, index) => (
                <button
                  key={item.task_id}
                  onClick={() => onEditTask(tasks.find((task) => task.id === item.task_id))}
                  className="w-full text-left bg-slate-800/80 rounded-xl p-4 border border-slate-700 hover:border-violet-500 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-white font-medium">#{index + 1} {item.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{item.reasons.join(" • ")}</p>
                    </div>
                    <span className="px-2 py-1 bg-violet-500/20 text-violet-300 text-xs rounded-lg">
                      Score {item.score}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <CalendarClock className="w-5 h-5 text-cyan-400" /> AI Scheduling Assistant
            </h2>
            <button
              onClick={applySchedule}
              disabled={schedule.length === 0}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-sm rounded-lg"
            >
              Apply schedule
            </button>
          </div>
          <div className="space-y-3">
            {schedule.length === 0 ? (
              <p className="text-slate-400">No suggested blocks available.</p>
            ) : (
              schedule.map((block) => (
                <div key={`${block.task_id}-${block.start}`} className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-white font-medium">{block.title}</p>
                    <span className="text-sm text-cyan-300">{formatTime(block.start)} - {formatTime(block.end)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{block.reason}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Play className="w-5 h-5 text-rose-400" /> Pomodoro Timer
          </h2>
          <div className="text-center py-4">
            <div className="text-6xl font-bold text-white tabular-nums mb-5">{timerLabel}</div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isTimerRunning ? "Pause" : "Start"}
              </button>
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setPomodoroSeconds(25 * 60);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            </div>
          </div>
        </section>

        <section className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Flame className="w-5 h-5 text-orange-400" /> Habit Tracking
          </h2>
          <form onSubmit={addHabit} className="flex gap-2 mb-4">
            <input
              value={newHabit}
              onChange={(event) => setNewHabit(event.target.value)}
              placeholder="Add a daily habit..."
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
            <button className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg">Add</button>
          </form>
          <div className="space-y-2">
            {habits.map((habit) => {
              const completedToday = habit.completed_dates?.includes(today);
              return (
                <div key={habit.id} className="flex items-center gap-3 bg-slate-800/80 rounded-xl p-3">
                  <button
                    onClick={() => toggleHabit(habit.id)}
                    className={`p-1.5 rounded-lg ${completedToday ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"}`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{habit.name}</p>
                    <p className="text-xs text-slate-400">{habit.streak || 0} day streak</p>
                  </div>
                  <button onClick={() => deleteHabit(habit.id)} className="text-slate-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            {habits.length === 0 && <p className="text-slate-400 text-sm">Start by adding your first habit.</p>}
          </div>
        </section>

        <section className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Users className="w-5 h-5 text-emerald-400" /> Team Collaboration
          </h2>
          <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
            {(collaborationTasks.length ? collaborationTasks : tasks.slice(0, 4)).map((task) => (
              <div key={task.id} className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white font-medium">{task.title}</p>
                    <p className="text-xs text-slate-400">Owner: {task.assigned_to || "Unassigned"}</p>
                  </div>
                  <button onClick={() => onEditTask(task)} className="text-xs text-violet-300 hover:text-violet-200">
                    Edit
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {task.comments?.slice(-2).map((comment) => (
                    <p key={comment.id} className="text-xs text-slate-300 bg-slate-900/70 rounded-lg p-2">
                      <MessageSquare className="inline w-3 h-3 mr-1 text-slate-500" />
                      <span className="text-slate-400">{comment.author}:</span> {comment.text}
                    </p>
                  ))}
                  <div className="flex gap-2">
                    <input
                      value={commentText[task.id] || ""}
                      onChange={(event) => setCommentText({ ...commentText, [task.id]: event.target.value })}
                      placeholder="Add comment..."
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                    />
                    <button onClick={() => addComment(task.id)} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg">
                      Send
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-slate-400 text-sm">Add tasks to collaborate with your team.</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProductivityView;
