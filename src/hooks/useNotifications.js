import { useEffect, useCallback, useState } from 'react';

// ============================================================
// useNotifications — Push Notifications para recordatorios de pago
//
// Usa la Web Notifications API (soportada en Chrome/Edge/Firefox)
// En iOS Safari solo funciona si la PWA está instalada en home screen.
//
// Flujo:
//  1. Usuario da permiso al primer uso
//  2. Al montar, revisa cada tarjeta:
//     - Si faltan ≤ 5 días → notifica "Pago próximo"
//     - Si falta 1 día     → notifica "¡Pago mañana!"
//  3. Revisa de nuevo cada hora (mientras la app esté abierta)
// ============================================================

const NOTIF_KEY = 'fp_notif_sent'; // Evitar spam: guardar cuándo se envió cada notif

function getNotifState() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}'); } catch { return {}; }
}
function setNotifState(state) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(state));
}

export function useNotifications(cards = []) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied';
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const sendNotification = useCallback((title, body, options = {}) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const n = new Notification(title, {
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: options.tag || 'finanzaspro',
      requireInteraction: options.urgent || false,
      ...options,
    });
    // Auto-cerrar después de 8s si no es urgente
    if (!options.urgent) setTimeout(() => n.close(), 8000);
    return n;
  }, []);

  const checkCardPayments = useCallback(() => {
    if (permission !== 'granted' || !cards.length) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().split('T')[0];
    const state = getNotifState();
    let updated = false;

    cards.forEach((card) => {
      // Calcular fecha de próximo pago
      let payDate = new Date(today.getFullYear(), today.getMonth(), card.diaPago);
      if (payDate < today) payDate.setMonth(payDate.getMonth() + 1);
      const daysLeft = Math.ceil((payDate - today) / (1000 * 60 * 60 * 24));

      const key5  = `${card.id}_5_${todayKey}`;
      const key1  = `${card.id}_1_${todayKey}`;
      const key0  = `${card.id}_0_${todayKey}`;

      const fmt = (n) => new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN', maximumFractionDigits:0 }).format(n);

      // 5 días antes
      if (daysLeft <= 5 && daysLeft > 1 && !state[key5]) {
        sendNotification(
          `💳 Pago próximo — ${card.nombre}`,
          `Faltan ${daysLeft} días para tu pago. Saldo: ${fmt(card.saldoActual)}. Mínimo: ${fmt(card.minimoMes)}.`,
          { tag: key5 }
        );
        state[key5] = true;
        updated = true;
      }

      // 1 día antes (urgente)
      if (daysLeft === 1 && !state[key1]) {
        sendNotification(
          `🚨 ¡Pago mañana! — ${card.nombre}`,
          `Tu pago vence mañana. Saldo actual: ${fmt(card.saldoActual)}. Pago mínimo: ${fmt(card.minimoMes)}.`,
          { tag: key1, urgent: true }
        );
        state[key1] = true;
        updated = true;
      }

      // El mismo día
      if (daysLeft === 0 && !state[key0]) {
        sendNotification(
          `🔴 ¡Pago HOY! — ${card.nombre}`,
          `Hoy vence el pago de ${card.nombre}. Saldo: ${fmt(card.saldoActual)}.`,
          { tag: key0, urgent: true }
        );
        state[key0] = true;
        updated = true;
      }
    });

    if (updated) setNotifState(state);
  }, [cards, permission, sendNotification]);

  // Verificar al montar y cada hora
  useEffect(() => {
    checkCardPayments();
    const interval = setInterval(checkCardPayments, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkCardPayments]);

  return { permission, requestPermission, sendNotification, checkCardPayments };
}
