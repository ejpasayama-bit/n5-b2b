import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db, FieldValue } from '@/lib/firebaseAdmin';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs/promises';
import path from 'path';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-09-30.endive' as any,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // 🚨 lang を受け取る
    const { schoolName, contactName, address, email, licenses, lang } = body;
    const parsedLicenses = Number(licenses);
    const isEn = lang === 'en'; // 英語判定フラグ

    const getPricePerLicense = (count: number) => {
      if (count >= 500) return 350;
      if (count >= 100) return 400;
      if (count >= 50) return 450;
      return 500;
    };
    const unitPrice = getPricePerLicense(parsedLicenses);
    const totalAmount = unitPrice * parsedLicenses;

    const orderRef = db.collection('orders').doc();
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    // 1. Stripe決済セッションの作成
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      client_reference_id: orderRef.id,
      metadata: { orderId: orderRef.id, schoolName },
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              // 🚨 Stripeの表示名も分岐
              name: isEn 
                ? `JLPT N5(CEFR A1-A2) Prep App Volume License (${schoolName})` 
                : `N5レベル(CEFR A1-A2相当)リスニング対策アプリ 一括導入ライセンス (${schoolName} 様)`,
              description: isEn 
                ? `Contact: ${contactName} / ${parsedLicenses} users` 
                : `担当者: ${contactName} 様 / ${parsedLicenses}名様分`,
            },
            unit_amount: unitPrice,
          },
          quantity: parsedLicenses,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/delivery/${orderRef.id}`,
      cancel_url: `${baseUrl}/`,
    });

    // 2. Firebaseへの注文データ保存
    await orderRef.set({
      schoolName,
      contactName,
      address: address || '',
      email,
      licenses: parsedLicenses,
      unitPrice: unitPrice,
      totalAmount: totalAmount,
      stripeSessionId: session.id,
      paymentUrl: session.url,
      status: 'pending',
      lang: lang || 'ja', // 言語情報も保存しておく
      createdAt: FieldValue.serverTimestamp(),
    });

    // 3. 見積書PDFの動的生成
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf');
    const fontBuffer = await fs.readFile(fontPath);
    const fontBase64 = fontBuffer.toString('base64');

    const doc = new jsPDF();
    doc.addFileToVFS('NotoSansJP-Regular.ttf', fontBase64);
    doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
    doc.setFont('NotoSansJP');
    
    // ヘッダー
    doc.setFillColor(65, 105, 225);
    doc.rect(15, 15, 180, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(isEn ? 'ESTIMATE' : '見 積 書', 105, 22, { align: 'center' });

    // 宛先と自社情報
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const today = new Date();
    
    // 日付フォーマット（英語の場合はYYYY-MM-DD）
    const dateStr = isEn ? today.toISOString().split('T')[0] : today.toLocaleDateString('ja-JP');
    doc.text(`${isEn ? 'Date: ' : '見積日:  '}${dateStr}`, 145, 35);
    doc.text(`${isEn ? 'Est No: ' : '見積番号:  '}EST-${today.getFullYear()}${String(today.getMonth()+1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${orderRef.id.substring(0,4).toUpperCase()}`, 145, 42);

    doc.setFontSize(14);
    doc.text(`${schoolName}${isEn ? '' : ' 御中'}`, 15, 50);
    if (contactName) {
      doc.setFontSize(12);
      doc.text(`${isEn ? 'Attn: ' : 'ご担当: '}${contactName}${isEn ? '' : ' 様'}`, 15, 58);
    }
    
    doc.setFontSize(12);
    doc.text("EasyJ Studio", 120, 50);
    doc.setFontSize(9);
    doc.text(isEn ? "Rep: Fukaya" : "代表: 深谷", 120, 57);
    doc.text(`Email: info@easyjstudio.com`, 120, 70);

    doc.setFontSize(10);
    doc.text(isEn ? 'We respectfully submit the following estimate.' : '下記の通り、お見積り申し上げます。', 15, 80);

    // 見積合計金額
    doc.setFillColor(65, 105, 225);
    doc.rect(15, 90, 85, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(isEn ? 'Total Estimated Amount' : 'お見積合計金額', 57.5, 95, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    doc.rect(15, 98, 85, 12);
    doc.setFontSize(16);
    doc.text(`¥ ${totalAmount.toLocaleString()}`, 57.5, 106, { align: 'center' });

    // 納期・条件
    doc.setFontSize(9);
    autoTable(doc, {
      startY: 120,
      margin: { left: 15 },
      tableWidth: 90,
      theme: 'grid',
      styles: { font: 'NotoSansJP', fontSize: 9 },
      columnStyles: { 0: { fillColor: [65, 105, 225], textColor: 255, cellWidth: 25 } }, 
      body: isEn ? [
        ['Payment Terms', 'Credit Card (One-time)'],
        ['Delivery', 'Auto-issued via portal after payment'],
        ['Expiration', '30 days from issuance'],
      ] : [
        ['支払条件', 'クレジットカード決済（一括）'],
        ['納品方法', '決済完了後、専用ポータルより自動即時発行'],
        ['有効期限', '本見積発行日より30日間'],
      ],
    });

    // 明細表
    const itemName = isEn 
      ? 'JLPT N5(CEFR A1-A2) Prep App Volume License' 
      : 'N5レベル(CEFR A1-A2相当)リスニング対策アプリ 一括導入ライセンス';
    const unitName = isEn ? 'users' : '名様分';

    autoTable(doc, {
      startY: 145,
      theme: 'grid',
      styles: { font: 'NotoSansJP', fontSize: 9 },
      headStyles: { fillColor: [65, 105, 225], textColor: 255, halign: 'center', fontStyle: 'normal' },
      columnStyles: { 
        0: { cellWidth: 90 }, 1: { halign: 'right' }, 2: { halign: 'center' },
        3: { halign: 'right' }, 4: { halign: 'right' }
      },
      head: isEn ? [['Item', 'Qty', 'Unit', 'Unit Price', 'Amount']] : [['内容', '数量', '単位', '単価', '金額']],
      body: [
        [itemName, parsedLicenses.toString(), unitName, `¥ ${unitPrice.toLocaleString()}`, `¥ ${totalAmount.toLocaleString()}`],
        ['', '', '', '', ''],
        ['', '', '', '', '']
      ],
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // 小計・合計
    autoTable(doc, {
      startY: finalY + 5,
      margin: { left: 135 },
      tableWidth: 60,
      theme: 'grid',
      styles: { font: 'NotoSansJP', fontSize: 9, halign: 'right' },
      columnStyles: { 0: { fillColor: [65, 105, 225], textColor: 255, halign: 'center', cellWidth: 25 } },
      body: [
        [isEn ? 'Total' : '合計', `¥ ${totalAmount.toLocaleString()}`],
      ],
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // 🚨 メール本文の多言語化
    const emailBodyJa = `${schoolName}
${contactName} 様

この度は「N5レベル(CEFR A1-A2相当)リスニング対策アプリ」の一括導入ライセンスをお申し込みいただき、誠にありがとうございます。
ご依頼いただきました内容にてお見積書を作成いたしましたので、PDFにて添付ご案内申し上げます。

内容にお間違いがなければ、以下の専用決済URLよりクレジットカードにてお支払いをお願いいたします。

◆ お支払い専用ページ（Stripe決済）
${session.url}

※決済が完了いたしますと、即座に本メールアドレス宛にシリアルキー納品ポータルのURLが自動送信されます。
※ご不明な点がございましたら、本メールへのご返信にてお気軽にお問い合わせください。

--------------------------------------------------
EasyJ Studio
代表: 深谷
Email: info@easyjstudio.com
--------------------------------------------------`;

    const emailBodyEn = `${schoolName}
Attn: ${contactName}

Thank you for requesting the volume license for our JLPT N5(CEFR A1-A2) Prep App.
Please find attached the estimate/invoice PDF based on your request.

If the details are correct, please proceed with the credit card payment using the secure link below:

◆ Payment URL (Stripe)
${session.url}

* Upon successful payment, a link to the serial key delivery portal will be automatically sent to this email address.
* If you have any questions, please feel free to reply to this email.

--------------------------------------------------
EasyJ Studio
Rep: Fukaya
Email: info@easyjstudio.com
--------------------------------------------------`;

    await resend.emails.send({
      from: 'info@easyjstudio.com',
      to: email,
      subject: isEn 
        ? `[Estimate/Invoice] JLPT N5(CEFR A1-A2) Prep App Volume Licensing` 
        : `【お見積書/ご請求】N5レベル(CEFR A1-A2相当)リスニング対策アプリ ライセンス一括導入のご案内`,
      text: isEn ? emailBodyEn : emailBodyJa,
      attachments: [
        {
          filename: isEn ? `Estimate_${schoolName}.pdf` : `見積書_${schoolName}様.pdf`,
          content: pdfBuffer,
        },
      ],
    });
    console.log(`✅ ${schoolName}様宛に見積書PDF付き決済メールを送信しました`);

    return NextResponse.json({ 
      success: true, 
      paymentUrl: session.url,
      orderId: orderRef.id
    });

  } catch (error: any) {
    console.error('Stripe/Firebase/Email Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}