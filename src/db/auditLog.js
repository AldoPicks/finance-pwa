// ============================================================
// FINANZASPRO — SISTEMA DE LOGS DE AUDITORÍA
// ============================================================
//
// Registra TODAS las acciones del usuario con:
//   - quién lo hizo (uid + email)
//   - qué acción fue
//   - qué datos cambió (before / after)
//   - cuándo (timestamp)
//   - desde dónde (userAgent, módulo)
//
// Los logs se guardan en localStorage bajo la clave 'fp_audit_logs'
// y son exportables como JSON o CSV.
//
// CATEGORÍAS DE ACCIONES:
//   AUTH       → login, logout, registro, cambio contraseña
//   FINANCE    → ingreso editado, celda editada, snapshot
//   EXPENSE    → crear, editar, eliminar gasto
//   CATEGORY   → crear, editar, eliminar, reactivar
//   CARD       → crear, editar, eliminar, registrar pago
//   PROFILE    → actualizar perfil, cambiar preferencias
//   SYSTEM     → seed, migración, error
// ============================================================

const LOGS_KEY    = 'fp_audit_logs';
const MAX_LOGS    = 2000;    // máximo de entradas guardadas
const MAX_AGE_MS  = 90 * 24 * 60 * 60 * 1000; // 90 días

// ─── TIPOS DE ACCIÓN ─────────────────────────────────────────

export const LOG_ACTIONS = {
  // AUTH
  AUTH_LOGIN:           { label: 'Inicio de sesión',        icon: '🔐', module: 'Auth',       severity: 'info' },
  AUTH_LOGOUT:          { label: 'Cierre de sesión',        icon: '👋', module: 'Auth',       severity: 'info' },
  AUTH_REGISTER:        { label: 'Registro de cuenta',      icon: '✅', module: 'Auth',       severity: 'success' },
  AUTH_CHANGE_PASSWORD: { label: 'Contraseña cambiada',     icon: '🔑', module: 'Auth',       severity: 'warning' },
  AUTH_LOGIN_FAILED:    { label: 'Login fallido',           icon: '❌', module: 'Auth',       severity: 'error' },

  // FINANCE
  FINANCE_INCOME_EDIT:  { label: 'Ingreso mensual editado', icon: '💰', module: 'Finanzas',   severity: 'info' },
  FINANCE_CELL_EDIT:    { label: 'Celda de tabla editada',  icon: '✏️', module: 'Finanzas',   severity: 'info' },
  FINANCE_SNAPSHOT:     { label: 'Snapshot guardado',       icon: '📸', module: 'Finanzas',   severity: 'success' },

  // EXPENSE
  EXPENSE_CREATE:       { label: 'Gasto registrado',        icon: '➕', module: 'Gastos',     severity: 'success' },
  EXPENSE_EDIT:         { label: 'Gasto editado',           icon: '✏️', module: 'Gastos',     severity: 'info' },
  EXPENSE_DELETE:       { label: 'Gasto eliminado',         icon: '🗑️', module: 'Gastos',     severity: 'warning' },

  // CATEGORY
  CATEGORY_CREATE:      { label: 'Categoría creada',        icon: '🏷️', module: 'Categorías', severity: 'success' },
  CATEGORY_EDIT:        { label: 'Categoría editada',       icon: '✏️', module: 'Categorías', severity: 'info' },
  CATEGORY_DELETE:      { label: 'Categoría eliminada',     icon: '🗑️', module: 'Categorías', severity: 'warning' },
  CATEGORY_REACTIVATE:  { label: 'Categoría reactivada',    icon: '♻️', module: 'Categorías', severity: 'info' },

  // CARD
  CARD_CREATE:          { label: 'Tarjeta agregada',        icon: '💳', module: 'Tarjetas',   severity: 'success' },
  CARD_EDIT:            { label: 'Tarjeta editada',         icon: '✏️', module: 'Tarjetas',   severity: 'info' },
  CARD_DELETE:          { label: 'Tarjeta eliminada',       icon: '🗑️', module: 'Tarjetas',   severity: 'warning' },
  CARD_PAYMENT:         { label: 'Pago registrado',         icon: '💸', module: 'Tarjetas',   severity: 'success' },

  // PROFILE
  PROFILE_UPDATE:       { label: 'Perfil actualizado',      icon: '👤', module: 'Perfil',     severity: 'info' },
  PROFILE_THEME:        { label: 'Tema cambiado',           icon: '🎨', module: 'Perfil',     severity: 'info' },

  // SYSTEM
  SYSTEM_SEED:          { label: 'Datos demo inicializados',icon: '🌱', module: 'Sistema',    severity: 'info' },
  SYSTEM_ERROR:         { label: 'Error del sistema',       icon: '💥', module: 'Sistema',    severity: 'error' },
};

// ─── UTILIDADES ───────────────────────────────────────────────

function loadLogs() {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function saveLogs(logs) {
  try { localStorage.setItem(LOGS_KEY, JSON.stringify(logs)); } catch {}
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let device = 'Desktop';
  if (/Mobi|Android/i.test(ua)) device = 'Mobile';
  else if (/Tablet|iPad/i.test(ua)) device = 'Tablet';

  let browser = 'Unknown';
  if (/Chrome/.test(ua) && !/Edge/.test(ua)) browser = 'Chrome';
  else if (/Firefox/.test(ua)) browser = 'Firefox';
  else if (/Safari/.test(ua)) browser = 'Safari';
  else if (/Edge/.test(ua)) browser = 'Edge';

  return { device, browser };
}

// ─── LOGGER PRINCIPAL ─────────────────────────────────────────

export const AuditLog = {
  /**
   * Registrar una acción
   * @param {string} action - clave de LOG_ACTIONS
   * @param {object} opts
   * @param {string} opts.uid       - ID del usuario
   * @param {string} opts.email     - Email del usuario
   * @param {string} opts.userName  - Nombre del usuario
   * @param {*}      opts.before    - Estado antes del cambio (opcional)
   * @param {*}      opts.after     - Estado después del cambio (opcional)
   * @param {string} opts.detail    - Descripción legible del cambio
   * @param {string} opts.monthKey  - Mes relacionado (si aplica)
   */
  log(action, opts = {}) {
    const actionMeta = LOG_ACTIONS[action] || { label: action, icon: '📝', module: 'Unknown', severity: 'info' };
    const device = getDeviceInfo();

    const entry = {
      id:        crypto.randomUUID?.() || Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
      action,
      label:     actionMeta.label,
      icon:      actionMeta.icon,
      module:    actionMeta.module,
      severity:  actionMeta.severity,
      // Usuario
      uid:       opts.uid       || 'anonymous',
      email:     opts.email     || '',
      userName:  opts.userName  || '',
      // Datos
      detail:    opts.detail    || '',
      monthKey:  opts.monthKey  || null,
      before:    opts.before !== undefined ? JSON.stringify(opts.before) : null,
      after:     opts.after  !== undefined ? JSON.stringify(opts.after)  : null,
      // Contexto
      device:    device.device,
      browser:   device.browser,
      url:       window.location.pathname,
    };

    let logs = loadLogs();

    // Limpiar logs viejos (>90 días)
    const cutoff = Date.now() - MAX_AGE_MS;
    logs = logs.filter((l) => new Date(l.timestamp).getTime() > cutoff);

    // Agregar al frente
    logs.unshift(entry);

    // Limitar tamaño
    if (logs.length > MAX_LOGS) logs = logs.slice(0, MAX_LOGS);

    saveLogs(logs);
    return entry;
  },

  /** Obtener todos los logs (más recientes primero) */
  getAll() {
    return loadLogs();
  },

  /** Filtrar logs */
  filter({ uid, action, module: mod, severity, from, to, search } = {}) {
    let logs = loadLogs();

    if (uid)      logs = logs.filter((l) => l.uid === uid);
    if (action)   logs = logs.filter((l) => l.action === action);
    if (mod)      logs = logs.filter((l) => l.module === mod);
    if (severity) logs = logs.filter((l) => l.severity === severity);
    if (from)     logs = logs.filter((l) => new Date(l.timestamp) >= new Date(from));
    if (to)       logs = logs.filter((l) => new Date(l.timestamp) <= new Date(to));
    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter((l) =>
        l.label.toLowerCase().includes(q) ||
        l.detail.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        l.module.toLowerCase().includes(q)
      );
    }

    return logs;
  },

  /** Estadísticas rápidas */
  stats() {
    const logs = loadLogs();
    const today = new Date().toISOString().split('T')[0];

    const byModule   = {};
    const bySeverity = {};
    const byDay      = {};
    let todayCount   = 0;

    logs.forEach((l) => {
      byModule[l.module]     = (byModule[l.module]     || 0) + 1;
      bySeverity[l.severity] = (bySeverity[l.severity] || 0) + 1;
      const day = l.timestamp.split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
      if (day === today) todayCount++;
    });

    return {
      total:      logs.length,
      todayCount,
      byModule,
      bySeverity,
      byDay,
      oldest:     logs[logs.length - 1]?.timestamp || null,
      newest:     logs[0]?.timestamp || null,
    };
  },

  /** Exportar como JSON */
  exportJSON() {
    const data = JSON.stringify(loadLogs(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `finanzaspro-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /** Exportar como CSV */
  exportCSV() {
    const logs = loadLogs();
    const headers = ['Fecha','Hora','Módulo','Acción','Usuario','Email','Detalle','Severidad','Dispositivo','Navegador','URL'];
    const rows = logs.map((l) => {
      const [date, time] = l.timestamp.split('T');
      return [
        date,
        time.split('.')[0],
        l.module,
        l.label,
        l.userName,
        l.email,
        l.detail,
        l.severity,
        l.device,
        l.browser,
        l.url,
      ].map((v) => `"${String(v || '').replace(/"/g, '""')}"`);
    });

    const csv  = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `finanzaspro-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /** Limpiar logs (solo admin) */
  clear() {
    saveLogs([]);
  },
};

// ─── HOOK PARA USAR EN COMPONENTES ───────────────────────────

/**
 * Hook que retorna una función `log` ya vinculada al usuario actual.
 * Uso: const { log } = useAuditLog();
 *      log('EXPENSE_CREATE', { detail: 'Papas $200', after: expenseData });
 */
export function createBoundLogger(user) {
  return (action, opts = {}) => {
    AuditLog.log(action, {
      uid:      user?.uid   || 'anonymous',
      email:    user?.email || '',
      userName: user?.name  || '',
      ...opts,
    });
  };
}
