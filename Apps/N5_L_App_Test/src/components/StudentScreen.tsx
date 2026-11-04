import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';

interface Question {
  id: string;
  question_number: number;
  test_type: string;
  options: string[];
  correct_option_index: number;
  theme_color: string;
  question_image_url?: string | null; // これを追加
}

export const StudentScreen = () => {
  const { t } = useLanguage();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) setStudentId(authData.user.id);

      const { data: qData, error } = await supabase
        .from('questions')
        .select('*')
        .eq('test_type', 'pre')
        .order('question_number', { ascending: true });

      if (!error && qData) setQuestions(qData);
    };
    fetchData();
  }, []);

  const handleNext = async () => {
    if (selectedOptionIndex === null || !studentId || questions.length === 0) return;
    setIsSubmitting(true);
    const currentQ = questions[currentIndex];
    
    try {
      await supabase.from('answers').insert({
        student_id: studentId,
        question_id: currentQ.id,
        test_type: currentQ.test_type,
        selected_option_index: selectedOptionIndex,
        is_correct: selectedOptionIndex === currentQ.correct_option_index
      });

      if (currentIndex + 1 >= questions.length) {
        setIsFinished(true);
      } else {
        setCurrentIndex(prev => prev + 1);
        setSelectedOptionIndex(null);
      }
    } catch (error) {
      alert('エラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isImageUrl = (text: string) => /\.(png|jpe?g|svg|gif|webp)$/i.test(text);

  if (questions.length === 0) return <div className="flex items-center justify-center min-h-screen text-2xl font-bold">{t('student.wait')}</div>;
  
  if (isFinished) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <h1 className="text-4xl font-bold text-indigo-600 mb-6">{t('student.complete')}</h1>
      <p className="text-xl text-slate-700 font-bold">先生の指示があるまでお待ちください。</p>
    </div>
  );

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

      <div className="z-10 w-full max-w-lg flex flex-col h-[90vh]">
        
        {/* ヘッダー部分（Q番号） */}
        <div className="flex justify-center items-center mb-6 shrink-0">
          <h2 className="text-slate-700 text-3xl font-black bg-white/80 px-6 py-2 rounded-full shadow-sm">
            Q {currentQ.question_number}
          </h2>
        </div>

        {currentQ.question_image_url && (
          <div className="flex justify-center mb-6 shrink-0">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 w-full flex justify-center max-h-56">
              <img 
                src={currentQ.question_image_url} 
                className="max-h-full object-contain rounded-xl pointer-events-none" 
                alt={`Question ${currentQ.question_number} illustration`} 
              />
            </div>
          </div>
        )}

        {/* 選択肢のスクロールエリア */}
        <div className={`flex-1 flex flex-col gap-4 overflow-y-auto pb-6 ${hasImages ? 'min-h-[400px]' : ''}`}>
          {currentQ.options.map((opt, i) => {
            const isSelected = selectedOptionIndex === i;
            
            return (
              <button
                key={i}
                onClick={() => setSelectedOptionIndex(i)}
                className={`relative overflow-hidden rounded-2xl transition-all duration-200 active:scale-95 border-2 flex items-stretch min-h-[5rem] shadow-sm hover:shadow-md
                  ${isSelected 
                    ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200/50' 
                    : 'bg-white border-transparent hover:border-indigo-200'}
                  ${hasImages ? 'flex-1' : 'py-3'}
                `}
              >
                {/* 左側の数字バッジ */}
                <div className={`w-14 flex items-center justify-center font-black text-xl shrink-0 border-r transition-colors
                  ${isSelected ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-100'}
                `}>
                  {i + 1}
                </div>

                {/* 右側のコンテンツ（画像 or テキスト） */}
                <div className="flex-1 p-4 flex items-center justify-center h-full">
                  {isImageUrl(opt) ? (
                    <img src={opt} className="max-h-24 max-w-full object-contain" alt={`option ${i+1}`} />
                  ) : (
                    <span className={`font-bold text-xl ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                      {opt}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* フッター（次へボタン） */}
        <div className="shrink-0 mt-auto pt-4 pb-8">
          <button
            onClick={handleNext}
            disabled={selectedOptionIndex === null || isSubmitting}
            className={`w-full py-5 text-2xl font-black rounded-2xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2
              ${selectedOptionIndex === null || isSubmitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl'}
            `}
          >
            {isSubmitting ? t('student.wait') : t('student.next')}
          </button>
        </div>

      </div>
    </div>
  );
};