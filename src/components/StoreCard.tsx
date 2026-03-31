import React, { useMemo } from 'react';
import { StoreMaster } from '../types';
import { useAppContext } from '../context/AppContext';
import { calculatePredictions, calculateRequiredStaff, getDaysInMonth, calculateMonthsOpen } from '../utils/calculations';
import { Users, CalendarDays, TrendingUp } from 'lucide-react';
import { InfoTooltip as Tooltip } from './InfoTooltip';

interface StoreCardProps {
  store: StoreMaster;
  currentYearMonth: string;
}

export const StoreCard: React.FC<StoreCardProps> = ({ store, currentYearMonth }) => {
  const { visitors, allocations, setAllocations, staffs, staffWorkforceDetails } = useAppContext();

  const daysInMonth = getDaysInMonth(currentYearMonth);
  const monthsOpen = calculateMonthsOpen(store.openDate, currentYearMonth);

  const { predictedW, predictedH, forecastW, forecastH, seasonalIndexW, seasonalIndexH } = useMemo(() => {
    return calculatePredictions(visitors, store.id, currentYearMonth);
  }, [visitors, store.id, currentYearMonth]);

  const { requiredW, requiredH } = useMemo(() => {
    return calculateRequiredStaff(store, predictedW, predictedH, monthsOpen);
  }, [store, predictedW, predictedH, monthsOpen]);

  const currentAllocation = allocations.find(a => a.storeId === store.id && a.yearMonth === currentYearMonth);
  const assignedStaffIds = (currentAllocation?.slots || []).filter(s => s !== null) as string[];
  const assignedCount = assignedStaffIds.length;

  const allCurrentAllocations = allocations.filter(a => a.yearMonth === currentYearMonth);
  const staffCounts: Record<string, number> = {};
  allCurrentAllocations.forEach(a => {
    a.slots.forEach(s => {
      if (s) {
        staffCounts[s] = (staffCounts[s] || 0) + 1;
      }
    });
  });

  const storeStaffDetails = staffWorkforceDetails.filter(d => 
    d.yearMonth === currentYearMonth && 
    assignedStaffIds.includes(d.staffId)
  );

  const totals = {
    extra: storeStaffDetails.reduce((sum, d) => sum + (d.extraWorkDays || 0), 0),
    paid: storeStaffDetails.reduce((sum, d) => sum + (d.paidLeaveDays || 0), 0),
    support: storeStaffDetails.reduce((sum, d) => sum + (d.supportDays || 0), 0),
    training: storeStaffDetails.reduce((sum, d) => sum + (d.trainingDays || 0), 0),
  };

  const baseWorkableDays = assignedStaffIds.reduce((sum, id) => {
    const staff = staffs.find(s => s.id === id);
    return sum + (staff ? daysInMonth - staff.daysOff : 0);
  }, 0);

  const adjustedManDays = baseWorkableDays + totals.extra - totals.paid - totals.support - totals.training;

  const getStatusColor = (required: number, assigned: number) => {
    if (assigned < required) return 'bg-red-100 text-red-800 border-red-200';
    if (assigned === required) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
      <div className="bg-neutral-50 border-b border-neutral-200 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="bg-neutral-900 text-white p-2 rounded-lg">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">{store.name}</h2>
            <p className="text-xs text-neutral-500 font-mono">ID: {store.id} | 席数: {store.seats} | 経過月数: {monthsOpen}ヶ月</p>
          </div>
        </div>

        <div className="flex space-x-4">
          <div className={`px-4 py-2 rounded-lg border flex flex-col items-center ${getStatusColor(requiredW, assignedCount)}`}>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">平日必要枠</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-black">{assignedCount}</span>
              <span className="text-sm font-medium opacity-70">/ {requiredW}</span>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg border flex flex-col items-center ${getStatusColor(requiredH, assignedCount)}`}>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">休日必要枠</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-black">{assignedCount}</span>
              <span className="text-sm font-medium opacity-70">/ {requiredH}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b border-neutral-100 bg-white text-sm">
        <div className="flex flex-col p-2 rounded bg-blue-50 border border-blue-100">
          <span className="text-[10px] font-bold text-blue-600 uppercase">公出 (プラス)</span>
          <span className="text-lg font-bold text-blue-700">+{totals.extra}</span>
        </div>
        <div className="flex flex-col p-2 rounded bg-red-50 border border-red-100">
          <span className="text-[10px] font-bold text-red-600 uppercase">有休 (マイナス)</span>
          <span className="text-lg font-bold text-red-700">-{totals.paid}</span>
        </div>
        <div className="flex flex-col p-2 rounded bg-red-50 border border-red-100">
          <span className="text-[10px] font-bold text-red-600 uppercase">応援 (マイナス)</span>
          <span className="text-lg font-bold text-red-700">-{totals.support}</span>
        </div>
        <div className="flex flex-col p-2 rounded bg-red-50 border border-red-100">
          <span className="text-[10px] font-bold text-red-600 uppercase">研修 (マイナス)</span>
          <span className="text-lg font-bold text-red-700">-{totals.training}</span>
        </div>
      </div>

      <div className="px-4 py-2 bg-neutral-900 text-white flex justify-between items-center">
        <span className="text-xs font-bold">調整後 合計確保数</span>
        <Tooltip content="(月間日数 - 公休数) + 公出 - 有休 - 応援 - 研修" position="bottom">
          <span className="text-lg font-black cursor-help">{adjustedManDays}</span>
        </Tooltip>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border-b border-neutral-100 bg-neutral-50/50 text-sm">
        <Tooltip content="重回帰分析（広告費・競合等）による予測値">
          <div className="flex items-center space-x-2 text-neutral-600 cursor-help">
            <TrendingUp size={16} className="text-neutral-400" />
            <span>TREND予測(平日): <strong className="text-neutral-900">{predictedW.toFixed(1)}</strong></span>
          </div>
        </Tooltip>
        <Tooltip content="時系列単回帰分析（経過月数）による予測値">
          <div className="flex items-center space-x-2 text-neutral-600 cursor-help">
            <TrendingUp size={16} className="text-neutral-400" />
            <span>FORECAST予測(平日): <strong className="text-neutral-900">{forecastW.toFixed(1)}</strong></span>
          </div>
        </Tooltip>
        <Tooltip content="対象月の過去平均 / 全期間平均">
          <div className="flex items-center space-x-2 text-neutral-600 cursor-help">
            <CalendarDays size={16} className="text-neutral-400" />
            <span>季節指数(平日): <strong className="text-neutral-900">{seasonalIndexW.toFixed(2)}</strong></span>
          </div>
        </Tooltip>
        <Tooltip content="重回帰分析（広告費・競合等）による予測値">
          <div className="flex items-center space-x-2 text-neutral-600 cursor-help">
            <TrendingUp size={16} className="text-neutral-400" />
            <span>TREND予測(休日): <strong className="text-neutral-900">{predictedH.toFixed(1)}</strong></span>
          </div>
        </Tooltip>
        <Tooltip content="時系列単回帰分析（経過月数）による予測値">
          <div className="flex items-center space-x-2 text-neutral-600 cursor-help">
            <TrendingUp size={16} className="text-neutral-400" />
            <span>FORECAST予測(休日): <strong className="text-neutral-900">{forecastH.toFixed(1)}</strong></span>
          </div>
        </Tooltip>
        <Tooltip content="対象月の過去平均 / 全期間平均">
          <div className="flex items-center space-x-2 text-neutral-600 cursor-help">
            <CalendarDays size={16} className="text-neutral-400" />
            <span>季節指数(休日): <strong className="text-neutral-900">{seasonalIndexH.toFixed(2)}</strong></span>
          </div>
        </Tooltip>
      </div>

      <div className="p-4 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-100 text-neutral-600 text-xs uppercase tracking-wider border-y border-neutral-200">
              <th className="p-3 font-semibold w-12 text-center">No</th>
              <th className="p-3 font-semibold w-64">氏名</th>
              <th className="p-3 font-semibold text-right">公休数</th>
              <th className="p-3 font-semibold text-right">確保数</th>
              <th className="p-3 font-semibold text-right">処理能力</th>
              <th className="p-3 font-semibold text-right">月間個体能力</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {assignedStaffIds.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-neutral-500">
                  稼働計画タブからスタッフを配置してください
                </td>
              </tr>
            ) : (
              assignedStaffIds.map((staffId, index) => {
                const staff = staffs.find(s => s.id === staffId);
                const isDuplicate = staffId ? staffCounts[staffId] > 1 : false;
                
                const workableDays = staff ? daysInMonth - staff.daysOff : 0;
                const monthlyCapacity = staff ? Math.round(workableDays * staff.capacity * 10) / 10 : 0;

                return (
                  <tr key={index} className={`transition-colors hover:bg-neutral-50 ${isDuplicate ? 'bg-red-50' : ''}`}>
                    <td className="p-3 text-center text-neutral-400 font-mono text-sm">{index + 1}</td>
                    <td className="p-3 relative font-medium text-neutral-900">
                      <div className="flex items-center space-x-2">
                        <span>{staff?.name || '不明なスタッフ'}</span>
                        {staff?.skillLevel === 'trainee' && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">新人</span>}
                        {staff?.skillLevel === 'leader' && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded font-bold">指導者</span>}
                        {isDuplicate && (
                          <span className="text-xs text-red-600 font-bold">重複!</span>
                        )}
                      </div>
                    </td>
                    <td className={`p-3 text-right font-mono text-sm ${isDuplicate ? 'text-red-600' : 'text-neutral-600'}`}>
                      {staff ? staff.daysOff : '-'}
                    </td>
                    <td className={`p-3 text-right font-mono text-sm ${isDuplicate ? 'text-red-600' : 'text-neutral-900 font-medium'}`}>
                      <Tooltip content="月間日数 - 公休数" position="bottom">
                        <span className="cursor-help">{staff ? workableDays : '-'}</span>
                      </Tooltip>
                    </td>
                    <td className={`p-3 text-right font-mono text-sm ${isDuplicate ? 'text-red-600' : 'text-neutral-600'}`}>
                      {staff ? staff.capacity : '-'}
                    </td>
                    <td className={`p-3 text-right font-mono text-sm ${isDuplicate ? 'text-red-600' : 'text-neutral-900 font-bold'}`}>
                      <Tooltip content="出勤可能日数 × 処理能力" position="bottom">
                        <span className="cursor-help">{staff ? monthlyCapacity : '-'}</span>
                      </Tooltip>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
