'use client';

import { Download } from 'lucide-react';

export default function DownloadButton({ keys, schoolName, lang = 'ja' }: { keys: string[], schoolName: string, lang?: 'ja' | 'en' }) {
  const handleDownload = () => {
    // 以前のExpressアプリと同じCSV生成ロジック（BOM付きでExcel文字化け防止）
    const csvContent = "\uFEFF" + "SerialKey,SchoolName\r\n" + keys.map(k => `${k},${schoolName}`).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    // ダウンロード用リンクを生成して強制クリック
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `licenses_${schoolName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 🚨 言語によってボタンのテキストを分岐
  const buttonText = lang === 'en' ? 'Download Serial Keys (CSV)' : 'シリアルキー (CSV) をダウンロード';

  return (
    <button
      onClick={handleDownload}
      className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
    >
      <Download className="w-5 h-5" />
      {buttonText}
    </button>
  );
}