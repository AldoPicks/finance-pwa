// ============================================================
// FINANZASPRO — CONFIGURACIÓN DE FIREBASE
// ============================================================
//
// Los valores se leen desde variables de entorno (.env.local).
// NUNCA escribas los valores directamente aquí si el repo es público.
//
// Crea un archivo .env.local en la raíz del proyecto con:
//
//   REACT_APP_FIREBASE_API_KEY=AIza...
//   REACT_APP_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
//   REACT_APP_FIREBASE_PROJECT_ID=tu-proyecto
//   REACT_APP_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
//   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
//   REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
//
// .env.local está en .gitignore — nunca se sube a GitHub.
// ============================================================

import { initializeApp } from 'firebase/app';
import { getAuth }       from 'firebase/auth';
import {
  getFirestore,
  enableIndexedDbPersistence,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};

// Validación mejorada: verificar que la config sea válida
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    '❌ Firebase configuration is missing required variables.\n' +
    'Create a .env.local file in the project root with:\n' +
    'REACT_APP_FIREBASE_API_KEY=...\n' +
    'REACT_APP_FIREBASE_AUTH_DOMAIN=...\n' +
    'REACT_APP_FIREBASE_PROJECT_ID=...\n' +
    'REACT_APP_FIREBASE_STORAGE_BUCKET=...\n' +
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...\n' +
    'REACT_APP_FIREBASE_APP_ID=...'
  );
}

let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}
export const auth = getAuth(app);
export const db   = getFirestore(app);

// Enable offline persistence for Firestore (data cached locally)
// Wrapped in async initialization to prevent blocking
(async () => {
  try {
    await enableIndexedDbPersistence(db);
    console.log('✅ Firestore offline persistence enabled');
  } catch (err) {
    // Silently handle common errors — app continues without persistence
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Multiple tabs open — Firestore persistence disabled.');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ Browser does not support Firestore persistence.');
    } else {
      console.warn('⚠️ Firestore offline persistence unavailable:', err.message);
    }
  }
})();

export default app;
