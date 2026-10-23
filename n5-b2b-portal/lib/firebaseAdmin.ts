import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // 改行コード（\n）が文字列として扱われないように置換処理を入れます
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log("Firebase Admin の初期化に成功しました");
  } catch (error) {
    console.error("Firebase Admin 初期化エラー:", error);
  }
}

export const db = getFirestore();
export { FieldValue };