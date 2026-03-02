# FinanzasPro — PWA de Gestión de Finanzas

Una aplicación web progresiva (PWA) para gestionar finanzas personales, construida con React, Material-UI y Chart.js. Funciona offline, es instalable en móvil/desktop, y soporta integración con Firebase y APIs externas.

---

## 📋 Características

- 🔐 **Autenticación** — Login con mock local (localStorage) o Firebase Auth
- 📊 **Dashboard** — Resumen mensual con tarjetas, tabla editable y gráficos
- ✏️ **Tabla editable** — Gastos por semana con cálculo automático de totales y ahorros
- 🥧 **Gráfico de pie** — Distribución de gastos por categoría (Chart.js)
- 📊 **Gráfico de barras** — Gastos semanales apilados
- ⚠️ **Alertas** — Snackbar si el abono al carro supera el 50% del ingreso
- 💱 **Tipo de cambio** — Integración con Exchange Rates API (MXN → USD)
- 📱 **PWA** — Instalable, con Service Worker y caché offline
- 🔥 **Firebase** — Integración opcional para Auth y Firestore documentada

---

## 🚀 Setup rápido (mock local, sin Firebase)

### 1. Instalar Node.js y npm

Descarga Node.js v18+ desde https://nodejs.org  
Verifica la instalación:

```bash
node --version   # v18+
npm --version    # v9+
```

### 2. Crear el proyecto

```bash
npx create-react-app finance-pwa
cd finance-pwa
```

### 3. Instalar dependencias

```bash
npm install \
  @mui/material \
  @mui/icons-material \
  @emotion/react \
  @emotion/styled \
  chart.js \
  react-chartjs-2 \
  react-router-dom \
  firebase
```

### 4. Copiar los archivos del proyecto

Reemplaza los archivos de `src/` y `public/` con los del repositorio:

```
src/
  index.js
  App.js
  context/
    AuthContext.js
    FinanceContext.js
  hooks/
    useExchangeRate.js
  pages/
    Login.js
    Dashboard.js
  components/
    SummaryCard.js
    FinanceTable.js
    PieChart.js
    BarChart.js
public/
  index.html
  manifest.json
  service-worker.js
```

### 5. Variables de entorno (opcionales)

Crea un archivo `.env` en la raíz del proyecto:

```env
# Exchange Rates API (gratuito en https://www.exchangerate-api.com)
REACT_APP_EXCHANGE_API_KEY=tu_api_key_aqui

# Firebase (ver sección Firebase más abajo)
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
```

> Sin variables de entorno, la app usa datos mock y tasa de cambio hardcodeada.

### 6. Correr localmente

```bash
npm start
```

Abre http://localhost:3000

**Credenciales de demo:**
- `demo@finanzaspro.com` / `demo123`
- `admin@finanzaspro.com` / `admin123`

---

## 🔥 Configuración Firebase (Opcional)

### Auth + Firestore gratuitos

1. Ve a https://console.firebase.google.com y crea un proyecto
2. Activa **Authentication** → Sign-in method → Email/Password
3. Activa **Firestore Database** → Modo de prueba (gratuito 90 días, luego configura reglas)
4. Ve a **Project settings** → Config de la app web → Copia las credenciales

Crea `src/firebase.js`:

```js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

Ver comentarios en `src/context/AuthContext.js` y `src/context/FinanceContext.js` para instrucciones de migración.

---

## 💱 Exchange Rates API

1. Crea cuenta gratuita en https://www.exchangerate-api.com (1,500 req/mes)
2. Copia tu API key al `.env`: `REACT_APP_EXCHANGE_API_KEY=...`
3. El hook `useExchangeRate` se encarga del resto automáticamente

---

## 🪙 CoinGecko (Crypto — sin API key)

```js
// Ejemplo de uso en cualquier componente:
const res = await fetch(
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=mxn,usd'
);
const data = await res.json();
// data.bitcoin = { mxn: 900000, usd: 45000 }
```

---

## 🏗️ Build y Deploy

### Build de producción

```bash
npm run build
```

Genera la carpeta `build/` optimizada para producción.

### Deploy en Netlify (gratuito)

1. Instala Netlify CLI: `npm install -g netlify-cli`
2. Autentícate: `netlify login`
3. Deploy:
   ```bash
   netlify deploy --prod --dir=build
   ```

O arrastra la carpeta `build/` a https://app.netlify.com/drop

### Deploy en Vercel (gratuito)

```bash
npm install -g vercel
vercel --prod
```

### Deploy en GitHub Pages

```bash
npm install --save-dev gh-pages
```

Agrega en `package.json`:
```json
{
  "homepage": "https://tuusuario.github.io/finance-pwa",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}
```

```bash
npm run deploy
```

---

## 📱 PWA — Instalación

Una vez desplegada, el navegador mostrará un botón "Instalar app" en la barra de direcciones.

**En móvil (Android/iOS):**
- Chrome/Edge: Menú → "Agregar a pantalla de inicio"
- Safari iOS: Compartir → "Agregar a pantalla de inicio"

El Service Worker guardará los assets en caché para uso offline.

---

## 🏗️ Estructura del proyecto

```
src/
├── App.js                    # Rutas y tema MUI
├── index.js                  # Entry point + registro SW
├── context/
│   ├── AuthContext.js        # Autenticación (mock/Firebase)
│   └── FinanceContext.js     # Estado de finanzas + persistencia
├── hooks/
│   └── useExchangeRate.js    # Tipo de cambio MXN/USD
├── pages/
│   ├── Login.js              # Pantalla de login
│   └── Dashboard.js          # Dashboard principal
└── components/
    ├── SummaryCard.js        # Tarjeta de resumen
    ├── FinanceTable.js       # Tabla editable de gastos
    ├── PieChart.js           # Gráfico de pie por categoría
    └── BarChart.js           # Gráfico de barras por semana
public/
├── index.html                # HTML base + Google Fonts
├── manifest.json             # Manifest PWA
└── service-worker.js         # SW para caché offline
```

---

## 🛠️ Dependencias principales

| Paquete | Versión | Uso |
|---|---|---|
| `react` | 18.x | UI framework |
| `react-router-dom` | 6.x | Navegación SPA |
| `@mui/material` | 5.x | Componentes UI |
| `@mui/icons-material` | 5.x | Iconos |
| `chart.js` | 4.x | Motor de gráficos |
| `react-chartjs-2` | 5.x | Wrapper React para Chart.js |
| `firebase` | 10.x | Auth + Firestore (opcional) |

---

## 📝 Licencia

MIT — libre para uso personal y comercial.
