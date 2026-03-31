import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart, Area, AreaChart } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { Filter, MapPin, Store, Calendar as CalendarIcon, TrendingUp, RotateCcw, Database } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';
import { calculatePredictions } from '../utils/calculations';
import { DataManagement } from './DataManagement';
import { ConfirmModal } from './ConfirmModal';

interface AnalyticsProps {
  currentYearMonth: string;
}

type ViewMode = 'all' | 'area' | 'store';
type Timeframe = '12months' | 'quarterly' | 'weekly' | 'daily' | 'future';

export const Analytics: React.FC<AnalyticsProps> = ({ currentYearMonth }) => {
  const { stores, visitors, budgets, resetAllData } = useAppContext();
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const handleReset = () => {
    setIsConfirmModalOpen(true);
  };

  const confirmReset = () => {
    resetAllData();
  };

  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<Timeframe>('12months');

  const sortedStores = useMemo(() => [...stores].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [stores]);

  // Extract unique areas
  const areas = useMemo(() => {
    const uniqueAreas = new Set(sortedStores.map(s => s.area).filter(Boolean) as string[]);
    return Array.from(uniqueAreas);
  }, [sortedStores]);

  // Filter stores based on view mode
  const filteredStores = useMemo(() => {
    if (viewMode === 'all') return sortedStores;
    if (viewMode === 'area' && selectedArea !== 'all') return sortedStores.filter(s => s.area === selectedArea);
    if (viewMode === 'store' && selectedStore !== 'all') return sortedStores.filter(s => s.id === selectedStore);
    return sortedStores;
  }, [sortedStores, viewMode, selectedArea, selectedStore]);

  const filteredStoreIds = useMemo(() => new Set(filteredStores.map(s => s.id)), [filteredStores]);

  // Filter visitors for the selected stores
  const relevantVisitors = useMemo(() => {
    return visitors.filter(v => filteredStoreIds.has(v.storeId));
  }, [visitors, filteredStoreIds]);

  // --- Data Aggregation Logic ---

  // 1. 12 Months Trend
  const data12Months = useMemo(() => {
    if (timeframe !== '12months') return [];
    
    // Group by YYYY-MM
    const monthlyData: Record<string, { total: number, count: number }> = {};
    relevantVisitors.forEach(v => {
      const ym = v.date.substring(0, 7);
      if (!monthlyData[ym]) monthlyData[ym] = { total: 0, count: 0 };
      monthlyData[ym].total += v.visitors;
      monthlyData[ym].count += 1;
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // Get last 12 months
      .map(([ym, data]) => ({
        name: ym,
        avgDaily: Math.round(data.total / (data.count || 1)),
        total: data.total
      }));
  }, [relevantVisitors, timeframe]);

  // 2. Quarterly
  const dataQuarterly = useMemo(() => {
    if (timeframe !== 'quarterly') return [];

    const getQuarter = (dateStr: string) => {
      const month = parseInt(dateStr.substring(5, 7), 10);
      const year = dateStr.substring(0, 4);
      const q = Math.ceil(month / 3);
      return `${year} Q${q}`;
    };

    const quarterlyData: Record<string, { total: number, count: number }> = {};
    relevantVisitors.forEach(v => {
      const q = getQuarter(v.date);
      if (!quarterlyData[q]) quarterlyData[q] = { total: 0, count: 0 };
      quarterlyData[q].total += v.visitors;
      quarterlyData[q].count += 1;
    });

    return Object.entries(quarterlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-4) // Last 4 quarters
      .map(([q, data]) => ({
        name: q,
        avgDaily: Math.round(data.total / (data.count || 1)),
        total: data.total
      }));
  }, [relevantVisitors, timeframe]);

  // 3. Weekly (Day of Week)
  const dataWeekly = useMemo(() => {
    if (timeframe !== 'weekly') return [];

    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const weeklyData = days.map(d => ({ name: d, total: 0, count: 0 }));

    // Use last 3 months for weekly average to be relevant
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const cutoffDate = threeMonthsAgo.toISOString().substring(0, 10);

    relevantVisitors.filter(v => v.date >= cutoffDate).forEach(v => {
      const date = new Date(v.date);
      const dayIndex = date.getDay();
      weeklyData[dayIndex].total += v.visitors;
      weeklyData[dayIndex].count += 1;
    });

    // Shift array so Monday is first (1,2,3,4,5,6,0)
    const shiftedData = [...weeklyData.slice(1), weeklyData[0]];

    return shiftedData.map(d => ({
      name: d.name,
      avgDaily: d.count > 0 ? Math.round(d.total / d.count) : 0
    }));
  }, [relevantVisitors, timeframe]);

  // 4. Daily (Calendar Day for selected month)
  const dataDaily = useMemo(() => {
    if (timeframe !== 'daily') return [];

    const dailyData: Record<string, { total: number, count: number }> = {};
    
    relevantVisitors
      .filter(v => v.date.startsWith(currentYearMonth))
      .forEach(v => {
        const day = v.date.substring(8, 10);
        if (!dailyData[day]) dailyData[day] = { total: 0, count: 0 };
        dailyData[day].total += v.visitors;
        dailyData[day].count += 1;
      });

    return Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, data]) => ({
        name: `${day}日`,
        avgDaily: Math.round(data.total / (data.count || 1))
      }));
  }, [relevantVisitors, timeframe, currentYearMonth]);

  // 5. Future Predictions
  const dataFuture = useMemo(() => {
    if (timeframe !== 'future') return [];

    const futureMonths: string[] = [];
    const [year, month] = currentYearMonth.split('-').map(Number);
    
    for (let i = 0; i < 6; i++) {
      const d = new Date(year, month - 1 + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      futureMonths.push(ym);
    }

    return futureMonths.map(ym => {
      let totalPredicted = 0;
      let totalBudget = 0;

      filteredStores.forEach(store => {
        const storeBudgets = budgets.filter(b => b.storeId === store.id);
        const storeVisitors = visitors.filter(v => v.storeId === store.id);

        const preds = calculatePredictions(
          storeVisitors,
          store.id,
          ym
        );

        const budgetObj = storeBudgets.find(b => b.yearMonth === ym);
        const budgetValue = budgetObj ? budgetObj.budget : 0;

        // Calculate monthly total from daily predictions
        const aiMonthly = preds.preds.reduce((sum, p) => sum + p.visitors, 0);
        
        totalPredicted += aiMonthly;
        totalBudget += budgetValue;
      });

      return {
        name: ym,
        predicted: Math.round(totalPredicted),
        budget: Math.round(totalBudget)
      };
    });
  }, [filteredStores, budgets, visitors, timeframe, currentYearMonth]);


  const renderGraph = () => {
    switch (timeframe) {
      case '12months':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data12Months} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Area type="monotone" dataKey="avgDaily" name="1日平均客数" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorAvg)" activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'quarterly':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataQuarterly} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip cursor={{ fill: '#f5f5f5' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="avgDaily" name="1日平均客数" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={60} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'weekly':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dataWeekly} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip cursor={{ fill: '#f5f5f5' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="avgDaily" name="曜日別平均客数" fill="#10b981" radius={[4, 4, 0, 0]} barSize={50} />
              <Line type="monotone" dataKey="avgDaily" name="トレンド" stroke="#059669" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        );
      case 'daily':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataDaily} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="stepAfter" dataKey="avgDaily" name="日別客数" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'future':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dataFuture} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip cursor={{ fill: '#f5f5f5' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Area type="monotone" dataKey="predicted" name="AI予測客数" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={3} />
              <Line type="monotone" dataKey="budget" name="予算客数" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        );
    }
  };

  const getGraphTitle = () => {
    let target = '全店舗ブロック';
    if (viewMode === 'area' && selectedArea !== 'all') target = `${selectedArea}エリア`;
    if (viewMode === 'store' && selectedStore !== 'all') target = stores.find(s => s.id === selectedStore)?.name || '';

    switch (timeframe) {
      case '12months': return `${target} - 過去12ヶ月の客数トレンド`;
      case 'quarterly': return `${target} - 四半期ごとの客数比較`;
      case 'weekly': return `${target} - 曜日別の客数傾向 (直近3ヶ月)`;
      case 'daily': return `${target} - 日別客数推移 (${currentYearMonth})`;
      case 'future': return `${target} - 未来6ヶ月の需要予測`;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">分析・グラフ</h2>
          <p className="text-neutral-600">店舗、エリア、全店舗ブロックごとの客数データを様々な期間で分析します。</p>
        </div>
        <div className="flex items-center space-x-4">

          <button 
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>全データ削除</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2 bg-neutral-50 p-2 rounded-lg border border-neutral-200">
          <Filter size={18} className="text-neutral-500" />
          <select 
            value={viewMode} 
            onChange={(e) => {
              setViewMode(e.target.value as ViewMode);
              setSelectedArea('all');
              setSelectedStore('all');
            }}
            className="bg-transparent border-none text-sm font-medium text-neutral-700 focus:ring-0 cursor-pointer"
          >
            <option value="all">全店舗ブロック</option>
            <option value="area">エリア別</option>
            <option value="store">店舗別</option>
          </select>
        </div>

        {viewMode === 'area' && (
          <div className="flex items-center space-x-2 bg-neutral-50 p-2 rounded-lg border border-neutral-200">
            <MapPin size={18} className="text-neutral-500" />
            <select 
              value={selectedArea} 
              onChange={(e) => setSelectedArea(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-neutral-700 focus:ring-0 cursor-pointer"
            >
              <option value="all">すべてのエリア</option>
              {areas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>
        )}

        {viewMode === 'store' && (
          <div className="flex items-center space-x-2 bg-neutral-50 p-2 rounded-lg border border-neutral-200">
            <Store size={18} className="text-neutral-500" />
            <select 
              value={selectedStore} 
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-neutral-700 focus:ring-0 cursor-pointer"
            >
              <option value="all">すべての店舗</option>
              {sortedStores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="h-8 w-px bg-neutral-300 mx-2 hidden md:block"></div>

        <div className="flex items-center space-x-2 bg-neutral-50 p-2 rounded-lg border border-neutral-200">
          <CalendarIcon size={18} className="text-neutral-500" />
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            className="bg-transparent border-none text-sm font-medium text-neutral-700 focus:ring-0 cursor-pointer"
          >
            <option value="12months">過去12ヶ月</option>
            <option value="quarterly">四半期別</option>
            <option value="weekly">曜日別</option>
            <option value="daily">暦日別 ({currentYearMonth})</option>
            <option value="future">未来予測 (6ヶ月)</option>
          </select>
        </div>
      </div>

      {/* Graph Area */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
        <h3 className="text-lg font-bold text-neutral-800 mb-6">{getGraphTitle()}</h3>
        <div className="h-[500px] w-full">
          {renderGraph()}
        </div>
      </div>
      
      {/* Data Summary Table (Optional, for better visibility) */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50">
          <h3 className="font-bold text-neutral-800">データ詳細</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-white border-b border-neutral-200 text-neutral-500">
                <th className="p-3 font-medium">期間 / 項目</th>
                <th className="p-3 font-medium text-right">
                  <InfoTooltip content="期間内の総客数 / 期間内の日数" position="bottom">
                    <span className="cursor-help">平均客数</span>
                  </InfoTooltip>
                </th>
                {timeframe !== 'weekly' && timeframe !== 'daily' && (
                  <th className="p-3 font-medium text-right">
                    <InfoTooltip content="期間内の累計客数" position="bottom">
                      <span className="cursor-help">総客数</span>
                    </InfoTooltip>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {(timeframe === '12months' ? data12Months :
                timeframe === 'quarterly' ? dataQuarterly :
                timeframe === 'weekly' ? dataWeekly :
                timeframe === 'daily' ? dataDaily :
                dataFuture).map((row, i) => (
                <tr key={i} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="p-3 font-medium text-neutral-800">{row.name}</td>
                  <td className="p-3 text-right text-neutral-600">
                    {timeframe === 'future' 
                      ? `${(row as any).predicted.toLocaleString()} (予測)` 
                      : `${row.avgDaily.toLocaleString()}`}
                  </td>
                  {timeframe !== 'weekly' && timeframe !== 'daily' && (
                    <td className="p-3 text-right text-neutral-600">
                      {timeframe === 'future' 
                        ? `${(row as any).budget.toLocaleString()} (予算)` 
                        : 'total' in row ? row.total.toLocaleString() : '-'}
                    </td>
                  )}
                </tr>
              ))}
              {(timeframe === '12months' && data12Months.length === 0) ||
               (timeframe === 'quarterly' && dataQuarterly.length === 0) ||
               (timeframe === 'weekly' && dataWeekly.length === 0) ||
               (timeframe === 'daily' && dataDaily.length === 0) ||
               (timeframe === 'future' && dataFuture.length === 0) ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-neutral-500">データがありません</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      {isDataModalOpen && <DataManagement onClose={() => setIsDataModalOpen(false)} />}
      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        message="すべてのデータを削除して空にしますか？この操作は取り消せません。"
        onConfirm={confirmReset}
        onCancel={() => setIsConfirmModalOpen(false)}
      />
    </div>
  );
};

