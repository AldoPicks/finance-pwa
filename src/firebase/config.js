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

// Validar que las variables estén configuradas
const missingVars = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missingVars.length > 0) {
  console.error(
    '❌ Firebase: faltan variables de entorno:\n' +
    missingVars.map((k) => `  REACT_APP_${k.toUpperCase()}`).join('\n') +
    '\n\nCrea un archivo .env.local con tus credenciales de Firebase.'
  );
}

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// Persistencia offline: los datos están disponibles sin internet
// y se sincronizan automáticamente al reconectarse
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Múltiples pestañas abiertas — solo funciona en una a la vez
    console.warn('Firebase offline: múltiples pestañas detectadas');
  } else if (err.code === 'unimplemented') {
    // Navegador no soporta persistencia offline
    console.warn('Firebase offline: navegador no soportado');
  }
});

export default app;
