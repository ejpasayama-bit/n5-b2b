import React, { useState } from 'react';
import { db } from '../firebase'; // Firebase設定ファイルのパスに合わせてください
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Key, Copy, CheckCircle, AlertCircle } from 'lucide-react';
// import { v4 as uuidv4 } from 'uuid'; // UUID生成ライブラリ（npm install uuid が必要）

// UUIDライブラリを使わない簡易なランダムキー生成関数の例
const generateRandomKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'EASYJ-';
  for (let i = 0; i < 8; i++) {
    if (i === 4) result += '-';
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result; // 例: EASYJ-AB12-CD34
};

export const AdminKeyGenerator = ({ onClose }) => {
  const [generatedKey, setGeneratedKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [memo, setMemo] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const handleGenerateAndSave = async () => {
    setIsGenerating(true);
    setStatusMsg('');
    try {
      const newKey = generateRandomKey();
      
      // Firestoreへ保存
      await addDoc(collection(db, 'b2b_licenses'), {
        key: newKey,
        type: 'trial',
        isUsed: false,
        createdAt: serverTimestamp(),
        usedAt: null,
        memo: memo || 'PoC Trial'
      });

      setGeneratedKey(newKey);
      setStatusMsg('キーの発行とデータベース保存が完了しました。');
      
      // 自動でクリップボードにコピー
      if (navigator.clipboard) {
         await navigator.clipboard.writeText(newKey);
         setCopied(true);
         setTimeout(() => setCopied(false), 3000);
      }
    } catch (error) {
      console.error("Key generation error:", error);
      setStatusMsg('エラーが発生しました: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6 border border-slate-700 shadow-2xl">
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
          <h2 className="text-xl font-black text-cyan-400 flex items-center gap-2">
            <Key size={24} /> B2B Trial Key Generator
          </h2>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              ✕
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
             <label className="block text-slate-400 text-xs font-bold mb-1">発行先メモ (任意)</label>
             <input 
               type="text" 
               value={memo}
               onChange={(e) => setMemo(e.target.value)}
               placeholder="例: インドネシア〇〇協会 会長用"
               className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
             />
          </div>

          <button 
            onClick={handleGenerateAndSave} 
            disabled={isGenerating}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {isGenerating ? '生成中...' : '新規トライアルキーを発行'}
          </button>

          {generatedKey && (
            <div className="mt-6 bg-slate-900 border border-cyan-900/50 rounded-xl p-4 text-center">
              <p className="text-slate-400 text-xs font-bold mb-2">生成されたキー</p>
              <div className="text-2xl font-mono font-black text-white tracking-widest mb-3 select-all">
                {generatedKey}
              </div>
              <button 
                onClick={() => {
                   navigator.clipboard.writeText(generatedKey);
                   setCopied(true);
                   setTimeout(() => setCopied(false), 3000);
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {copied ? <><CheckCircle size={16} className="text-green-400"/> コピーしました</> : <><Copy size={16}/> コピーする</>}
              </button>
            </div>
          )}

          {statusMsg && (
             <p className={`text-xs font-bold mt-4 ${statusMsg.includes('エラー') ? 'text-red-400' : 'text-cyan-400'}`}>
                {statusMsg.includes('エラー') && <AlertCircle size={14} className="inline mr-1"/>}
                {statusMsg}
             </p>
          )}
        </div>
      </div>
    </div>
  );
};