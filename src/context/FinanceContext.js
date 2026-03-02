import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FinanceDB, HistoryDB, CategoryDB, ExpenseDB, getCurrentMonthKey, offsetMonth, fromMonthKey } from '../db/schema';
import { useAuth } from './AuthContext';

const FinanceContext = createContext(null);

function calcularTotales(rows, income) {
  const editables = rows.filter((r) => r.editable);
  const totales = { s1: 0, s2: 0, s3: 0, s4: 0 };
  editables.forEach((r) => {
    totales.s1 += Number(r.s1) || 0; totales.s2 += Number(r.s2) || 0;
    totales.s3 += Number(r.s3) || 0; totales.s4 += Number(r.s4) || 0;
  });
  return rows.map((r) => {
    if (r.id === 'total')  return { ...r, ...totales };
    if (r.id === 'ahorro') {
      const t = totales.s1 + totales.s2 + totales.s3 + totales.s4;
      return { ...r, s1: income - t, s2: 0, s3: 0, s4: 0 };
    }
    return r;
  });
}

export function FinanceProvider({ children }) {
  const { user } = useAuth();
  const currentMonthKey = getCurrentMonthKey();

  const [activeMonthKey, setActiveMonthKey] = useState(currentMonthKey);
  const [monthData,  setMonthData]  = useState(null);
  const [history,    setHistory]    = useState([]);
  const [categories, setCategories] = useState([]);
  const [expenses,   setExpenses]   = useState([]);
  const [tasaCambio, setTasaCambio] = useState(0.0572);

  // Reload everything when user or active month changes
  const reload = useCallback(() => {
    if (!user) { setMonthData(null); setHistory([]); setCategories([]); setExpenses([]); return; }
    setMonthData({ ...FinanceDB.getMonth(user.uid, activeMonthKey) });
    setHistory(HistoryDB.getAll(user.uid));
    setCategories(CategoryDB.getAll(user.uid));
    setExpenses(ExpenseDB.getByMonth(user.uid, activeMonthKey));
  }, [user, activeMonthKey]);

  useEffect(() => { reload(); }, [reload]);

  // Month navigation
  const goToMonth        = useCallback((key) => setActiveMonthKey(key), []);
  const goToPrevMonth    = useCallback(() => setActiveMonthKey((k) => offsetMonth(k, -1)), []);
  const goToNextMonth    = useCallback(() => setActiveMonthKey((k) => offsetMonth(k, +1)), []);
  const goToCurrentMonth = useCallback(() => setActiveMonthKey(currentMonthKey), [currentMonthKey]);

  // Finance table cell edit (manual override)
  const updateCell = useCallback((rowId, semana, valor) => {
    if (!user || !monthData) return;
    const updated = FinanceDB.updateCell(user.uid, activeMonthKey, rowId, semana, valor);
    setMonthData({ ...updated });
  }, [user, activeMonthKey, monthData]);

  const updateIngreso = useCallback((valor) => {
    if (!user || !monthData) return;
    const updated = FinanceDB.updateIncome(user.uid, activeMonthKey, valor);
    setMonthData({ ...updated });
  }, [user, activeMonthKey, monthData]);

  const saveSnapshot = useCallback(() => {
    if (!user) return;
    FinanceDB.snapshotMonth(user.uid, activeMonthKey);
    setHistory(HistoryDB.getAll(user.uid));
  }, [user, activeMonthKey]);

  // ── EXPENSE CRUD ──────────────────────────────────────────
  const addExpense = useCallback((data) => {
    if (!user) return;
    ExpenseDB.create(user.uid, activeMonthKey, data);
    reload();
  }, [user, activeMonthKey, reload]);

  const editExpense = useCallback((expenseId, updates) => {
    if (!user) return;
    ExpenseDB.update(user.uid, activeMonthKey, expenseId, updates);
    reload();
  }, [user, activeMonthKey, reload]);

  const deleteExpense = useCallback((expenseId) => {
    if (!user) return;
    ExpenseDB.delete(user.uid, activeMonthKey, expenseId);
    reload();
  }, [user, activeMonthKey, reload]);

  // ── CATEGORY CRUD ─────────────────────────────────────────
  const addCategory = useCallback((data) => {
    if (!user) return CategoryDB.create(user.uid, data);
    const cat = CategoryDB.create(user.uid, data);
    setCategories(CategoryDB.getAll(user.uid));
    return cat;
  }, [user]);

  const updateCategory = useCallback((catId, updates) => {
    if (!user) return;
    CategoryDB.update(user.uid, catId, updates);
    setCategories(CategoryDB.getAll(user.uid));
    reload();
  }, [user, reload]);

  const deleteCategory = useCallback((catId) => {
    if (!user) return;
    const result = CategoryDB.delete(user.uid, catId, activeMonthKey);
    setCategories(CategoryDB.getAll(user.uid));
    reload();
    return result;
  }, [user, activeMonthKey, reload]);

  const reactivateCategory = useCallback((catId) => {
    if (!user) return;
    CategoryDB.reactivate(user.uid, catId);
    setCategories(CategoryDB.getAll(user.uid));
  }, [user]);

  const updateTasaCambio = useCallback((tasa) => setTasaCambio(tasa), []);

  // Derived values
  const rows = monthData
    ? calcularTotales([
        ...monthData.rows,
        { id: 'total',  categoria: 'Total Gastos', s1:0, s2:0, s3:0, s4:0, editable: false, color: '#455a64' },
        { id: 'ahorro', categoria: 'Ahorro',        s1:0, s2:0, s3:0, s4:0, editable: false, color: '#00897b' },
      ], monthData.income)
    : [];

  const income     = monthData?.income || 0;
  const totalMes   = rows.filter((r) => r.editable).reduce((a, r) => a + r.s1 + r.s2 + r.s3 + r.s4, 0);
  const ahorroMes  = income - totalMes;
  const pctGastos  = income > 0 ? ((totalMes / income) * 100).toFixed(1) : '0.0';
  const carroRow   = monthData?.rows.find((r) => r.id === 'abono_carro');
  const totalCarro = carroRow ? carroRow.s1 + carroRow.s2 + carroRow.s3 + carroRow.s4 : 0;
  const pctCarro   = income > 0 ? ((totalCarro / income) * 100).toFixed(1) : '0.0';
  const alertaCarro = income > 0 && totalCarro / income > (user?.prefs?.alertThreshold || 50) / 100;
  const { label: activeMonthLabel } = fromMonthKey(activeMonthKey);
  const isCurrentMonth = activeMonthKey === currentMonthKey;

  return (
    <FinanceContext.Provider value={{
      // Month
      activeMonthKey, activeMonthLabel, currentMonthKey, isCurrentMonth, monthData,
      goToMonth, goToPrevMonth, goToNextMonth, goToCurrentMonth,
      // Finance
      rows, ingreso: income, totalMes, ahorroMes, pctGastos, pctCarro, alertaCarro, tasaCambio,
      updateCell, updateIngreso, updateTasaCambio, saveSnapshot,
      // History
      history,
      // Expenses
      expenses, addExpense, editExpense, deleteExpense,
      // Categories
      categories, addCategory, updateCategory, deleteCategory, reactivateCategory,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => useContext(FinanceContext);
