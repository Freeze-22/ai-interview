// backend/src/config/firebase.js
import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';

let initialized = false;

export function initializeFirebase() {
  if (initialized) return;

  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  try {
    // Check if path exists AND the file is not empty
    if (serviceAccountPath && existsSync(serviceAccountPath)) {
      const content = readFileSync(serviceAccountPath, 'utf8').trim();

      if (content) {
        const serviceAccount = JSON.parse(content);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.GCS_BUCKET_NAME,
        });
        console.log('✅ Firebase Admin initialized via Service Account Key');
      } else {
        throw new Error("Service account file is empty");
      }
    } else {
      // Fallback to Application Default Credentials (ADC)
      admin.initializeApp({
        projectId: process.env.GOOGLE_CLOUD_PROJECT, // Removed old hardcoded ID
        storageBucket: process.env.GCS_BUCKET_NAME,
      });
      console.log('✅ Firebase Admin initialized via Application Default Credentials');
    }
  } catch (error) {
    console.error('⚠️ Firebase Init Warning:', error.message);
    console.log('🔄 Attempting fallback initialization...');

    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: process.env.GOOGLE_CLOUD_PROJECT, // Removed old hardcoded ID
        storageBucket: process.env.GCS_BUCKET_NAME,
      });
    }
  }

  initialized = true;
}

export function getFirestore() { return admin.firestore(); }
export function getStorage() { return admin.storage(); }
export function getAuth() { return admin.auth(); }
export default admin;