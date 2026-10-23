import { Suspense } from 'react';
import { db } from '@/lib/firebaseAdmin';
import DownloadButton from './DownloadButton';
import { ShieldCheck, XCircle } from 'lucide-react';
import { connection } from 'next/server';

const DICT = {
  ja: {
    notPaid: "お支払いが確認できていません",
    notPaidDesc: "決済が完了していないか、処理中です。",
    portalTitle: "納品ポータル",
    honorific: " 様",
    issuedCount: "発行済みライセンス数",
    unit: "個",
  },
  en: {
    notPaid: "Payment Not Confirmed",
    notPaidDesc: "Payment is pending or currently processing.",
    portalTitle: "Delivery Portal",
    honorific: "",
    issuedCount: "Issued Licenses",
    unit: "",
  }
};

// 1. Firebaseと通信する「動的な中身」のコンポーネント
async function DeliveryContent({ orderIdPromise }: { orderIdPromise: Promise<{ orderId: string }> }) {
  await connection();
  const { orderId } = await orderIdPromise;

  const orderRef = db.collection('orders').doc(orderId);
  const orderDoc = await orderRef.get();

  if (!orderDoc.exists) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center border border-slate-100">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-800">注文が見つかりません<br/><span className="text-sm">Order Not Found</span></h1>
      </div>
    );
  }

  const orderData = orderDoc.data()!;
  // Firestoreに保存したlangを取得（デフォルトはja）
  const lang = (orderData.lang as 'ja' | 'en') || 'ja';
  const t = DICT[lang];

  if (orderData.status !== 'paid') {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center border border-slate-100">
        <h1 className="text-xl font-bold text-slate-800">{t.notPaid}</h1>
        <p className="text-slate-600 mt-2">{t.notPaidDesc}</p>
      </div>
    );
  }

  const keysSnapshot = await db.collection('activation_keys').where('orderId', '==', orderId).get();
  const keys = keysSnapshot.docs.map(doc => doc.id);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-6">
        <ShieldCheck className="h-8 w-8 text-indigo-600" />
      </div>
      <h1 className="text-2xl font-black text-slate-800 mb-2">{t.portalTitle}</h1>
      <p className="text-slate-600 mb-6 font-medium">{orderData.schoolName}{t.honorific}</p>
      
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8">
        <p className="text-sm text-slate-500 mb-1">{t.issuedCount}</p>
        <p className="text-3xl font-black text-slate-800">{keys.length} <span className="text-lg font-bold text-slate-500">{t.unit}</span></p>
      </div>

      {/* 🚨 DownloadButtonにも言語情報を渡します */}
      <DownloadButton keys={keys} schoolName={orderData.schoolName} lang={lang} />
    </div>
  );
}

// 2. Next.jsが事前キャッシュする「ページの大枠」
export default function DeliveryPage({ params }: { params: Promise<{ orderId: string }> }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Suspenseで囲むことで、中身の処理だけをアクセス時まで遅延させます */}
      <Suspense fallback={<div className="font-bold text-slate-500">Loading... / 読み込み中...</div>}>
        <DeliveryContent orderIdPromise={params} />
      </Suspense>
    </div>
  );
}