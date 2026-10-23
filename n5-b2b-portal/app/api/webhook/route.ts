import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db, FieldValue } from '@/lib/firebaseAdmin';
import crypto from 'crypto';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-09-30.endive' as any,
});

// Stripe CLIやダッシュボードで取得するWebhookシークレット
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// 以前作成されたシリアルキー生成ロジック
function generateSerialKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) key += "-";
    key += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return key;
}

export async function POST(req: Request) {
  console.log("🔥 Webhookエンドポイントにリクエストが到達しました！");
  // Webhookの署名検証のため、リクエストボディをそのまま文字列として取得
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  let event;
  try {
    // 悪意のあるリクエストを防ぐため、Stripeからの通信か検証
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // 決済完了イベントを検知
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Checkout生成時に仕込んでおいたFirestoreのドキュメントIDを取得
    const orderId = session.client_reference_id;

    if (orderId) {
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (orderDoc.exists) {
        const orderData = orderDoc.data()!;
        // 🚨 注文データから言語情報を取得（デフォルトは 'ja'）
        const isEn = orderData.lang === 'en';
        
        // 1. 注文ステータスを「支払い済み（paid）」に更新
        await orderRef.update({ 
          status: 'paid', 
          paidAt: FieldValue.serverTimestamp() 
        });

        // 2. シリアルキーを指定数だけ生成して保存
        const numKeys = orderData.licenses;
        const schoolName = orderData.schoolName;
        
        const batch = db.batch();
        const collectionRef = db.collection("activation_keys");

        for (let i = 0; i < numKeys; i++) {
          const serialKey = generateSerialKey();
          const docRef = collectionRef.doc(serialKey);
          
          batch.set(docRef, {
            orderId: orderId, // どの注文で発行されたか紐付け
            schoolName: schoolName,
            isUsed: false,
            usedAt: null,
            createdAt: FieldValue.serverTimestamp()
          });
        }
        
        await batch.commit();
        console.log(`✅ ${schoolName} 様向けのキーを ${numKeys} 個発行し、保存しました。`);

        const resend = new Resend(process.env.RESEND_API_KEY);
        const deliveryUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/delivery/${orderId}`;
        
        // 🚨 メール本文の多言語化
        const emailBodyJa = `${schoolName}
${orderData.contactName || 'ご担当者'} 様

お支払いが確認できました。誠にありがとうございます。
以下の専用納品ポータルより、発行されたシリアルキー（CSV形式）をダウンロードしてご利用ください。

◆ 納品ポータルURL
${deliveryUrl}

※本URLは後日いつでも再ダウンロードにご利用いただけます。

EasyJ Studio
代表: 深谷`;

        const emailBodyEn = `${schoolName}
Attn: ${orderData.contactName || 'Customer'}

We have confirmed your payment. Thank you very much.
Please download your issued serial keys (CSV format) from the dedicated delivery portal below.

◆ Delivery Portal URL
${deliveryUrl}

* You can use this URL to download the keys again at any time in the future.

EasyJ Studio
Rep: Fukaya`;

        await resend.emails.send({
          from: 'info@easyjstudio.com', // Resendで認証済みのドメイン
          to: orderData.email,
          subject: isEn 
            ? `[Delivery Complete] JLPT N5(CEFR A1-A2) Prep App Serial Keys Issued` 
            : `【納品完了】N5レベル(CEFR A1-A2相当)リスニング対策アプリ シリアルキー発行のお知らせ`,
          text: isEn ? emailBodyEn : emailBodyJa
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}