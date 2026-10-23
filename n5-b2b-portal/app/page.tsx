"use client";

import { useState } from "react";
import { CheckCircle, Globe } from "lucide-react";

// 辞書オブジェクトの定義
const DICT = {
  ja: {
    title: "N5レベル(CEFR A1-A2相当)\nリスニング対策アプリ\n教育機関向け 一括導入パック",
    subtitle: "ご入力いただいたメールアドレス宛に、お支払いリンク付きの見積り・請求書を自動発行いたします。",
    schoolName: "学校・機関名",
    schoolPh: "例：東ジャワ日本語学校",
    contactName: "担当者名",
    contactPh: "例：山田 太郎",
    address: "住所（任意）",
    addressPh: "例：東京都千代田区〇〇 1-2-3",
    email: "メールアドレス（納品先）",
    emailPh: "例：info@example.com",
    licenses: "導入ライセンス数（学生数）",
    licensesUnit: "名様分",
    estimateStr: "お見積り金額",
    totalStr: "合計",
    submitBtn: "見積り・請求書を発行する",
    submittingBtn: "処理中...",
    successTitle: "請求書の発行が完了しました",
    successDesc1: "ご入力いただいたメールアドレス（",
    successDesc2: "）宛に、PDFのお見積り・請求書と、お支払い用のリンクを送信いたしました。",
    successDesc3: "社内でのご決済手続きをお願いいたします。",
    backToTop: "トップページへ戻る"
  },
  en: {
    title: "JLPT N5 (CEFR A1-A2)\nListening Prep App\nVolume Licensing for Institutions",
    subtitle: "We will automatically issue an estimate/invoice with a payment link to your email address.",
    schoolName: "School / Institution Name",
    schoolPh: "e.g., East Java Japanese School",
    contactName: "Contact Person Name",
    contactPh: "e.g., John Doe",
    address: "Address (Optional)",
    addressPh: "e.g., 1-2-3 Chiyoda-ku, Tokyo",
    email: "Email Address (For Delivery)",
    emailPh: "e.g., info@example.com",
    licenses: "Number of Licenses (Students)",
    licensesUnit: "users",
    estimateStr: "Estimated Amount",
    totalStr: "Total",
    submitBtn: "Generate Estimate & Invoice",
    submittingBtn: "Processing...",
    successTitle: "Invoice Issued Successfully",
    successDesc1: "We have sent a PDF estimate/invoice and a payment link to the email address you provided (",
    successDesc2: ").",
    successDesc3: "Please proceed with your internal payment process.",
    backToTop: "Back to Top"
  }
};

export default function CheckoutForm() {
  const [lang, setLang] = useState<'ja' | 'en'>('en'); // デフォルトを英語に設定
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    schoolName: "",
    contactName: "",
    address: "",
    email: "",
    licenses: 50,
  });

  const t = DICT[lang];

  const getPricePerLicense = (count: number) => {
    if (count >= 500) return 350;
    if (count >= 100) return 400;
    if (count >= 50) return 450;
    return 500;
  };

  const currentPrice = getPricePerLicense(formData.licenses);
  const totalPrice = formData.licenses * currentPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 🚨 選択された言語(lang)をAPIに送信
        body: JSON.stringify({ ...formData, lang }),
      });

      const data = await res.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        throw new Error(data.error || '請求書の発行に失敗しました');
      }
    } catch (error) {
      console.error("エラー:", error);
      alert(lang === 'ja' ? "通信エラーが発生しました。" : "A network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🌟 送信完了後の画面
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">{t.successTitle}</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            {t.successDesc1}<span className="font-bold">{formData.email}</span>{t.successDesc2}<br /><br />
            {t.successDesc3}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
          >
            {t.backToTop}
          </button>
        </div>
      </div>
    );
  }

  // 🌟 入力フォームの画面
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        
        {/* 言語切り替えトグル */}
        <div className="flex justify-end mb-2 -mt-2">
          <button 
            onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <Globe size={16} />
            {lang === 'ja' ? 'English' : '日本語'}
          </button>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 whitespace-pre-line">
            {t.title}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {t.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t.schoolName}</label>
            <input type="text" name="schoolName" required value={formData.schoolName} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" placeholder={t.schoolPh} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t.contactName}</label>
            <input type="text" name="contactName" required value={formData.contactName} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" placeholder={t.contactPh} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t.address}</label>
            <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" placeholder={t.addressPh} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t.email}</label>
            <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" placeholder={t.emailPh} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t.licenses}</label>
            <div className="flex items-center gap-4">
              <input type="number" name="licenses" min="10" step="10" required value={formData.licenses} onChange={handleChange} className="w-32 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-black text-lg text-slate-800" />
              <span className="text-slate-500">{t.licensesUnit}</span>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4 mt-6">
            <div className="flex justify-between items-center text-sm font-bold text-indigo-900 mb-1">
              <span>{t.estimateStr}</span>
              <span>¥{currentPrice.toLocaleString()} × {formData.licenses}</span>
            </div>
            <div className="flex justify-between items-center text-2xl font-black text-indigo-600">
              <span>{t.totalStr}</span>
              <span>¥{totalPrice.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full mt-6 py-4 rounded-xl font-black text-white shadow-lg transition-all ${
              isSubmitting ? "bg-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {isSubmitting ? t.submittingBtn : t.submitBtn}
          </button>
        </form>
      </div>
    </div>
  );
}