import React from 'react';
import { useAppContext } from '../context/AppContext';
import { StoreCard } from './StoreCard';

interface DashboardProps {
  currentYearMonth: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ currentYearMonth }) => {
  const { stores } = useAppContext();
  const sortedStores = [...stores].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="p-6 space-y-8 bg-neutral-100 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {sortedStores.map(store => (
          <StoreCard key={store.id} store={store} currentYearMonth={currentYearMonth} />
        ))}
      </div>
    </div>
  );
};
