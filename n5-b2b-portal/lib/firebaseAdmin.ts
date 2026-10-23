import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

if (!getApps().length) {
  try {
    const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("Firebase Admin の初期化に成功しました");
  } catch (error) {
    console.error("Firebase Admin 初期化エラー:", error);
  }
}

// route.ts でも使えるように FieldValue を一緒にエクスポートします
export const db = getFirestore();
export { FieldValue };