import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CalendarView = ({ tasks, onEditTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const getTasksForDate = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    return tasks.filter((task) => task.due_date === dateStr);
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
    );
  };

  const days = getDaysInMonth(currentDate);

  const getPriorityColor = (priority) => {
    const colors = {
      High: "bg-red-500",
      Medium: "bg-amber-500",
      Low: "bg-emerald-500",
    };
    return colors[priority] || "bg-violet-500";
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      {/* Calendar Header */}
      <div className="mb-6 flex items-center justify-center gap-3 sm:gap-6">
        <button
          onClick={prevMonth}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="min-w-[200px] text-center text-lg font-semibold text-slate-900 sm:text-xl dark:text-white">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <button
          onClick={nextMonth}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-semibold uppercase text-slate-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const dayTasks = getTasksForDate(day.date);
            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 rounded-lg border transition-colors ${
                  day.isCurrentMonth
                    ? "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700"
                    : "bg-slate-100/70 border-slate-200 opacity-60 dark:bg-slate-800/20 dark:border-slate-700/50"
                } ${isToday(day.date) ? "border-indigo-500" : ""}`}
              >
                <div
                  className={`text-sm font-medium mb-2 ${
                    isToday(day.date)
                      ? "text-indigo-500 dark:text-indigo-400"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {day.date.getDate()}
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <button
                      key={task.id}
                      onClick={() => onEditTask(task)}
                      className={`w-full truncate rounded px-2 py-1 text-left text-xs text-white transition-opacity hover:opacity-80 ${getPriorityColor(task.priority)}`}
                    >
                      {task.title}
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="px-2 text-xs text-slate-500">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
