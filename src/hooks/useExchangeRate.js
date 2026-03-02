import { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';

// ============================================================
// Hook: useExchangeRate
//
// Integración con Exchange Rates API (https://www.exchangerate-api.com)
// Plan gratuito: 1,500 requests/mes, no requiere tarjeta.
//
// Para activar:
// 1. Crear cuenta en https://www.exchangerate-api.com/
// 2. Obtener API key gratuita
// 3. Reemplazar VITE_EXCHANGE_API_KEY en .env:
//    REACT_APP_EXCHANGE_API_KEY=tu_api_key_aqui
//
// También compatible con Open Exchange Rates y Fixer.io
// ============================================================

const MOCK_RATE = 0.0572; // Tasa MXN→USD de ejemplo (actualizar si se usa API real)

export function useExchangeRate() {
  const { updateTasaCambio } = useFinance();
  const [rate, setRate] = useState(MOCK_RATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const apiKey = process.env.REACT_APP_EXCHANGE_API_KEY;

    if (!apiKey) {
      // Sin API key: usar tasa mock y notificar
      console.info('[ExchangeRate] Sin API key. Usando tasa mock:', MOCK_RATE);
      setRate(MOCK_RATE);
      updateTasaCambio(MOCK_RATE);
      return;
    }

    const fetchRate = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://v6.exchangerate-api.com/v6/${apiKey}/pair/MXN/USD`
        );
        if (!res.ok) throw new Error('Error al obtener tasa de cambio');
        const json = await res.json();

        const newRate = json.conversion_rate;
        setRate(newRate);
        updateTasaCambio(newRate);
        setLastUpdated(new Date().toLocaleTimeString('es-MX'));
      } catch (err) {
        setError(err.message);
        setRate(MOCK_RATE);
        updateTasaCambio(MOCK_RATE);
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
    // Actualizar cada 30 minutos
    const interval = setInterval(fetchRate, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { rate, loading, error, lastUpdated };
}

// ============================================================
// EJEMPLO: CoinGecko API para Crypto Tracking
// ============================================================
// (gratuito, sin API key)
//
// export async function fetchCryptoPrice(coin = 'bitcoin') {
//   const res = await fetch(
//     `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=mxn,usd`
//   );
//   const data = await res.json();
//   return data[coin]; // { mxn: 900000, usd: 45000 }
// }
//
// Uso en componente:
//   const [btcPrice, setBtcPrice] = useState(null);
//   useEffect(() => {
//     fetchCryptoPrice('bitcoin').then(setBtcPrice);
//   }, []);
// ============================================================
