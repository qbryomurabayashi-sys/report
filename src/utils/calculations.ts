import { StoreMaster, DailyVisitor } from '../types';
import * as JapaneseHolidays from 'japanese-holidays';

export const isPublicHoliday = (date: Date): boolean => {
  try {
    const dynamicHolidaysStr = localStorage.getItem('app_dynamic_holidays');
    if (dynamicHolidaysStr) {
      const dynamicHolidays = JSON.parse(dynamicHolidaysStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      // If the API explicitly lists it as a holiday
      if (dynamicHolidays[dateString]) {
        return true;
      }
    }
  } catch (e) {
    console.error('Failed to parse dynamic holidays', e);
  }

  // Fallback to algorithmic calculation
  return !!JapaneseHolidays.isHoliday(date);
};

export const getDaysInMonth = (yearMonth: string) => {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month, 0).getDate();
};

export const getDayCountsInMonth = (yearMonth: string) => {
  if (!yearMonth) return { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sundayHoliday: 0, total: 0 };
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  
  let monday = 0;
  let tuesday = 0;
  let wednesday = 0;
  let thursday = 0;
  let friday = 0;
  let saturday = 0;
  let sundayHoliday = 0;

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month - 1, i);
    const dayOfWeek = d.getDay();
    const isHoliday = isPublicHoliday(d);

    if (dayOfWeek === 0 || isHoliday) sundayHoliday++;
    else if (dayOfWeek === 1) monday++;
    else if (dayOfWeek === 2) tuesday++;
    else if (dayOfWeek === 3) wednesday++;
    else if (dayOfWeek === 4) thursday++;
    else if (dayOfWeek === 5) friday++;
    else if (dayOfWeek === 6) saturday++;
  }

  return { monday, tuesday, wednesday, thursday, friday, saturday, sundayHoliday, total: daysInMonth };
};

export const getMonthDiff = (ym1: string, ym2: string) => {
  const [y1, m1] = ym1.split('-').map(Number);
  const [y2, m2] = ym2.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
};

export const calculateMonthsOpen = (openDate: string, targetYearMonth: string) => {
  if (!openDate) return 0;
  const [oYear, oMonth] = openDate.split('-').map(Number);
  const [tYear, tMonth] = targetYearMonth.split('-').map(Number);
  const diff = (tYear - oYear) * 12 + (tMonth - oMonth);
  return Math.max(0, diff);
};

export function simpleLinearRegression(x: number[], y: number[], targetX: number): number | null {
  const n = x.length;
  if (n < 2) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumXX += x[i] * x[i];
  }
  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-9) return null;
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return slope * targetX + intercept;
}

export const calculateDayOfWeekPredictions = (
  visitors: DailyVisitor[],
  storeId: string,
  targetYearMonth: string
) => {
  const storeVisitors = visitors.filter(v => v.storeId === storeId);
  const dayOfWeekData: Record<number, { total: number; count: number }> = {
    1: { total: 0, count: 0 }, // Mon
    2: { total: 0, count: 0 }, // Tue
    3: { total: 0, count: 0 }, // Wed
    4: { total: 0, count: 0 }, // Thu
    5: { total: 0, count: 0 }, // Fri
    6: { total: 0, count: 0 }, // Sat
    0: { total: 0, count: 0 }, // Sun
  };

  storeVisitors.forEach(v => {
    const d = new Date(v.date);
    const dow = d.getDay();
    dayOfWeekData[dow].total += v.visitors;
    dayOfWeekData[dow].count += 1;
  });

  const overallAvg = storeVisitors.length > 0 
    ? storeVisitors.reduce((sum, v) => sum + v.visitors, 0) / storeVisitors.length 
    : 0;

  const dowIndices: Record<number, number> = {};
  [0, 1, 2, 3, 4, 5, 6].forEach(dow => {
    const avg = dayOfWeekData[dow].count > 0 ? dayOfWeekData[dow].total / dayOfWeekData[dow].count : overallAvg;
    dowIndices[dow] = overallAvg > 0 ? avg / overallAvg : 1;
  });

  return dowIndices;
};

export const calculatePredictions = (
  visitors: DailyVisitor[],
  storeId: string,
  targetYearMonth: string
) => {
  const storeVisitors = visitors.filter(v => v.storeId === storeId);
  const monthlyData: Record<string, { wTotal: number; wCount: number; hTotal: number; hCount: number }> = {};
  
  storeVisitors.forEach(v => {
    const ym = v.date.substring(0, 7);
    if (!monthlyData[ym]) {
      monthlyData[ym] = { wTotal: 0, wCount: 0, hTotal: 0, hCount: 0 };
    }
    if (v.isHoliday) {
      monthlyData[ym].hTotal += v.visitors;
      monthlyData[ym].hCount += 1;
    } else {
      monthlyData[ym].wTotal += v.visitors;
      monthlyData[ym].wCount += 1;
    }
  });

  const targetMonthStr = targetYearMonth.split('-')[1];
  let targetMonthWTotal = 0, targetMonthWCount = 0;
  let targetMonthHTotal = 0, targetMonthHCount = 0;
  
  let overallWTotal = 0, overallWCount = 0;
  let overallHTotal = 0, overallHCount = 0;

  Object.keys(monthlyData).forEach(ym => {
    const m = ym.split('-')[1];
    const data = monthlyData[ym];
    
    overallWTotal += data.wTotal;
    overallWCount += data.wCount;
    overallHTotal += data.hTotal;
    overallHCount += data.hCount;

    if (m === targetMonthStr) {
      targetMonthWTotal += data.wTotal;
      targetMonthWCount += data.wCount;
      targetMonthHTotal += data.hTotal;
      targetMonthHCount += data.hCount;
    }
  });

  const overallWAverage = overallWCount > 0 ? overallWTotal / overallWCount : 0;
  const overallHAverage = overallHCount > 0 ? overallHTotal / overallHCount : 0;

  const targetMonthWAverage = targetMonthWCount > 0 ? targetMonthWTotal / targetMonthWCount : overallWAverage;
  const targetMonthHAverage = targetMonthHCount > 0 ? targetMonthHTotal / targetMonthHCount : overallHAverage;

  const seasonalIndexW = overallWAverage > 0 ? targetMonthWAverage / overallWAverage : 1;
  const seasonalIndexH = overallHAverage > 0 ? targetMonthHAverage / overallHAverage : 1;

  // FORECAST (Simple Linear Regression based on time)
  let forecastWBase = overallWAverage;
  let forecastHBase = overallHAverage;
  
  const sortedYMs = Object.keys(monthlyData).sort();
  if (sortedYMs.length > 0) {
    const earliest = sortedYMs[0];
    const xArr: number[] = [];
    const ywArr: number[] = [];
    const yhArr: number[] = [];
    
    sortedYMs.forEach(ym => {
      const data = monthlyData[ym];
      const wAvg = data.wCount > 0 ? data.wTotal / data.wCount : 0;
      const hAvg = data.hCount > 0 ? data.hTotal / data.hCount : 0;
      if (wAvg > 0 && hAvg > 0) {
        xArr.push(getMonthDiff(earliest, ym));
        ywArr.push(wAvg);
        yhArr.push(hAvg);
      }
    });
    
    const targetX = getMonthDiff(earliest, targetYearMonth);
    forecastWBase = simpleLinearRegression(xArr, ywArr, targetX) ?? overallWAverage;
    forecastHBase = simpleLinearRegression(xArr, yhArr, targetX) ?? overallHAverage;
  }

  // Final prediction = base * seasonal index
  // Since we removed external factors, we'll just use the forecast base as the main prediction
  const predictedW = Math.max(0, forecastWBase * seasonalIndexW);
  const predictedH = Math.max(0, forecastHBase * seasonalIndexH);
  
  const forecastW = Math.max(0, forecastWBase * seasonalIndexW);
  const forecastH = Math.max(0, forecastHBase * seasonalIndexH);

  const dowIndices = calculateDayOfWeekPredictions(visitors, storeId, targetYearMonth);

  // Generate daily predictions for the target month
  const [targetYear, targetMonth] = targetYearMonth.split('-').map(Number);
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const preds: { date: string; visitors: number }[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${targetYearMonth}-${String(d).padStart(2, '0')}`;
    const date = new Date(dateStr);
    const dow = date.getDay();
    const isHoliday = dow === 0 || dow === 6 || isPublicHoliday(date); // Include public holidays
    const base = isHoliday ? predictedH : predictedW;
    const dowIndex = dowIndices[dow] || 1;
    preds.push({
      date: dateStr,
      visitors: Math.round(base * dowIndex)
    });
  }

  return {
    predictedW,
    predictedH,
    forecastW,
    forecastH,
    seasonalIndexW,
    seasonalIndexH,
    dowIndices,
    preds
  };
};

export const calculateBudgetBasedPredictions = (
  budget: number,
  weekdayCount: number,
  holidayCount: number,
  holidayMultiplier: number = 1.25
) => {
  const totalWeight = weekdayCount + holidayCount * holidayMultiplier;
  if (totalWeight === 0) return { predictedW: 0, predictedH: 0 };
  const baseWeek = budget / totalWeight;
  const baseHol = baseWeek * holidayMultiplier;
  return { predictedW: baseWeek, predictedH: baseHol };
};

export const calculateIndividualCapacity = (hours: number, skillLevel: 'trainee' | 'standard' | 'leader' = 'standard') => {
  const multipliers = {
    trainee: 2.5,
    standard: 3.5,
    leader: 4.0
  };
  const activeHours = Math.max(0, hours - 1.5);
  return Math.round(activeHours * multipliers[skillLevel] * 10) / 10;
};

export const calculateRequiredStaff = (
  store: StoreMaster,
  predictedW: number,
  predictedH: number,
  monthsOpen: number
) => {
  // 実働時間 = 営業時間 - 1.5時間
  // 標準的な1日処理能力 = 1人の実働時間 × 3.5人/時
  const activeHoursW = Math.max(0, store.hoursW - 1.5);
  const activeHoursH = Math.max(0, store.hoursH - 1.5);

  const capW = activeHoursW * 3.5;
  const capH = activeHoursH * 3.5;

  const needWRaw = capW > 0 ? predictedW / capW : 0;
  const needHRaw = capH > 0 ? predictedH / capH : 0;

  // 制約: 最大値=席数, 最小値(平日)=2, 最小値(休日)=3(37ヶ月以内)or2
  const requiredW = Math.max(2, Math.min(store.seats, Math.round(needWRaw)));
  const requiredH = Math.max(monthsOpen <= 37 ? 3 : 2, Math.min(store.seats, Math.round(needHRaw)));

  return { requiredW, requiredH };
};
