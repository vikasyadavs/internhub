import { useState, useEffect } from 'react';
import { CheckSquare, Square, Calendar, Clipboard, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function TodaysTasksWidget() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/today-tasks');
      setItems(res.data.tasks || []);
    } catch (_) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const toggleCheck = async (item) => {
    try {
      const newStatus = !item.done;
      // Optimistic update
      setItems(prev => prev.map(x => x.id === item.id ? { ...x, done: newStatus } : x));
      await api.post(`/today-tasks/check/${item.id}`, { done: newStatus });
      toast.success(newStatus ? 'Item completed!' : 'Item marked incomplete');
    } catch (e) {
      // Revert status on error
      setItems(prev => prev.map(x => x.id === item.id ? { ...x, done: !item.done } : x));
      toast.error('Failed to update status');
    }
  };

  if (loading) return <div className="skeleton h-48 rounded-2xl" />;

  const completed = items.filter(x => x.done).length;
  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="font-extrabold text-navy dark:text-white flex items-center gap-2">
            <CheckSquare size={18} className="text-purple-500" />
            Today's Checklist (10 AM daily)
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Tasks, client follow-ups, and interviews due today</p>
        </div>
        <span className="badge badge-purple font-extrabold">{completed}/{items.length} Done</span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-gray-405 dark:text-gray-500 gap-1.5">
          <span className="text-2xl">🎉</span>
          <p className="text-xs font-semibold text-navy dark:text-white">All clear for today!</p>
          <p className="text-[10px] text-gray-400">No deadlines or followups are scheduled for today.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-navy dark:text-gray-300">
              <span>Day Progress</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-purple-blue h-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* List items */}
          <div className="divide-y divide-gray-50 dark:divide-slate-850">
            {items.map(item => {
              const itemIcons = {
                task: { icon: Clipboard, cls: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' },
                followup: { icon: Calendar, cls: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' },
                interview: { icon: AlertCircle, cls: 'text-pink-500 bg-pink-50 dark:bg-pink-950/20' }
              };
              const config = itemIcons[item.type] || { icon: CheckSquare, cls: 'text-purple-500' };
              const IconComp = config.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => toggleCheck(item)}
                  className="w-full text-left py-2.5 flex items-center gap-3 group transition-all"
                >
                  <div className="shrink-0 text-gray-400 group-hover:text-purple-500 transition-colors">
                    {item.done ? (
                      <CheckSquare size={18} className="text-purple-600 dark:text-purple-400 fill-purple-100 dark:fill-purple-950/30" />
                    ) : (
                      <Square size={18} />
                    )}
                  </div>
                  <div className={`p-1.5 rounded-lg shrink-0 ${config.cls}`}>
                    <IconComp size={11} />
                  </div>
                  <span className={`text-xs flex-1 truncate ${
                    item.done
                      ? 'text-gray-450 dark:text-gray-500 line-through font-normal'
                      : 'text-navy dark:text-white font-medium group-hover:text-purple-600 dark:group-hover:text-purple-400'
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
