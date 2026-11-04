import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin'; // 既存のFirebase Admin SDK設定に合わせてください

// ランダムキー生成関数
const generateRandomKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'EASYJ-POC-'; // PoC用であることがわかりやすいプレフィックス
  for (let i = 0; i < 8; i++) {
    if (i === 4) result += '-';
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result; // 例: EASYJ-POC-AB12-CD34
};

export async function POST(req: Request) {
  try {
    const { adminSecret, memo } = await req.json();

    // 1. 管理者シークレットキーの検証（環境変数と一致するか）
    if (adminSecret !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized: 無効な管理者キーです。' }, { status: 401 });
    }

    // 2. キーの生成
    const newKey = generateRandomKey();

    // 3. Firestoreへの保存 (poc_keys コレクション)
    await adminDb.collection('poc_keys').add({
      key: newKey,
      type: 'poc_trial',
      isUsed: false,
      createdAt: new Date(), // Admin SDKでは通常のDateオブジェクトでOK
      usedAt: null,
      validMonths: 2, // 有効期限（認証後2ヶ月）
      memo: memo || 'インドネシアPoC用'
    });

    // 4. 成功レスポンス（生成したキーを返す）
    return NextResponse.json({ success: true, key: newKey });

  } catch (error: any) {
    console.error('Key generation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}