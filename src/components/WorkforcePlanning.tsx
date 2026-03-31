import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { getDayCountsInMonth, calculatePredictions, calculateRequiredStaff, calculateMonthsOpen, calculateBudgetBasedPredictions, calculateIndividualCapacity } from '../utils/calculations';
import { Users, Calendar, Calculator, CheckCircle, Plus, Trash2, TrendingUp, Copy, RotateCcw, Database } from 'lucide-react';
import { StoreWorkforcePlan, StaffWorkforceDetail } from '../types';
import { InfoTooltip as Tooltip } from './InfoTooltip';
import { DataManagement } from './DataManagement';
import { ConfirmModal } from './ConfirmModal';

interface WorkforcePlanningProps {
  currentYearMonth: string;
  setCurrentYearMonth: (ym: string) => void;
}

export const WorkforcePlanning: React.FC<WorkforcePlanningProps> = ({ currentYearMonth, setCurrentYearMonth }) => {
  const { stores, staffs, visitors, allocations, setAllocations, storeWorkforcePlans, setStoreWorkforcePlans, staffWorkforceDetails, setStaffWorkforceDetails, budgets, setBudgets, resetAllData } = useAppContext();
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const handleReset = () => {
    setIsConfirmModalOpen(true);
  };

  const confirmReset = () => {
    resetAllData();
  };

  const dayCounts = getDayCountsInMonth(currentYearMonth);

  const allAllocatedStaffIds = React.useMemo(() => {
    return allocations
      .filter(a => a.yearMonth === currentYearMonth)
      .flatMap(a => a.slots)
      .filter(Boolean) as string[];
  }, [allocations, currentYearMonth]);

  const handleStorePlanChange = (storeId: string, field: keyof StoreWorkforcePlan, value: number) => {
    setStoreWorkforcePlans(prev => {
      const existing = prev.find(p => p.storeId === storeId && p.yearMonth === currentYearMonth);
      if (existing) {
        return prev.map(p => p.storeId === storeId && p.yearMonth === currentYearMonth ? { ...p, [field]: value } : p);
      } else {
        return [...prev, {
          storeId, yearMonth: currentYearMonth,
          mondayCount: 0, tuesdayCount: 0, wednesdayCount: 0, thursdayCount: 0, fridayCount: 0, saturdayCount: 0, sundayHolidayCount: 0,
          mondayAdjustment: 0, tuesdayAdjustment: 0, wednesdayAdjustment: 0, thursdayAdjustment: 0, fridayAdjustment: 0, saturdayAdjustment: 0, sundayHolidayAdjustment: 0,
          [field]: value
        }];
      }
    });
  };

  const handleStaffDetailChange = (staffId: string, field: keyof StaffWorkforceDetail, value: number) => {
    setStaffWorkforceDetails(prev => {
      const existing = prev.find(p => p.staffId === staffId && p.yearMonth === currentYearMonth);
      if (existing) {
        return prev.map(p => p.staffId === staffId && p.yearMonth === currentYearMonth ? { ...p, [field]: value } : p);
      } else {
        return [...prev, {
          staffId, yearMonth: currentYearMonth,
          extraWorkDays: 0, paidLeaveDays: 0, supportDays: 0, trainingDays: 0, daysOffAdjustment: 0,
          [field]: value
        }];
      }
    });
  };

  const handleAddStaffToStore = (storeId: string, staffId: string) => {
    if (!staffId) return;
    setAllocations(prev => {
      const existing = prev.find(a => a.storeId === storeId && a.yearMonth === currentYearMonth);
      if (existing) {
        return prev.map(a => a.storeId === storeId && a.yearMonth === currentYearMonth ? { ...a, slots: [...a.slots, staffId] } : a);
      } else {
        return [...prev, { storeId, yearMonth: currentYearMonth, slots: [staffId] }];
      }
    });
  };

  const handleRemoveStaffFromStore = (storeId: string, staffId: string) => {
    setAllocations(prev => {
      return prev.map(a => {
        if (a.storeId === storeId && a.yearMonth === currentYearMonth) {
          return { ...a, slots: a.slots.filter(s => s !== staffId) };
        }
        return a;
      });
    });
  };

  const handleBudgetChange = (storeId: string, value: number) => {
    setBudgets(prev => {
      const existing = prev.find(b => b.storeId === storeId && b.yearMonth === currentYearMonth);
      if (existing) {
        return prev.map(b => b.storeId === storeId && b.yearMonth === currentYearMonth ? { ...b, budget: value } : b);
      } else {
        return [...prev, { storeId, yearMonth: currentYearMonth, budget: value }];
      }
    });
  };

  const handleAddPartTimeStaff = (storeId: string) => {
    setStoreWorkforcePlans(prev => {
      const existing = prev.find(p => p.storeId === storeId && p.yearMonth === currentYearMonth);
      const newStaff = { id: Date.now().toString(), name: '', days: 0 };
      if (existing) {
        return prev.map(p => p.storeId === storeId && p.yearMonth === currentYearMonth ? { ...p, partTimeStaff: [...(p.partTimeStaff || []), newStaff] } : p);
      } else {
        return [...prev, {
          storeId, yearMonth: currentYearMonth,
          mondayCount: 0, tuesdayCount: 0, wednesdayCount: 0, thursdayCount: 0, fridayCount: 0, saturdayCount: 0, sundayHolidayCount: 0,
          partTimeStaff: [newStaff]
        }];
      }
    });
  };

  const handlePartTimeStaffChange = (storeId: string, staffId: string, field: 'name' | 'days', value: string | number) => {
    setStoreWorkforcePlans(prev => {
      return prev.map(p => {
        if (p.storeId === storeId && p.yearMonth === currentYearMonth) {
          const newPartTimeStaff = (p.partTimeStaff || []).map(s => s.id === staffId ? { ...s, [field]: value } : s);
          return { ...p, partTimeStaff: newPartTimeStaff };
        }
        return p;
      });
    });
  };

  const handleRemovePartTimeStaff = (storeId: string, staffId: string) => {
    setStoreWorkforcePlans(prev => {
      return prev.map(p => {
        if (p.storeId === storeId && p.yearMonth === currentYearMonth) {
          const newPartTimeStaff = (p.partTimeStaff || []).filter(s => s.id !== staffId);
          return { ...p, partTimeStaff: newPartTimeStaff };
        }
        return p;
      });
    });
  };

  const handleCopyFromPreviousMonth = () => {
    const [year, month] = currentYearMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevYearMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    // Copy allocations
    const prevAllocations = allocations.filter(a => a.yearMonth === prevYearMonth);
    if (prevAllocations.length > 0) {
      setAllocations(prev => {
        const currentFiltered = prev.filter(a => a.yearMonth !== currentYearMonth);
        const newAllocations = prevAllocations.map(a => ({ ...a, yearMonth: currentYearMonth }));
        return [...currentFiltered, ...newAllocations];
      });
    }

    // Copy store plans
    const prevStorePlans = storeWorkforcePlans.filter(p => p.yearMonth === prevYearMonth);
    if (prevStorePlans.length > 0) {
      setStoreWorkforcePlans(prev => {
        const currentFiltered = prev.filter(p => p.yearMonth !== currentYearMonth);
        const newPlans = prevStorePlans.map(p => ({ ...p, yearMonth: currentYearMonth }));
        return [...currentFiltered, ...newPlans];
      });
    }

    // Copy staff details
    const prevStaffDetails = staffWorkforceDetails.filter(d => d.yearMonth === prevYearMonth);
    if (prevStaffDetails.length > 0) {
      setStaffWorkforceDetails(prev => {
        const currentFiltered = prev.filter(d => d.yearMonth !== currentYearMonth);
        const newDetails = prevStaffDetails.map(d => ({ ...d, yearMonth: currentYearMonth }));
        return [...currentFiltered, ...newDetails];
      });
    }

    // Copy budgets
    const prevBudgets = budgets.filter(b => b.yearMonth === prevYearMonth);
    if (prevBudgets.length > 0) {
      setBudgets(prev => {
        const currentFiltered = prev.filter(b => b.yearMonth !== currentYearMonth);
        const newBudgets = prevBudgets.map(b => ({ ...b, yearMonth: currentYearMonth }));
        return [...currentFiltered, ...newBudgets];
      });
    }
    
    alert(`${prevYearMonth}のデータをコピーしました。`);
  };

  // Calculate summaries
  let totalStaffCount = 0;
  let totalNetManDaysAll = 0;
  let totalRecommendedManDaysAll = 0;
  let totalPlannedManDaysAll = 0;
  let totalShortageAll = 0;
  let totalCapacityAll = 0;
  let totalPredictedVisitorsAll = 0;
  let totalCapacityShortageAll = 0;
  let totalDaysOffAll = 0;
  let totalBaseManDaysAll = 0;
  let totalCapacitySumAll = 0;

  const round = (val: number) => Math.round(val * 10) / 10;

  const sortedStores = [...stores].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const storeRows = sortedStores.map(store => {
    const allocation = allocations.find(a => a.storeId === store.id && a.yearMonth === currentYearMonth);
    const staffIds = Array.from(new Set((allocation?.slots || []).filter(s => s !== null)));
    const staffsInStore = staffIds.map(id => staffs.find(s => s.id === id)).filter(Boolean) as typeof staffs;
    
    const staffCount = staffsInStore.length;
    const totalManDays = staffCount * dayCounts.total;
    const totalDaysOff = staffsInStore.reduce((sum, s) => sum + s.daysOff, 0);
    
    const storeStaffDetails = staffWorkforceDetails.filter(d => 
      d.yearMonth === currentYearMonth && 
      staffIds.includes(d.staffId)
    );

    const totalExtraWorkDays = storeStaffDetails.reduce((sum, d) => sum + (d.extraWorkDays || 0), 0);
    const totalPaidLeaveDays = storeStaffDetails.reduce((sum, d) => sum + (d.paidLeaveDays || 0), 0);
    const totalSupportDays = storeStaffDetails.reduce((sum, d) => sum + (d.supportDays || 0), 0);
    const totalTrainingDays = storeStaffDetails.reduce((sum, d) => sum + (d.trainingDays || 0), 0);
    const totalDaysOffAdjustment = storeStaffDetails.reduce((sum, d) => sum + (d.daysOffAdjustment || 0), 0);

    const netManDays = (totalManDays - totalDaysOff - totalDaysOffAdjustment) + totalExtraWorkDays - totalPaidLeaveDays - totalSupportDays - totalTrainingDays;

    const weekdayDays = dayCounts.monday + dayCounts.tuesday + dayCounts.wednesday + dayCounts.thursday + dayCounts.friday;
    const weekendDays = dayCounts.saturday + dayCounts.sundayHoliday;

    const staffsInStoreWithCap = staffsInStore.map(s => {
      const capW = calculateIndividualCapacity(store.hoursW, s.skillLevel);
      const capH = calculateIndividualCapacity(store.hoursH, s.skillLevel);
      const avgCap = round(((capW * weekdayDays) + (capH * weekendDays)) / (dayCounts.total || 1));
      return { ...s, capW, capH, avgCap };
    });

    const totalCapacity = round(staffsInStoreWithCap.reduce((sum, s) => {
      const detail = storeStaffDetails.find(d => d.staffId === s.id);
      const adj = detail?.daysOffAdjustment || 0;
      return sum + ((dayCounts.total - s.daysOff - adj) * s.avgCap);
    }, 0));
    const totalCapacitySum = round(staffsInStoreWithCap.reduce((sum, s) => sum + s.avgCap, 0));

    const monthsOpen = calculateMonthsOpen(store.openDate, currentYearMonth);
    const preds = calculatePredictions(visitors, store.id, currentYearMonth);
    
    const budgetObj = budgets.find(b => b.storeId === store.id && b.yearMonth === currentYearMonth);
    const budget = budgetObj ? budgetObj.budget : 0;

    // AI Base
    const aiPredictedW = preds.predictedW;
    const aiPredictedH = preds.predictedH;
    const aiMonthlyPredictedVisitors = Math.round((aiPredictedW * weekdayDays) + (aiPredictedH * weekendDays));
    const aiReqs = calculateRequiredStaff(store, aiPredictedW, aiPredictedH, monthsOpen);
    const aiRecommendedW = aiReqs.requiredW;
    const aiRecommendedH = aiReqs.requiredH;
    const aiRecommendedManDays = (aiRecommendedW * weekdayDays) + (aiRecommendedH * weekendDays);

    // Calculate day-of-week specific recommended staff based on AI predictions
    const aiRecByDay = [0, 1, 2, 3, 4, 5, 6].map(dow => {
      const dowPreds = (preds.preds || []).filter(p => new Date(p.date).getDay() === dow);
      if (dowPreds.length === 0) return 0;
      const avgVisitors = dowPreds.reduce((sum, p) => sum + p.visitors, 0) / dowPreds.length;
      const req = calculateRequiredStaff(store, avgVisitors, avgVisitors, monthsOpen);
      return req.requiredW;
    });

    const aiRecs = {
      sun: aiRecByDay[0],
      mon: aiRecByDay[1],
      tue: aiRecByDay[2],
      wed: aiRecByDay[3],
      thu: aiRecByDay[4],
      fri: aiRecByDay[5],
      sat: aiRecByDay[6]
    };

    // Budget Base
    let budgetPredictedW = 0;
    let budgetPredictedH = 0;
    let budgetMonthlyPredictedVisitors = budget;
    let budgetRecommendedW = 0;
    let budgetRecommendedH = 0;
    let budgetRecommendedManDays = 0;

    if (budget > 0) {
      const budgetPreds = calculateBudgetBasedPredictions(budget, weekdayDays, weekendDays, 1.25);
      budgetPredictedW = budgetPreds.predictedW;
      budgetPredictedH = budgetPreds.predictedH;
      const budgetReqs = calculateRequiredStaff(store, budgetPredictedW, budgetPredictedH, monthsOpen);
      budgetRecommendedW = budgetReqs.requiredW;
      budgetRecommendedH = budgetReqs.requiredH;
      budgetRecommendedManDays = (budgetRecommendedW * weekdayDays) + (budgetRecommendedH * weekendDays);
    }

    // Active values (use Budget if entered, otherwise AI)
    const activePredictedW = budget > 0 ? budgetPredictedW : aiPredictedW;
    const activePredictedH = budget > 0 ? budgetPredictedH : aiPredictedH;
    const activeMonthlyPredictedVisitors = budget > 0 ? budgetMonthlyPredictedVisitors : aiMonthlyPredictedVisitors;
    const activeRecommendedW = budget > 0 ? budgetRecommendedW : aiRecommendedW;
    const activeRecommendedH = budget > 0 ? budgetRecommendedH : aiRecommendedH;
    const activeRecommendedManDays = budget > 0 ? budgetRecommendedManDays : aiRecommendedManDays;

    const activeRecs = {
      mon: budget > 0 ? budgetRecommendedW : aiRecs.mon,
      tue: budget > 0 ? budgetRecommendedW : aiRecs.tue,
      wed: budget > 0 ? budgetRecommendedW : aiRecs.wed,
      thu: budget > 0 ? budgetRecommendedW : aiRecs.thu,
      fri: budget > 0 ? budgetRecommendedW : aiRecs.fri,
      sat: budget > 0 ? budgetRecommendedH : aiRecs.sat,
      sun: budget > 0 ? budgetRecommendedH : aiRecs.sun
    };

    const plan = storeWorkforcePlans.find(p => p.storeId === store.id && p.yearMonth === currentYearMonth) || {
      storeId: store.id, yearMonth: currentYearMonth,
      mondayCount: 0, tuesdayCount: 0, wednesdayCount: 0, thursdayCount: 0, fridayCount: 0, saturdayCount: 0, sundayHolidayCount: 0,
      mondayAdjustment: 0, tuesdayAdjustment: 0, wednesdayAdjustment: 0, thursdayAdjustment: 0, fridayAdjustment: 0, saturdayAdjustment: 0, sundayHolidayAdjustment: 0,
      partTimeStaff: []
    };

    const partTimeStaff = plan.partTimeStaff || [];
    const partTimeTotal = partTimeStaff.reduce((sum, s) => sum + (s.days || 0), 0);

    const monMD = round(plan.mondayCount * (dayCounts.monday + (plan.mondayAdjustment || 0)));
    const tueMD = round(plan.tuesdayCount * (dayCounts.tuesday + (plan.tuesdayAdjustment || 0)));
    const wedMD = round(plan.wednesdayCount * (dayCounts.wednesday + (plan.wednesdayAdjustment || 0)));
    const thuMD = round(plan.thursdayCount * (dayCounts.thursday + (plan.thursdayAdjustment || 0)));
    const friMD = round(plan.fridayCount * (dayCounts.friday + (plan.fridayAdjustment || 0)));
    const satMD = round(plan.saturdayCount * (dayCounts.saturday + (plan.saturdayAdjustment || 0)));
    const sunMD = round(plan.sundayHolidayCount * (dayCounts.sundayHoliday + (plan.sundayHolidayAdjustment || 0)));
    const totalPlanned = round(monMD + tueMD + wedMD + thuMD + friMD + satMD + sunMD);

    const shortage = round(netManDays - totalPlanned);
    const capacityShortage = round(totalCapacity - activeMonthlyPredictedVisitors);

    const avgDailyCapacity = round(totalCapacity / (dayCounts.total || 1));
    const avgDailyVisitors = round(activeMonthlyPredictedVisitors / (dayCounts.total || 1));
    
    const avgCapW = staffCount > 0 ? staffsInStoreWithCap.reduce((sum, s) => sum + s.capW, 0) / staffCount : 0;
    const avgCapH = staffCount > 0 ? staffsInStoreWithCap.reduce((sum, s) => sum + s.capH, 0) / staffCount : 0;

    const getAvgVisitorsForDow = (dow: number) => {
      const dowPreds = (preds.preds || []).filter(p => new Date(p.date).getDay() === dow);
      if (dowPreds.length === 0) return 0;
      return Math.round(dowPreds.reduce((sum, p) => sum + p.visitors, 0) / dowPreds.length);
    };

    const avgVisitors = {
      sun: getAvgVisitorsForDow(0),
      mon: getAvgVisitorsForDow(1),
      tue: getAvgVisitorsForDow(2),
      wed: getAvgVisitorsForDow(3),
      thu: getAvgVisitorsForDow(4),
      fri: getAvgVisitorsForDow(5),
      sat: getAvgVisitorsForDow(6)
    };

    const plannedPower = {
      mon: round(plan.mondayCount * avgCapW),
      tue: round(plan.tuesdayCount * avgCapW),
      wed: round(plan.wednesdayCount * avgCapW),
      thu: round(plan.thursdayCount * avgCapW),
      fri: round(plan.fridayCount * avgCapW),
      sat: round(plan.saturdayCount * avgCapH),
      sun: round(plan.sundayHolidayCount * avgCapH)
    };

    totalStaffCount += staffCount;
    totalNetManDaysAll += netManDays;
    totalRecommendedManDaysAll += activeRecommendedManDays;
    totalPlannedManDaysAll += totalPlanned;
    totalShortageAll += (shortage + partTimeTotal);
    totalCapacityAll += totalCapacity;
    totalPredictedVisitorsAll += activeMonthlyPredictedVisitors;
    totalCapacityShortageAll += capacityShortage;
    totalDaysOffAll += totalDaysOff;
    totalBaseManDaysAll += (totalManDays - totalDaysOff);
    totalCapacitySumAll += avgDailyCapacity;

    return {
      store,
      staffsInStore,
      staffCount,
      totalManDays,
      totalDaysOff,
      netManDays,
      totalCapacity,
      totalCapacitySum,
      recommendedManDays: activeRecommendedManDays,
      shortage,
      monthlyPredictedVisitors: activeMonthlyPredictedVisitors,
      capacityShortage,
      plan,
      monMD, tueMD, wedMD, thuMD, friMD, satMD, sunMD, totalPlanned,
      preds,
      recommendedW: activeRecommendedW,
      recommendedH: activeRecommendedH,
      totalTrainingDays,
      totalDaysOffAdjustment,
      partTimeStaff,
      partTimeTotal,
      aiMonthlyPredictedVisitors,
      aiRecommendedManDays,
      budgetMonthlyPredictedVisitors,
      budgetRecommendedManDays,
      aiRecommendedW,
      budgetRecommendedW,
      totalExtraWorkDays,
      totalPaidLeaveDays,
      totalSupportDays,
      aiRecs,
      activeRecs,
      avgDailyCapacity,
      avgDailyVisitors,
      plannedPower,
      avgVisitors
    };
  });

  const groupedStoreRows = storeRows.reduce((acc, row) => {
    const area = row.store.area || '未分類';
    if (!acc[area]) acc[area] = [];
    acc[area].push(row);
    return acc;
  }, {} as Record<string, typeof storeRows>);

  const grandTotals = {
    aiVisitors: storeRows.reduce((sum, r) => sum + r.aiMonthlyPredictedVisitors, 0),
    budget: storeRows.reduce((sum, r) => sum + r.budgetMonthlyPredictedVisitors, 0),
    netManDays: round(storeRows.reduce((sum, r) => sum + r.netManDays, 0)),
    recommendedManDays: round(storeRows.reduce((sum, r) => sum + r.recommendedManDays, 0)),
    totalCapacity: round(storeRows.reduce((sum, r) => sum + r.totalCapacity, 0)),
    predictedVisitors: storeRows.reduce((sum, r) => sum + r.monthlyPredictedVisitors, 0),
    monMD: round(storeRows.reduce((sum, r) => sum + r.monMD, 0)),
    tueMD: round(storeRows.reduce((sum, r) => sum + r.tueMD, 0)),
    wedMD: round(storeRows.reduce((sum, r) => sum + r.wedMD, 0)),
    thuMD: round(storeRows.reduce((sum, r) => sum + r.thuMD, 0)),
    friMD: round(storeRows.reduce((sum, r) => sum + r.friMD, 0)),
    satMD: round(storeRows.reduce((sum, r) => sum + r.satMD, 0)),
    sunMD: round(storeRows.reduce((sum, r) => sum + r.sunMD, 0)),
    totalPlanned: round(storeRows.reduce((sum, r) => sum + r.totalPlanned, 0)),
    extra: round(storeRows.reduce((sum, r) => sum + r.totalExtraWorkDays, 0)),
    paid: round(storeRows.reduce((sum, r) => sum + r.totalPaidLeaveDays, 0)),
    support: round(storeRows.reduce((sum, r) => sum + r.totalSupportDays, 0)),
    training: round(storeRows.reduce((sum, r) => sum + r.totalTrainingDays, 0)),
    leave: round(storeRows.reduce((sum, r) => sum + (r.totalDaysOffAdjustment || 0), 0)),
    shortage: round(storeRows.reduce((sum, r) => sum + r.shortage, 0)),
    partTimeTotal: round(storeRows.reduce((sum, r) => sum + r.partTimeTotal, 0)),
    totalBaseManDays: round(totalBaseManDaysAll),
    totalDaysOff: totalDaysOffAll,
    totalCapacitySum: round(totalCapacitySumAll),
  };

  return (
    <div className="p-6 max-w-[1800px] mx-auto space-y-8">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">稼働計画・計算</h2>
          <p className="text-neutral-600">店舗ごとのスタッフ配置と、曜日別の稼働計画を入力します。ダッシュボードの配置にも反映されます。</p>
        </div>
        <div className="flex items-center space-x-4">

          <button 
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>全データ削除</span>
          </button>
          <button 
            onClick={handleCopyFromPreviousMonth}
            className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-neutral-200 shadow-sm hover:bg-neutral-50 text-neutral-700 transition-colors"
          >
            <Copy size={18} />
            <span className="font-medium text-sm">前月からコピー</span>
          </button>
          <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-neutral-200 shadow-sm">
            <Calendar size={20} className="text-neutral-500" />
            <input 
              type="month" 
              value={currentYearMonth}
              onChange={(e) => setCurrentYearMonth(e.target.value)}
              className="border-none bg-transparent font-bold text-neutral-700 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Users size={24} /></div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">総スタッフ数</p>
            <Tooltip content="店舗に配属されている全スタッフの人数です。" position="bottom">
              <p className="text-2xl font-bold text-neutral-900 cursor-help">{totalStaffCount}</p>
            </Tooltip>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle size={24} /></div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">確保数 / 必要数</p>
            <Tooltip content={
              <div className="space-y-1">
                <p>確保：スタッフの出勤可能日数の合計</p>
                <p>必要：AI予測客数に基づく推奨数</p>
                <p className="text-[10px] opacity-70 border-t border-white/20 pt-1">計算: Σ(月間日数 - 公休数) / Σ(日別必要数)</p>
              </div>
            } position="bottom">
              <p className="text-2xl font-bold text-neutral-900 cursor-help">
                {totalNetManDaysAll} <span className="text-sm font-normal text-neutral-500">/ {totalRecommendedManDaysAll}</span>
              </p>
            </Tooltip>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${totalShortageAll < 0 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}><TrendingUp size={24} /></div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">応援必要数 (過不足)</p>
            <Tooltip content={
              <div className="space-y-1">
                <p>確保数 - 計画計 + 時短パート合計</p>
                <p>プラス：人員に余裕あり</p>
                <p>マイナス：人員不足（応援が必要）</p>
              </div>
            } position="bottom">
              <p className={`text-2xl font-bold cursor-help ${totalShortageAll < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {totalShortageAll > 0 ? `+${totalShortageAll}` : totalShortageAll}
              </p>
            </Tooltip>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 flex items-center space-x-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg"><Calculator size={24} /></div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">平均供給力 / 予測客数 (1日当り)</p>
            <Tooltip content={
              <div className="space-y-1">
                <p>供給：スタッフの公休を考慮した1日あたりの平均供給力</p>
                <p>予測：1日あたりの予測客数（AIまたは予算）</p>
                <p className="text-[10px] opacity-70 border-t border-white/20 pt-1">計算: Σ(月間供給力) / 月間日数</p>
              </div>
            } position="bottom">
              <p className="text-2xl font-bold text-neutral-900 cursor-help">
                {Math.round(totalCapacityAll / (dayCounts.total || 1))} <span className="text-sm font-normal text-neutral-500">/ {Math.round(totalPredictedVisitorsAll / (dayCounts.total || 1))}</span>
              </p>
            </Tooltip>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${totalCapacityShortageAll < 0 ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}><TrendingUp size={24} /></div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">平均供給力 過不足 (1日当り)</p>
            <Tooltip content={
              <div className="space-y-1">
                <p>平均供給力 - 予測客数</p>
                <p>1日あたりのサービス提供能力の余裕度です。</p>
              </div>
            } position="bottom">
              <p className={`text-2xl font-bold cursor-help ${totalCapacityShortageAll < 0 ? 'text-red-600' : 'text-indigo-600'}`}>
                {totalCapacityShortageAll > 0 ? `+${Math.round(totalCapacityShortageAll / (dayCounts.total || 1))}` : Math.round(totalCapacityShortageAll / (dayCounts.total || 1))}
              </p>
            </Tooltip>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 flex items-center space-x-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg"><Calendar size={24} /></div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">計画数 (入力値)</p>
            <Tooltip content="各店舗の稼働計画で入力された合計値です。" position="bottom">
              <p className="text-2xl font-bold text-neutral-900 cursor-help">{totalPlannedManDaysAll}</p>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-neutral-100 text-neutral-700 border-b border-neutral-300">
                <th rowSpan={2} className="p-1 border-r border-neutral-300 sticky left-0 bg-neutral-100 z-20 min-w-[80px]">
                  <Tooltip content="店舗名：対象となる店舗の名称です。" position="bottom-left">
                    <span className="cursor-help">店舗名</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 sticky left-[80px] bg-neutral-100 z-20 min-w-[100px]">
                  <Tooltip content="月間客数：AI予測または予算として設定された月間の総客数です。" position="bottom-left">
                    <div className="cursor-help">月間客数<br/><span className="text-[10px] font-normal">(AI/予算)</span></div>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 sticky left-[180px] bg-neutral-100 z-20 min-w-[100px]">
                  <Tooltip content="氏名：店舗に配属されているスタッフの氏名です。" position="bottom-left">
                    <span className="cursor-help">氏名</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center">
                  <Tooltip content="公休：スタッフの月間の公休日数です。" position="bottom">
                    <span className="cursor-help">公休</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center">
                  <Tooltip content="確保数：月間日数から公休を引いた、スタッフが稼働可能な日数の合計です。" position="bottom">
                    <span className="cursor-help">確保<br/>数</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center">
                  <Tooltip content="平均供給力(1日)：スタッフの公休を考慮した、1日あたりの平均的なサービス提供能力（対応可能客数）です。算出式：月間合計供給力 ÷ 月間日数" position="bottom">
                    <span className="cursor-help">平均供給力<br/>(1日)</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center">
                  <Tooltip content="平均予測客数(1日)：AI予測または予算から算出された、1日あたりの平均的な予測客数です。算出式：月間予測客数 ÷ 月間日数" position="bottom">
                    <span className="cursor-help">平均予測客数<br/>(1日)</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center min-w-[40px]">
                  <Tooltip content="月曜日：月曜日ごとの配置人数と、月間の合計数です。" position="bottom">
                    <span className="cursor-help">月</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center min-w-[40px]">
                  <Tooltip content="火曜日：火曜日ごとの配置人数と、月間の合計数です。" position="bottom">
                    <span className="cursor-help">火</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center min-w-[40px]">
                  <Tooltip content="水曜日：水曜日ごとの配置人数と、月間の合計数です。" position="bottom">
                    <span className="cursor-help">水</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center min-w-[40px]">
                  <Tooltip content="木曜日：木曜日ごとの配置人数と、月間の合計数です。" position="bottom">
                    <span className="cursor-help">木</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center min-w-[40px]">
                  <Tooltip content="金曜日：金曜日ごとの配置人数と、月間の合計数です。" position="bottom">
                    <span className="cursor-help">金</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center min-w-[40px]">
                  <Tooltip content="土曜日：土曜日ごとの配置人数と、月間の合計数です。" position="bottom">
                    <span className="cursor-help">土</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center min-w-[40px]">
                  <Tooltip content="日曜日・祝日：日曜日・祝日ごとの配置人数と、月間の合計数です。" position="bottom">
                    <span className="cursor-help">日祝</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center bg-yellow-100">
                  <Tooltip content="計画計：各曜日の配置人数から算出された月間の合計計画数です。" position="bottom">
                    <span className="cursor-help">計画計</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center">
                  <Tooltip content="公出：公休日以外の出勤（休日出勤）による増加数です。" position="bottom">
                    <span className="cursor-help">公出</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center">
                  <Tooltip content="有休：有給休暇の取得による減少数です。" position="bottom">
                    <span className="cursor-help">有休</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center">
                  <Tooltip content="応援：他店への応援派遣による減少数です。" position="bottom">
                    <span className="cursor-help">応援</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center">
                  <Tooltip content="研修：研修参加による減少数です。" position="bottom">
                    <span className="cursor-help">研修</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center">
                  <Tooltip content="休職等：休職や長期休暇による減少数です。" position="bottom">
                    <span className="cursor-help">休職等</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 border-r border-neutral-300 text-center bg-yellow-100 font-bold">
                  <Tooltip content="過不足：確保数から計画計を引いた値です。マイナスは人員不足を意味します。" position="bottom-right">
                    <span className="cursor-help">過不足</span>
                  </Tooltip>
                </th>
                <th colSpan={3} className="p-1 border-r border-neutral-300 text-center">
                  <Tooltip content="時短パート：短時間勤務スタッフの配置状況です。" position="bottom">
                    <span className="cursor-help">時短パート</span>
                  </Tooltip>
                </th>
                <th rowSpan={2} className="p-1 text-center bg-yellow-100 font-bold text-red-600">
                  <Tooltip content="応援必要数：過不足に時短パートの出勤日数を加味した、最終的な応援必要数です。" position="bottom-right">
                    <div className="cursor-help">応援<br/>必要数</div>
                  </Tooltip>
                </th>
              </tr>
              <tr className="bg-neutral-100 text-neutral-700 border-b border-neutral-300">
                <th className="p-1 border-r border-neutral-300 text-center min-w-[80px]">氏名</th>
                <th className="p-1 border-r border-neutral-300 text-center min-w-[40px]">日数</th>
                <th className="p-1 border-r border-neutral-300 text-center min-w-[40px]">計</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedStoreRows).map(([areaName, rows]: [string, any]) => (
                <React.Fragment key={areaName}>
                  {rows.map((row: any) => {
                const numStaffRows = row.staffsInStore.length;
                const numPartTimeRows = row.partTimeStaff.length;
                const totalRows = Math.max(numStaffRows + 2, numPartTimeRows + 2);
                const rowSpan = totalRows;
                const budgetObj = budgets.find(b => b.storeId === row.store.id && b.yearMonth === currentYearMonth);
                const budgetValue = budgetObj ? budgetObj.budget : '';

                return (
                  <React.Fragment key={row.store.id}>
                    {Array.from({ length: totalRows }).map((_, i) => {
                      const isSummaryRow = i === 0;
                      const isAddStaffRow = i === numStaffRows + 1;
                      const staffIndex = i - 1;
                      const staff = staffIndex >= 0 && staffIndex < numStaffRows ? row.staffsInStore[staffIndex] : null;
                      
                      const partTimeIndex = i - 1;
                      const partTime = partTimeIndex >= 0 && partTimeIndex < numPartTimeRows ? row.partTimeStaff[partTimeIndex] : null;

                      return (
                        <tr key={i} className={`border-b border-neutral-200 hover:bg-neutral-50 ${isAddStaffRow ? 'border-b-2 border-neutral-400 bg-neutral-50' : ''}`}>
                          {isSummaryRow && (
                            <>
                              <td rowSpan={rowSpan} className="p-1 border-r border-neutral-300 font-bold bg-white sticky left-0 z-10 align-top">{row.store.name}</td>
                              <td rowSpan={rowSpan} className="p-1 border-r border-neutral-300 bg-white sticky left-[80px] z-10 align-top">
                                <div className="flex flex-col space-y-1">
                                  <Tooltip content="過去データから重回帰分析または時系列分析で算出した月間予測客数です。">
                                    <div className="text-[10px] text-neutral-500 cursor-help">AI予測: {row.aiMonthlyPredictedVisitors}</div>
                                  </Tooltip>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[10px] text-neutral-500">予算:</span>
                                    <input 
                                      type="number" 
                                      min="0" 
                                      value={budgetValue} 
                                      onChange={e => handleBudgetChange(row.store.id, Number(e.target.value))} 
                                      className="w-16 p-1 border rounded text-xs"
                                      placeholder="未入力"
                                    />
                                  </div>
                                </div>
                              </td>
                            </>
                          )}

                          {isSummaryRow ? (
                            <>
                              <td className="p-1 border-r border-neutral-300 bg-neutral-50 sticky left-[180px] z-10 text-neutral-500 text-xs text-center align-middle">
                                店舗集計<br/>
                                <span className="text-[10px] text-neutral-400">({row.staffCount}名)</span>
                              </td>
                              <td className="p-1 border-r border-neutral-300 bg-neutral-50 text-center text-xs text-neutral-600 align-middle">
                                {row.totalDaysOff}
                              </td>
                              <td className="p-1 border-r border-neutral-300 bg-neutral-50 text-center text-xs text-neutral-500 align-middle">
                                確保合計<br/>
                                <Tooltip content="スタッフの稼働可能日数（月間日数 - 公休数）の合計です。">
                                  <span className="font-bold text-neutral-700 cursor-help">
                                    {row.totalManDays - row.totalDaysOff}
                                  </span>
                                </Tooltip>
                              </td>
                              <td className="p-1 border-r border-neutral-300 bg-neutral-50 text-center align-middle">
                                <Tooltip content="スタッフの公休を考慮した、1日あたりの平均的なサービス提供能力です。">
                                  <div className="text-xs text-blue-600 font-bold cursor-help">{row.avgDailyCapacity}</div>
                                </Tooltip>
                              </td>
                              <td className="p-1 border-r border-neutral-300 bg-neutral-50 text-center align-middle">
                                <Tooltip content="1日あたりの平均的な予測客数です。">
                                  <div className="text-xs text-blue-600 font-bold cursor-help">{row.avgDailyVisitors}</div>
                                </Tooltip>
                              </td>
                              
                              <td className="p-1 border-r border-neutral-300 align-top bg-white">
                                <Tooltip content={
                                  <div className="space-y-1">
                                    <p>AI予測または予算から算出された推奨人員枠です。</p>
                                    <p className="text-[10px] opacity-80">AI予測(月曜): {row.aiRecs.mon} / 予算: {row.budgetRecommendedW}</p>
                                    <p className="text-[10px] text-blue-500">平均予測客数: {row.avgVisitors.mon}</p>
                                  </div>
                                }>
                                  <div className="text-[10px] text-neutral-400 text-center mb-1 cursor-help">推:{row.activeRecs.mon}</div>
                                </Tooltip>
                                <input type="number" min="0" value={row.plan.mondayCount || ''} onChange={e => handleStorePlanChange(row.store.id, 'mondayCount', Number(e.target.value))} className="w-10 p-1 border rounded text-center mx-auto block text-xs" />
                                <div className="mt-1 flex flex-col items-center space-y-1">
                                  <Tooltip content={`計画供給能力: ${row.plannedPower.mon}`}>
                                    <div className={`text-[9px] font-bold px-1 rounded ${row.plannedPower.mon < row.avgVisitors.mon ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                                      力:{row.plannedPower.mon}
                                    </div>
                                  </Tooltip>
                                  <Tooltip content="休業日調整（マイナス入力）">
                                    <input 
                                      type="number" 
                                      max="0"
                                      value={row.plan.mondayAdjustment || ''} 
                                      onChange={e => handleStorePlanChange(row.store.id, 'mondayAdjustment', Number(e.target.value))} 
                                      className="w-10 p-0.5 border border-red-200 rounded text-[10px] text-center text-red-600 bg-red-50"
                                      placeholder="休"
                                    />
                                  </Tooltip>
                                  <Tooltip content={`月間月曜日数(${dayCounts.monday}日 + 調整) × 配置人数`}>
                                    <div className="text-[10px] text-blue-600 text-center font-bold cursor-help">{row.monMD}</div>
                                  </Tooltip>
                                </div>
                              </td>
                              <td className="p-1 border-r border-neutral-300 align-top bg-white">
                                <Tooltip content={
                                  <div className="space-y-1">
                                    <p>AI予測または予算から算出された推奨人員枠です。</p>
                                    <p className="text-[10px] opacity-80">AI予測(火曜): {row.aiRecs.tue} / 予算: {row.budgetRecommendedW}</p>
                                    <p className="text-[10px] text-blue-500">平均予測客数: {row.avgVisitors.tue}</p>
                                  </div>
                                }>
                                  <div className="text-[10px] text-neutral-400 text-center mb-1 cursor-help">推:{row.activeRecs.tue}</div>
                                </Tooltip>
                                <input type="number" min="0" value={row.plan.tuesdayCount || ''} onChange={e => handleStorePlanChange(row.store.id, 'tuesdayCount', Number(e.target.value))} className="w-10 p-1 border rounded text-center mx-auto block text-xs" />
                                <div className="mt-1 flex flex-col items-center space-y-1">
                                  <Tooltip content={`計画供給能力: ${row.plannedPower.tue}`}>
                                    <div className={`text-[9px] font-bold px-1 rounded ${row.plannedPower.tue < row.avgVisitors.tue ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                                      力:{row.plannedPower.tue}
                                    </div>
                                  </Tooltip>
                                  <Tooltip content="休業日調整（マイナス入力）">
                                    <input 
                                      type="number" 
                                      max="0"
                                      value={row.plan.tuesdayAdjustment || ''} 
                                      onChange={e => handleStorePlanChange(row.store.id, 'tuesdayAdjustment', Number(e.target.value))} 
                                      className="w-10 p-0.5 border border-red-200 rounded text-[10px] text-center text-red-600 bg-red-50"
                                      placeholder="休"
                                    />
                                  </Tooltip>
                                  <Tooltip content={`月間火曜日数(${dayCounts.tuesday}日 + 調整) × 配置人数`}>
                                    <div className="text-[10px] text-blue-600 text-center font-bold cursor-help">{row.tueMD}</div>
                                  </Tooltip>
                                </div>
                              </td>
                              <td className="p-1 border-r border-neutral-300 align-top bg-white">
                                <Tooltip content={
                                  <div className="space-y-1">
                                    <p>AI予測または予算から算出された推奨人員枠です。</p>
                                    <p className="text-[10px] opacity-80">AI予測(水曜): {row.aiRecs.wed} / 予算: {row.budgetRecommendedW}</p>
                                    <p className="text-[10px] text-blue-500">平均予測客数: {row.avgVisitors.wed}</p>
                                  </div>
                                }>
                                  <div className="text-[10px] text-neutral-400 text-center mb-1 cursor-help">推:{row.activeRecs.wed}</div>
                                </Tooltip>
                                <input type="number" min="0" value={row.plan.wednesdayCount || ''} onChange={e => handleStorePlanChange(row.store.id, 'wednesdayCount', Number(e.target.value))} className="w-10 p-1 border rounded text-center mx-auto block text-xs" />
                                <div className="mt-1 flex flex-col items-center space-y-1">
                                  <Tooltip content={`計画供給能力: ${row.plannedPower.wed}`}>
                                    <div className={`text-[9px] font-bold px-1 rounded ${row.plannedPower.wed < row.avgVisitors.wed ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                                      力:{row.plannedPower.wed}
                                    </div>
                                  </Tooltip>
                                  <Tooltip content="休業日調整（マイナス入力）">
                                    <input 
                                      type="number" 
                                      max="0"
                                      value={row.plan.wednesdayAdjustment || ''} 
                                      onChange={e => handleStorePlanChange(row.store.id, 'wednesdayAdjustment', Number(e.target.value))} 
                                      className="w-10 p-0.5 border border-red-200 rounded text-[10px] text-center text-red-600 bg-red-50"
                                      placeholder="休"
                                    />
                                  </Tooltip>
                                  <Tooltip content={`月間水曜日数(${dayCounts.wednesday}日 + 調整) × 配置人数`}>
                                    <div className="text-[10px] text-blue-600 text-center font-bold cursor-help">{row.wedMD}</div>
                                  </Tooltip>
                                </div>
                              </td>
                              <td className="p-1 border-r border-neutral-300 align-top bg-white">
                                <Tooltip content={
                                  <div className="space-y-1">
                                    <p>AI予測または予算から算出された推奨人員枠です。</p>
                                    <p className="text-[10px] opacity-80">AI予測(木曜): {row.aiRecs.thu} / 予算: {row.budgetRecommendedW}</p>
                                    <p className="text-[10px] text-blue-500">平均予測客数: {row.avgVisitors.thu}</p>
                                  </div>
                                }>
                                  <div className="text-[10px] text-neutral-400 text-center mb-1 cursor-help">推:{row.activeRecs.thu}</div>
                                </Tooltip>
                                <input type="number" min="0" value={row.plan.thursdayCount || ''} onChange={e => handleStorePlanChange(row.store.id, 'thursdayCount', Number(e.target.value))} className="w-10 p-1 border rounded text-center mx-auto block text-xs" />
                                <div className="mt-1 flex flex-col items-center space-y-1">
                                  <Tooltip content={`計画供給能力: ${row.plannedPower.thu}`}>
                                    <div className={`text-[9px] font-bold px-1 rounded ${row.plannedPower.thu < row.avgVisitors.thu ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                                      力:{row.plannedPower.thu}
                                    </div>
                                  </Tooltip>
                                  <Tooltip content="休業日調整（マイナス入力）">
                                    <input 
                                      type="number" 
                                      max="0"
                                      value={row.plan.thursdayAdjustment || ''} 
                                      onChange={e => handleStorePlanChange(row.store.id, 'thursdayAdjustment', Number(e.target.value))} 
                                      className="w-10 p-0.5 border border-red-200 rounded text-[10px] text-center text-red-600 bg-red-50"
                                      placeholder="休"
                                    />
                                  </Tooltip>
                                  <Tooltip content={`月間木曜日数(${dayCounts.thursday}日 + 調整) × 配置人数`}>
                                    <div className="text-[10px] text-blue-600 text-center font-bold cursor-help">{row.thuMD}</div>
                                  </Tooltip>
                                </div>
                              </td>
                              <td className="p-1 border-r border-neutral-300 align-top bg-white">
                                <Tooltip content={
                                  <div className="space-y-1">
                                    <p>AI予測または予算から算出された推奨人員枠です。</p>
                                    <p className="text-[10px] opacity-80">AI予測(金曜): {row.aiRecs.fri} / 予算: {row.budgetRecommendedW}</p>
                                    <p className="text-[10px] text-blue-500">平均予測客数: {row.avgVisitors.fri}</p>
                                  </div>
                                }>
                                  <div className="text-[10px] text-neutral-400 text-center mb-1 cursor-help">推:{row.activeRecs.fri}</div>
                                </Tooltip>
                                <input type="number" min="0" value={row.plan.fridayCount || ''} onChange={e => handleStorePlanChange(row.store.id, 'fridayCount', Number(e.target.value))} className="w-10 p-1 border rounded text-center mx-auto block text-xs" />
                                <div className="mt-1 flex flex-col items-center space-y-1">
                                  <Tooltip content={`計画供給能力: ${row.plannedPower.fri}`}>
                                    <div className={`text-[9px] font-bold px-1 rounded ${row.plannedPower.fri < row.avgVisitors.fri ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                                      力:{row.plannedPower.fri}
                                    </div>
                                  </Tooltip>
                                  <Tooltip content="休業日調整（マイナス入力）">
                                    <input 
                                      type="number" 
                                      max="0"
                                      value={row.plan.fridayAdjustment || ''} 
                                      onChange={e => handleStorePlanChange(row.store.id, 'fridayAdjustment', Number(e.target.value))} 
                                      className="w-10 p-0.5 border border-red-200 rounded text-[10px] text-center text-red-600 bg-red-50"
                                      placeholder="休"
                                    />
                                  </Tooltip>
                                  <Tooltip content={`月間金曜日数(${dayCounts.friday}日 + 調整) × 配置人数`}>
                                    <div className="text-[10px] text-blue-600 text-center font-bold cursor-help">{row.friMD}</div>
                                  </Tooltip>
                                </div>
                              </td>
                              <td className="p-1 border-r border-neutral-300 align-top bg-white">
                                <Tooltip content={
                                  <div className="space-y-1">
                                    <p>AI予測または予算から算出された推奨人員枠です。</p>
                                    <p className="text-[10px] opacity-80">AI予測(土曜): {row.aiRecs.sat} / 予算: {row.budgetRecommendedH}</p>
                                    <p className="text-[10px] text-blue-500">平均予測客数: {row.avgVisitors.sat}</p>
                                  </div>
                                }>
                                  <div className="text-[10px] text-neutral-400 text-center mb-1 cursor-help">推:{row.activeRecs.sat}</div>
                                </Tooltip>
                                <input type="number" min="0" value={row.plan.saturdayCount || ''} onChange={e => handleStorePlanChange(row.store.id, 'saturdayCount', Number(e.target.value))} className="w-10 p-1 border rounded text-center mx-auto block text-xs" />
                                <div className="mt-1 flex flex-col items-center space-y-1">
                                  <Tooltip content={`計画供給能力: ${row.plannedPower.sat}`}>
                                    <div className={`text-[9px] font-bold px-1 rounded ${row.plannedPower.sat < row.avgVisitors.sat ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                                      力:{row.plannedPower.sat}
                                    </div>
                                  </Tooltip>
                                  <Tooltip content="休業日調整（マイナス入力）">
                                    <input 
                                      type="number" 
                                      max="0"
                                      value={row.plan.saturdayAdjustment || ''} 
                                      onChange={e => handleStorePlanChange(row.store.id, 'saturdayAdjustment', Number(e.target.value))} 
                                      className="w-10 p-0.5 border border-red-200 rounded text-[10px] text-center text-red-600 bg-red-50"
                                      placeholder="休"
                                    />
                                  </Tooltip>
                                  <Tooltip content={`月間土曜日数(${dayCounts.saturday}日 + 調整) × 配置人数`}>
                                    <div className="text-[10px] text-blue-600 text-center font-bold cursor-help">{row.satMD}</div>
                                  </Tooltip>
                                </div>
                              </td>
                              <td className="p-1 border-r border-neutral-300 align-top bg-white">
                                <Tooltip content={
                                  <div className="space-y-1">
                                    <p>AI予測または予算から算出された推奨人員枠です。</p>
                                    <p className="text-[10px] opacity-80">AI予測(日曜): {row.aiRecs.sun} / 予算: {row.budgetRecommendedH}</p>
                                    <p className="text-[10px] text-blue-500">平均予測客数: {row.avgVisitors.sun}</p>
                                  </div>
                                }>
                                  <div className="text-[10px] text-neutral-400 text-center mb-1 cursor-help">推:{row.activeRecs.sun}</div>
                                </Tooltip>
                                <input type="number" min="0" value={row.plan.sundayHolidayCount || ''} onChange={e => handleStorePlanChange(row.store.id, 'sundayHolidayCount', Number(e.target.value))} className="w-10 p-1 border rounded text-center mx-auto block text-xs" />
                                <div className="mt-1 flex flex-col items-center space-y-1">
                                  <Tooltip content={`計画供給能力: ${row.plannedPower.sun}`}>
                                    <div className={`text-[9px] font-bold px-1 rounded ${row.plannedPower.sun < row.avgVisitors.sun ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                                      力:{row.plannedPower.sun}
                                    </div>
                                  </Tooltip>
                                  <Tooltip content="休業日調整（マイナス入力）">
                                    <input 
                                      type="number" 
                                      max="0"
                                      value={row.plan.sundayHolidayAdjustment || ''} 
                                      onChange={e => handleStorePlanChange(row.store.id, 'sundayHolidayAdjustment', Number(e.target.value))} 
                                      className="w-10 p-0.5 border border-red-200 rounded text-[10px] text-center text-red-600 bg-red-50"
                                      placeholder="休"
                                    />
                                  </Tooltip>
                                  <Tooltip content={`月間日曜日数(${dayCounts.sundayHoliday}日 + 調整) × 配置人数`}>
                                    <div className="text-[10px] text-blue-600 text-center font-bold cursor-help">{row.sunMD}</div>
                                  </Tooltip>
                                </div>
                              </td>
                              
                              <td className="p-1 border-r border-neutral-300 text-center font-bold bg-yellow-100 align-middle">
                                <Tooltip content="各曜日の配置人数から算出された月間の合計計画数です。">
                                  <span className="cursor-help">{row.totalPlanned}</span>
                                </Tooltip>
                              </td>
                              
                              <td className="p-1 border-r border-neutral-300 bg-neutral-50 text-center font-bold text-blue-600 align-middle">
                                <Tooltip content="店舗スタッフ全員の公出（休日出勤）日数の合計です。">
                                  <span className="cursor-help">{row.totalExtraWorkDays > 0 ? `+${row.totalExtraWorkDays}` : row.totalExtraWorkDays}</span>
                                </Tooltip>
                              </td>
                              <td className="p-1 border-r border-neutral-300 bg-neutral-50 text-center font-bold text-red-600 align-middle">
                                <Tooltip content="店舗スタッフ全員の有給休暇取得日数の合計です。">
                                  <span className="cursor-help">{row.totalPaidLeaveDays > 0 ? `-${row.totalPaidLeaveDays}` : row.totalPaidLeaveDays}</span>
                                </Tooltip>
                              </td>
                              <td className="p-1 border-r border-neutral-300 bg-neutral-50 text-center font-bold text-red-600 align-middle">
                                <Tooltip content="店舗スタッフ全員の他店への応援派遣日数の合計です。">
                                  <span className="cursor-help">{row.totalSupportDays > 0 ? `-${row.totalSupportDays}` : row.totalSupportDays}</span>
                                </Tooltip>
                              </td>
                              <td className="p-1 border-r border-neutral-300 bg-neutral-50 text-center font-bold text-red-600 align-middle">
                                <Tooltip content="店舗スタッフ全員の研修参加日数の合計です。">
                                  <span className="cursor-help">{row.totalTrainingDays > 0 ? `-${row.totalTrainingDays}` : row.totalTrainingDays}</span>
                                </Tooltip>
                              </td>
                              <td className="p-1 border-r border-neutral-300 bg-neutral-50 text-center font-bold text-red-600 align-middle">
                                <Tooltip content="店舗スタッフ全員の休職等による減少日数の合計です。">
                                  <span className="cursor-help">{row.totalDaysOffAdjustment > 0 ? `-${row.totalDaysOffAdjustment}` : row.totalDaysOffAdjustment}</span>
                                </Tooltip>
                              </td>
                            </>
                          ) : staff ? (
                            <>
                              <td className="p-1 border-r border-neutral-300 sticky left-[180px] bg-white z-10 flex items-center justify-between">
                                <div className="flex items-center space-x-1">
                                  {staff.skillLevel === 'trainee' && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded" title="新人">新人</span>}
                                  {staff.skillLevel === 'leader' && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded font-bold" title="指導者">指導者</span>}
                                  <span className="truncate max-w-[80px]" title={staff.name}>{staff.name}</span>
                                </div>
                                <button onClick={() => handleRemoveStaffFromStore(row.store.id, staff.id)} className="text-neutral-400 hover:text-red-500 ml-1" title="店舗から外す">
                                  <Trash2 size={14} />
                                </button>
                              </td>
                              <td className="p-1 border-r border-neutral-300 text-center text-neutral-600">{staff.daysOff}</td>
                              <td className="p-1 border-r border-neutral-300 text-center text-neutral-900">
                                <Tooltip content="月間日数 - 公休数" position="bottom">
                                  <span className="cursor-help">{dayCounts.total - staff.daysOff}</span>
                                </Tooltip>
                              </td>
                              <td className="p-1 border-r border-neutral-300 text-center text-neutral-600">
                                <Tooltip content={`平日能力: ${staff.capW} / 休日能力: ${staff.capH}`}>
                                  <span className="cursor-help">{staff.avgCap}</span>
                                </Tooltip>
                              </td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300 bg-yellow-50"></td>
                              
                              <td className="p-1 border-r border-neutral-300 text-center">
                                <input type="number" min="0" value={(staffWorkforceDetails.find(d => d.staffId === staff.id && d.yearMonth === currentYearMonth)?.extraWorkDays) || ''} onChange={e => handleStaffDetailChange(staff.id, 'extraWorkDays', Number(e.target.value))} className="w-10 p-1 border rounded text-center mx-auto block text-xs" />
                              </td>
                              <td className="p-1 border-r border-neutral-300 text-center">
                                <input type="number" min="0" value={(staffWorkforceDetails.find(d => d.staffId === staff.id && d.yearMonth === currentYearMonth)?.paidLeaveDays) || ''} onChange={e => handleStaffDetailChange(staff.id, 'paidLeaveDays', Number(e.target.value))} className="w-10 p-1 border rounded text-center mx-auto block text-xs" />
                              </td>
                              <td className="p-1 border-r border-neutral-300 text-center">
                                <input type="number" min="0" value={(staffWorkforceDetails.find(d => d.staffId === staff.id && d.yearMonth === currentYearMonth)?.supportDays) || ''} onChange={e => handleStaffDetailChange(staff.id, 'supportDays', Number(e.target.value))} className="w-10 p-1 border rounded text-center mx-auto block text-xs" />
                              </td>
                              <td className="p-1 border-r border-neutral-300 text-center">
                                <input type="number" min="0" value={(staffWorkforceDetails.find(d => d.staffId === staff.id && d.yearMonth === currentYearMonth)?.trainingDays) || ''} onChange={e => handleStaffDetailChange(staff.id, 'trainingDays', Number(e.target.value))} className="w-10 p-1 border rounded text-center mx-auto block text-xs" />
                              </td>
                              <td className="p-1 border-r border-neutral-300 text-center">
                                <input type="number" min="0" value={(staffWorkforceDetails.find(d => d.staffId === staff.id && d.yearMonth === currentYearMonth)?.daysOffAdjustment) || ''} onChange={e => handleStaffDetailChange(staff.id, 'daysOffAdjustment', Number(e.target.value))} className="w-10 p-1 border rounded text-center mx-auto block text-xs" />
                              </td>
                            </>
                          ) : isAddStaffRow ? (
                            <>
                              <td className="p-1 border-r border-neutral-300 sticky left-[180px] bg-neutral-50 z-10">
                                  <select 
                                    className="w-full p-1 border rounded text-xs bg-white"
                                    onChange={(e) => {
                                      handleAddStaffToStore(row.store.id, e.target.value);
                                      e.target.value = ""; // reset
                                    }}
                                    defaultValue=""
                                  >
                                    <option value="" disabled>+ 追加</option>
                                    {staffs.filter(s => !allAllocatedStaffIds.includes(s.id)).map(s => (
                                      <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                  </select>
                              </td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300 bg-yellow-50"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                            </>
                          ) : (
                            <>
                              <td className="p-1 border-r border-neutral-300 sticky left-[180px] bg-white z-10"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300 bg-yellow-50"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                            </>
                          )}

                          {/* Right side columns */}
                          {isSummaryRow && (
                            <td rowSpan={rowSpan} className="p-1 border-r border-neutral-300 text-center font-bold bg-yellow-100 align-middle">
                              <Tooltip content="確保人工数 - 計画計">
                                <span className={`cursor-help ${row.shortage < 0 ? 'text-red-600' : ''}`}>{row.shortage}</span>
                              </Tooltip>
                            </td>
                          )}

                          {isSummaryRow ? (
                            <td colSpan={2} className="p-1 border-r border-neutral-300 text-center bg-neutral-50">
                              <button onClick={() => handleAddPartTimeStaff(row.store.id)} className="text-[10px] text-blue-600 hover:text-blue-800 font-medium">+ 時短パート追加</button>
                            </td>
                          ) : partTime ? (
                            <>
                              <td className="p-1 border-r border-neutral-300">
                                <div className="flex items-center">
                                  <input type="text" value={partTime.name} onChange={e => handlePartTimeStaffChange(row.store.id, partTime.id, 'name', e.target.value)} className="w-full p-1 border rounded text-xs" placeholder="氏名" />
                                  <button onClick={() => handleRemovePartTimeStaff(row.store.id, partTime.id)} className="text-neutral-400 hover:text-red-500 ml-1"><Trash2 size={14} /></button>
                                </div>
                              </td>
                              <td className="p-1 border-r border-neutral-300 text-center">
                                <input type="number" min="0" value={partTime.days || ''} onChange={e => handlePartTimeStaffChange(row.store.id, partTime.id, 'days', Number(e.target.value))} className="w-8 p-1 border rounded text-center mx-auto block text-xs" />
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-1 border-r border-neutral-300"></td>
                              <td className="p-1 border-r border-neutral-300"></td>
                            </>
                          )}

                          {isSummaryRow && (
                            <>
                              <td rowSpan={rowSpan} className="p-1 border-r border-neutral-300 text-center align-middle font-bold bg-white">
                                {row.partTimeTotal > 0 ? row.partTimeTotal : ''}
                              </td>
                              <td rowSpan={rowSpan} className={`p-1 text-center font-bold bg-yellow-100 align-middle text-base ${row.shortage + row.partTimeTotal < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                <Tooltip 
                                  content={
                                    <div className="space-y-1">
                                      <p className="font-bold border-b border-white/20 pb-1 mb-1">応援必要数</p>
                                      <p>計算：過不足 + 時短パート合計</p>
                                      <p className="text-[10px] opacity-80">※マイナスは人員不足（応援が必要）を意味します。</p>
                                    </div>
                                  }
                                  position="top-right"
                                >
                                  <span className="cursor-help">
                                    {row.shortage + row.partTimeTotal > 0 ? `+${row.shortage + row.partTimeTotal}` : row.shortage + row.partTimeTotal}
                                  </span>
                                </Tooltip>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {/* Area Subtotal Row */}
              <tr className="bg-blue-50 font-bold border-t-2 border-blue-200">
                <td className="p-2 border-r border-neutral-300 sticky left-0 bg-blue-50 z-10">{areaName} 小計</td>
                <td className="p-2 border-r border-neutral-300 sticky left-[80px] bg-blue-50 z-10">
                  <div className="text-[10px] text-neutral-600">AI:{rows.reduce((sum, r) => sum + r.aiMonthlyPredictedVisitors, 0)}</div>
                  <div className="text-[10px] text-neutral-600">予算:{rows.reduce((sum, r) => sum + r.budgetMonthlyPredictedVisitors, 0)}</div>
                </td>
                <td className="p-2 border-r border-neutral-300 sticky left-[180px] bg-blue-50 z-10 text-center">-</td>
                <td className="p-2 border-r border-neutral-300 text-center text-xs text-neutral-600">
                  {rows.reduce((sum, r) => sum + r.totalDaysOff, 0)}
                </td>
                <td className="p-2 border-r border-neutral-300 text-center text-xs">
                  <span className="font-bold text-neutral-700">
                    {rows.reduce((sum, r) => sum + (r.totalManDays - r.totalDaysOff), 0)}
                  </span>
                </td>
                <td className="p-2 border-r border-neutral-300 text-center text-xs text-blue-600 font-bold">
                  {round(rows.reduce((sum, r) => sum + r.avgDailyCapacity, 0))}
                </td>
                <td className="p-2 border-r border-neutral-300 text-center text-xs text-blue-600 font-bold">
                  {round(rows.reduce((sum, r) => sum + r.avgDailyVisitors, 0))}
                </td>
                <td className="p-2 border-r border-neutral-300 text-center text-blue-600">{round(rows.reduce((sum, r) => sum + r.monMD, 0))}</td>
                <td className="p-2 border-r border-neutral-300 text-center text-blue-600">{round(rows.reduce((sum, r) => sum + r.tueMD, 0))}</td>
                <td className="p-2 border-r border-neutral-300 text-center text-blue-600">{round(rows.reduce((sum, r) => sum + r.wedMD, 0))}</td>
                <td className="p-2 border-r border-neutral-300 text-center text-blue-600">{round(rows.reduce((sum, r) => sum + r.thuMD, 0))}</td>
                <td className="p-2 border-r border-neutral-300 text-center text-blue-600">{round(rows.reduce((sum, r) => sum + r.friMD, 0))}</td>
                <td className="p-2 border-r border-neutral-300 text-center text-blue-600">{round(rows.reduce((sum, r) => sum + r.satMD, 0))}</td>
                <td className="p-2 border-r border-neutral-300 text-center text-blue-600">{round(rows.reduce((sum, r) => sum + r.sunMD, 0))}</td>
                <td className="p-2 border-r border-neutral-300 text-center bg-yellow-100">
                  {round(rows.reduce((sum, r) => sum + r.totalPlanned, 0))}
                </td>
                <td className="p-2 border-r border-neutral-300 text-center text-blue-600">
                  +{rows.reduce((sum, r) => sum + r.totalExtraWorkDays, 0)}
                </td>
                <td className="p-2 border-r border-neutral-300 text-center text-red-600">
                  -{rows.reduce((sum, r) => sum + r.totalPaidLeaveDays, 0)}
                </td>
                <td className="p-2 border-r border-neutral-300 text-center text-red-600">
                  -{rows.reduce((sum, r) => sum + r.totalSupportDays, 0)}
                </td>
                <td className="p-2 border-r border-neutral-300 text-center text-red-600">
                  -{rows.reduce((sum, r) => sum + r.totalTrainingDays, 0)}
                </td>
                <td className="p-2 border-r border-neutral-300 text-center text-red-600">
                  -{rows.reduce((sum, r) => sum + (r.totalDaysOffAdjustment || 0), 0)}
                </td>
                <td className="p-2 border-r border-neutral-300 text-center bg-yellow-100">
                  <span className={round(rows.reduce((sum, r) => sum + r.shortage, 0)) < 0 ? 'text-red-600' : ''}>
                    {round(rows.reduce((sum, r) => sum + r.shortage, 0))}
                  </span>
                </td>
                <td colSpan={2} className="p-2 border-r border-neutral-300 text-center">-</td>
                <td className="p-2 border-r border-neutral-300 text-center">
                  {round(rows.reduce((sum, r) => sum + r.partTimeTotal, 0))}
                </td>
                <td className="p-2 text-center text-sm border-r border-neutral-300 bg-yellow-100">
                  <span className={`font-bold ${round(rows.reduce((sum, r) => sum + r.shortage + r.partTimeTotal, 0)) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {round(rows.reduce((sum, r) => sum + r.shortage + r.partTimeTotal, 0)) > 0 ? '+' : ''}{round(rows.reduce((sum, r) => sum + r.shortage + r.partTimeTotal, 0))}
                  </span>
                </td>
              </tr>
            </React.Fragment>
          ))}
              {/* Grand Total Row */}
              <tr className="bg-neutral-200 font-bold border-t-2 border-neutral-400">
                <td className="p-2 border-r border-neutral-300 sticky left-0 bg-neutral-200 z-10">全店合計</td>
                <td className="p-2 border-r border-neutral-300 sticky left-[80px] bg-neutral-200 z-10">
                  <div className="text-[10px] text-neutral-600">AI:{grandTotals.aiVisitors}</div>
                  <div className="text-[10px] text-neutral-600">予算:{grandTotals.budget}</div>
                </td>
                <td className="p-2 border-r border-neutral-300 sticky left-[180px] bg-neutral-200 z-10 text-center">-</td>
                <td className="p-2 border-r border-neutral-300 text-center text-xs text-neutral-600">
                  {grandTotals.totalDaysOff}
                </td>
                <td className="p-2 border-r border-neutral-300 text-center text-xs">
                  確保合計<br/>
                  <Tooltip content="全スタッフの稼働可能日数の総計です。">
                    <span className="font-bold text-neutral-700 cursor-help">
                      {grandTotals.totalBaseManDays}
                    </span>
                  </Tooltip>
                </td>
                <td className="p-2 border-r border-neutral-300 text-center text-xs text-blue-600 font-bold">
                  <Tooltip content="全スタッフの公休を考慮した、1日あたりの平均的なサービス提供能力の総計です。">
                    <span className="cursor-help">{round(totalCapacitySumAll)}</span>
                  </Tooltip>
                </td>
                <td className="p-2 border-r border-neutral-300 text-center text-xs text-blue-600 font-bold">
                  <Tooltip content="全店の1日あたりの平均的な予測客数の総計です。">
                    <span className="cursor-help">{round(totalPredictedVisitorsAll / (dayCounts.total || 1))}</span>
                  </Tooltip>
                </td>
                <td className="p-2 border-r border-neutral-300 text-center text-blue-600">{round(grandTotals.monMD)}</td>
                <td className="p-2 border-r border-neutral-300 text-center text-blue-600">{round(grandTotals.tueMD)}</td>
                <td className="p-2 border-r border-neutral-300 text-center text-blue-600">{round(grandTotals.wedMD)}</td>
                <td className="p-2 border-r border-neutral-300 text-center text-blue-600">{round(grandTotals.thuMD)}</td>
                <td className="p-2 border-r border-neutral-300 text-center text-blue-600">{round(grandTotals.friMD)}</td>
                <td className="p-2 border-r border-neutral-300 text-center text-blue-600">{round(grandTotals.satMD)}</td>
                <td className="p-2 border-r border-neutral-300 text-center text-blue-600">{round(grandTotals.sunMD)}</td>
                <td className="p-2 border-r border-neutral-300 text-center bg-yellow-200">
                  <Tooltip content="各店舗の月間計画数の合計です。">
                    <span className="cursor-help">{round(grandTotals.totalPlanned)}</span>
                  </Tooltip>
                </td>
                <td className="p-2 border-r border-neutral-300 text-center text-blue-600">+{round(grandTotals.extra)}</td>
                <td className="p-2 border-r border-neutral-300 text-center text-red-600">-{round(grandTotals.paid)}</td>
                <td className="p-2 border-r border-neutral-300 text-center text-red-600">-{round(grandTotals.support)}</td>
                <td className="p-2 border-r border-neutral-300 text-center text-red-600">-{round(grandTotals.training)}</td>
                <td className="p-2 border-r border-neutral-300 text-center text-red-600">-{round(grandTotals.leave)}</td>
                <td className="p-2 border-r border-neutral-300 text-center bg-yellow-200">
                  <span className={round(grandTotals.shortage) < 0 ? 'text-red-600' : ''}>{round(grandTotals.shortage)}</span>
                </td>
                <td colSpan={2} className="p-2 border-r border-neutral-300 text-center">-</td>
                <td className="p-2 border-r border-neutral-300 text-center">{round(grandTotals.partTimeTotal)}</td>
                <td className="p-2 text-center text-sm border-r border-neutral-300">
                  <Tooltip content="全店合計の過不足（時短パート含む）です。" position="top-right">
                    <span className={`cursor-help font-bold ${round(grandTotals.shortage + grandTotals.partTimeTotal) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {round(grandTotals.shortage + grandTotals.partTimeTotal) > 0 ? `+${round(grandTotals.shortage + grandTotals.partTimeTotal)}` : round(grandTotals.shortage + grandTotals.partTimeTotal)}
                    </span>
                  </Tooltip>
                </td>
              </tr>
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
