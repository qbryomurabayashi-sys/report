import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../types";
import { ChevronLeft, ChevronRight, Send, Save, Plus, Trash2, Building2, Users, ChevronDown, ChevronUp, X } from "lucide-react";

interface AMStatusFormProps {
  user: User;
  onBack: () => void;
}

interface StoreReport {
  id: string;
  storeName: string;
  textLastMonthGoals: string;
  textLastMonthResults: string;
  textThisMonthGoals: string;
  textThisMonthFocus: string;
  textPromo: string;
  textFacility: string;
  textSalesPrevious: string;
  textSalesCurrent: string;
  textSalesBudget: string;
  textStaffStore: string;
}

interface HrEvent {
  id: string;
  type: '入社' | '退職' | '休職';
  date: string;
  store: string;
  name: string;
  details: string;
}

interface InterviewEvent {
  id: string;
  date: string;
  importance: '高' | '中' | '低';
  store: string;
  name: string;
  interviewer: string;
  interviewType: string;
  status: '継続' | '完了' | 'BMフォロー必要';
  contentMain: string;
  contentConcerns: string;
  contentNextAction: string;
  contentImpression: string;
}

const STORE_MASTER: Record<string, string[]> = {
    "神奈川南ブロック": [
        "京急横浜駅北口店", "イトーヨーカドー横浜別所店", "アピタ金沢文庫店", 
        "オーケーみなとみらい店", "ヨークフーズ上大岡店", "ウィング久里浜店", 
        "コースカベイサイドストアーズ店", "横浜市役所店", "サミット横浜岡野店"
    ],
    "神奈川北ブロック": [
        "川崎アゼリア店", "武蔵小杉店", "溝の口店", "新百合ヶ丘店"
    ],
    "東京多摩ブロック": [
        "町田店", "八王子店", "立川店", "吉祥寺店"
    ]
};

export function AMStatusForm({ user, onBack }: AMStatusFormProps) {
  const [activeTab, setActiveTab] = useState<'store' | 'area'>('store');
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialStores = STORE_MASTER[user.Area || ""] || [];
  const [storeReports, setStoreReports] = useState<StoreReport[]>([]);
  const [selectedStoreToAdd, setSelectedStoreToAdd] = useState("");

  const addStoreReport = () => {
    if (selectedStoreToAdd && !storeReports.some(r => r.storeName === selectedStoreToAdd)) {
      setStoreReports([...storeReports, {
        id: selectedStoreToAdd,
        storeName: selectedStoreToAdd,
        textLastMonthGoals: "",
        textLastMonthResults: "",
        textThisMonthGoals: "",
        textThisMonthFocus: "",
        textPromo: "",
        textFacility: "",
        textSalesPrevious: "",
        textSalesCurrent: "",
        textSalesBudget: "",
        textStaffStore: "",
      }]);
      setSelectedStoreToAdd("");
      setExpandedStoreId(selectedStoreToAdd);
    }
  };

  const removeStoreReport = (id: string) => {
    setStoreReports(reports => reports.filter(r => r.id !== id));
  };

  const [textAreaVision, setTextAreaVision] = useState("");
  const [textAreaSummary, setTextAreaSummary] = useState("");
  const [textManagerCondition, setTextManagerCondition] = useState("");
  const [textOtherTopics, setTextOtherTopics] = useState("");
  
  const [hrEvents, setHrEvents] = useState<HrEvent[]>([]);
  const [interviewEvents, setInterviewEvents] = useState<InterviewEvent[]>([]);

  const handleStoreChange = (id: string, field: keyof StoreReport, value: string) => {
    setStoreReports(reports => reports.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addHrEvent = () => {
    setHrEvents([...hrEvents, { id: Date.now().toString(), type: '入社', date: '', store: '', name: '', details: '' }]);
  };

  const updateHrEvent = (id: string, field: keyof HrEvent, value: string) => {
    setHrEvents(events => events.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeHrEvent = (id: string) => {
    setHrEvents(events => events.filter(e => e.id !== id));
  };

  const addInterviewEvent = () => {
    setInterviewEvents([...interviewEvents, { 
      id: Date.now().toString(), date: '', importance: '中', store: '', name: '', 
      interviewer: '',
      interviewType: '', status: '継続', contentMain: '', contentConcerns: '', 
      contentNextAction: '', contentImpression: '' 
    }]);
  };

  const updateInterviewEvent = (id: string, field: keyof InterviewEvent, value: string) => {
    setInterviewEvents(events => events.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeInterviewEvent = (id: string) => {
    setInterviewEvents(events => events.filter(e => e.id !== id));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        UserID: user.UserID,
        UserName: user.Name,
        UserArea: user.Area,
        storeReports,
        textAreaVision,
        textAreaSummary,
        textManagerCondition,
        textOtherTopics,
        hrEvents,
        interviewEvents
      };

      const response = await fetch("/api/saveAMStatusReport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        alert("近況報告を提出しました");
        onBack();
      } else {
        alert(data.message || "提出に失敗しました");
      }
    } catch (err) {
      alert("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 pt-8 pb-32 max-w-4xl">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 glass-card rounded-xl text-gray-500 hover:text-neon-blue transition-all">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold neon-text-orange font-display tracking-tight">AM近況報告作成</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-digital">ブロック: {user.Area} / 報告者: {user.Name}</p>
        </div>
      </header>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('store')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'store' ? 'bg-neon-blue text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]' : 'glass-card text-gray-400 hover:text-white'}`}
        >
          <Building2 size={16} className="inline-block mr-2" />
          店舗個別
        </button>
        <button
          onClick={() => setActiveTab('area')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'area' ? 'bg-neon-orange text-black shadow-[0_0_15px_rgba(255,157,0,0.4)]' : 'glass-card text-gray-400 hover:text-white'}`}
        >
          <Users size={16} className="inline-block mr-2" />
          エリア全体
        </button>
      </div>

      <div className="space-y-6">
        {activeTab === 'store' && (
          <div className="space-y-4">
            <div className="glass-card p-4 rounded-xl flex gap-2 items-center">
              <div className="flex-1 relative">
                <input
                  list="store-suggestions"
                  value={selectedStoreToAdd}
                  onChange={(e) => setSelectedStoreToAdd(e.target.value)}
                  placeholder="店舗名を入力または選択..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-gray-200 outline-none focus:border-neon-blue"
                />
                <datalist id="store-suggestions">
                  {initialStores.filter(s => !storeReports.some(r => r.storeName === s)).map(store => (
                    <option key={store} value={store} />
                  ))}
                </datalist>
              </div>
              <button
                onClick={addStoreReport}
                disabled={!selectedStoreToAdd}
                className="bg-neon-blue text-black px-6 py-3 rounded-lg font-bold disabled:opacity-50 hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all"
              >
                追加
              </button>
            </div>

            {storeReports.length === 0 ? (
              <div className="glass-card border border-dashed border-white/20 rounded-2xl p-12 flex flex-col items-center justify-center text-gray-500">
                <Building2 size={48} className="mb-4 opacity-50" />
                <p className="font-bold mb-1">店舗が選択されていません</p>
                <p className="text-xs">上のフォームから追加してください</p>
              </div>
            ) : (
              storeReports.map((store) => (
                <div key={store.id} className="glass-card rounded-2xl overflow-hidden border border-white/10">
                  <div className="bg-neon-blue text-black p-3 flex justify-between items-center">
                    <button
                      onClick={() => setExpandedStoreId(expandedStoreId === store.id ? null : store.id)}
                      className="flex-1 flex items-center justify-between font-bold text-left"
                    >
                      {store.storeName}
                      {expandedStoreId === store.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                    <button onClick={() => removeStoreReport(store.id)} className="hover:bg-black/20 p-1 rounded-full transition-colors ml-2">
                      <X size={18} />
                    </button>
                  </div>
                
                <AnimatePresence>
                  {expandedStoreId === store.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="p-6 space-y-8 border-t border-white/5"
                    >
                      {/* 先月の課題解決/振り返り */}
                      <div className="space-y-4">
                        <h4 className="font-bold flex items-center gap-2 text-gray-200">
                          <span className="text-neon-blue">←</span> 先月の課題解決/振り返り
                        </h4>
                        <textarea
                          value={store.textLastMonthGoals}
                          onChange={(e) => handleStoreChange(store.id, 'textLastMonthGoals', e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-200 focus:border-neon-blue outline-none min-h-[100px]"
                          placeholder="【設定した課題解決・取り組み】"
                        />
                        <textarea
                          value={store.textLastMonthResults}
                          onChange={(e) => handleStoreChange(store.id, 'textLastMonthResults', e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-200 focus:border-neon-blue outline-none min-h-[100px]"
                          placeholder="【学び・反省点や成果】"
                        />
                      </div>

                      {/* 今月の課題解決への取り組み */}
                      <div className="space-y-4">
                        <h4 className="font-bold flex items-center gap-2 text-gray-200">
                          <span className="text-neon-blue">→</span> 今月の課題解決への取り組み
                        </h4>
                        <textarea
                          value={store.textThisMonthGoals}
                          onChange={(e) => handleStoreChange(store.id, 'textThisMonthGoals', e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-200 focus:border-neon-blue outline-none min-h-[100px]"
                          placeholder="【課題解決・取り組み】"
                        />
                        <textarea
                          value={store.textThisMonthFocus}
                          onChange={(e) => handleStoreChange(store.id, 'textThisMonthFocus', e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-200 focus:border-neon-blue outline-none min-h-[100px]"
                          placeholder="【重点項目】"
                        />
                      </div>

                      {/* 販促・設備 */}
                      <div className="space-y-4 border-l-4 border-neon-green pl-4">
                        <h4 className="font-bold flex items-center gap-2 text-gray-200">
                          <Building2 size={18} /> 販促・設備
                        </h4>
                        <textarea
                          value={store.textPromo}
                          onChange={(e) => handleStoreChange(store.id, 'textPromo', e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-200 focus:border-neon-green outline-none min-h-[80px]"
                          placeholder="【販促】キャンペーン実施状況など"
                        />
                        <textarea
                          value={store.textFacility}
                          onChange={(e) => handleStoreChange(store.id, 'textFacility', e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-200 focus:border-neon-green outline-none min-h-[80px]"
                          placeholder="【設備】修繕・不具合など"
                        />
                      </div>

                      {/* 売上実績 */}
                      <div className="space-y-4 border-l-4 border-neon-orange pl-4">
                        <h4 className="font-bold flex items-center gap-2 text-gray-200">
                          <span className="text-neon-orange">📈</span> 売上実績
                        </h4>
                        <div className="space-y-3 bg-white/5 p-4 rounded-xl">
                          <div className="flex items-center gap-4">
                            <label className="w-24 text-sm text-gray-400">▼前期実績</label>
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="number"
                                value={store.textSalesPrevious}
                                onChange={(e) => handleStoreChange(store.id, 'textSalesPrevious', e.target.value)}
                                className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-neon-orange"
                              />
                              <span className="text-sm text-gray-400">名</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="w-24 text-sm text-gray-400">▼今期実績</label>
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="number"
                                value={store.textSalesCurrent}
                                onChange={(e) => handleStoreChange(store.id, 'textSalesCurrent', e.target.value)}
                                className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-neon-orange"
                              />
                              <span className="text-sm text-gray-400">名</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="w-24 text-sm text-gray-400">▼予算</label>
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="number"
                                value={store.textSalesBudget}
                                onChange={(e) => handleStoreChange(store.id, 'textSalesBudget', e.target.value)}
                                className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-neon-orange"
                              />
                              <span className="text-sm text-gray-400">名</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-neon-orange/10 border border-neon-orange/30 p-3 rounded-lg text-xs text-neon-orange flex flex-wrap gap-2 items-center">
                          <span>🧮</span>
                          <span>▼前期実績: {store.textSalesPrevious || 0}名 (前期比: {store.textSalesPrevious && store.textSalesCurrent ? Math.round((Number(store.textSalesCurrent) / Number(store.textSalesPrevious)) * 100) : '-'}%) /</span>
                          <span>▼今期実績: {store.textSalesCurrent || 0}名 (予算比: {store.textSalesBudget && store.textSalesCurrent ? Math.round((Number(store.textSalesCurrent) / Number(store.textSalesBudget)) * 100) : '-'}%) /</span>
                          <span>▼予算: {store.textSalesBudget || 0}名</span>
                        </div>
                      </div>

                      {/* スタッフの様子 */}
                      <div className="space-y-4 border-l-4 border-pink-500 pl-4">
                        <h4 className="font-bold flex items-center gap-2 text-gray-200">
                          <Users size={18} className="text-pink-500" /> スタッフの様子 (店舗)
                        </h4>
                        <textarea
                          value={store.textStaffStore}
                          onChange={(e) => handleStoreChange(store.id, 'textStaffStore', e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-200 focus:border-pink-500 outline-none min-h-[100px]"
                          placeholder="例：新人Aさんの技術向上が見られる。チームワークは良好。"
                        />
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
            )}
            {/* Navigation to Area Tab */}
            <div className="pt-8 flex justify-end">
              <button
                onClick={() => {
                  setActiveTab('area');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2 bg-neon-orange/20 text-neon-orange border border-neon-orange/30 px-6 py-3 rounded-xl font-digital tracking-widest hover:bg-neon-orange hover:text-black transition-all"
              >
                エリア報告へ進む <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'area' && (
          <div className="space-y-8">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setActiveTab('store')}
                className="flex items-center gap-1 text-[10px] font-digital text-gray-500 hover:text-neon-blue transition-colors"
              >
                <ChevronLeft size={12} /> 店舗報告に戻る
              </button>
            </div>
            <div className="glass-card p-6 rounded-2xl border-l-4 border-neon-blue">
              <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                <span className="text-neon-blue">📄</span> AM総括
              </h3>
              <div className="space-y-4">
                <textarea
                  value={textAreaVision}
                  onChange={(e) => setTextAreaVision(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-200 focus:border-neon-blue outline-none min-h-[100px]"
                  placeholder="◆エリアビジョン"
                />
                <textarea
                  value={textAreaSummary}
                  onChange={(e) => setTextAreaSummary(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-200 focus:border-neon-blue outline-none min-h-[100px]"
                  placeholder="◆エリア取り組み/総括"
                />
                <textarea
                  value={textManagerCondition}
                  onChange={(e) => setTextManagerCondition(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-200 focus:border-neon-blue outline-none min-h-[100px]"
                  placeholder="◆管轄店長,副店長様子"
                />
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl border-l-4 border-yellow-500">
              <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                <span className="text-yellow-500">💡</span> その他トピックス
              </h3>
              <textarea
                value={textOtherTopics}
                onChange={(e) => setTextOtherTopics(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-200 focus:border-yellow-500 outline-none min-h-[100px]"
                placeholder="例：来期の出店候補地（○○駅前）の競合調査結果と勝算について"
              />
            </div>

            <div className="glass-card p-6 rounded-2xl border-l-4 border-neon-red">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-neon-red flex items-center gap-2">
                  <Users size={18} /> 入社・退職・休職
                </h3>
                <button onClick={addHrEvent} className="text-xs bg-neon-red/20 text-neon-red px-4 py-1.5 rounded-full flex items-center gap-1 hover:bg-neon-red/30 transition-all font-bold">
                  <Plus size={14} /> 追加
                </button>
              </div>
              <div className="space-y-4">
                {hrEvents.map((event) => (
                  <div key={event.id} className="bg-neon-red/5 p-4 rounded-xl border border-neon-red/20 relative">
                    <button onClick={() => removeHrEvent(event.id)} className="absolute top-4 right-4 text-gray-500 hover:text-neon-red">
                      <Trash2 size={16} />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-8">
                      <div className="flex gap-2">
                        <select value={event.type} onChange={(e) => updateHrEvent(event.id, 'type', e.target.value as any)} className="w-1/3 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-neon-red">
                          <option value="入社">入社</option>
                          <option value="退職">退職</option>
                          <option value="休職">休職</option>
                        </select>
                        <input type="date" value={event.date} onChange={(e) => updateHrEvent(event.id, 'date', e.target.value)} className="w-2/3 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-neon-red" />
                      </div>
                      <div className="flex gap-2">
                        <select value={event.store} onChange={(e) => updateHrEvent(event.id, 'store', e.target.value)} className="w-1/2 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-neon-red">
                          <option value="">店舗選択</option>
                          {initialStores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input type="text" placeholder="氏名" value={event.name} onChange={(e) => updateHrEvent(event.id, 'name', e.target.value)} className="w-1/2 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-neon-red" />
                      </div>
                    </div>
                    <textarea placeholder="詳細（理由など）" value={event.details} onChange={(e) => updateHrEvent(event.id, 'details', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-gray-200 outline-none focus:border-neon-red min-h-[80px]" />
                  </div>
                ))}
                {hrEvents.length === 0 && <p className="text-sm text-gray-500 text-center py-4">データがありません</p>}
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl border-l-4 border-yellow-400">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2">
                  <span className="text-yellow-400">💬</span> スタッフ面談
                </h3>
                <button onClick={addInterviewEvent} className="text-xs bg-yellow-400/20 text-yellow-400 px-4 py-1.5 rounded-full flex items-center gap-1 hover:bg-yellow-400/30 transition-all font-bold border border-yellow-400/50">
                  <Plus size={14} /> 追加
                </button>
              </div>
              <div className="space-y-4">
                {interviewEvents.map((event) => (
                  <div key={event.id} className="bg-yellow-400/5 p-4 rounded-xl border border-yellow-400/20 relative">
                    <button onClick={() => removeInterviewEvent(event.id)} className="absolute top-4 right-4 text-gray-500 hover:text-neon-red">
                      <Trash2 size={16} />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-8">
                      <div className="flex gap-2">
                        <input type="date" value={event.date} onChange={(e) => updateInterviewEvent(event.id, 'date', e.target.value)} className="w-1/2 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-yellow-400" />
                        <div className="w-1/2 flex rounded-lg overflow-hidden border border-white/10">
                          <button onClick={() => updateInterviewEvent(event.id, 'importance', '高')} className={`flex-1 text-xs font-bold ${event.importance === '高' ? 'bg-yellow-400 text-black' : 'bg-white/5 text-gray-400'}`}>高</button>
                          <button onClick={() => updateInterviewEvent(event.id, 'importance', '中')} className={`flex-1 text-xs font-bold border-l border-r border-white/10 ${event.importance === '中' ? 'bg-yellow-400 text-black' : 'bg-white/5 text-gray-400'}`}>中</button>
                          <button onClick={() => updateInterviewEvent(event.id, 'importance', '低')} className={`flex-1 text-xs font-bold ${event.importance === '低' ? 'bg-yellow-400 text-black' : 'bg-white/5 text-gray-400'}`}>低</button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <select value={event.store} onChange={(e) => updateInterviewEvent(event.id, 'store', e.target.value)} className="w-1/2 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-yellow-400">
                          <option value="">店舗選択</option>
                          {initialStores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input type="text" placeholder="面談相手の氏名" value={event.name} onChange={(e) => updateInterviewEvent(event.id, 'name', e.target.value)} className="w-1/2 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-yellow-400" />
                      </div>
                      <div className="flex gap-2 md:col-span-2">
                        <input type="text" placeholder="面談者（誰が面談したか）" value={event.interviewer} onChange={(e) => updateInterviewEvent(event.id, 'interviewer', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-yellow-400" />
                      </div>
                      <div className="flex gap-2 md:col-span-2">
                        <select value={event.interviewType} onChange={(e) => updateInterviewEvent(event.id, 'interviewType', e.target.value)} className="w-1/2 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-yellow-400">
                          <option value="">評価面談</option>
                          <option value="キャリア面談">キャリア面談</option>
                          <option value="1on1">1on1</option>
                          <option value="その他">その他</option>
                        </select>
                        <select value={event.status} onChange={(e) => updateInterviewEvent(event.id, 'status', e.target.value as any)} className="w-1/2 bg-white/5 border border-neon-blue/50 text-neon-blue rounded-lg p-2 text-sm outline-none focus:border-yellow-400">
                          <option value="継続">継続</option>
                          <option value="完了">完了</option>
                          <option value="BMフォロー必要">BMフォロー必要</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-gray-400 font-bold mb-1 block">【主な内容】</label>
                        <textarea value={event.contentMain} onChange={(e) => updateInterviewEvent(event.id, 'contentMain', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-gray-200 outline-none focus:border-yellow-400 min-h-[80px]" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 font-bold mb-1 block">【懸念事項/未解決事項】</label>
                        <textarea value={event.contentConcerns} onChange={(e) => updateInterviewEvent(event.id, 'contentConcerns', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-gray-200 outline-none focus:border-yellow-400 min-h-[80px]" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 font-bold mb-1 block">【次回アクション】</label>
                        <textarea value={event.contentNextAction} onChange={(e) => updateInterviewEvent(event.id, 'contentNextAction', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-gray-200 outline-none focus:border-yellow-400 min-h-[80px]" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 font-bold mb-1 block">【所感】</label>
                        <textarea value={event.contentImpression} onChange={(e) => updateInterviewEvent(event.id, 'contentImpression', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-gray-200 outline-none focus:border-yellow-400 min-h-[80px]" />
                      </div>
                    </div>
                  </div>
                ))}
                {interviewEvents.length === 0 && <p className="text-sm text-gray-500 text-center py-4">データがありません</p>}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-8">
          <button
            onClick={() => alert("下書き保存しました（デモ）")}
            className="flex-1 bg-white/5 border border-white/10 text-gray-300 py-4 rounded-xl font-bold uppercase tracking-[0.2em] hover:bg-white/10 transition-all font-digital flex items-center justify-center gap-2"
          >
            <Save size={18} />
            下書き保存
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-neon-orange text-black py-4 rounded-xl font-bold uppercase tracking-[0.2em] hover:shadow-[0_0_20px_rgba(255,157,0,0.4)] transition-all disabled:opacity-50 font-digital flex items-center justify-center gap-2"
          >
            <Send size={18} />
            {isSubmitting ? "送信中..." : "提出する"}
          </button>
        </div>
      </div>
    </div>
  );
}
