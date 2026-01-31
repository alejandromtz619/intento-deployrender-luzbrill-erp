import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

const CurrencyTicker = () => {
  const { api } = useApp();
  const [cotizacion, setCotizacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manual, setManual] = useState(false);
  const [manualRates, setManualRates] = useState({ usd: '', brl: '' });

  const fetchCotizacion = async () => {
    setLoading(true);
    try {
      const data = await api('/cotizacion');
      setCotizacion(data);
      setManual(data.manual);
    } catch (e) {
      console.error('Error fetching cotizacion:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCotizacion();
    // Refresh every 5 minutes
    const interval = setInterval(fetchCotizacion, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value) => {
    if (!value) return '---';
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const toggleManual = () => {
    if (manual) {
      // Switch back to auto
      fetchCotizacion();
    }
    setManual(!manual);
  };

  const applyManualRates = () => {
    if (manualRates.usd && manualRates.brl) {
      setCotizacion({
        usd_pyg: parseFloat(manualRates.usd),
        brl_pyg: parseFloat(manualRates.brl),
        manual: true,
        fecha_actualizacion: new Date().toISOString()
      });
    }
  };

  return (
    <div className="bg-slate-900 text-white h-10 flex items-center overflow-hidden rounded-md" data-testid="currency-ticker">
      <div className="flex items-center gap-6 px-4 animate-ticker whitespace-nowrap">
        {/* USD/PYG */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">USD/PYG</span>
          <span className="font-mono-data text-sm font-medium">
            ₲ {formatCurrency(cotizacion?.usd_pyg)}
          </span>
          {!loading && <TrendingUp className="h-4 w-4 text-green-400" />}
        </div>

        {/* BRL/PYG */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">BRL/PYG</span>
          <span className="font-mono-data text-sm font-medium">
            ₲ {formatCurrency(cotizacion?.brl_pyg)}
          </span>
          {!loading && <TrendingDown className="h-4 w-4 text-red-400" />}
        </div>

        {/* Duplicate for continuous scroll */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">USD/PYG</span>
          <span className="font-mono-data text-sm font-medium">
            ₲ {formatCurrency(cotizacion?.usd_pyg)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">BRL/PYG</span>
          <span className="font-mono-data text-sm font-medium">
            ₲ {formatCurrency(cotizacion?.brl_pyg)}
          </span>
        </div>
      </div>

      {/* Manual toggle */}
      <div className="absolute right-2 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 text-xs",
            manual ? "text-orange-400" : "text-slate-400"
          )}
          onClick={toggleManual}
          data-testid="toggle-manual-rate"
        >
          <RefreshCw className={cn("h-3 w-3 mr-1", loading && "animate-spin")} />
          {manual ? 'Manual' : 'Auto'}
        </Button>
      </div>
    </div>
  );
};

export default CurrencyTicker;
