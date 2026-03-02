import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  X,
  MessageSquare,
  Sparkles,
  Calendar,
  ListTodo,
  Plus,
  Check,
  Loader2,
} from "lucide-react";
import { api } from "../api";

const AIChat = ({ onTaskCreated, onRefresh }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "👋 Hi! I'm your TaskFlow AI assistant. I can help you:\n\n• Create tasks naturally\n• Plan your day\n• Break down complex tasks\n• Show productivity insights\n\nJust type what you need!",
      type: "greeting",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTask, setPendingTask] = useState(null);
  const [pendingSubtasks, setPendingSubtasks] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await api.agentChat(userMessage);

      let assistantMessage = {
        role: "assistant",
        content: response.response,
        type: response.type,
        data: response.data,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Handle different response types
      if (response.type === "create_task" && response.data) {
        if (response.needs_confirmation) {
          setPendingTask(response.data);
        } else {
          setPendingTask(response.data);
        }
      } else if (response.type === "breakdown" && response.data?.subtasks) {
        setPendingSubtasks(response.data);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          type: "error",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!pendingTask) return;

    try {
      await api.createTaskFromChat(pendingTask);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ Task "${pendingTask.title}" created successfully!`,
          type: "success",
        },
      ]);
      setPendingTask(null);
      onTaskCreated?.();
      onRefresh?.();
    } catch (error) {
      console.error("Error creating task:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Failed to create task. Please try again.",
          type: "error",
        },
      ]);
    }
  };

  const handleCreateSubtasks = async () => {
    if (!pendingSubtasks) return;

    try {
      await api.createSubtasks(
        pendingSubtasks.subtasks,
        pendingSubtasks.main_task
      );
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ Created ${pendingSubtasks.subtasks.length} subtasks!`,
          type: "success",
        },
      ]);
      setPendingSubtasks(null);
      onRefresh?.();
    } catch (error) {
      console.error("Error creating subtasks:", error);
    }
  };

  const handleQuickAction = async (action) => {
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: action }]);

    try {
      if (action === "Plan my day") {
        const plan = await api.getDayPlan();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: plan.summary,
            type: "plan",
            data: plan,
          },
        ]);
      } else if (action === "Show insights") {
        const insights = await api.getInsights();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: insights.insights.join("\n"),
            type: "insights",
            data: insights,
          },
        ]);
      } else {
        const response = await api.agentChat(action);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response.response,
            type: response.type,
            data: response.data,
          },
        ]);
      }
    } catch (error) {
      console.error("Quick action error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPlanData = (data) => {
    if (!data) return null;

    return (
      <div className="mt-3 space-y-3">
        {data.morning_tasks?.length > 0 && (
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-amber-400 font-medium mb-2">
              🌅 Morning
            </div>
            {data.morning_tasks.map((task, i) => (
              <div key={i} className="text-sm text-slate-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                {task}
              </div>
            ))}
          </div>
        )}
        {data.afternoon_tasks?.length > 0 && (
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-blue-400 font-medium mb-2">
              ☀️ Afternoon
            </div>
            {data.afternoon_tasks.map((task, i) => (
              <div key={i} className="text-sm text-slate-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                {task}
              </div>
            ))}
          </div>
        )}
        {data.evening_tasks?.length > 0 && (
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-purple-400 font-medium mb-2">
              🌙 Evening
            </div>
            {data.evening_tasks.map((task, i) => (
              <div key={i} className="text-sm text-slate-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                {task}
              </div>
            ))}
          </div>
        )}
        {data.suggestions?.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-600">
            <div className="text-xs text-slate-400">💡 Suggestions:</div>
            {data.suggestions.map((s, i) => (
              <div key={i} className="text-xs text-slate-400 mt-1">
                • {s}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSubtasks = (data) => {
    if (!data?.subtasks) return null;

    return (
      <div className="mt-3 space-y-2">
        {data.subtasks.map((task, i) => (
          <div
            key={i}
            className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2"
          >
            <ListTodo className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-slate-300 flex-1">{task.title}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                task.priority === "High"
                  ? "bg-red-500/20 text-red-400"
                  : task.priority === "Low"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/20 text-amber-400"
              }`}
            >
              {task.priority}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all z-[100] ${
          isOpen
            ? "bg-slate-700 rotate-0"
            : "bg-gradient-to-r from-violet-600 to-purple-600 hover:scale-110"
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Bot className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 flex flex-col z-[100] animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-t-2xl">
            <div className="w-10 h-10 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">AI Assistant</h3>
              <p className="text-xs text-slate-400">
                Ask me anything about your tasks
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 p-3 border-b border-slate-700/50">
            <button
              onClick={() => handleQuickAction("Plan my day")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-xs text-slate-300 transition-colors"
            >
              <Calendar className="w-3 h-3" />
              Plan my day
            </button>
            <button
              onClick={() => handleQuickAction("Show insights")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-xs text-slate-300 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Insights
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-violet-600 text-white"
                      : "bg-slate-800 text-slate-200"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>

                  {/* Render special data */}
                  {msg.type === "plan" && renderPlanData(msg.data)}
                  {msg.type === "breakdown" && renderSubtasks(msg.data)}
                </div>
              </div>
            ))}

            {/* Pending Task Confirmation */}
            {pendingTask && (
              <div className="bg-slate-800 rounded-2xl p-4 border border-violet-500/30">
                <div className="text-sm text-slate-300 mb-3">
                  Create this task?
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
                  <div className="font-medium text-white">{pendingTask.title}</div>
                  {pendingTask.description && (
                    <div className="text-sm text-slate-400 mt-1">
                      {pendingTask.description}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        pendingTask.priority === "High"
                          ? "bg-red-500/20 text-red-400"
                          : pendingTask.priority === "Low"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {pendingTask.priority}
                    </span>
                    {pendingTask.due_date && (
                      <span className="text-xs text-slate-400">
                        Due: {pendingTask.due_date}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateTask}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Create
                  </button>
                  <button
                    onClick={() => setPendingTask(null)}
                    className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Pending Subtasks Confirmation */}
            {pendingSubtasks && (
              <div className="bg-slate-800 rounded-2xl p-4 border border-violet-500/30">
                <div className="text-sm text-slate-300 mb-3">
                  Create these subtasks for "{pendingSubtasks.main_task}"?
                </div>
                {renderSubtasks(pendingSubtasks)}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleCreateSubtasks}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create All
                  </button>
                  <button
                    onClick={() => setPendingSubtasks(null)}
                    className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl px-4 py-3">
                  <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChat;
