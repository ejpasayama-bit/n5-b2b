import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { QuestionSettings } from './QuestionSettings';

type TabType = 'dashboard' | 'students' | 'difficult' | 'settings';

export const AdminScreen = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  // 集計データ用State
  const [groupStats, setGroupStats] = useState<any[]>([]);
  const [grammarStats, setGrammarStats] = useState<any[]>([]);
  const [studentStats, setStudentStats] = useState<any[]>([]);
  const [difficultStats, setDifficultStats] = useState<any[]>([]);

  useEffect(() => {
    fetchAndProcessData();
  }, []);

  const fetchAndProcessData = async () => {
    setLoading(true);
    try {
      // 1. answers, profiles, questions をJOINして一括取得
      const { data, error } = await supabase
        .from('answers')
        .select(`
          is_correct,
          test_type,
          profiles ( id, experiment_group ),
          questions ( id, question_number, grammar_category, target_chapter )
        `);

      if (error) throw error;
      if (!data) return;

      // === データ集計用の器 ===
      const groups: Record<string, { preTotal: number; preCorrect: number; postTotal: number; postCorrect: number }> = {
        'A': { preTotal: 0, preCorrect: 0, postTotal: 0, postCorrect: 0 },
        'B': { preTotal: 0, preCorrect: 0, postTotal: 0, postCorrect: 0 }
      };
      const grammarMap: Record<string, { preTotal: number; preCorrect: number; postTotal: number; postCorrect: number }> = {};
      const studentMap: Record<string, { id: string; group: string; preTotal: number; preCorrect: number; postTotal: number; postCorrect: number }> = {};
      const questionMap: Record<string, { id: string; q_num: number; type: string; chapter: number; grammar: string; total: number; correct: number }> = {};

      // データを1行ずつループして各器に振り分け
      data.forEach((row: any) => {
        const group = row.profiles?.experiment_group;
        const studentId = row.profiles?.id;
        const testType = row.test_type; 
        const isCorrect = row.is_correct;
        const qId = row.questions?.id;
        const grammar = row.questions?.grammar_category || '未設定';

        // 3. グループ別集計（A/B群）
        if (group === 'A' || group === 'B') {
          if (testType === 'pre') {
            groups[group].preTotal++;
            if (isCorrect) groups[group].preCorrect++;
          } else {
            groups[group].postTotal++;
            if (isCorrect) groups[group].postCorrect++;
          }
        }

        // 文法別集計（A群のみ）
        if (group === 'A' && grammar) {
          if (!grammarMap[grammar]) grammarMap[grammar] = { preTotal: 0, preCorrect: 0, postTotal: 0, postCorrect: 0 };
          if (testType === 'pre') {
            grammarMap[grammar].preTotal++;
            if (isCorrect) grammarMap[grammar].preCorrect++;
          } else {
            grammarMap[grammar].postTotal++;
            if (isCorrect) grammarMap[grammar].postCorrect++;
          }
        }

        // 2 & 6. 個別生徒集計
        if (studentId && group) {
          if (!studentMap[studentId]) studentMap[studentId] = { id: studentId, group, preTotal: 0, preCorrect: 0, postTotal: 0, postCorrect: 0 };
          if (testType === 'pre') {
            studentMap[studentId].preTotal++;
            if (isCorrect) studentMap[studentId].preCorrect++;
          } else {
            studentMap[studentId].postTotal++;
            if (isCorrect) studentMap[studentId].postCorrect++;
          }
        }

        // 4. 問題ごとの難問集計
        if (qId) {
          if (!questionMap[qId]) questionMap[qId] = { 
            id: qId, q_num: row.questions?.question_number, type: testType, 
            chapter: row.questions?.target_chapter, grammar, total: 0, correct: 0 
          };
          questionMap[qId].total++;
          if (isCorrect) questionMap[qId].correct++;
        }
      });

      const calcRate = (c: number, t: number) => t > 0 ? Math.round((c / t) * 100) : 0;

      // グラフ・リスト用配列への成形
      setGroupStats([
        { name: 'A群 (アプリ学習)', 'プレテスト': calcRate(groups['A'].preCorrect, groups['A'].preTotal), 'ポストテスト': calcRate(groups['A'].postCorrect, groups['A'].postTotal) },
        { name: 'B群 (従来学習)', 'プレテスト': calcRate(groups['B'].preCorrect, groups['B'].preTotal), 'ポストテスト': calcRate(groups['B'].postCorrect, groups['B'].postTotal) }
      ]);

      setGrammarStats(Object.keys(grammarMap).map(key => ({
        subject: key,
        'プレテスト(A群)': calcRate(grammarMap[key].preCorrect, grammarMap[key].preTotal),
        'ポストテスト(A群)': calcRate(grammarMap[key].postCorrect, grammarMap[key].postTotal),
      })));

      // 伸び率（ポスト - プレ）を算出し、伸び率が高い順にソート
      setStudentStats(Object.values(studentMap).map(s => {
        const preRate = calcRate(s.preCorrect, s.preTotal);
        const postRate = calcRate(s.postCorrect, s.postTotal);
        return { ...s, preRate, postRate, growth: postRate - preRate };
      }).sort((a, b) => b.growth - a.growth));

      // 正答率を算出し、正答率が低い（難問）順にソート
      setDifficultStats(Object.values(questionMap).map(q => ({
        ...q, rate: calcRate(q.correct, q.total)
      })).sort((a, b) => a.rate - b.rate));

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center font-bold text-slate-500">集計中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl">
        
        {/* ヘッダー＆タブ切り替え */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <span>📊</span> 管理コンソール
          </h1>
          <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>分析ボード</button>
            <button onClick={() => setActiveTab('students')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === 'students' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>個別成績</button>
            <button onClick={() => setActiveTab('difficult')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === 'difficult' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>難問分析</button>
            <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>問題設定</button>
          </div>
        </div>

        {/* --- 1. 分析ダッシュボードタブ --- */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-700 mb-6 border-b pb-4">学習効果の比較（A群 vs B群）</h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontWeight: 'bold' }} />
                    <YAxis unit="%" domain={[0, 100]} tick={{ fill: '#64748b' }} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="プレテスト" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="ポストテスト" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-700 mb-6 border-b pb-4">文法項目別の習熟度推移（A群）</h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={grammarStats}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontWeight: 'bold', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                    <Radar name="プレテスト" dataKey="プレテスト(A群)" stroke="#cbd5e1" fill="#cbd5e1" fillOpacity={0.5} />
                    <Radar name="ポストテスト" dataKey="ポストテスト(A群)" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <RechartsTooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* --- 2 & 6. 個別成績タブ（伸び率ランキング） --- */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-700">生徒別 伸び率ランキング</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 font-bold text-sm">
                    <th className="p-4 border-b">グループ</th>
                    <th className="p-4 border-b">ユーザーID (一部)</th>
                    <th className="p-4 border-b text-right">プレ正答率</th>
                    <th className="p-4 border-b text-right">ポスト正答率</th>
                    <th className="p-4 border-b text-right">伸び率</th>
                  </tr>
                </thead>
                <tbody>
                  {studentStats.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50 border-b border-slate-50 font-bold">
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-sm ${s.group === 'A' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'}`}>
                          {s.group}群
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 font-mono text-sm">{s.id.slice(0, 8)}...</td>
                      <td className="p-4 text-right text-slate-500">{s.preRate}%</td>
                      <td className="p-4 text-right text-indigo-600">{s.postRate}%</td>
                      <td className="p-4 text-right">
                        <span className={`px-2 py-1 rounded-lg ${s.growth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {s.growth >= 0 ? '+' : ''}{s.growth}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 4. 難問分析タブ --- */}
        {activeTab === 'difficult' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-700">問題別 難易度分析（正答率ワースト順）</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 font-bold text-sm">
                    <th className="p-4 border-b">テスト</th>
                    <th className="p-4 border-b">Q番号</th>
                    <th className="p-4 border-b">対象課</th>
                    <th className="p-4 border-b">文法項目</th>
                    <th className="p-4 border-b text-right">解答数</th>
                    <th className="p-4 border-b text-right">正答率</th>
                  </tr>
                </thead>
                <tbody>
                  {difficultStats.map((q, i) => (
                    <tr key={i} className="hover:bg-slate-50 border-b border-slate-50 font-bold text-slate-700">
                      <td className="p-4">{q.type === 'pre' ? 'プレ' : 'ポスト'}</td>
                      <td className="p-4">Q{q.q_num}</td>
                      <td className="p-4">第{q.chapter}課</td>
                      <td className="p-4">{q.grammar}</td>
                      <td className="p-4 text-right text-slate-500">{q.total}</td>
                      <td className="p-4 text-right">
                        <span className={`px-2 py-1 rounded-lg ${q.rate < 40 ? 'bg-red-100 text-red-700' : q.rate < 70 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {q.rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 5. 問題設定タブ --- */}
        {activeTab === 'settings' && (
          <QuestionSettings />
        )}

      </div>
    </div>
  );
};