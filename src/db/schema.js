// ============================================================
// FINANZASPRO — ESQUEMA DE BASE DE DATOS v3
// ============================================================
//
//  finanzaspro_db_v3: {
//    version: 3,
//    users:      { [uid]: UserRecord },
//    sessions:   { currentUid: string },
//    categories: { [uid]: CategoryDef[] },      ← NUEVO: catálogo propio
//    finance:    { [uid]: { [monthKey]: MonthRecord } },
//    expenses:   { [uid]: { [monthKey]: ExpenseEntry[] } }, ← NUEVO: gastos detallados
//    history:    { [uid]: HistoryEntry[] }
//  }
//
// ─────────────────────────────────────────────────────────────

/**
 * CategoryDef — Definición de una categoría (catálogo del usuario)
 * @property {string}  id
 * @property {string}  nombre
 * @property {string}  color       - hex color
 * @property {string}  icono       - emoji
 * @property {boolean} activa
 * @property {string}  createdAt
 */

/**
 * ExpenseEntry — Un gasto individual registrado por el usuario
 * @property {string}  id          - uuid
 * @property {string}  categoryId  - referencia a CategoryDef.id
 * @property {number}  monto
 * @property {string}  descripcion - ej: "Papas fritas en la tienda"
 * @property {string}  fecha       - ISO date "2025-03-15"
 * @property {number}  semana      - 1|2|3|4 (calculado automáticamente)
 * @property {string}  monthKey    - "YYYY-MM"
 * @property {string}  createdAt
 * @property {string}  updatedAt
 */

// ─── CATEGORÍAS PREDETERMINADAS ──────────────────────────────

export const DEFAULT_CATEGORIES = [
  { id: 'gastos_semanales', nombre: 'Gastos semanales',    color: '#1e88e5', icono: '🛒', activa: true },
  { id: 'gastos_finde',     nombre: 'Gastos fin de semana',color: '#43a047', icono: '🎉', activa: true },
  { id: 'abono_carro',      nombre: 'Abono carro',         color: '#e53935', icono: '🚗', activa: true },
  { id: 'aporte_casa',      nombre: 'Aporte casa',         color: '#fb8c00', icono: '🏠', activa: true },
  { id: 'internet',         nombre: 'Internet',            color: '#8e24aa', icono: '📡', activa: true },
];

// Valores de presupuesto semanal por defecto para cada categoría
export const DEFAULT_BUDGETS = {
  gastos_semanales: { s1: 500, s2: 500, s3: 500, s4: 500 },
  gastos_finde:     { s1: 300, s2: 300, s3: 300, s4: 300 },
  abono_carro:      { s1: 1200, s2: 0,  s3: 0,   s4: 0   },
  aporte_casa:      { s1: 1500, s2: 0,  s3: 0,   s4: 0   },
  internet:         { s1: 350,  s2: 0,  s3: 0,   s4: 0   },
};

// ─── HELPERS ─────────────────────────────────────────────────

export const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

export const COLOR_OPTIONS = [
  '#1e88e5','#43a047','#e53935','#fb8c00','#8e24aa',
  '#00897b','#f4511e','#039be5','#7cb342','#e91e63',
  '#3949ab','#00acc1','#ffb300','#6d4c41','#546e7a',
];

export const ICON_OPTIONS = [
  '🛒','🍔','🚗','🏠','📡','🎉','💊','✈️','🎓','👕',
  '⚡','💧','🍽️','🎬','🏃','💼','🐾','🌿','🛠️','💈',
];

export function toMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function fromMonthKey(key) {
  const [year, month] = key.split('-').map(Number);
  return { year, month, label: `${MONTH_NAMES[month - 1]} ${year}` };
}

export function offsetMonth(key, delta) {
  const [year, month] = key.split('-').map(Number);
  return toMonthKey(new Date(year, month - 1 + delta, 1));
}

export function getCurrentMonthKey() { return toMonthKey(new Date()); }

/** Calcula a qué semana del mes pertenece una fecha (1-4) */
export function dateToWeek(dateStr) {
  const day = new Date(dateStr + 'T12:00:00').getDate();
  if (day <= 7)  return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ─── DB ENGINE ───────────────────────────────────────────────

const DB_KEY = 'finanzaspro_db_v3';

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { version: 3, users: {}, sessions: {}, categories: {}, finance: {}, expenses: {}, history: {} };
}

function saveDB(db) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch(e) { console.error('DB save error', e); }
}

const hashPassword  = (p) => btoa(unescape(encodeURIComponent(p + '_fp_salt')));
const verifyPassword = (p, h) => hashPassword(p) === h;

// ─── CATEGORY OPERATIONS ─────────────────────────────────────

export const CategoryDB = {
  /** Obtener catálogo del usuario (con defaults si es nuevo) */
  getAll(uid) {
    const db = loadDB();
    if (!db.categories[uid]) {
      db.categories[uid] = DEFAULT_CATEGORIES.map((c) => ({
        ...c, createdAt: new Date().toISOString(),
      }));
      saveDB(db);
    }
    return db.categories[uid];
  },

  /** Crear categoría */
  create(uid, { nombre, color, icono }) {
    const db = loadDB();
    if (!db.categories[uid]) db.categories[uid] = [];
    const existing = db.categories[uid].find(
      (c) => c.nombre.toLowerCase() === nombre.toLowerCase()
    );
    if (existing) throw new Error('Ya existe una categoría con ese nombre');
    const newCat = {
      id: 'cat_' + uuid().slice(0, 8),
      nombre: nombre.trim(),
      color: color || COLOR_OPTIONS[0],
      icono: icono || '📦',
      activa: true,
      createdAt: new Date().toISOString(),
    };
    db.categories[uid].push(newCat);
    saveDB(db);
    return newCat;
  },

  /** Actualizar categoría */
  update(uid, catId, updates) {
    const db = loadDB();
    const cats = db.categories[uid] || [];
    const idx = cats.findIndex((c) => c.id === catId);
    if (idx < 0) throw new Error('Categoría no encontrada');
    // No permitir nombre duplicado
    const dup = cats.find((c) => c.id !== catId && c.nombre.toLowerCase() === (updates.nombre || '').toLowerCase());
    if (dup) throw new Error('Ya existe una categoría con ese nombre');
    db.categories[uid][idx] = { ...cats[idx], ...updates };
    saveDB(db);
    return db.categories[uid][idx];
  },

  /** Eliminar (soft delete: marcar inactiva si tiene gastos, hard delete si no) */
  delete(uid, catId, monthKey) {
    const db = loadDB();
    const cats = db.categories[uid] || [];
    const idx = cats.findIndex((c) => c.id === catId);
    if (idx < 0) throw new Error('Categoría no encontrada');

    // Verificar si tiene gastos registrados
    const expenses = (db.expenses[uid]?.[monthKey] || []).filter((e) => e.categoryId === catId);
    if (expenses.length > 0) {
      // Soft delete
      db.categories[uid][idx].activa = false;
      saveDB(db);
      return { type: 'soft', message: 'Categoría desactivada (tiene gastos asociados)' };
    }
    // Hard delete
    db.categories[uid].splice(idx, 1);
    // Eliminar también de los meses
    if (db.finance[uid]) {
      Object.keys(db.finance[uid]).forEach((mk) => {
        const month = db.finance[uid][mk];
        if (month.rows) {
          month.rows = month.rows.filter((r) => r.id !== catId);
        }
      });
    }
    saveDB(db);
    return { type: 'hard', message: 'Categoría eliminada' };
  },

  /** Reactivar categoría */
  reactivate(uid, catId) {
    const db = loadDB();
    const cats = db.categories[uid] || [];
    const idx = cats.findIndex((c) => c.id === catId);
    if (idx < 0) throw new Error('Categoría no encontrada');
    db.categories[uid][idx].activa = true;
    saveDB(db);
    return db.categories[uid][idx];
  },
};

// ─── EXPENSE OPERATIONS ──────────────────────────────────────

export const ExpenseDB = {
  /** Obtener todos los gastos de un mes */
  getByMonth(uid, monthKey) {
    const db = loadDB();
    return (db.expenses[uid]?.[monthKey] || [])
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  },

  /** Registrar un nuevo gasto */
  create(uid, monthKey, { categoryId, monto, descripcion, fecha }) {
    const db = loadDB();
    if (!db.expenses[uid]) db.expenses[uid] = {};
    if (!db.expenses[uid][monthKey]) db.expenses[uid][monthKey] = [];

    const semana = dateToWeek(fecha);
    const entry = {
      id: uuid(),
      categoryId,
      monto: Number(monto) || 0,
      descripcion: descripcion?.trim() || '',
      fecha,
      semana,
      monthKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.expenses[uid][monthKey].push(entry);

    // Actualizar el total de la semana en la tabla del mes
    _syncExpensesToMonth(db, uid, monthKey);
    saveDB(db);
    return entry;
  },

  /** Actualizar un gasto */
  update(uid, monthKey, expenseId, updates) {
    const db = loadDB();
    const list = db.expenses[uid]?.[monthKey] || [];
    const idx = list.findIndex((e) => e.id === expenseId);
    if (idx < 0) throw new Error('Gasto no encontrado');

    if (updates.fecha) updates.semana = dateToWeek(updates.fecha);
    db.expenses[uid][monthKey][idx] = {
      ...list[idx], ...updates,
      updatedAt: new Date().toISOString(),
    };
    _syncExpensesToMonth(db, uid, monthKey);
    saveDB(db);
    return db.expenses[uid][monthKey][idx];
  },

  /** Eliminar un gasto */
  delete(uid, monthKey, expenseId) {
    const db = loadDB();
    const list = db.expenses[uid]?.[monthKey] || [];
    db.expenses[uid][monthKey] = list.filter((e) => e.id !== expenseId);
    _syncExpensesToMonth(db, uid, monthKey);
    saveDB(db);
  },
};

/**
 * Recalcula los totales por semana en MonthRecord
 * sumando todos los ExpenseEntry del mes
 */
function _syncExpensesToMonth(db, uid, monthKey) {
  const month = db.finance[uid]?.[monthKey];
  if (!month) return;
  const expenses = db.expenses[uid]?.[monthKey] || [];

  // Agrupar gastos: { categoryId: { s1, s2, s3, s4 } }
  const totals = {};
  expenses.forEach((e) => {
    if (!totals[e.categoryId]) totals[e.categoryId] = { s1: 0, s2: 0, s3: 0, s4: 0 };
    totals[e.categoryId][`s${e.semana}`] += e.monto;
  });

  // Actualizar rows del mes
  month.rows = month.rows.map((r) => {
    const t = totals[r.id];
    if (!t) return { ...r, s1: 0, s2: 0, s3: 0, s4: 0 };
    return { ...r, s1: t.s1, s2: t.s2, s3: t.s3, s4: t.s4 };
  });

  // Asegurar que existen rows para categorías con gastos pero sin row
  Object.keys(totals).forEach((catId) => {
    if (!month.rows.find((r) => r.id === catId)) {
      const cats = db.categories[uid] || [];
      const cat = cats.find((c) => c.id === catId);
      if (cat) {
        const t = totals[catId];
        month.rows.push({ id: catId, categoria: cat.nombre, color: cat.color, editable: true, s1: t.s1, s2: t.s2, s3: t.s3, s4: t.s4 });
      }
    }
  });

  month.updatedAt = new Date().toISOString();
}

// ─── USER OPERATIONS ─────────────────────────────────────────

export const UserDB = {
  create({ email, password, name }) {
    const db = loadDB();
    if (Object.values(db.users).find((u) => u.email === email))
      throw new Error('Ya existe una cuenta con ese correo');
    const uid  = btoa(email + Date.now());
    const now  = new Date().toISOString();
    const user = {
      uid, email, passwordHash: hashPassword(password), name,
      avatar: name.charAt(0).toUpperCase(), currency: 'MXN', defaultIncome: 10000,
      createdAt: now, updatedAt: now,
      prefs: { theme: 'dark', showUSD: true, alertCarro: true, alertThreshold: 50 },
    };
    db.users[uid] = user;
    saveDB(db);
    return user;
  },
  login(email, password) {
    const db   = loadDB();
    const user = Object.values(db.users).find((u) => u.email === email);
    if (!user) throw new Error('No existe una cuenta con ese correo');
    if (!verifyPassword(password, user.passwordHash)) throw new Error('Contraseña incorrecta');
    db.sessions.currentUid = user.uid;
    saveDB(db);
    const { passwordHash, ...safe } = user; return safe;
  },
  update(uid, updates) {
    const db = loadDB();
    if (!db.users[uid]) throw new Error('Usuario no encontrado');
    db.users[uid] = { ...db.users[uid], ...updates, updatedAt: new Date().toISOString() };
    saveDB(db);
    const { passwordHash, ...safe } = db.users[uid]; return safe;
  },
  changePassword(uid, current, newPass) {
    const db   = loadDB();
    const user = db.users[uid];
    if (!user) throw new Error('Usuario no encontrado');
    if (!verifyPassword(current, user.passwordHash)) throw new Error('Contraseña actual incorrecta');
    db.users[uid].passwordHash = hashPassword(newPass);
    db.users[uid].updatedAt    = new Date().toISOString();
    saveDB(db); return true;
  },
  logout()            { const db = loadDB(); delete db.sessions.currentUid; saveDB(db); },
  getCurrentSession() {
    const db  = loadDB();
    const uid = db.sessions.currentUid;
    if (!uid || !db.users[uid]) return null;
    const { passwordHash, ...safe } = db.users[uid]; return safe;
  },
};

// ─── FINANCE OPERATIONS ──────────────────────────────────────

export const FinanceDB = {
  getMonth(uid, monthKey) {
    const db = loadDB();
    if (!db.finance[uid]) db.finance[uid] = {};
    if (!db.finance[uid][monthKey]) {
      // Obtener categorías del usuario para crear las rows
      const cats = CategoryDB.getAll(uid);
      const user = db.users[uid];
      const rows = cats
        .filter((c) => c.activa)
        .map((c) => {
          const b = DEFAULT_BUDGETS[c.id] || { s1: 0, s2: 0, s3: 0, s4: 0 };
          return { id: c.id, categoria: c.nombre, color: c.color, editable: true, ...b };
        });
      db.finance[uid][monthKey] = {
        monthKey, uid,
        income:    user?.defaultIncome || 10000,
        rows,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: '', closed: false,
      };
      saveDB(db);
    }
    return db.finance[uid][monthKey];
  },
  saveMonth(uid, monthKey, data) {
    const db = loadDB();
    if (!db.finance[uid]) db.finance[uid] = {};
    db.finance[uid][monthKey] = { ...data, updatedAt: new Date().toISOString() };
    saveDB(db);
    return db.finance[uid][monthKey];
  },
  updateCell(uid, monthKey, rowId, semana, valor) {
    const db    = loadDB();
    const month = db.finance[uid]?.[monthKey];
    if (!month) return null;
    month.rows  = month.rows.map((r) => r.id === rowId ? { ...r, [semana]: Number(valor) || 0 } : r);
    month.updatedAt = new Date().toISOString();
    saveDB(db); return month;
  },
  updateIncome(uid, monthKey, income) {
    const db    = loadDB();
    const month = db.finance[uid]?.[monthKey];
    if (!month) return null;
    month.income    = Number(income) || 0;
    month.updatedAt = new Date().toISOString();
    saveDB(db); return month;
  },
  snapshotMonth(uid, monthKey) {
    const db    = loadDB();
    const month = db.finance[uid]?.[monthKey];
    if (!month) return null;
    const totalExpenses = month.rows.reduce((a, r) => a + r.s1 + r.s2 + r.s3 + r.s4, 0);
    const savings       = month.income - totalExpenses;
    const savingsRate   = month.income > 0 ? parseFloat(((savings / month.income) * 100).toFixed(1)) : 0;
    const byCategory    = {};
    month.rows.forEach((r) => { byCategory[r.id] = r.s1 + r.s2 + r.s3 + r.s4; });
    const { label }     = fromMonthKey(monthKey);
    const entry = { monthKey, monthLabel: label, income: month.income, totalExpenses, savings, savingsRate, byCategory, snapshotAt: new Date().toISOString() };
    if (!db.history[uid]) db.history[uid] = [];
    const idx = db.history[uid].findIndex((h) => h.monthKey === monthKey);
    if (idx >= 0) db.history[uid][idx] = entry; else db.history[uid].push(entry);
    db.history[uid].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    saveDB(db); return entry;
  },
};

// ─── HISTORY OPERATIONS ──────────────────────────────────────

export const HistoryDB = {
  getAll(uid)  { const db = loadDB(); return (db.history[uid] || []).sort((a, b) => b.monthKey.localeCompare(a.monthKey)); },
  getLast(uid, n = 6) { return HistoryDB.getAll(uid).slice(0, n); },
};

// ─── SEED DEMO ───────────────────────────────────────────────

export function seedDemoData() {
  const db = loadDB();
  if (Object.keys(db.users).length > 0) return;
  try {
    const user = UserDB.create({ email: 'demo@finanzaspro.com', password: 'demo123', name: 'Usuario Demo' });
    CategoryDB.getAll(user.uid); // inicializar categorías
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = toMonthKey(d);
      const month = FinanceDB.getMonth(user.uid, key);
      const j = () => Math.floor(Math.random() * 200) - 100;
      month.rows = month.rows.map((r) => ({ ...r, s1: Math.max(0, r.s1 + j()), s2: Math.max(0, r.s2 + j()), s3: Math.max(0, r.s3 + j()), s4: Math.max(0, r.s4 + j()) }));
      month.income = 10000 + Math.floor(Math.random() * 2000);
      FinanceDB.saveMonth(user.uid, key, month);
      FinanceDB.snapshotMonth(user.uid, key);
    }
    UserDB.create({ email: 'admin@finanzaspro.com', password: 'admin123', name: 'Administrador' });
  } catch {}
}

// ─── CREDIT CARD OPERATIONS ──────────────────────────────────

/**
 * CreditCard
 * @property {string}  id
 * @property {string}  uid
 * @property {string}  nombre        - "Visa Oro", "Banamex"
 * @property {string}  banco         - "BBVA", "Citibanamex"
 * @property {string}  ultimos4      - últimos 4 dígitos
 * @property {string}  color         - color de la tarjeta
 * @property {string}  red           - "visa" | "mastercard" | "amex"
 * @property {number}  limiteTotal   - límite de crédito total
 * @property {number}  saldoActual   - deuda actual
 * @property {number}  minimoMes     - pago mínimo del mes
 * @property {number}  diaPago       - día del mes en que vence el pago (1-31)
 * @property {number}  diaCorte      - día de corte
 * @property {string}  tasa          - tasa de interés anual (CAT) como string "32.5"
 * @property {boolean} activa
 * @property {string}  createdAt
 * @property {string}  updatedAt
 * @property {CardPayment[]} pagos   - historial de pagos
 */

/**
 * CardPayment
 * @property {string} id
 * @property {number} monto
 * @property {string} fecha
 * @property {string} tipo   - "minimo" | "total" | "parcial"
 * @property {string} nota
 */

export const CARD_COLORS = [
  '#1a237e', '#0d47a1', '#006064', '#1b5e20',
  '#4a148c', '#b71c1c', '#e65100', '#212121',
  '#37474f', '#880e4f',
];

export const CARD_NETWORKS = ['visa', 'mastercard', 'amex', 'carnet'];

export const CardDB = {
  getAll(uid) {
    const db = loadDB();
    return (db.cards?.[uid] || []).filter((c) => c.activa !== false);
  },

  getAllIncludingInactive(uid) {
    const db = loadDB();
    return db.cards?.[uid] || [];
  },

  create(uid, data) {
    const db = loadDB();
    if (!db.cards) db.cards = {};
    if (!db.cards[uid]) db.cards[uid] = [];
    const card = {
      id: 'card_' + uuid(),
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
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      pagos:       [],
    };
    db.cards[uid].push(card);
    saveDB(db);
    return card;
  },

  update(uid, cardId, updates) {
    const db = loadDB();
    const cards = db.cards?.[uid] || [];
    const idx = cards.findIndex((c) => c.id === cardId);
    if (idx < 0) throw new Error('Tarjeta no encontrada');
    db.cards[uid][idx] = {
      ...cards[idx], ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveDB(db);
    return db.cards[uid][idx];
  },

  delete(uid, cardId) {
    const db = loadDB();
    const cards = db.cards?.[uid] || [];
    const idx = cards.findIndex((c) => c.id === cardId);
    if (idx < 0) return;
    db.cards[uid][idx].activa = false;
    db.cards[uid][idx].updatedAt = new Date().toISOString();
    saveDB(db);
  },

  addPayment(uid, cardId, { monto, tipo, nota }) {
    const db = loadDB();
    const cards = db.cards?.[uid] || [];
    const idx = cards.findIndex((c) => c.id === cardId);
    if (idx < 0) throw new Error('Tarjeta no encontrada');
    const payment = {
      id: 'pay_' + uuid(),
      monto: Number(monto) || 0,
      fecha: new Date().toISOString().split('T')[0],
      tipo: tipo || 'parcial',
      nota: nota?.trim() || '',
    };
    if (!db.cards[uid][idx].pagos) db.cards[uid][idx].pagos = [];
    db.cards[uid][idx].pagos.unshift(payment);
    // Actualizar saldo
    db.cards[uid][idx].saldoActual = Math.max(0, db.cards[uid][idx].saldoActual - payment.monto);
    db.cards[uid][idx].updatedAt = new Date().toISOString();
    saveDB(db);
    return db.cards[uid][idx];
  },

  /** Días hasta el próximo pago */
  daysUntilPayment(card) {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), card.diaPago);
    if (thisMonth < today) {
      thisMonth.setMonth(thisMonth.getMonth() + 1);
    }
    return Math.ceil((thisMonth - today) / (1000 * 60 * 60 * 24));
  },
};
