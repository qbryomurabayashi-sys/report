import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { getDaysInMonth } from '../utils/calculations';
import { RotateCcw, Database, Trash2, GripVertical } from 'lucide-react';
import { DataManagement } from './DataManagement';
import { ConfirmModal } from './ConfirmModal';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { StoreMaster } from '../types';
import { isPublicHoliday } from '../utils/calculations';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stores' | 'staffs' | 'visitors'>('stores');
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const { resetAllData } = useAppContext();

  const handleReset = () => {
    setIsConfirmModalOpen(true);
  };

  const confirmReset = () => {
    resetAllData();
  };

  return (
    <div className="p-6 bg-neutral-100 min-h-screen">
      <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-neutral-900">マスタ設定</h1>
        <div className="flex space-x-3">

          <button 
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>全データ削除</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="flex border-b border-neutral-200 bg-neutral-50">
          <button onClick={() => setActiveTab('stores')} className={`px-6 py-4 text-sm font-bold uppercase tracking-wider ${activeTab === 'stores' ? 'border-b-2 border-red-600 text-red-600' : 'text-neutral-500 hover:text-neutral-900'}`}>店舗マスタ</button>
          <button onClick={() => setActiveTab('staffs')} className={`px-6 py-4 text-sm font-bold uppercase tracking-wider ${activeTab === 'staffs' ? 'border-b-2 border-red-600 text-red-600' : 'text-neutral-500 hover:text-neutral-900'}`}>スタッフマスタ</button>
          <button onClick={() => setActiveTab('visitors')} className={`px-6 py-4 text-sm font-bold uppercase tracking-wider ${activeTab === 'visitors' ? 'border-b-2 border-red-600 text-red-600' : 'text-neutral-500 hover:text-neutral-900'}`}>日別客数カレンダー</button>
        </div>

        <div className="p-6 overflow-x-auto">
          {activeTab === 'stores' && <StoreSettings />}
          {activeTab === 'staffs' && <StaffSettings />}
          {activeTab === 'visitors' && <VisitorSettings />}
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

const StoreSettings = () => {
  const { stores, setStores, setAllocations, setStoreWorkforcePlans, setVisitors } = useAppContext();
  const [storeToDelete, setStoreToDelete] = useState<string | null>(null);

  const handleChange = (index: number, field: keyof typeof stores[0], value: string | number) => {
    const newStores = [...stores];
    newStores[index] = { ...newStores[index], [field]: value };
    setStores(newStores);
  };

  const handleAddStore = () => {
    const newId = `S_${Date.now().toString(36)}`;
    const maxOrder = stores.length > 0 ? Math.max(...stores.map(s => s.order ?? 0)) : -1;
    setStores([...stores, { id: newId, name: '新店舗', hoursW: 10, hoursH: 10, seats: 10, openDate: new Date().toISOString().split('T')[0], area: '未設定', order: maxOrder + 1 }]);
  };

  const handleDeleteStore = (id: string) => {
    setStoreToDelete(id);
  };

  const confirmDeleteStore = () => {
    if (storeToDelete) {
      setStores(stores.filter(s => s.id !== storeToDelete));
      setAllocations(prev => prev.filter(a => a.storeId !== storeToDelete));
      setStoreWorkforcePlans(prev => prev.filter(p => p.storeId !== storeToDelete));
      setVisitors(prev => prev.filter(v => v.storeId !== storeToDelete));
      setStoreToDelete(null);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(stores);
    const [reorderedItem] = items.splice(result.source.index, 1);
    if (!reorderedItem) return;
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order property
    const updatedItems = items.map((item, index) => ({
      ...(item as StoreMaster),
      order: index
    }));

    setStores(updatedItems);
  };

  // Sort stores by order before rendering
  const sortedStores = [...stores].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="stores">
          {(provided) => (
            <table className="w-full text-left border-collapse" {...provided.droppableProps} ref={provided.innerRef}>
              <thead>
                <tr className="bg-neutral-100 text-neutral-600 text-xs uppercase tracking-wider">
                  <th className="p-3 w-10"></th>
                  <th className="p-3">ID</th>
                  <th className="p-3">エリア</th>
                  <th className="p-3">店舗名</th>
                  <th className="p-3">平日営業時間</th>
                  <th className="p-3">休日営業時間</th>
                  <th className="p-3">席数</th>
                  <th className="p-3">オープン日</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {sortedStores.map((store, i) => (
                  // @ts-ignore
                  <Draggable key={store.id} draggableId={store.id} index={i}>
                    {(provided) => (
                      <tr ref={provided.innerRef} {...provided.draggableProps} className="bg-white">
                        <td className="p-3" {...provided.dragHandleProps}>
                          <GripVertical className="w-5 h-5 text-neutral-400 cursor-grab" />
                        </td>
                        <td className="p-3 font-mono text-sm">{store.id}</td>
                        <td className="p-3"><input type="text" value={store.area || ''} onChange={e => handleChange(i, 'area', e.target.value)} className="border p-1 rounded w-full" placeholder="エリア" /></td>
                        <td className="p-3"><input type="text" value={store.name} onChange={e => handleChange(i, 'name', e.target.value)} className="border p-1 rounded w-full" /></td>
                        <td className="p-3"><input type="number" value={store.hoursW} onChange={e => handleChange(i, 'hoursW', Number(e.target.value))} className="border p-1 rounded w-full" /></td>
                        <td className="p-3"><input type="number" value={store.hoursH} onChange={e => handleChange(i, 'hoursH', Number(e.target.value))} className="border p-1 rounded w-full" /></td>
                        <td className="p-3"><input type="number" value={store.seats} onChange={e => handleChange(i, 'seats', Number(e.target.value))} className="border p-1 rounded w-full" /></td>
                        <td className="p-3"><input type="date" value={store.openDate || ''} onChange={e => handleChange(i, 'openDate', e.target.value)} className="border p-1 rounded w-full" /></td>
                        <td className="p-3">
                          <button onClick={() => handleDeleteStore(store.id)} className="text-red-500 hover:text-red-700 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </tbody>
            </table>
          )}
        </Droppable>
      </DragDropContext>
      <button onClick={handleAddStore} className="mt-4 bg-neutral-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-neutral-800 transition-colors">
        ＋ 店舗を追加
      </button>
      <ConfirmModal 
        isOpen={!!storeToDelete}
        message="この店舗を削除してもよろしいですか？"
        onConfirm={confirmDeleteStore}
        onCancel={() => setStoreToDelete(null)}
      />
    </div>
  );
};

const StaffSettings = () => {
  const { staffs, setStaffs, setAllocations, setStaffWorkforceDetails } = useAppContext();
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);

  const handleChange = (index: number, field: keyof typeof staffs[0], value: string | number) => {
    const newStaffs = [...staffs];
    newStaffs[index] = { ...newStaffs[index], [field]: value };
    setStaffs(newStaffs);
  };

  const handleAddStaff = () => {
    const newId = `ST_${Date.now().toString(36)}`;
    const maxOrder = staffs.length > 0 ? Math.max(...staffs.map(s => s.order ?? 0)) : -1;
    setStaffs([...staffs, { id: newId, name: '新スタッフ', capacity: 20, daysOff: 8, skillLevel: 'standard', order: maxOrder + 1 }]);
  };

  const handleDeleteStaff = (id: string) => {
    setStaffToDelete(id);
  };

  const confirmDeleteStaff = () => {
    if (staffToDelete) {
      setStaffs(staffs.filter(s => s.id !== staffToDelete));
      setAllocations(prev => prev.map(a => ({
        ...a,
        slots: a.slots.filter(s => s !== staffToDelete)
      })));
      setStaffWorkforceDetails(prev => prev.filter(d => d.staffId !== staffToDelete));
      setStaffToDelete(null);
    }
  };

  const handleCapacityPaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const values = text.split(/\t|,|\s+/).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    if (values.length > 0) {
      // 貼り付けられた数値の単純平均を(30.5 - 契約公休数)で割り、「個体能力（出勤1日あたりの能力）」として採用
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const staff = staffs[index];
      const divisor = 30.5 - (staff.daysOff || 0);
      const dailyCapacity = divisor > 0 ? avg / divisor : 0;
      handleChange(index, 'capacity', Math.round(dailyCapacity * 10) / 10);
      e.currentTarget.value = ''; // clear input after paste
    }
  };

  const applySkillLevel = (index: number, level: 'trainee' | 'standard' | 'leader') => {
    // 基準となる実働時間（例: 10時間 - 1.5時間 = 8.5時間）で計算
    const multipliers = { trainee: 2.5, standard: 3.5, leader: 4.0 };
    const baseHours = 10; // 基準営業時間
    const activeHours = baseHours - 1.5;
    const capacity = Math.round(activeHours * multipliers[level] * 10) / 10;
    
    const newStaffs = [...staffs];
    newStaffs[index] = { ...newStaffs[index], skillLevel: level, capacity };
    setStaffs(newStaffs);
  };

  return (
    <div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-neutral-100 text-neutral-600 text-xs uppercase tracking-wider">
            <th className="p-3">ID</th>
            <th className="p-3">氏名</th>
            <th className="p-3">スキルマーク</th>
            <th className="p-3">個体能力</th>
            <th className="p-3">契約公休数</th>
            <th className="p-3">過去実績ペースト (自動計算)</th>
            <th className="p-3 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {staffs.map((staff, i) => (
            <tr key={staff.id}>
              <td className="p-3 font-mono text-sm">{staff.id}</td>
              <td className="p-3"><input type="text" value={staff.name} onChange={e => handleChange(i, 'name', e.target.value)} className="border p-1 rounded w-full" /></td>
              <td className="p-3">
                <select 
                  value={staff.skillLevel || 'standard'} 
                  onChange={e => applySkillLevel(i, e.target.value as any)}
                  className="border p-1 rounded w-full text-sm"
                >
                  <option value="trainee">新人 (2.5)</option>
                  <option value="standard">標準 (3.5)</option>
                  <option value="leader">指導者 (4.0)</option>
                </select>
              </td>
              <td className="p-3">
                <input type="number" value={staff.capacity} onChange={e => handleChange(i, 'capacity', Number(e.target.value))} className="border p-1 rounded w-full" />
              </td>
              <td className="p-3"><input type="number" value={staff.daysOff} onChange={e => handleChange(i, 'daysOff', Number(e.target.value))} className="border p-1 rounded w-full" /></td>
              <td className="p-3">
                <input 
                  type="text" 
                  placeholder="Excelからペースト..." 
                  onPaste={(e) => handleCapacityPaste(i, e)} 
                  className="border p-1 rounded w-full text-xs bg-neutral-50" 
                  title="過去の対応人数をタブ区切りでペーストすると平均値を自動計算します"
                />
              </td>
              <td className="p-3">
                <button onClick={() => handleDeleteStaff(staff.id)} className="text-red-500 hover:text-red-700 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={handleAddStaff} className="mt-4 bg-neutral-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-neutral-800 transition-colors">
        ＋ スタッフを追加
      </button>
      <ConfirmModal 
        isOpen={!!staffToDelete}
        message="このスタッフを削除してもよろしいですか？"
        onConfirm={confirmDeleteStaff}
        onCancel={() => setStaffToDelete(null)}
      />
    </div>
  );
};

const VisitorSettings = () => {
  const { visitors, setVisitors, stores } = useAppContext();
  const [selectedStore, setSelectedStore] = useState(stores[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const [visitorToDelete, setVisitorToDelete] = useState<string | null>(null);

  const storeVisitors = visitors.filter(v => v.storeId === selectedStore && v.date.startsWith(selectedMonth)).sort((a, b) => a.date.localeCompare(b.date));

  const handleChange = (date: string, field: 'visitors' | 'isHoliday', value: number | boolean) => {
    setVisitors(prev => {
      const newVisitors = [...prev];
      const index = newVisitors.findIndex(v => v.storeId === selectedStore && v.date === date);
      if (index >= 0) {
        newVisitors[index] = { ...newVisitors[index], [field]: value };
      } else {
        newVisitors.push({ date, storeId: selectedStore, visitors: field === 'visitors' ? value as number : 0, isHoliday: field === 'isHoliday' ? value as boolean : false });
      }
      return newVisitors;
    });
  };

  const handlePasteVisitors = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const values = text.split(/\t|,/).map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v));
    
    if (values.length === 0) return;

    const daysInMonth = getDaysInMonth(selectedMonth);
    setVisitors(prev => {
      // Remove existing entries for this month/store
      const newVisitors = prev.filter(v => !(v.storeId === selectedStore && v.date.startsWith(selectedMonth)));
      
      for (let i = 0; i < Math.min(values.length, daysInMonth); i++) {
        const day = String(i + 1).padStart(2, '0');
        const dateStr = `${selectedMonth}-${day}`;
        const d = new Date(dateStr);
        const isHoliday = d.getDay() === 0 || d.getDay() === 6 || isPublicHoliday(d);
        newVisitors.push({
          date: dateStr,
          storeId: selectedStore,
          visitors: values[i],
          isHoliday
        });
      }
      return newVisitors;
    });
    
    e.currentTarget.value = ''; // clear textarea after paste
  };

  const handleDeleteVisitor = (date: string) => {
    setVisitorToDelete(date);
  };

  const confirmDeleteVisitor = () => {
    if (visitorToDelete) {
      setVisitors(prev => prev.filter(v => !(v.storeId === selectedStore && v.date === visitorToDelete)));
      setVisitorToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-4">
        <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)} className="border p-2 rounded">
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="border p-2 rounded" />
      </div>
      
      <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
        <label className="block text-sm font-bold text-neutral-700 mb-2">Excelから一括入力 (横列データをペースト)</label>
        <textarea 
          placeholder="Excelの横列データ（タブ区切り）をここにペーストしてください..." 
          onPaste={handlePasteVisitors} 
          className="w-full border border-neutral-300 p-3 rounded text-sm h-20 resize-none focus:ring-2 focus:ring-neutral-400 focus:border-transparent outline-none" 
        />
        <p className="text-xs text-neutral-500 mt-2">※ペーストすると、選択中の月の1日から順に客数が上書きされます。</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-100 text-neutral-600 text-xs uppercase tracking-wider">
              <th className="p-3">日付</th>
              <th className="p-3">客数</th>
              <th className="p-3">休日フラグ</th>
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {storeVisitors.map((v) => (
              <tr key={v.date}>
                <td className="p-3 font-mono text-sm">{v.date}</td>
                <td className="p-3"><input type="number" value={v.visitors} onChange={e => handleChange(v.date, 'visitors', Number(e.target.value))} className="border p-1 rounded w-32" /></td>
                <td className="p-3"><input type="checkbox" checked={v.isHoliday} onChange={e => handleChange(v.date, 'isHoliday', e.target.checked)} className="w-5 h-5" /></td>
                <td className="p-3">
                  <button onClick={() => handleDeleteVisitor(v.date)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmModal 
        isOpen={!!visitorToDelete}
        message="この日の客数データを削除してもよろしいですか？"
        onConfirm={confirmDeleteVisitor}
        onCancel={() => setVisitorToDelete(null)}
      />
    </div>
  );
};

