import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  CategoryService, ExpenseService, MonthService, AuditService,
  getCurrentMonthKey, offsetMonth, fromMonthKey,
} from '../firebase/services';
import { useAuth } from './AuthContext';

const FinanceContext = createContext(null);

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN', maximumFractionDigits:0 }).format(n);

function calcularTotales(rows, income) {
  const editables = rows.filter((r) => r.editable);
  const totales = { s1:0, s2:0, s3:0, s4:0 };
  editables.forEach((r) => {
    totales.s1 += Number(r.s1)||0; totales.s2 += Number(r.s2)||0;
    totales.s3 += Number(r.s3)||0; totales.s4 += Number(r.s4)||0;
  });
  return rows.map((r) => {
    if (r.id === 'total')  return { ...r, ...totales };
    if (r.id === 'ahorro') {
      const t = totales.s1+totales.s2+totales.s3+totales.s4;
      return { ...r, s1: income-t, s2:0, s3:0, s4:0 };
    }
    return r;
  });
}

export function FinanceProvider({ children }) {
  const { user } = useAuth();
  const currentMonthKey = getCurrentMonthKey();

  const [activeMonthKey, setActiveMonthKey] = useState(currentMonthKey);
  const [monthData,   setMonthData]   = useState(null);
  const [history,     setHistory]     = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [expenses,    setExpenses]    = useState([]);
  const [tasaCambio,  setTasaCambio]  = useState(0.0572);
  const [loading,     setLoading]     = useState(false);

  const audit = useCallback((action, opts) => {
    if (!user) return;
    AuditService.log(user.uid, action, {
      email: user.email, userName: user.name,
      monthKey: activeMonthKey, ...opts,
    });
  }, [user, activeMonthKey]);

  const reload = useCallback(async () => {
    if (!user) {
      setMonthData(null); setHistory([]); setCategories([]); setExpenses([]);
      return;
    }
    setLoading(true);
    try {
      const [cats, exps, hist] = await Promise.all([
        CategoryService.getAll(user.uid),
        ExpenseService.getByMonth(user.uid, activeMonthKey),
        MonthService.getHistory(user.uid),
      ]);
      setCategories(cats);
      setExpenses(exps);
      setHistory(hist);

      // El mes debe cargarse después de las categorías
      const month = await MonthService.getOrCreate(
        user.uid, activeMonthKey, cats, user.defaultIncome || 10000
      );
      setMonthData(month);
    } catch (e) {
      console.error('Error cargando datos:', e);
    } finally {
      setLoading(false);
    }
  }, [user, activeMonthKey]);

  useEffect(() => { reload(); }, [reload]);

  // Navegación de meses
  const goToMonth        = useCallback((key) => setActiveMonthKey(key), []);
  const goToPrevMonth    = useCallback(() => setActiveMonthKey((k) => offsetMonth(k, -1)), []);
  const goToNextMonth    = useCallback(() => setActiveMonthKey((k) => offsetMonth(k, +1)), []);
  const goToCurrentMonth = useCallback(() => setActiveMonthKey(currentMonthKey), [currentMonthKey]);

  // Editar celda (override manual de presupuesto)
  const updateCell = useCallback(async (rowId, semana, valor) => {
    if (!user || !monthData) return;
    const before = monthData.rows.find((r) => r.id === rowId)?.[semana];
    const updatedRows = monthData.rows.map((r) =>
      r.id === rowId ? { ...r, [semana]: Number(valor)||0 } : r
    );
    const updated = { ...monthData, rows: updatedRows };
    setMonthData(updated);
    await MonthService.save(user.uid, activeMonthKey, updated);
    audit('FINANCE_CELL_EDIT', {
      detail: `"${rowId}" ${semana.toUpperCase()}: ${fmt(before)} → ${fmt(valor)}`,
      before: { [semana]: before }, after: { [semana]: valor },
    });
  }, [user, activeMonthKey, monthData, audit]);

  const updateIngreso = useCallback(async (valor) => {
    if (!user || !monthData) return;
    const before = monthData.income;
    const updated = await MonthService.updateIncome(user.uid, activeMonthKey, valor);
    setMonthData(updated);
    audit('FINANCE_INCOME_EDIT', {
      detail: `Ingreso: ${fmt(before)} → ${fmt(valor)}`,
      before: { income: before }, after: { income: valor },
    });
  }, [user, activeMonthKey, monthData, audit]);

  const saveSnapshot = useCallback(async () => {
    if (!user) return;
    await MonthService.snapshot(user.uid, activeMonthKey);
    const hist = await MonthService.getHistory(user.uid);
    setHistory(hist);
    const { label } = fromMonthKey(activeMonthKey);
    audit('FINANCE_SNAPSHOT', { detail: `Snapshot guardado para ${label}` });
  }, [user, activeMonthKey, audit]);

  // ── EXPENSES CRUD ─────────────────────────────────────────
  const addExpense = useCallback(async (data) => {
    if (!user) return;
    await ExpenseService.create(user.uid, activeMonthKey, data);
    const cat = categories.find((c) => c.id === data.categoryId);
    audit('EXPENSE_CREATE', {
      detail: `${fmt(data.monto)} en "${cat?.nombre || data.categoryId}"${data.descripcion ? ` — "${data.descripcion}"` : ''}`,
      after: data,
    });
    await reload();
  }, [user, activeMonthKey, categories, audit, reload]);

  const editExpense = useCallback(async (expenseId, updates) => {
    if (!user) return;
    const before = expenses.find((e) => e.id === expenseId);
    await ExpenseService.update(user.uid, activeMonthKey, expenseId, updates);
    audit('EXPENSE_EDIT', {
      detail: `Gasto editado: ${fmt(updates.monto || before?.monto)}`,
      before, after: { ...before, ...updates },
    });
    await reload();
  }, [user, activeMonthKey, expenses, audit, reload]);

  const deleteExpense = useCallback(async (expenseId) => {
    if (!user) return;
    const target = expenses.find((e) => e.id === expenseId);
    await ExpenseService.delete(user.uid, activeMonthKey, expenseId);
    audit('EXPENSE_DELETE', {
      detail: `Eliminado: ${fmt(target?.monto)} — "${target?.descripcion || target?.categoryId}"`,
      before: target,
    });
    await reload();
  }, [user, activeMonthKey, expenses, audit, reload]);

  // ── CATEGORIES CRUD ───────────────────────────────────────
  const addCategory = useCallback(async (data) => {
    if (!user) return;
    const cat = await CategoryService.create(user.uid, data);
    audit('CATEGORY_CREATE', { detail: `Nueva: "${data.nombre}"`, after: cat });
    const cats = await CategoryService.getAll(user.uid);
    setCategories(cats);
    return cat;
  }, [user, audit]);

  const updateCategory = useCallback(async (catId, updates) => {
    if (!user) return;
    const before = categories.find((c) => c.id === catId);
    await CategoryService.update(user.uid, catId, updates);
    audit('CATEGORY_EDIT', {
      detail: `"${before?.nombre}" actualizada`,
      before, after: { ...before, ...updates },
    });
    const cats = await CategoryService.getAll(user.uid);
    setCategories(cats);
    await reload();
  }, [user, categories, audit, reload]);

  const deleteCategory = useCallback(async (catId) => {
    if (!user) return;
    const target     = categories.find((c) => c.id === catId);
    const hasExpenses = expenses.some((e) => e.categoryId === catId);
    const result     = await CategoryService.delete(user.uid, catId, hasExpenses);
    audit('CATEGORY_DELETE', {
      detail: `"${target?.nombre}" ${result.type === 'soft' ? 'desactivada' : 'eliminada'}`,
      before: target,
    });
    const cats = await CategoryService.getAll(user.uid);
    setCategories(cats);
    await reload();
    return result;
  }, [user, categories, expenses, audit, reload]);

  const reactivateCategory = useCallback(async (catId) => {
    if (!user) return;
    const target = categories.find((c) => c.id === catId);
    await CategoryService.reactivate(user.uid, catId);
    audit('CATEGORY_REACTIVATE', { detail: `"${target?.nombre}" reactivada` });
    const cats = await CategoryService.getAll(user.uid);
    setCategories(cats);
  }, [user, categories, audit]);

  const updateTasaCambio = useCallback((tasa) => setTasaCambio(tasa), []);

  // Derivados
  // Merge the category color from the live `categories` state into the
  // stored month rows. The reason is that rows are snapshots taken when the
  // month document was created, so if the user edits the category color later
  // the row would still keep the old colour. We override here on every
  // calculation so the dashboard (and charts) always show the current color.
  const rows = monthData
    ? calcularTotales([
        ...monthData.rows.map((r) => {
          if (r.editable) {
            const cat = categories.find((c) => c.id === r.id);
            if (cat && cat.color && cat.color !== r.color) {
              return { ...r, color: cat.color };
            }
          }
          return r;
        }),
        { id:'total',  categoria:'Total Gastos', s1:0,s2:0,s3:0,s4:0, editable:false, color:'#455a64' },
        { id:'ahorro', categoria:'Ahorro',        s1:0,s2:0,s3:0,s4:0, editable:false, color:'#00897b' },
      ], monthData.income)
    : [];

  const income      = monthData?.income || 0;
  const totalMes    = rows.filter((r) => r.editable).reduce((a,r) => a+r.s1+r.s2+r.s3+r.s4, 0);
  const ahorroMes   = income - totalMes;
  const pctGastos   = income > 0 ? ((totalMes/income)*100).toFixed(1) : '0.0';
  const carroRow    = monthData?.rows.find((r) => r.id === 'abono_carro');
  const totalCarro  = carroRow ? carroRow.s1+carroRow.s2+carroRow.s3+carroRow.s4 : 0;
  const pctCarro    = income > 0 ? ((totalCarro/income)*100).toFixed(1) : '0.0';
  const alertaCarro = income > 0 && totalCarro/income > (user?.prefs?.alertThreshold||50)/100;
  const { label: activeMonthLabel } = fromMonthKey(activeMonthKey);
  const isCurrentMonth = activeMonthKey === currentMonthKey;

  return (
    <FinanceContext.Provider value={{
      activeMonthKey, activeMonthLabel, currentMonthKey, isCurrentMonth, monthData, loading,
      goToMonth, goToPrevMonth, goToNextMonth, goToCurrentMonth,
      rows, ingreso: income, totalMes, ahorroMes, pctGastos, pctCarro, alertaCarro, tasaCambio,
      updateCell, updateIngreso, updateTasaCambio, saveSnapshot,
      history,
      expenses, addExpense, editExpense, deleteExpense,
      categories, addCategory, updateCategory, deleteCategory, reactivateCategory,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => useContext(FinanceContext);
