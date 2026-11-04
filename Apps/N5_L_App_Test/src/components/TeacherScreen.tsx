import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';

interface Question {
  id: string;
  question_number: number;
  test_type: string;
  audio_url: string;
  options: string[];
  correct_option_index: number;
  theme_color: string;
  question_image_url?: string | null;
}

export const TeacherScreen = () => {
  const { t } = useLanguage();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: qData, error } = await supabase
        .from('questions')
        .select('*')
        .eq('test_type', 'pre')
        .order('question_number', { ascending: true });

      if (!error && qData) {
        setQuestions(qData);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    setHasPlayed(false);
  }, [currentIndex]);

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };
  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const handlePlayAudio = () => {
    if (audioRef.current && !hasPlayed && !isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setHasPlayed(true);
  };

  const isImageUrl = (text: string) => /\.(png|jpe?g|svg|gif|webp)$/i.test(text);

  if (questions.length === 0) {
    return <div className="flex items-center justify-center min-h-screen text-2xl font-bold">{t('student.wait')}</div>;
  }

  const currentQ = questions[currentIndex];
  const hasImages = currentQ.options.some(isImageUrl);

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8 transition-colors duration-300 relative overflow-hidden bg-slate-50"
      style={currentQ.theme_color ? { backgroundColor: currentQ.theme_color } : {}}
    >
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[15rem] font-bold text-black/5 pointer-events-none select-none z-0">
        {currentQ.question_number}
      </div>

      <div className="z-10 w-full max-w-2xl flex flex-col h-[90vh]">
        
        <div className="flex justify-between items-center mb-4 shrink-0 bg-white/80 p-4 rounded-2xl shadow-sm border border-white">
          <h2 className="text-slate-700 text-3xl font-black">
            Q {currentQ.question_number}
          </h2>
          <div className="text-slate-500 font-bold">
            {currentIndex + 1} / {questions.length}
          </div>
        </div>

        <div className="mb-6 shrink-0 bg-black/70 text-white p-3 rounded-xl text-center font-bold text-sm shadow-md flex items-center justify-center gap-2">
          <span>👀</span>
          生徒の画面がこの背景色になっているか確認してから再生してください
        </div>

        {currentQ.question_image_url && (
          <div className="flex justify-center mb-6 shrink-0">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 w-full flex justify-center max-h-48">
              <img 
                src={currentQ.question_image_url} 
                className="max-h-full object-contain rounded-xl pointer-events-none" 
                alt={`Q${currentQ.question_number} image`} 
              />
            </div>
          </div>
        )}

        <div className="flex justify-center mb-8 shrink-0">
          <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-indigo-100 w-full flex flex-col items-center gap-4">
            <span className="text-indigo-600 font-bold text-sm">問題音声（1回のみ再生可能）</span>
            
            <audio 
              ref={audioRef}
              src={currentQ.audio_url} 
              onEnded={handleAudioEnded}
              className="hidden"
            />
            
            <button
              onClick={handlePlayAudio}
              disabled={hasPlayed || isPlaying}
              className={`w-full max-w-sm py-4 rounded-xl font-black text-xl flex items-center justify-center gap-2 transition-all shadow-sm
                ${isPlaying 
                  ? 'bg-amber-100 text-amber-700 border-2 border-amber-400' 
                  : hasPlayed 
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none' 
                    : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-md active:scale-95'}
              `}
            >
              {isPlaying ? (
                <>🔊 再生中...</>
              ) : hasPlayed ? (
                <>✔️ 再生完了</>
              ) : (
                <>▶️ 音声を再生する</>
              )}
            </button>
          </div>
        </div>

        {/* 選択肢表示エリア：正解の装飾をなくし、すべてフラットに変更 */}
        <div className={`flex-1 flex flex-col bg-white/40 backdrop-blur p-4 sm:p-6 rounded-3xl border-2 border-white/60 shadow-sm ${hasImages ? 'min-h-[300px]' : ''}`}>
          
          {/* ベタ打ちの文字をスタイリングして配置 */}
          <div className="text-slate-600 font-bold text-sm mb-4 text-center flex items-center justify-center gap-2">
            <span>📝</span> （生徒の選択肢は以下となっています）
          </div>

          {/* 選択肢のスクロールエリア */}
          <div className="flex flex-col gap-4 overflow-y-auto pb-2">
            {currentQ.options.map((opt, i) => {
              return (
                <div
                  key={i}
                  className={`relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white flex items-stretch min-h-[4rem] shadow-sm
                    ${hasImages ? 'flex-1' : 'py-2'}
                  `}
                >
                  <div className="w-14 flex items-center justify-center font-black text-xl shrink-0 border-r bg-slate-50 text-slate-500 border-slate-100">
                    {i + 1}
                  </div>

                  <div className="flex-1 p-2 flex items-center justify-center h-full relative">
                    {isImageUrl(opt) ? (
                      <img src={opt} className="max-h-20 max-w-full object-contain" alt={`option ${i+1}`} />
                    ) : (
                      <span className="font-bold text-xl text-slate-700">
                        {opt}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 mt-auto pt-4 pb-8 flex gap-4">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`flex-1 py-4 text-xl font-bold rounded-xl transition-all
              ${currentIndex === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 shadow-sm active:scale-95'}
            `}
          >
            ◀ 戻る
          </button>
          
          <button
            onClick={handleNext}
            disabled={currentIndex === questions.length - 1}
            className={`flex-1 py-4 text-xl font-bold rounded-xl transition-all shadow-md
              ${currentIndex === questions.length - 1
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}
            `}
          >
            次へ ▶
          </button>
        </div>

      </div>
    </div>
  );
};