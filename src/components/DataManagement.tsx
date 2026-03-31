import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Database, RotateCcw, FileJson, Check, AlertCircle, Download, Upload } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface DataManagementProps {
  onClose: () => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({ onClose }) => {
  const { exportData, importData, resetAllData } = useAppContext();
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const handleExport = () => {
    const data = exportData();
    setJsonInput(data);
    navigator.clipboard.writeText(data);
    setStatus('success');
    setTimeout(() => setStatus('idle'), 2000);
  };

  const handleDownload = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workforce-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus('success');
    setTimeout(() => setStatus('idle'), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
      const success = importData(content);
      if (success) {
        setStatus('success');
        setTimeout(() => {
          setStatus('idle');
          onClose();
        }, 1000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!jsonInput.trim()) return;
    const success = importData(jsonInput);
    if (success) {
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        onClose();
      }, 1000);
    } else {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleReset = () => {
    setIsConfirmModalOpen(true);
  };

  const confirmReset = () => {
    resetAllData();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center space-x-2">
            <Database className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-neutral-900">データ管理 (JSON入出力)</h2>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700 p-2 hover:bg-neutral-200 rounded-full transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">JSONデータ</label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full h-64 p-4 font-mono text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
              placeholder='ここにJSONデータを貼り付けるか、エクスポートボタンを押してください...'
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              <FileJson className="w-4 h-4" />
              <span>エクスポート (コピー)</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>ファイル保存</span>
            </button>
            <label className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>ファイル読込</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
            <button
              onClick={handleImport}
              disabled={!jsonInput.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>インポート (適用)</span>
            </button>
            <div className="flex-grow" />
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>全データ削除 (空にする)</span>
            </button>
          </div>

          {status === 'success' && (
            <div className="flex items-center space-x-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">処理が完了しました。</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">JSONの形式が正しくありません。</span>
            </div>
          )}
        </div>

        <div className="p-4 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-500">
          <p>※ インポートを行うと、現在のデータは上書きされます。</p>
          <p>※ エクスポートしたデータは、バックアップとして保存しておくことができます。</p>
        </div>
      </div>
      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        message="すべてのデータを削除して空にしますか？この操作は取り消せません。"
        onConfirm={confirmReset}
        onCancel={() => setIsConfirmModalOpen(false)}
      />
    </div>
  );
};
