'use client';

import React, { useState } from 'react';
import { Key, Copy, CheckCircle, AlertCircle, Lock } from 'lucide-react';

export default function AdminKeyGeneratorPage() {
  const [adminSecret, setAdminSecret] = useState('');
  const [memo, setMemo] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleGenerate = async () => {
    if (!adminSecret) {
      setStatusMsg('エラー: 管理者パスワードを入力してください。');
      return;
    }

    setIsGenerating(true);
    setStatusMsg('');
    setGeneratedKey('');

    try {
      // Node.jsのAPIエンドポイントを呼び出す
      const response = await fetch('/api/generate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminSecret, memo }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'キーの生成に失敗しました。');
      }

      setGeneratedKey(data.key);
      setStatusMsg('キーの発行とデータベース保存が完了しました。');

      // 自動でクリップボードにコピー
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(data.key);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch (error: any) {
      console.error(error);
      setStatusMsg(`エラー: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl w-full max-w-md p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* 背景の装飾 */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />
        
        <div className="flex flex-col items-center mb-8">
          <div className="bg-slate-800 p-4 rounded-full mb-4 shadow-inner border border-slate-700">
            <Lock size={32} className="text-cyan-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-widest text-center">
            B2B PoC-Key Generator
          </h1>
          <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-widest">
            Restricted Admin Area
          </p>
        </div>

        <div className="space-y-5">
          {/* 管理者パスワード入力 */}
          <div>
            <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">
              Admin Secret Password
            </label>
            <input
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
            />
          </div>

          {/* メモ入力 */}
          <div>
            <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">
              Issue Memo (Optional)
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="例: インドネシア〇〇協会 会長用"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
            />
          </div>

          {/* 生成ボタン */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !adminSecret}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-4 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-cyan-500/20 active:scale-95 flex items-center justify-center gap-2"
          >
            {isGenerating ? 'Generating...' : <><Key size={18} /> GENERATE POC KEY</>}
          </button>

          {/* メッセージ表示 */}
          {statusMsg && (
            <div className={`p-4 rounded-xl flex items-start gap-2 text-sm font-bold animate-in slide-in-from-bottom-2 ${statusMsg.startsWith('エラー') ? 'bg-red-950/50 text-red-400 border border-red-900/50' : 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/50'}`}>
               {statusMsg.startsWith('エラー') ? <AlertCircle size={18} className="shrink-0 mt-0.5"/> : <CheckCircle size={18} className="shrink-0 mt-0.5"/>}
               <p className="leading-relaxed">{statusMsg}</p>
            </div>
          )}

          {/* 生成されたキーの表示とコピー */}
          {generatedKey && (
            <div className="mt-6 bg-slate-950 border-2 border-cyan-500/30 rounded-2xl p-5 text-center animate-in zoom-in duration-300">
              <p className="text-cyan-500/80 text-xs font-bold mb-2 uppercase tracking-widest">
                Generated Key
              </p>
              <div className="text-3xl font-mono font-black text-white tracking-widest mb-4 select-all">
                {generatedKey}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-700 shadow-md active:scale-95"
              >
                {copied ? (
                  <><CheckCircle size={18} className="text-green-400" /> COPIED!</>
                ) : (
                  <><Copy size={18} className="text-cyan-400"/> COPY TO CLIPBOARD</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}