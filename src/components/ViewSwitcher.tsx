import React from 'react';
import { ChevronDown, Users, Calendar, Clock, Layout } from 'lucide-react';
import { ViewType } from '../types';

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ currentView, onViewChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const views: { type: ViewType; label: string; icon: React.ReactNode }[] = [
    { type: 'Team', label: 'チームタイムライン', icon: <Users className="w-4 h-4" /> },
    { type: 'Calendar', label: '期限カレンダー', icon: <Calendar className="w-4 h-4" /> },
    { type: 'Weekly', label: '週次プラン', icon: <Clock className="w-4 h-4" /> },
    { type: 'Board', label: 'クエストボード', icon: <Layout className="w-4 h-4" /> },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 glass-card rounded-lg neon-text-blue hover:bg-white/10 transition-colors"
      >
        {views.find(v => v.type === currentView)?.icon}
        <span className="font-display uppercase tracking-wider">{views.find(v => v.type === currentView)?.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 glass-card rounded-lg overflow-hidden z-50">
          {views.map((view) => (
            <button
              key={view.type}
              onClick={() => {
                onViewChange(view.type);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors ${
                currentView === view.type ? 'bg-neon-blue/20 neon-text-blue' : 'text-gray-400'
              }`}
            >
              {view.icon}
              <span className="font-display text-sm uppercase tracking-wider">{view.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewSwitcher;
