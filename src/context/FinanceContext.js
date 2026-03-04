import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  CategoryService, ExpenseService, MonthService, IncomeService, AuditService,
  CardService,
  getCurrentMonthKey, offsetMonth, fromMonthKey,
} from '../firebase/services';

import { useAuth } from './AuthContext';

// ── Helpers tarjetas ──────────────────────────────────────────

function diaToSemana(dia) {
  if (dia <= 7)  return 's1';
  if (dia <= 14) return 's2';
  if (dia <= 21) return 's3';
  return 's4';
}

function primerMesCobroCard(fechaStr, diaCorte) {
  const d         = new Date(fechaStr + 'T12:00:00');
  const diaCompra = d.getDate();
  const mes       = d.getMonth();
  const anio      = d.getFullYear();
  const mesCierre = diaCompra <= diaCorte ? mes : mes + 1;
  return new Date(anio, mesCierre + 1, 1);
}

function calcularCargosTargetasPorSemana(cards, monthKey) {
  const [ty, tm]  = monthKey.split('-').map(Number);
  const targetIdx = ty * 12 + (tm - 1);
  const tot       = { s1: 0, s2: 0, s3: 0, s4: 0 };

  cards.forEach((card) => {
    const diaCorte = Number(card.diaCorte) || 25;
    const semana   = diaToSemana(Number(card.diaPago) || 1);

    (card.compras || []).forEach((compra) => {
      const meses    = Number(compra.meses) || 1;
      const inicio   = primerMesCobroCard(compra.fecha, diaCorte);
      const startIdx = inicio.getFullYear() * 12 + inicio.getMonth();
      if (targetIdx >= startIdx && targetIdx < startIdx + meses) {
        tot[semana] += compra.monto / meses;
      }
    });
  });

  Object.keys(tot).forEach((k) => { tot[k] = Math.round(tot[k] * 100) / 100; });
  return tot;
}

const FinanceContext = createContext(null);

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

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
  const [monthData,   setMonthData]   = useState(null);
  const [history,     setHistory]     = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [expenses,    setExpenses]    = useState([]);
  const [incomes,     setIncomes]     = useState([]);
  const [cards,       setCards]       = useState([]);
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
      setMonthData(null); setHistory([]); setCategories([]);
      setExpenses([]); setIncomes([]); setCards([]);
      return;
    }
    setLoading(true);
    try {
      const [cats, exps, incs, hist, cds] = await Promise.all([
        CategoryService.getAll(user.uid),
        ExpenseService.getByMonth(user.uid, activeMonthKey),
        IncomeService.getByMonth(user.uid, activeMonthKey),
        MonthService.getHistory(user.uid),
        CardService.getAll(user.uid),
      ]);
      setCategories(cats);
      setExpenses(exps);
      setIncomes(incs);
      setHistory(hist);
      setCards(cds);

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

  const updateCell = useCallback(async (rowId, semana, valor) => {
    if (!user || !monthData) return;
    const before = monthData.rows.find((r) => r.id === rowId)?.[semana];
    const updatedRows = monthData.rows.map((r) =>
      r.id === rowId ? { ...r, [semana]: Number(valor) || 0 } : r
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

  // ── INCOMES CRUD ──────────────────────────────────────────
  const addIncome = useCallback(async (data) => {
    if (!user) return;
    const entry = await IncomeService.create(user.uid, activeMonthKey, data);
    audit('INCOME_CREATE', {
      detail: `${fmt(data.monto)}${data.descripcion ? ` — "${data.descripcion}"` : ''} (${data.tipo})`,
      after: data,
    });
    await reload();
    return entry;
  }, [user, activeMonthKey, audit, reload]);

  const editIncome = useCallback(async (incomeId, updates) => {
    if (!user) return;
    const before = incomes.find((i) => i.id === incomeId);
    await IncomeService.update(user.uid, activeMonthKey, incomeId, updates);
    audit('INCOME_EDIT', {
      detail: `Ingreso editado: ${fmt(updates.monto || before?.monto)}`,
      before, after: { ...before, ...updates },
    });
    await reload();
  }, [user, activeMonthKey, incomes, audit, reload]);

  const deleteIncome = useCallback(async (incomeId) => {
    if (!user) return;
    const target = incomes.find((i) => i.id === incomeId);
    await IncomeService.delete(user.uid, activeMonthKey, incomeId);
    audit('INCOME_DELETE', {
      detail: `Eliminado: ${fmt(target?.monto)}${target?.descripcion ? ` — "${target.descripcion}"` : ''}`,
      before: target,
    });
    await reload();
  }, [user, activeMonthKey, incomes, audit, reload]);

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
    const target      = categories.find((c) => c.id === catId);
    const hasExpenses = expenses.some((e) => e.categoryId === catId);
    const result      = await CategoryService.delete(user.uid, catId, hasExpenses);
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

  // ── Derivados ─────────────────────────────────────────────

  const ingresoTotal = incomes.length > 0
    ? IncomeService.totalFromList(incomes)
    : (monthData?.income || 0);

  const ingresosBySemana = IncomeService.bySemana(incomes);

  const cardsCargos = calcularCargosTargetasPorSemana(cards, activeMonthKey);
  const hayCargosTarjetas = Object.values(cardsCargos).some((v) => v > 0);

  // ✅ IDs de categorías activas para filtrar rows huérfanas
  const activeCatIds = new Set(categories.filter((c) => c.activa).map((c) => c.id));

  const rows = monthData
    ? calcularTotales([
        ...monthData.rows
          // ✅ Filtrar filas cuya categoría fue eliminada/desactivada
          .filter((r) => !r.editable || activeCatIds.has(r.id))
          .map((r) => {
            if (r.editable) {
              const cat = categories.find((c) => c.id === r.id);
              if (cat?.color && cat.color !== r.color) return { ...r, color: cat.color };
            }
            return r;
          }),
        { id: 'total',  categoria: 'Total Gastos', s1: 0, s2: 0, s3: 0, s4: 0, editable: false, color: '#455a64' },
        { id: 'ahorro', categoria: 'Ahorro',        s1: 0, s2: 0, s3: 0, s4: 0, editable: false, color: '#00897b' },
      ], ingresoTotal)
    : [];

  const income = ingresoTotal;

  // ✅ FIX: totalMes sin doble conteo — las tarjetas se suman una sola vez
  const totalMes = rows
    .filter((r) => r.editable)
    .reduce((a, r) =>
      a + (Number(r.s1) || 0) + (Number(r.s2) || 0)
        + (Number(r.s3) || 0) + (Number(r.s4) || 0), 0)
    + Object.values(cardsCargos).reduce((a, v) => a + (Number(v) || 0), 0);

  const ahorroMes   = income - totalMes;
  const pctGastos   = income > 0 ? ((totalMes / income) * 100).toFixed(1) : '0.0';

  // ✅ FIX: carroRow leído desde `rows` (ya procesado) en lugar de monthData.rows (datos crudos)
  const carroRow   = rows.find((r) => r.id === 'abono_carro');
  const totalCarro = carroRow
    ? (Number(carroRow.s1) || 0) + (Number(carroRow.s2) || 0)
      + (Number(carroRow.s3) || 0) + (Number(carroRow.s4) || 0)
    : 0;

  const pctCarro    = income > 0 ? ((totalCarro / income) * 100).toFixed(1) : '0.0';
  const alertaCarro = income > 0 && totalCarro / income > (user?.prefs?.alertThreshold || 50) / 100;
  const { label: activeMonthLabel } = fromMonthKey(activeMonthKey);
  const isCurrentMonth = activeMonthKey === currentMonthKey;

  // ✅ Saldo disponible por semana: ingreso_sem + ahorro_sem_anterior
  const ingresoSemanal = income / 4;
  const ingresoSem = incomes.length > 0
    ? ['s1', 's2', 's3', 's4'].map((s) => ingresosBySemana[s] || 0)
    : [ingresoSemanal, ingresoSemanal, ingresoSemanal, ingresoSemanal];

  const gastoSem = ['s1', 's2', 's3', 's4'].map((s) =>
    rows.filter((r) => r.editable).reduce((acc, r) => acc + (Number(r[s]) || 0), 0)
    + (Number(cardsCargos[s]) || 0)
  );
  const ahorroSem = ingresoSem.map((ing, i) => ing - gastoSem[i]);

  // saldo disponible por semana
  const saldoDisponibleSem = ingresoSem.map((ing, i) => {
    const ahorroAnterior = i > 0 ? ahorroSem[i - 1] : 0;
    return ing + ahorroAnterior;
  });

  return (
    <FinanceContext.Provider value={{
      activeMonthKey, activeMonthLabel, currentMonthKey, isCurrentMonth, monthData, loading,
      goToMonth, goToPrevMonth, goToNextMonth, goToCurrentMonth,
      rows, ingreso: income, totalMes, ahorroMes, pctGastos, pctCarro, alertaCarro, tasaCambio,
      updateCell, updateIngreso, updateTasaCambio, saveSnapshot,
      history,
      // Ingresos variables
      incomes, ingresosBySemana, addIncome, editIncome, deleteIncome,
      // Tarjetas
      cards, cardsCargos, hayCargosTarjetas,
      // Gastos
      expenses, addExpense, editExpense, deleteExpense,
      // Categorías
      categories, addCategory, updateCategory, deleteCategory, reactivateCategory,
      // ✅ Saldo disponible por semana
      saldoDisponibleSem,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => useContext(FinanceContext);
