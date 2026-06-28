import { Search, Plus, FileText, Users, Briefcase } from 'lucide-react';

const PRESETS = {
  tasks: {
    emoji: '📋',
    title: 'No tasks yet',
    message: "Your manager will assign tasks soon. In the meantime, check your attendance and daily report.",
    actionLabel: null,
  },
  leads: {
    emoji: '💼',
    title: 'Start building your pipeline!',
    message: "Add your first lead and start tracking your BD progress. Every big deal starts with a conversation.",
    actionLabel: 'Add First Lead',
    actionIcon: Plus,
  },
  candidates: {
    emoji: '👥',
    title: 'No candidates assigned yet',
    message: "You have no candidates in your recruitment pipeline. Add candidates as you screen them.",
    actionLabel: 'Add Candidate',
    actionIcon: Plus,
  },
  projects: {
    emoji: '🚀',
    title: 'No projects yet',
    message: "No IT projects have been created yet. Projects will appear here when assigned.",
    actionLabel: null,
  },
  reports: {
    emoji: '📊',
    title: 'No reports found',
    message: "No activity data found for the selected filters. Try adjusting the date range.",
    actionLabel: null,
  },
  activity: {
    emoji: '⏱️',
    title: 'No activity recorded',
    message: "This user has no logged activity yet. Actions will appear here in real-time.",
    actionLabel: null,
  },
  notifications: {
    emoji: '🔔',
    title: "You're all caught up!",
    message: "No new notifications right now. We'll alert you when something needs attention.",
    actionLabel: null,
  },
  search: {
    emoji: '🔍',
    title: 'No results found',
    message: "Try a different search term or check the spelling.",
    actionLabel: null,
  },
  generic: {
    emoji: '📭',
    title: 'Nothing here yet',
    message: "There's nothing to show right now.",
    actionLabel: null,
  },
};

export default function EmptyState({ 
  type = 'generic', 
  title, 
  message, 
  actionLabel, 
  onAction,
  compact = false 
}) {
  const preset = PRESETS[type] || PRESETS.generic;
  const displayTitle   = title   || preset.title;
  const displayMessage = message || preset.message;
  const displayAction  = actionLabel || preset.actionLabel;
  const ActionIcon     = preset.actionIcon || Plus;

  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
        <span className="text-3xl">{preset.emoji}</span>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{displayTitle}</p>
        <p className="text-xs text-gray-400 max-w-xs">{displayMessage}</p>
        {onAction && displayAction && (
          <button onClick={onAction} className="btn-primary text-xs py-1.5 px-4 mt-1">
            <ActionIcon size={12} />
            {displayAction}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="empty-state animate-fade-in">
      <div className="empty-state-icon">
        <span className="text-4xl">{preset.emoji}</span>
      </div>
      <div className="space-y-2 max-w-sm">
        <h3 className="text-lg font-bold text-navy dark:text-white">{displayTitle}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{displayMessage}</p>
      </div>
      {onAction && displayAction && (
        <button onClick={onAction} className="btn-primary mt-2">
          <ActionIcon size={16} />
          {displayAction}
        </button>
      )}
    </div>
  );
}
