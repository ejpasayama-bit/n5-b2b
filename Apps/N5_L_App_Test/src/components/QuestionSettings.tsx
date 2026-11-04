import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// 自動割り当て用のパステルカラーパレット（6色でループ）
const THEME_PALETTE = [
  '#fee2e2', // 薄い赤
  '#dcfce7', // 薄い緑
  '#e0e7ff', // 薄い青
  '#fef3c7', // 薄い黄
  '#f3e8ff', // 薄い紫
  '#ccfbf1'  // 薄い水色
];

export const QuestionSettings = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [testType, setTestType] = useState<'pre' | 'post' | 'both'>('both');
  const [qNum, setQNum] = useState<number>(1);
  const [chapter, setChapter] = useState<number>(14);
  const [grammar, setGrammar] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('/audio/');
  const [qImgUrl, setQImgUrl] = useState<string>('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']); 
  const [correctIdx, setCorrectIdx] = useState<number>(0);
  const [themeColor, setThemeColor] = useState<string>(THEME_PALETTE[0]); 

  // ★ 新規追加：Q番号が変わるたびに自動で色をパレットから割り当てる
  useEffect(() => {
    // qNumが1ならインデックス0、7ならインデックス0に戻る（ループ）
    const colorIndex = (Math.max(1, qNum) - 1) % THEME_PALETTE.length;
    setThemeColor(THEME_PALETTE[colorIndex]);
  }, [qNum]);

  const updateOptionCount = (count: 3 | 4) => {
    if (count === 3 && options.length === 4) {
      setOptions(options.slice(0, 3));
      if (correctIdx === 3) setCorrectIdx(0);
    } else if (count === 4 && options.length === 3) {
      setOptions([...options, '']);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    if (options.some(opt => opt.trim() === '')) {
      setMessage({ text: 'すべての選択肢を入力してください', type: 'error' });
      setIsSubmitting(false);
      return;
    }

    try {
      const baseData = {
        question_number: qNum,
        audio_url: audioUrl,
        question_image_url: qImgUrl || null,
        options: options,
        correct_option_index: correctIdx,
        theme_color: themeColor,
        target_chapter: chapter,
        grammar_category: grammar
      };

      const insertData = testType === 'both' 
        ? [
            { ...baseData, test_type: 'pre' },
            { ...baseData, test_type: 'post' }
          ]
        : [
            { ...baseData, test_type: testType }
          ];

      const { error } = await supabase.from('questions').insert(insertData);

      if (error) throw error;

      setMessage({ text: `Q${qNum} の問題を登録しました！${testType === 'both' ? '（プレ・ポスト両方）' : ''}`, type: 'success' });
      setQNum(prev => prev + 1); // ここで+1されると、上のuseEffectが走り色も自動で切り替わる
      
    } catch (error: any) {
      console.error(error);
      setMessage({ text: '登録に失敗しました: ' + error.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
        <span className="text-4xl">📝</span>
        <div>
          <h2 className="text-2xl font-black text-slate-800">新規問題の登録</h2>
          <p className="text-sm text-slate-500 font-bold">Supabaseデータベースへ直接問題を書き込みます</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl font-bold text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-600">テスト種別</label>
            <select value={testType} onChange={e => setTestType(e.target.value as 'pre'|'post'|'both')} className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">
              <option value="both">プレ・ポスト両方</option>
              <option value="pre">プレテストのみ</option>
              <option value="post">ポストテストのみ</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-600">問題番号 (Q)</label>
            <input type="number" min="1" value={qNum} onChange={e => setQNum(Number(e.target.value))} className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" required />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-600">先生画面の色 (自動設定)</label>
            <div className="flex gap-2">
              <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} className="h-12 w-12 rounded-xl cursor-pointer" />
              <input type="text" value={themeColor} onChange={e => setThemeColor(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-sm" required />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-600">対象課 (例: 14)</label>
            <input type="number" min="1" value={chapter} onChange={e => setChapter(Number(e.target.value))} className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" required />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-600">文法項目 (例: て形)</label>
            <input type="text" value={grammar} onChange={e => setGrammar(e.target.value)} placeholder="て形、授受表現など" className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" required />
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-indigo-800">問題音声URL (publicフォルダ相対パス)</label>
            <input type="text" value={audioUrl} onChange={e => setAudioUrl(e.target.value)} placeholder="/audio/pre_q1.mp3" className="p-3 bg-white border border-indigo-200 rounded-xl font-bold font-mono text-sm" required />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-indigo-800">大問イラストURL (任意・なければ空欄)</label>
            <input type="text" value={qImgUrl} onChange={e => setQImgUrl(e.target.value)} placeholder="/img/q1_main.png" className="p-3 bg-white border border-indigo-200 rounded-xl font-bold font-mono text-sm" />
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-bold text-slate-700">選択肢の数と内容</label>
            <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
              <button type="button" onClick={() => updateOptionCount(3)} className={`px-4 py-1 text-sm font-bold rounded-md ${options.length === 3 ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>3択</button>
              <button type="button" onClick={() => updateOptionCount(4)} className={`px-4 py-1 text-sm font-bold rounded-md ${options.length === 4 ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>4択</button>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            {options.map((opt, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${correctIdx === i ? 'bg-green-50 border-green-400' : 'bg-white border-slate-200'}`}>
                <input 
                  type="radio" 
                  name="correctOption" 
                  checked={correctIdx === i} 
                  onChange={() => setCorrectIdx(i)}
                  className="w-5 h-5 accent-green-600 cursor-pointer"
                />
                <span className={`font-black text-lg ${correctIdx === i ? 'text-green-700' : 'text-slate-400'}`}>{i + 1}</span>
                <input 
                  type="text" 
                  value={opt} 
                  onChange={e => handleOptionChange(i, e.target.value)} 
                  placeholder={i === 0 ? 'テキスト または /img/opt1.png' : ''}
                  className="flex-1 bg-transparent outline-none font-bold text-slate-700"
                  required
                />
                {correctIdx === i && <span className="text-green-600 font-bold text-sm bg-green-200 px-2 py-1 rounded-md">正解</span>}
              </div>
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className={`mt-4 w-full py-5 text-xl font-black rounded-2xl shadow-lg transition-all active:scale-95 ${isSubmitting ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
          {isSubmitting ? '登録中...' : 'この問題をデータベースに保存する'}
        </button>
      </form>
    </div>
  );
};