import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Brain,
  CalendarClock,
  Check,
  Flame,
  MessageSquare,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Timer,
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

const formatMinutes = (minutes = 0) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins}m`;
  return `${hours}h ${mins}m`;
};

const panelClass = "rounded-lg border border-slate-200 bg-white p-5 shadow-sm";
const softButtonClass = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 hover:shadow-sm";

const ProductivityView = ({ tasks, onRefresh, onEditTask, showToast }) => {
  const [priorities, setPriorities] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [habits, setHabits] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [newHabit, setNewHabit] = useState("");
  const [commentText, setCommentText] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) || tasks.find((task) => task.status !== "Done") || tasks[0],
    [selectedTaskId, tasks]
  );

  const collaborationTasks = useMemo(
    () => tasks.filter((task) => task.assigned_to || task.comments?.length).slice(0, 5),
    [tasks]
  );

  const loadPanels = useCallback(async () => {
    try {
      const [priorityData, scheduleData, habitData, summaryData, forecastData] = await Promise.all([
        api.getPriorities(),
        api.getSchedule(),
        api.getHabits(),
        api.getDailySummary(),
        api.getWorkloadForecast(),
      ]);
      setPriorities(priorityData.prioritized_tasks || []);
      setSchedule(scheduleData.blocks || []);
      setHabits(habitData.habits || []);
      setDailySummary(summaryData);
      setForecast(forecastData);
    } catch (error) {
      console.error("Error loading productivity panels:", error);
      showToast?.("Unable to refresh productivity panels", "error");
    }
  }, [showToast]);

  useEffect(() => {
    // Refresh derived panels when visible tasks change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPanels();
  }, [loadPanels, tasks]);

  useEffect(() => {
    if (!isTimerRunning) return undefined;
    const timer = setInterval(() => {
      setPomodoroSeconds((seconds) => {
        if (seconds <= 1) {
          setIsTimerRunning(false);
          if (selectedTask) {
            api
              .addTimeLog(selectedTask.id, { minutes: 25, source: "pomodoro", note: "Completed Pomodoro" })
              .then(onRefresh)
              .then(loadPanels)
              .catch(() => showToast?.("Pomodoro finished, but time logging failed", "error"));
          }
          showToast?.("Pomodoro complete. Focus time logged.");
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, loadPanels, onRefresh, selectedTask, showToast]);

  const timerLabel = `${String(Math.floor(pomodoroSeconds / 60)).padStart(2, "0")}:${String(
    pomodoroSeconds % 60
  ).padStart(2, "0")}`;

  const addHabit = async (event) => {
    event.preventDefault();
    if (!newHabit.trim()) return;

    await api.addHabit({ name: newHabit.trim(), frequency: "Daily" });
    setNewHabit("");
    await loadPanels();
    showToast?.("Habit added");
  };

  const toggleHabit = async (habitId) => {
    await api.toggleHabit(habitId, today);
    await loadPanels();
  };

  const deleteHabit = async (habitId) => {
    await api.deleteHabit(habitId);
    await loadPanels();
    showToast?.("Habit deleted");
  };

  const applySchedule = async () => {
    await api.applySchedule(schedule);
    await onRefresh();
    await loadPanels();
    showToast?.("Schedule applied");
  };

  const addComment = async (taskId) => {
    const text = commentText[taskId]?.trim();
    if (!text) return;

    await api.addTaskComment(taskId, { author: "You", text });
    setCommentText({ ...commentText, [taskId]: "" });
    await onRefresh();
    await loadPanels();
    showToast?.("Comment added");
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700">
            <Sparkles className="h-4 w-4" />
            Focus workspace
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">Plan the work, then move through it calmly.</h1>
        </div>
        <button onClick={loadPanels} className={softButtonClass}>
          Refresh insights
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className={panelClass}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
              <Brain className="h-5 w-5 text-cyan-600" /> Smart priorities
            </h2>
          </div>
          <div className="space-y-3">
            {priorities.length === 0 ? (
              <p className="text-sm text-slate-500">No active tasks to prioritize.</p>
            ) : (
              priorities.slice(0, 5).map((item, index) => (
                <button
                  key={item.task_id}
                  onClick={() => onEditTask(tasks.find((task) => task.id === item.task_id))}
                  className="group w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">
                        {index + 1}. {item.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{item.reasons.join(" | ")}</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-cyan-700 ring-1 ring-cyan-100">
                      {item.score}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className={panelClass}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
              <CalendarClock className="h-5 w-5 text-emerald-600" /> Suggested schedule
            </h2>
            <button onClick={applySchedule} disabled={schedule.length === 0} className={`${softButtonClass} disabled:opacity-50`}>
              Apply
            </button>
          </div>
          <div className="space-y-3">
            {schedule.length === 0 ? (
              <p className="text-sm text-slate-500">No suggested blocks available.</p>
            ) : (
              schedule.map((block) => (
                <div key={`${block.task_id}-${block.start}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-950">{block.title}</p>
                    <span className="text-sm font-medium text-emerald-700">
                      {formatTime(block.start)} - {formatTime(block.end)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{block.reason}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className={panelClass}>
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-950">
            <Play className="h-5 w-5 text-rose-600" /> Focus timer
          </h2>
          <select
            value={selectedTask?.id || ""}
            onChange={(event) => setSelectedTaskId(event.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
          >
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
          <div className="rounded-lg bg-rose-50 p-5 text-center">
            <div className="mb-5 text-5xl font-semibold tabular-nums text-rose-700">{timerLabel}</div>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
              >
                {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isTimerRunning ? "Pause" : "Start"}
              </button>
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setPomodoroSeconds(25 * 60);
                }}
                className={softButtonClass}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
          {selectedTask && (
            <p className="mt-3 text-xs text-slate-500">
              Logging to {selectedTask.title}. Total: {formatMinutes(selectedTask.focus_minutes || 0)}.
            </p>
          )}
        </section>

        <section className={panelClass}>
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-950">
            <Flame className="h-5 w-5 text-orange-500" /> Habits
          </h2>
          <form onSubmit={addHabit} className="mb-4 flex gap-2">
            <input
              value={newHabit}
              onChange={(event) => setNewHabit(event.target.value)}
              placeholder="Add a daily habit"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            />
            <button className="rounded-lg bg-cyan-600 px-3 py-2 text-white transition hover:bg-cyan-700">
              <Plus className="h-4 w-4" />
            </button>
          </form>
          <div className="space-y-2">
            {habits.map((habit) => {
              const completedToday = habit.completed_dates?.includes(today);
              return (
                <div key={habit.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <button
                    onClick={() => toggleHabit(habit.id)}
                    className={`rounded-lg p-1.5 transition ${completedToday ? "bg-emerald-600 text-white" : "bg-white text-slate-400 ring-1 ring-slate-200 hover:text-emerald-600"}`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-950">{habit.name}</p>
                    <p className="text-xs text-slate-500">{habit.streak || 0} day streak</p>
                  </div>
                  <button onClick={() => deleteHabit(habit.id)} className="text-slate-400 transition hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            {habits.length === 0 && <p className="text-sm text-slate-500">Start with one habit you can repeat.</p>}
          </div>
        </section>

        <section className={panelClass}>
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-950">
            <Timer className="h-5 w-5 text-cyan-600" /> Daily summary
          </h2>
          <div className="space-y-3">
            <div className="rounded-lg bg-cyan-50 p-4">
              <p className="text-sm font-medium text-slate-950">{dailySummary?.recap || "Summary loading..."}</p>
              <p className="mt-2 text-sm text-slate-600">{dailySummary?.next_day_plan}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-950">Weekly load</p>
                <span className={`text-sm font-semibold ${forecast?.overload ? "text-red-600" : "text-emerald-600"}`}>
                  {forecast?.utilization_percent || 0}%
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{forecast?.message}</p>
              <div className="mt-4 grid grid-cols-7 gap-1">
                {forecast?.days?.map((day) => (
                  <div key={day.date} className={`h-14 rounded-md p-1 text-[10px] ${day.over_capacity ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                    <p>{day.date.slice(5)}</p>
                    <p>{formatMinutes(day.estimate_minutes)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className={`${panelClass} mt-5`}>
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-950">
          <Users className="h-5 w-5 text-emerald-600" /> Team notes
        </h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {(collaborationTasks.length ? collaborationTasks : tasks.slice(0, 4)).map((task) => (
            <div key={task.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-950">{task.title}</p>
                  <p className="text-xs text-slate-500">Owner: {task.assigned_to || "Unassigned"}</p>
                </div>
                <button onClick={() => onEditTask(task)} className="text-sm font-medium text-cyan-700 hover:text-cyan-800">
                  Edit
                </button>
              </div>
              <div className="space-y-2">
                {task.comments?.slice(-2).map((comment) => (
                  <p key={comment.id} className="rounded-lg bg-white p-2 text-xs text-slate-600 ring-1 ring-slate-200">
                    <MessageSquare className="mr-1 inline h-3 w-3 text-slate-400" />
                    <span className="font-medium text-slate-700">{comment.author}:</span> {comment.text}
                  </p>
                ))}
                <div className="flex gap-2">
                  <input
                    value={commentText[task.id] || ""}
                    onChange={(event) => setCommentText({ ...commentText, [task.id]: event.target.value })}
                    placeholder="Add a quick note"
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                  />
                  <button onClick={() => addComment(task.id)} className="rounded-lg bg-emerald-600 px-3 py-2 text-white transition hover:bg-emerald-700">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-sm text-slate-500">Add tasks to collaborate with your team.</p>}
        </div>
      </section>
    </div>
  );
};

export default ProductivityView;
