export interface StoreWorkforcePlan {
  storeId: string;
  yearMonth: string;
  mondayCount: number;
  tuesdayCount: number;
  wednesdayCount: number;
  thursdayCount: number;
  fridayCount: number;
  saturdayCount: number;
  sundayHolidayCount: number;
  mondayAdjustment?: number;
  tuesdayAdjustment?: number;
  wednesdayAdjustment?: number;
  thursdayAdjustment?: number;
  fridayAdjustment?: number;
  saturdayAdjustment?: number;
  sundayHolidayAdjustment?: number;
  partTimeStaff?: { id: string; name: string; days: number }[];
}

export interface StaffWorkforceDetail {
  staffId: string;
  yearMonth: string;
  extraWorkDays: number;
  paidLeaveDays: number;
  supportDays: number;
  trainingDays: number;
  daysOffAdjustment?: number;
}
export interface StoreMaster {
  id: string;
  name: string;
  hoursW: number;
  hoursH: number;
  seats: number;
  openDate: string; // YYYY-MM-DD
  area?: string;
  order?: number;
}

export type SkillLevel = 'trainee' | 'standard' | 'leader';

export interface StaffMaster {
  id: string;
  name: string;
  capacity: number;
  daysOff: number;
  skillLevel?: SkillLevel;
  isTrainee?: boolean; // Keep for compatibility
}

export interface DailyVisitor {
  date: string; // YYYY-MM-DD
  storeId: string;
  visitors: number;
  isHoliday: boolean;
}

export interface Allocation {
  yearMonth: string; // YYYY-MM
  storeId: string;
  slots: (string | null)[];
}

export interface MonthlyBudget {
  yearMonth: string;
  storeId: string;
  budget: number;
}

export type AppState = {
  stores: StoreMaster[];
  staffs: StaffMaster[];
  visitors: DailyVisitor[];
  allocations: Allocation[];
  budgets: MonthlyBudget[];
};
