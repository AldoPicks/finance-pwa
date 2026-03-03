// ============================================================
// FINANZASPRO — SERVICIOS DE FIREBASE / FIRESTORE
// ============================================================
//
// Estructura de colecciones en Firestore:
//
//  users/{uid}                          ← perfil del usuario
//  users/{uid}/categories/{catId}       ← categorías propias
//  users/{uid}/months/{monthKey}        ← datos financieros mensuales
//  users/{uid}/expenses/{expenseId}     ← gastos individuales
//  users/{uid}/cards/{cardId}           ← tarjetas de crédito
//  users/{uid}/history/{monthKey}       ← snapshots del historial
//  users/{uid}/audit/{logId}            ← logs de auditoría
//
// ============================================================

import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy, limit,
  addDoc, serverTimestamp, Timestamp,
  writeBatch, onSnapshot,
} from 'firebase/firestore';
import { db } from './config';

// ─── HELPERS ─────────────────────────────────────────────────

export const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

export function toMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
}

export function fromMonthKey(key) {
  const [year, month] = key.split('-').map(Number);
  return { year, month, label: `${MONTH_NAMES[month-1]} ${year}` };
}

export function offsetMonth(key, delta) {
  const [year, month] = key.split('-').map(Number);
  return toMonthKey(new Date(year, month-1+delta, 1));
}

export function getCurrentMonthKey() { return toMonthKey(new Date()); }

export function dateToWeek(dateStr) {
  const day = new Date(dateStr + 'T12:00:00').getDate();
  if (day <= 7)  return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

// Convierte Timestamp de Firestore a ISO string
function tsToISO(ts) {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'string') return ts;
  if (ts?.toDate) return ts.toDate().toISOString();
  return new Date().toISOString();
}

// Limpia undefined/null para Firestore
function clean(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  );
}

// ─── CATEGORÍAS DEFAULT ───────────────────────────────────────

export const DEFAULT_CATEGORIES = [
  { id:'gastos_semanales', nombre:'Gastos semanales',     color:'#1e88e5', icono:'🛒', activa:true },
  { id:'gastos_finde',     nombre:'Gastos fin de semana', color:'#43a047', icono:'🎉', activa:true },
  { id:'abono_carro',      nombre:'Abono carro',          color:'#e53935', icono:'🚗', activa:true },
  { id:'aporte_casa',      nombre:'Aporte casa',          color:'#fb8c00', icono:'🏠', activa:true },
  { id:'internet',         nombre:'Internet',             color:'#8e24aa', icono:'📡', activa:true },
];

export const DEFAULT_BUDGETS = {
  gastos_semanales: { s1:500,  s2:500, s3:500, s4:500 },
  gastos_finde:     { s1:300,  s2:300, s3:300, s4:300 },
  abono_carro:      { s1:1200, s2:0,   s3:0,   s4:0   },
  aporte_casa:      { s1:1500, s2:0,   s3:0,   s4:0   },
  internet:         { s1:350,  s2:0,   s3:0,   s4:0   },
};

export const COLOR_OPTIONS = [
  '#1e88e5','#43a047','#e53935','#fb8c00','#8e24aa',
  '#00897b','#f4511e','#039be5','#7cb342','#e91e63',
  '#3949ab','#00acc1','#ffb300','#6d4c41','#546e7a',
];

export const ICON_OPTIONS = [
  '🛒','🍔','🚗','🏠','📡','🎉','💊','✈️','🎓','👕',
  '⚡','💧','🍽️','🎬','🏃','💼','🐾','🌿','🛠️','💈',
];

export const CARD_COLORS   = ['#1a237e','#0d47a1','#006064','#1b5e20','#4a148c','#b71c1c','#e65100','#212121','#37474f','#880e4f'];
export const CARD_NETWORKS = ['visa','mastercard','amex','carnet'];

// ─── USER SERVICE ─────────────────────────────────────────────

export const UserService = {
  /** Obtener perfil del usuario */
  async getProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  },

  /** Crear o actualizar perfil (se llama tras Firebase Auth register) */
  async createProfile(uid, { email, name }) {
    const now = new Date().toISOString();
    const profile = {
      uid, email, name,
      avatar:        name.charAt(0).toUpperCase(),
      currency:      'MXN',
      defaultIncome: 10000,
      createdAt:     now,
      updatedAt:     now,
      prefs: {
        theme:          'dark',
        showUSD:        true,
        alertCarro:     true,
        alertThreshold: 50,
      },
    };
    await setDoc(doc(db, 'users', uid), profile);

    // Inicializar categorías por defecto
    const batch = writeBatch(db);
    for (const cat of DEFAULT_CATEGORIES) {
      const catRef = doc(db, 'users', uid, 'categories', cat.id);
      batch.set(catRef, { ...cat, createdAt: now });
    }
    await batch.commit();

    return profile;
  },

  /** Actualizar perfil */
  async updateProfile(uid, updates) {
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, { ...clean(updates), updatedAt: new Date().toISOString() });
    const snap = await getDoc(ref);
    return snap.data();
  },
};

// ─── CATEGORY SERVICE ─────────────────────────────────────────

export const CategoryService = {
  /** Obtener todas las categorías del usuario */
  async getAll(uid) {
    const snap = await getDocs(collection(db, 'users', uid, 'categories'));
    if (snap.empty) {
      // Primera vez: sembrar defaults
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      for (const cat of DEFAULT_CATEGORIES) {
        batch.set(doc(db, 'users', uid, 'categories', cat.id), { ...cat, createdAt: now });
      }
      await batch.commit();
      return DEFAULT_CATEGORIES.map((c) => ({ ...c, createdAt: now }));
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /** Crear categoría */
  async create(uid, { nombre, color, icono }) {
    const now = new Date().toISOString();
    const catId = 'cat_' + Date.now().toString(36);
    const data = { nombre: nombre.trim(), color, icono, activa: true, createdAt: now };
    await setDoc(doc(db, 'users', uid, 'categories', catId), data);
    return { id: catId, ...data };
  },

  /** Actualizar categoría */
  async update(uid, catId, updates) {
    const ref = doc(db, 'users', uid, 'categories', catId);
    await updateDoc(ref, clean(updates));
    const snap = await getDoc(ref);
    return { id: catId, ...snap.data() };
  },

  /** Eliminar o desactivar */
  async delete(uid, catId, hasExpenses) {
    const ref = doc(db, 'users', uid, 'categories', catId);
    if (hasExpenses) {
      await updateDoc(ref, { activa: false });
      return { type: 'soft', message: 'Categoría desactivada (tiene gastos asociados)' };
    }
    await deleteDoc(ref);
    return { type: 'hard', message: 'Categoría eliminada' };
  },

  /** Reactivar */
  async reactivate(uid, catId) {
    await updateDoc(doc(db, 'users', uid, 'categories', catId), { activa: true });
  },
};

// ─── EXPENSE SERVICE ──────────────────────────────────────────

export const ExpenseService = {
  /** Obtener gastos de un mes */
  async getByMonth(uid, monthKey) {
    const q = query(
      collection(db, 'users', uid, 'expenses'),
      where('monthKey', '==', monthKey),
      orderBy('fecha', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /** Registrar gasto */
  async create(uid, monthKey, { categoryId, monto, descripcion, fecha }) {
    const semana = dateToWeek(fecha);
    const data = {
      categoryId,
      monto:       Number(monto) || 0,
      descripcion: descripcion?.trim() || '',
      fecha,
      semana,
      monthKey,
      uid,
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, 'users', uid, 'expenses'), data);
    // Recalcular totales del mes
    await MonthService.syncFromExpenses(uid, monthKey);
    return { id: ref.id, ...data };
  },

  /** Actualizar gasto */
  async update(uid, monthKey, expenseId, updates) {
    if (updates.fecha) updates.semana = dateToWeek(updates.fecha);
    await updateDoc(
      doc(db, 'users', uid, 'expenses', expenseId),
      { ...clean(updates), updatedAt: new Date().toISOString() }
    );
    await MonthService.syncFromExpenses(uid, monthKey);
  },

  /** Eliminar gasto */
  async delete(uid, monthKey, expenseId) {
    await deleteDoc(doc(db, 'users', uid, 'expenses', expenseId));
    await MonthService.syncFromExpenses(uid, monthKey);
  },
};

// ─── MONTH SERVICE ────────────────────────────────────────────

export const MonthService = {
  /** Obtener mes (crea uno si no existe) */
  async getOrCreate(uid, monthKey, categories, defaultIncome = 10000) {
    const ref  = doc(db, 'users', uid, 'months', monthKey);
    const snap = await getDoc(ref);

    if (snap.exists()) return snap.data();

    const now  = new Date().toISOString();
    const rows = categories
      .filter((c) => c.activa)
      .map((c) => {
        const b = DEFAULT_BUDGETS[c.id] || { s1:0, s2:0, s3:0, s4:0 };
        return { id: c.id, categoria: c.nombre, color: c.color, editable: true, ...b };
      });

    const newMonth = {
      monthKey, uid,
      income:    defaultIncome,
      rows,
      notes:     '',
      closed:    false,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(ref, newMonth);
    return newMonth;
  },

  /** Guardar mes */
  async save(uid, monthKey, data) {
    const ref = doc(db, 'users', uid, 'months', monthKey);
    const updated = { ...data, updatedAt: new Date().toISOString() };
    await setDoc(ref, updated, { merge: true });
    return updated;
  },

  /** Actualizar ingreso */
  async updateIncome(uid, monthKey, income) {
    const ref = doc(db, 'users', uid, 'months', monthKey);
    await updateDoc(ref, { income: Number(income) || 0, updatedAt: new Date().toISOString() });
    const snap = await getDoc(ref);
    return snap.data();
  },

  /** Recalcular rows sumando todos los gastos del mes */
  async syncFromExpenses(uid, monthKey) {
    // Obtener gastos
    const q = query(
      collection(db, 'users', uid, 'expenses'),
      where('monthKey', '==', monthKey)
    );
    const expSnap = await getDocs(q);
    const expenses = expSnap.docs.map((d) => d.data());

    // Obtener mes
    const monthRef  = doc(db, 'users', uid, 'months', monthKey);
    const monthSnap = await getDoc(monthRef);
    if (!monthSnap.exists()) return;
    const month = monthSnap.data();

    // Agrupar por categoría
    const totals = {};
    expenses.forEach((e) => {
      if (!totals[e.categoryId]) totals[e.categoryId] = { s1:0, s2:0, s3:0, s4:0 };
      totals[e.categoryId][`s${e.semana}`] += e.monto;
    });

    // Actualizar rows
    const updatedRows = month.rows.map((r) => {
      const t = totals[r.id];
      return t ? { ...r, s1:t.s1, s2:t.s2, s3:t.s3, s4:t.s4 } : { ...r, s1:0, s2:0, s3:0, s4:0 };
    });

    // Agregar rows para categorías con gastos que no están en la tabla
    const existingIds = new Set(updatedRows.map((r) => r.id));
    const catsSnap = await getDocs(collection(db, 'users', uid, 'categories'));
    const catsMap  = {};
    catsSnap.docs.forEach((d) => { catsMap[d.id] = { id: d.id, ...d.data() }; });

    Object.keys(totals).forEach((catId) => {
      if (!existingIds.has(catId) && catsMap[catId]) {
        const cat = catsMap[catId];
        const t   = totals[catId];
        updatedRows.push({ id:catId, categoria:cat.nombre, color:cat.color, editable:true, s1:t.s1, s2:t.s2, s3:t.s3, s4:t.s4 });
      }
    });

    await updateDoc(monthRef, { rows: updatedRows, updatedAt: new Date().toISOString() });
    return { ...month, rows: updatedRows };
  },

  /** Guardar snapshot en historial */
  async snapshot(uid, monthKey) {
    const monthSnap = await getDoc(doc(db, 'users', uid, 'months', monthKey));
    if (!monthSnap.exists()) return null;
    const month = monthSnap.data();

    const totalExpenses = month.rows.reduce((a,r) => a+r.s1+r.s2+r.s3+r.s4, 0);
    const savings       = month.income - totalExpenses;
    const savingsRate   = month.income > 0 ? parseFloat(((savings/month.income)*100).toFixed(1)) : 0;
    const byCategory    = {};
    month.rows.forEach((r) => { byCategory[r.id] = r.s1+r.s2+r.s3+r.s4; });
    const { label }     = fromMonthKey(monthKey);

    const entry = { monthKey, monthLabel: label, income: month.income, totalExpenses, savings, savingsRate, byCategory, snapshotAt: new Date().toISOString() };
    await setDoc(doc(db, 'users', uid, 'history', monthKey), entry);
    return entry;
  },

  /** Listar historial */
  async getHistory(uid) {
    const snap = await getDocs(
      query(collection(db, 'users', uid, 'history'), orderBy('monthKey', 'desc'))
    );
    return snap.docs.map((d) => d.data());
  },
};

// ─── CARD SERVICE ─────────────────────────────────────────────

export const CardService = {
  async getAll(uid) {
    // The query below uses a `where` + `orderBy` combo, which in Firestore
    // requires a composite index. When the index is missing the call will
    // reject with a failed-precondition error and the page ends up with an
    // empty array (cards.length stays at 0 even though the documents exist).
    //
    // We try the indexed query first; if it fails we fall back to a simple
    // grab‑everything query and filter/sort client‑side so the UI still works.
    try {
      const q = query(
        collection(db, 'users', uid, 'cards'),
        where('activa', '==', true),
        orderBy('createdAt', 'asc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('CardService.getAll index query failed, falling back:', e);
      const snap = await getDocs(collection(db, 'users', uid, 'cards'));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => c.activa)
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    }
  },

  async create(uid, data) {
    const now = new Date().toISOString();
    const card = {
      uid,
      nombre:      data.nombre?.trim() || 'Mi tarjeta',
      banco:       data.banco?.trim() || '',
      ultimos4:    data.ultimos4 || '',
      color:       data.color || CARD_COLORS[0],
      red:         data.red || 'visa',
      limiteTotal: Number(data.limiteTotal) || 0,
      saldoActual: Number(data.saldoActual) || 0,
      minimoMes:   Number(data.minimoMes) || 0,
      diaPago:     Number(data.diaPago) || 1,
      diaCorte:    Number(data.diaCorte) || 25,
      tasa:        data.tasa || '0',
      notas:       data.notas || '',
      activa:      true,
      pagos:       [],
      createdAt:   now,
      updatedAt:   now,
    };
    const ref = await addDoc(collection(db, 'users', uid, 'cards'), card);
    return { id: ref.id, ...card };
  },

  async update(uid, cardId, updates) {
    await updateDoc(
      doc(db, 'users', uid, 'cards', cardId),
      { ...clean(updates), updatedAt: new Date().toISOString() }
    );
  },

  async delete(uid, cardId) {
    await updateDoc(doc(db, 'users', uid, 'cards', cardId), { activa: false, updatedAt: new Date().toISOString() });
  },

  async addPayment(uid, cardId, { monto, tipo, nota }) {
    const ref  = doc(db, 'users', uid, 'cards', cardId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Tarjeta no encontrada');
    const card    = snap.data();
    const payment = {
      id:    'pay_' + Date.now().toString(36),
      monto: Number(monto) || 0,
      fecha: new Date().toISOString().split('T')[0],
      tipo:  tipo || 'parcial',
      nota:  nota?.trim() || '',
    };
    const pagos      = [payment, ...(card.pagos || [])];
    const saldoActual = Math.max(0, card.saldoActual - payment.monto);
    await updateDoc(ref, { pagos, saldoActual, updatedAt: new Date().toISOString() });
    return { ...card, id: cardId, pagos, saldoActual };
  },

  daysUntilPayment(card) {
    const today = new Date(); today.setHours(0,0,0,0);
    let payDate = new Date(today.getFullYear(), today.getMonth(), card.diaPago);
    if (payDate < today) payDate.setMonth(payDate.getMonth()+1);
    return Math.ceil((payDate - today)/(1000*60*60*24));
  },
};

// ─── AUDIT SERVICE ────────────────────────────────────────────

export const AuditService = {
  /** Guardar log en Firestore */
  async log(uid, action, opts = {}) {
    const actionMeta = AUDIT_ACTIONS[action] || { label: action, icon: '📝', module: 'Unknown', severity: 'info' };
    const entry = {
      timestamp:  new Date().toISOString(),
      action,
      label:      actionMeta.label,
      icon:       actionMeta.icon,
      module:     actionMeta.module,
      severity:   actionMeta.severity,
      uid:        uid || 'anonymous',
      email:      opts.email    || '',
      userName:   opts.userName || '',
      detail:     opts.detail   || '',
      monthKey:   opts.monthKey || null,
      before:     opts.before !== undefined ? JSON.stringify(opts.before) : null,
      after:      opts.after  !== undefined ? JSON.stringify(opts.after)  : null,
      device:     /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
      browser:    getBrowser(),
      url:        window.location.pathname,
    };

    // Guardar en Firestore (no-await para no bloquear UI)
    addDoc(collection(db, 'users', uid, 'audit'), clean(entry)).catch(console.error);

    // También guardar localmente como backup
    try {
      const localLogs = JSON.parse(localStorage.getItem('fp_audit_local') || '[]');
      localLogs.unshift(entry);
      localStorage.setItem('fp_audit_local', JSON.stringify(localLogs.slice(0, 200)));
    } catch {}

    return entry;
  },

  /** Obtener logs de Firestore */
  async getAll(uid, limitN = 500) {
    const q = query(
      collection(db, 'users', uid, 'audit'),
      orderBy('timestamp', 'desc'),
      limit(limitN)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /** Exportar como CSV */
  exportCSV(logs) {
    const headers = ['Fecha','Hora','Módulo','Acción','Usuario','Email','Detalle','Severidad','Dispositivo','Navegador','URL'];
    const rows = logs.map((l) => {
      const [date, time] = (l.timestamp || '').split('T');
      return [date, time?.split('.')[0], l.module, l.label, l.userName, l.email, l.detail, l.severity, l.device, l.browser, l.url]
        .map((v) => `"${String(v||'').replace(/"/g,'""')}"`);
    });
    const csv  = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `finanzaspro-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  },

  exportJSON(logs) {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `finanzaspro-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  },
};

function getBrowser() {
  const ua = navigator.userAgent;
  if (/Chrome/.test(ua) && !/Edge/.test(ua)) return 'Chrome';
  if (/Firefox/.test(ua)) return 'Firefox';
  if (/Safari/.test(ua)) return 'Safari';
  if (/Edge/.test(ua)) return 'Edge';
  return 'Unknown';
}

// Acciones de auditoría (sin cambios)
export const AUDIT_ACTIONS = {
  AUTH_LOGIN:           { label:'Inicio de sesión',         icon:'🔐', module:'Auth',       severity:'info'    },
  AUTH_LOGOUT:          { label:'Cierre de sesión',         icon:'👋', module:'Auth',       severity:'info'    },
  AUTH_REGISTER:        { label:'Registro de cuenta',       icon:'✅', module:'Auth',       severity:'success' },
  AUTH_CHANGE_PASSWORD: { label:'Contraseña cambiada',      icon:'🔑', module:'Auth',       severity:'warning' },
  AUTH_LOGIN_FAILED:    { label:'Login fallido',            icon:'❌', module:'Auth',       severity:'error'   },
  FINANCE_INCOME_EDIT:  { label:'Ingreso mensual editado',  icon:'💰', module:'Finanzas',   severity:'info'    },
  FINANCE_CELL_EDIT:    { label:'Celda de tabla editada',   icon:'✏️', module:'Finanzas',   severity:'info'    },
  FINANCE_SNAPSHOT:     { label:'Snapshot guardado',        icon:'📸', module:'Finanzas',   severity:'success' },
  EXPENSE_CREATE:       { label:'Gasto registrado',         icon:'➕', module:'Gastos',     severity:'success' },
  EXPENSE_EDIT:         { label:'Gasto editado',            icon:'✏️', module:'Gastos',     severity:'info'    },
  EXPENSE_DELETE:       { label:'Gasto eliminado',          icon:'🗑️', module:'Gastos',     severity:'warning' },
  CATEGORY_CREATE:      { label:'Categoría creada',         icon:'🏷️', module:'Categorías', severity:'success' },
  CATEGORY_EDIT:        { label:'Categoría editada',        icon:'✏️', module:'Categorías', severity:'info'    },
  CATEGORY_DELETE:      { label:'Categoría eliminada',      icon:'🗑️', module:'Categorías', severity:'warning' },
  CATEGORY_REACTIVATE:  { label:'Categoría reactivada',     icon:'♻️', module:'Categorías', severity:'info'    },
  CARD_CREATE:          { label:'Tarjeta agregada',         icon:'💳', module:'Tarjetas',   severity:'success' },
  CARD_EDIT:            { label:'Tarjeta editada',          icon:'✏️', module:'Tarjetas',   severity:'info'    },
  CARD_DELETE:          { label:'Tarjeta eliminada',        icon:'🗑️', module:'Tarjetas',   severity:'warning' },
  CARD_PAYMENT:         { label:'Pago registrado',          icon:'💸', module:'Tarjetas',   severity:'success' },
  PROFILE_UPDATE:       { label:'Perfil actualizado',       icon:'👤', module:'Perfil',     severity:'info'    },
  PROFILE_THEME:        { label:'Tema cambiado',            icon:'🎨', module:'Perfil',     severity:'info'    },
  SYSTEM_ERROR:         { label:'Error del sistema',        icon:'💥', module:'Sistema',    severity:'error'   },
};
