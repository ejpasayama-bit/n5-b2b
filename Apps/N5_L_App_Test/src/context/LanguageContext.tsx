import { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';

// 1. サポートする言語の定義
type Language = 'ja' | 'id' | 'en';

// 2. 言語辞書の定義（後々別ファイルに分割してもOKです）
const translations: Record<Language, Record<string, string>> = {
  ja: {
    'login.title': 'システムログイン',
    'login.id': 'ID',
    'login.password': 'パスワード',
    'login.submit': 'ログイン',
    'student.next': '次へ',
    'student.wait': '待機中...',
    'student.complete': 'テスト完了',
    'error.invalid': 'IDまたはパスワードが間違っています',
  },
  id: {
    'login.title': 'Masuk ke Sistem',
    'login.id': 'ID Pengguna',
    'login.password': 'Kata Sandi',
    'login.submit': 'Masuk',
    'student.next': 'Selanjutnya',
    'student.wait': 'Menunggu...',
    'student.complete': 'Tes Selesai',
    'error.invalid': 'ID atau kata sandi salah',
  },
  en: {
    'login.title': 'System Login',
    'login.id': 'ID',
    'login.password': 'Password',
    'login.submit': 'Login',
    'student.next': 'Next',
    'student.wait': 'Waiting...',
    'student.complete': 'Test Complete',
    'error.invalid': 'Invalid ID or Password',
  },
};

// 3. Contextの型定義
interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

// 4. Providerコンポーネント
export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // 初期言語の設定（ブラウザの言語を判定するか、デフォルトをidにするなど調整可能）
  const [language, setLanguage] = useState<Language>('id'); 

  // 翻訳取得関数
  const t = (key: string) => {
    return translations[language][key] || key; // 辞書にない場合はキーをそのまま返す
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// 5. カスタムフック（各コンポーネントで呼び出しやすくするため）
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};