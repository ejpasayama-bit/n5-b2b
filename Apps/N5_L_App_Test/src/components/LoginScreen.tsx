import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

export const LoginScreen = () => {
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState(''); // IDの代わりにメールアドレスを使用
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      // 1. Supabase Authでログイン
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User not found');

      // 2. profilesテーブルからroleを取得
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      // 3. roleに応じてリダイレクト
      const role = profileData.role;
      if (role === 'student') navigate('/student');
      else if (role === 'teacher') navigate('/teacher');
      else if (role === 'admin') navigate('/admin');
      else throw new Error('Invalid role');

    } catch (error: any) {
      console.error(error);
      setErrorMsg(t('error.invalid'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={() => setLanguage('ja')} className={language === 'ja' ? 'font-bold' : ''}>JP</button>
        <button onClick={() => setLanguage('id')} className={language === 'id' ? 'font-bold' : ''}>ID</button>
      </div>

      <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">{t('login.title')}</h1>
        
        {errorMsg && (
          <div className="mb-4 text-red-500 text-sm font-bold text-center">
            {errorMsg}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            {t('login.id')} (Email)
          </label>
          <input 
            type="email" 
            className="border rounded w-full py-2 px-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            {t('login.password')}
          </label>
          <input 
            type="password" 
            className="border rounded w-full py-2 px-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button 
          onClick={handleLogin}
          disabled={isLoading}
          className={`text-white font-bold py-2 px-4 rounded w-full ${isLoading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-700'}`}
        >
          {isLoading ? t('student.wait') : t('login.submit')}
        </button>
      </div>
    </div>
  );
};