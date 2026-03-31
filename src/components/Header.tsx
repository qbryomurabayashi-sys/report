import React, { useState } from 'react';
import { AlertTriangle, Settings, LayoutDashboard, Menu, X, BarChart3, BookOpen, CalendarDays, Database } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getDaysInMonth } from '../utils/calculations';
import { DataManagement } from './DataManagement';

export type TabType = 'dashboard' | 'settings' | 'analytics' | 'logic' | 'workforce';

interface HeaderProps {
  currentYearMonth: string;
  setCurrentYearMonth: (ym: string) => void;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentYearMonth, setCurrentYearMonth, activeTab, setActiveTab }) => {
  const { allocations } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  
  const currentAllocations = allocations.filter(a => a.yearMonth === currentYearMonth);
  const staffCounts: Record<string, number> = {};
  currentAllocations.forEach(a => {
    a.slots.forEach(s => {
      if (s) {
        staffCounts[s] = (staffCounts[s] || 0) + 1;
      }
    });
  });
  
  const hasDuplicates = Object.values(staffCounts).some(count => count > 1);
  const daysInMonth = getDaysInMonth(currentYearMonth);

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-neutral-900 text-white p-4 shadow-md flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-6">
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="p-2 hover:bg-neutral-800 rounded-md transition-colors"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          {isMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-neutral-200 py-2 text-neutral-900">
              <button 
                onClick={() => handleTabClick('dashboard')}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-neutral-50 transition-colors ${activeTab === 'dashboard' ? 'bg-neutral-50 text-red-600 font-bold' : ''}`}
              >
                <LayoutDashboard size={18} />
                <span>ダッシュボード</span>
              </button>
              <button 
                onClick={() => handleTabClick('analytics')}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-neutral-50 transition-colors ${activeTab === 'analytics' ? 'bg-neutral-50 text-red-600 font-bold' : ''}`}
              >
                <BarChart3 size={18} />
                <span>分析・グラフ</span>
              </button>
              <button 
                onClick={() => handleTabClick('workforce')}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-neutral-50 transition-colors ${activeTab === 'workforce' ? 'bg-neutral-50 text-red-600 font-bold' : ''}`}
              >
                <CalendarDays size={18} />
                <span>稼働計画・人工数</span>
              </button>
              <button 
                onClick={() => handleTabClick('settings')}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-neutral-50 transition-colors ${activeTab === 'settings' ? 'bg-neutral-50 text-red-600 font-bold' : ''}`}
              >
                <Settings size={18} />
                <span>マスタ設定</span>
              </button>
              <button 
                onClick={() => handleTabClick('logic')}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-neutral-50 transition-colors ${activeTab === 'logic' ? 'bg-neutral-50 text-red-600 font-bold' : ''}`}
              >
                <BookOpen size={18} />
                <span>計算ロジック解説</span>
              </button>
            </div>
          )}
        </div>

        <h1 className="text-xl font-bold tracking-wider hidden sm:block">店舗人員適正化シミュレーター PRO</h1>
        
        <div className="flex items-center space-x-2 bg-neutral-800 px-3 py-1.5 rounded-md">
          <input 
            type="month" 
            value={currentYearMonth}
            onChange={(e) => setCurrentYearMonth(e.target.value)}
            className="bg-transparent text-white border-none outline-none cursor-pointer"
          />
          <span className="text-neutral-400 text-sm ml-2 border-l border-neutral-700 pl-2">
            暦日: {daysInMonth}日
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button 
          onClick={() => setIsDataModalOpen(true)}
          className="p-2 hover:bg-neutral-800 rounded-md transition-colors flex items-center space-x-2 text-neutral-400 hover:text-white"
          title="データ管理 (JSON入出力)"
        >
          <Database size={20} />
          <span className="text-xs hidden md:block">データ管理</span>
        </button>

        {hasDuplicates && (
          <div className="flex items-center space-x-2 bg-red-600/20 text-red-500 px-3 py-1.5 rounded-full border border-red-600/50 animate-pulse">
            <AlertTriangle size={18} />
            <span className="text-sm font-semibold">重複アサイン警告</span>
          </div>
        )}
      </div>

      {isDataModalOpen && <DataManagement onClose={() => setIsDataModalOpen(false)} />}
    </header>
  );
};
