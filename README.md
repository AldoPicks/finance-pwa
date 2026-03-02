# 💰 FinanzasPro

App PWA de finanzas personales construida con React + Material UI + Firebase.

**Funcionalidades:**
- 📊 Dashboard mensual con tabla de gastos por semana
- ➕ Registro de gastos con categorías personalizadas
- 💳 Gestión de tarjetas de crédito con alertas de pago
- 📋 Historial con gráficas de tendencias
- 🔔 Notificaciones push de fechas de pago
- 📝 Sistema de auditoría — registro de todas las acciones
- 🌙 Modo claro/oscuro
- ☁️ Datos en la nube con Firebase (acceso desde cualquier dispositivo)

---

## 📋 Requisitos previos

- [Node.js](https://nodejs.org/) v16 o superior
- Cuenta de Google (para Firebase)
- Cuenta de GitHub (para el despliegue)

---

## 🔥 Paso 1 — Crear proyecto en Firebase

### 1.1 Crear cuenta y proyecto

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Haz clic en **"Agregar proyecto"**
3. Escribe un nombre, por ejemplo: `finanzaspro`
4. Desactiva Google Analytics (no es necesario)
5. Haz clic en **"Crear proyecto"** y espera ~30 segundos

### 1.2 Activar Authentication

1. Menú izquierdo: **Build → Authentication**
2. Haz clic en **"Comenzar"**
3. Pestaña **"Sign-in method"** → **"Correo electrónico/contraseña"**
4. Activa la primera opción y guarda

### 1.3 Crear base de datos Firestore

1. Menú izquierdo: **Build → Firestore Database**
2. Haz clic en **"Crear base de datos"**
3. Selecciona **"Comenzar en modo de producción"**
4. Elige región: `nam5 (us-central)` para México
5. Haz clic en **"Listo"**

### 1.4 Configurar reglas de seguridad de Firestore ⚠️

En **Firestore → pestaña "Reglas"**, reemplaza todo el contenido con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Haz clic en **"Publicar"**. Sin esto, los datos de los usuarios no estarán protegidos.

### 1.5 Crear índices en Firestore

En **Firestore → pestaña "Índices"**, crea:

| Colección | Campo 1 | Campo 2 | Alcance |
|-----------|---------|---------|---------|
| `expenses` | `monthKey` ASC | `fecha` DESC | Colección |
| `cards` | `activa` ASC | `createdAt` ASC | Colección |
| `audit` | `timestamp` DESC | — | Colección |

> 💡 **Alternativa fácil:** Al abrir la app por primera vez, Firebase mostrará errores en la consola del navegador (F12) con enlaces para crear los índices automáticamente. Haz clic en esos enlaces.

### 1.6 Obtener credenciales

1. ⚙️ Configuración del proyecto → **"Tus apps"** → ícono `</>`
2. Nombre: `finanzaspro-web` → Registrar app
3. Copia el objeto `firebaseConfig`

---

## ⚙️ Paso 2 — Configurar localmente

```bash
# 1. Entra a la carpeta del proyecto
cd finance-pwa

# 2. Copia el archivo de ejemplo
cp .env.example .env.local

# 3. Edita .env.local con tus credenciales de Firebase
# (usa cualquier editor de texto)

# 4. Instala dependencias
npm install

# 5. Inicia el servidor de desarrollo
npm start
```

Tu `.env.local` debe verse así:

```env
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=tu-proyecto
REACT_APP_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## 🚀 Paso 3 — Desplegar en GitHub Pages

### 3.1 Crear repositorio en GitHub

1. Ve a [github.com/new](https://github.com/new)
2. Nombre: `finanzaspro`
3. **Visibilidad: Privado** (recomendado)
4. Crear repositorio

### 3.2 Subir el código

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/finanzaspro.git
git push -u origin main
```

### 3.3 Crear el workflow de deploy automático

Crea el archivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        env:
          REACT_APP_FIREBASE_API_KEY: ${{ secrets.REACT_APP_FIREBASE_API_KEY }}
          REACT_APP_FIREBASE_AUTH_DOMAIN: ${{ secrets.REACT_APP_FIREBASE_AUTH_DOMAIN }}
          REACT_APP_FIREBASE_PROJECT_ID: ${{ secrets.REACT_APP_FIREBASE_PROJECT_ID }}
          REACT_APP_FIREBASE_STORAGE_BUCKET: ${{ secrets.REACT_APP_FIREBASE_STORAGE_BUCKET }}
          REACT_APP_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.REACT_APP_FIREBASE_MESSAGING_SENDER_ID }}
          REACT_APP_FIREBASE_APP_ID: ${{ secrets.REACT_APP_FIREBASE_APP_ID }}
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build
```

### 3.4 Agregar los Secrets en GitHub

En tu repositorio: **Settings → Secrets and variables → Actions → New repository secret**

Crea estos 6 secrets con los valores de tu `firebaseConfig`:

| Nombre del secret | Valor |
|-------------------|-------|
| `REACT_APP_FIREBASE_API_KEY` | tu apiKey |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | tu authDomain |
| `REACT_APP_FIREBASE_PROJECT_ID` | tu projectId |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | tu storageBucket |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | tu messagingSenderId |
| `REACT_APP_FIREBASE_APP_ID` | tu appId |

### 3.5 Activar GitHub Pages

**Settings → Pages → Source:** Deploy from a branch → rama `gh-pages` → Save

### 3.6 Hacer push y esperar el deploy

```bash
git add .github/
git commit -m "Add deploy workflow"
git push
```

En ~3 minutos la app estará en: `https://TU_USUARIO.github.io/finanzaspro/`

Puedes ver el progreso en la pestaña **"Actions"** del repositorio.

### 3.7 Autorizar el dominio en Firebase

1. Firebase Console → **Authentication → Settings → Authorized domains**
2. **"Add domain"** → `TU_USUARIO.github.io`
3. Guardar

---

## 🔄 Actualizar la app

Cada vez que hagas cambios y hagas push a `main`, GitHub Actions desplegará automáticamente:

```bash
git add .
git commit -m "Descripción del cambio"
git push
```

---

## ❓ Preguntas frecuentes

**¿Es seguro el apiKey de Firebase en el código compilado?**

Sí. El `apiKey` de Firebase es una credencial **pública del cliente** (similar a un ID de proyecto) — no es una contraseña del servidor. Firebase no necesita ocultarlo porque la seguridad real viene de las **reglas de Firestore** (paso 1.4): aunque alguien vea tu apiKey, solo puede acceder a los datos que las reglas permiten (ninguno, si no está autenticado como el usuario correcto).

**¿Cuánto cuesta Firebase?**

El plan gratuito Spark incluye 50,000 lecturas/día y 20,000 escrituras/día. Para uso personal nunca lo superarás.

**¿Funciona sin internet?**

Sí. Firebase tiene persistencia offline activada. Los datos se sincronizan cuando vuelve la conexión.

**¿Puedo usar la app desde el celular?**

Sí. Al estar en Firebase, los datos son accesibles desde cualquier dispositivo. También puedes instalarla como PWA desde el navegador móvil.

---

## 📁 Estructura del proyecto

```
finance-pwa/
├── .env.example              ← Plantilla de variables de entorno
├── .env.local                ← Tus credenciales (NO se sube a git)
├── .gitignore
├── .github/workflows/
│   └── deploy.yml            ← Deploy automático a GitHub Pages
├── public/
└── src/
    ├── firebase/
    │   ├── config.js         ← Configuración de Firebase
    │   └── services.js       ← Servicios de Firestore
    ├── context/
    │   ├── AuthContext.js    ← Firebase Authentication
    │   ├── FinanceContext.js
    │   ├── AuditContext.js
    │   └── ThemeContext.js
    ├── pages/
    │   ├── Dashboard.js
    │   ├── Login.js
    │   ├── ExpensesPage.js
    │   ├── CardsPage.js
    │   ├── CategoriesPage.js
    │   ├── HistoryPage.js
    │   ├── LogsPage.js
    │   └── UserProfile.js
    └── components/
```

## 🗄️ Estructura de Firestore

```
users/{uid}/
  ├── [documento raíz]         → perfil: nombre, email, prefs...
  ├── categories/{catId}       → nombre, color, icono, activa
  ├── months/{YYYY-MM}         → income, rows[], notes
  ├── expenses/{expId}         → monto, descripcion, fecha, categoryId
  ├── cards/{cardId}           → limiteTotal, saldoActual, diaPago, pagos[]
  ├── history/{YYYY-MM}        → snapshots: totalExpenses, savings
  └── audit/{logId}            → action, detail, before, after, timestamp
```
