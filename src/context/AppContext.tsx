import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { StoreMaster, StaffMaster, DailyVisitor, Allocation, StoreWorkforcePlan, StaffWorkforceDetail, MonthlyBudget } from '../types';
import { isPublicHoliday } from '../utils/calculations';

interface AppContextType {
  stores: StoreMaster[];
  setStores: React.Dispatch<React.SetStateAction<StoreMaster[]>>;
  staffs: StaffMaster[];
  setStaffs: React.Dispatch<React.SetStateAction<StaffMaster[]>>;
  visitors: DailyVisitor[];
  setVisitors: React.Dispatch<React.SetStateAction<DailyVisitor[]>>;
  allocations: Allocation[];
  setAllocations: React.Dispatch<React.SetStateAction<Allocation[]>>;
  storeWorkforcePlans: StoreWorkforcePlan[];
  setStoreWorkforcePlans: React.Dispatch<React.SetStateAction<StoreWorkforcePlan[]>>;
  staffWorkforceDetails: StaffWorkforceDetail[];
  setStaffWorkforceDetails: React.Dispatch<React.SetStateAction<StaffWorkforceDetail[]>>;
  budgets: MonthlyBudget[];
  setBudgets: React.Dispatch<React.SetStateAction<MonthlyBudget[]>>;
  resetAllData: () => void;
  exportData: () => string;
  importData: (json: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialStores: StoreMaster[] = [
  { id: 'S01', name: '渋谷本店', hoursW: 10, hoursH: 12, seats: 8, openDate: '2020-04-01', area: '東京', order: 0 },
  { id: 'S02', name: '新宿東口店', hoursW: 11, hoursH: 11, seats: 6, openDate: '2022-04-01', area: '東京', order: 1 },
  { id: 'S03', name: '横浜西口店', hoursW: 10, hoursH: 12, seats: 10, openDate: '2019-11-01', area: '神奈川', order: 2 },
  { id: 'S04', name: '大宮店', hoursW: 10, hoursH: 10, seats: 8, openDate: '2023-05-20', area: '埼玉', order: 3 },
];

const initialStaffs: StaffMaster[] = [
  { id: 'ST01', name: '山田 太郎', capacity: 20, daysOff: 8 },
  { id: 'ST02', name: '佐藤 花子', capacity: 18, daysOff: 10 },
  { id: 'ST03', name: '鈴木 一郎', capacity: 25, daysOff: 8 },
  { id: 'ST04', name: '高橋 次郎', capacity: 15, daysOff: 12 },
  { id: 'ST05', name: '田中 三郎', capacity: 22, daysOff: 8 },
];

// Generate some mock visitors for the last 12 months
const generateMockVisitors = () => {
  const visitors: DailyVisitor[] = [];
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const isHoliday = d.getDay() === 0 || d.getDay() === 6 || isPublicHoliday(d);
    initialStores.forEach(store => {
      visitors.push({
        date: dateStr,
        storeId: store.id,
        visitors: isHoliday ? Math.floor(Math.random() * 50 + 50) : Math.floor(Math.random() * 30 + 30),
        isHoliday,
      });
    });
  }
  return visitors;
};

const initialVisitors = generateMockVisitors();

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [stores, setStores] = useLocalStorage<StoreMaster[]>('app_stores', initialStores);
  const [staffs, setStaffs] = useLocalStorage<StaffMaster[]>('app_staffs', initialStaffs);
  const [visitors, setVisitors] = useLocalStorage<DailyVisitor[]>('app_visitors', initialVisitors);
  const [allocations, setAllocations] = useLocalStorage<Allocation[]>('app_allocations', []);
  const [storeWorkforcePlans, setStoreWorkforcePlans] = useLocalStorage<StoreWorkforcePlan[]>('app_store_workforce_plans', []);
  const [staffWorkforceDetails, setStaffWorkforceDetails] = useLocalStorage<StaffWorkforceDetail[]>('app_staff_workforce_details', []);
  const [budgets, setBudgets] = useLocalStorage<MonthlyBudget[]>('app_budgets', []);

  useEffect(() => {
    // Fetch latest holidays in the background to keep them up to date
    fetch('https://holidays-jp.github.io/api/v1/date.json')
      .then(res => res.json())
      .then(data => {
        localStorage.setItem('app_dynamic_holidays', JSON.stringify(data));
      })
      .catch(err => console.error('Failed to fetch dynamic holidays:', err));
  }, []);

  const resetAllData = () => {
    setStores([]);
    setStaffs([]);
    setVisitors([]);
    setAllocations([]);
    setStoreWorkforcePlans([]);
    setStaffWorkforceDetails([]);
    setBudgets([]);
  };

  const exportData = () => {
    return JSON.stringify({
      stores, staffs, visitors, allocations, storeWorkforcePlans, staffWorkforceDetails, budgets
    }, null, 2);
  };

  const importData = (json: string) => {
    try {
      const data = JSON.parse(json);
      if (data.stores) setStores(data.stores);
      if (data.staffs) setStaffs(data.staffs);
      if (data.visitors) setVisitors(data.visitors);
      if (data.allocations) setAllocations(data.allocations);
      if (data.storeWorkforcePlans) setStoreWorkforcePlans(data.storeWorkforcePlans);
      if (data.staffWorkforceDetails) setStaffWorkforceDetails(data.staffWorkforceDetails);
      if (data.budgets) setBudgets(data.budgets);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        stores, setStores,
        staffs, setStaffs,
        visitors, setVisitors,
        allocations, setAllocations,
        storeWorkforcePlans, setStoreWorkforcePlans,
        staffWorkforceDetails, setStaffWorkforceDetails,
        budgets, setBudgets,
        resetAllData, exportData, importData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
