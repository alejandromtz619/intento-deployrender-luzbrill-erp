import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import CurrencyTicker from '../components/CurrencyTicker';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  ShoppingCart, TrendingUp, Package, Truck, AlertTriangle, 
  DollarSign, ArrowUp, ArrowDown, Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { cn } from '../lib/utils';

const Dashboard = () => {
  const { api, empresa } = useApp();
  const [stats, setStats] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ventasPeriodo, setVentasPeriodo] = useState('dia');
  const [ventasData, setVentasData] = useState([]);
  const [loadingVentas, setLoadingVentas] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!empresa?.id) return;
      
      try {
        const [statsData, alertasData] = await Promise.all([
          api(`/dashboard/stats?empresa_id=${empresa.id}`),
          api(`/alertas?empresa_id=${empresa.id}`)
        ]);
        setStats(statsData);
        setAlertas(alertasData);
      } catch (e) {
        console.error('Error fetching dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [empresa?.id, api]);

  // Fetch ventas según período seleccionado
  useEffect(() => {
    const fetchVentasPeriodo = async () => {
      if (!empresa?.id) return;
      
      setLoadingVentas(true);
      try {
        const data = await api(`/dashboard/ventas-periodo?empresa_id=${empresa.id}&periodo=${ventasPeriodo}`);
        setVentasData(data || []);
      } catch chart data based on selected period
  const getChartData = () => {
    if (ventasPeriodo === 'dia') {
      // 24h chart data
      return Array.from({ length: 24 }, (_, i) => {
        const hourData = stats?.ventas_por_hora?.find(v => v.hora === i);
        return {
          label: `${i}:00`,
          cantidad: hourData?.cantidad || 0,
          monto: hourData?.monto || 0
        };
      });
    }
    
    // Para otros períodos, usar ventasData del backend
    return ventasData.map(item => ({
      label: item.label || item.fecha || item.periodo,
      cantidad: item.cantidad || 0,
      monto: item.monto || 0
    }));
  };

  const chartData = getChartData();

  const getPeriodoLabel = () => {
    const labels = {
      'dia': 'Hoy',
      'semana': 'Esta Semana',
      'mes': 'Este Mes',
      'trimestre': 'Este Trimestre',
      'semestre': 'Este Semestre',
      'anio': 'Este Año'
    };
    return labels[ventasPeriodo] || 'Hoy';
  }fetchVentasPeriodo();
  }, [empresa?.id, ventasPeriodo, api]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  // Generate 24h chart data
  const chartData = Array.from({ length: 24 }, (_, i) => {
    const hourData = stats?.ventas_por_hora?.find(v => v.hora === i);
    return {
      hora: `${i}:00`,
      cantidad: hourData?.cantidad || 0,
      monto: hourData?.monto || 0
    };
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 skeleton-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 skeleton-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Currency Ticker */}
      <CurrencyTicker />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ventas Hoy</p>
                <p className="text-2xl font-bold font-mono-data">
                  {formatCurrency(stats?.ventas_hoy)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.cantidad_ventas_hoy || 0} ventas
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Deliverys Pendientes</p>
                <p className="text-2xl font-bold">{stats?.deliverys_pendientes || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Truck className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Bajo</p>
                <p className="text-2xl font-bold">{stats?.productos_stock_bajo || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">productos</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
             div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Ventas - {getPeriodoLabel()}
              </CardTitle>
              <Select value={ventasPeriodo} onValueChange={setVentasPeriodo}>
                <SelectTrigger className="w-[160px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Hoy</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mes</SelectItem>
                  <SelectItem value="trimestre">Trimestre</SelectItem>
                  <SelectItem value="semestre">Semestre</SelectItem>
                  <SelectItem value="anio">Año</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingVentas ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10 }}
                      interval={ventasPeriodo === 'dia' ? 2 : 'preserveStartEnd'}
                      angle={ventasPeriodo === 'dia' ? 0 : -45}
                      textAnchor={ventasPeriodo === 'dia' ? 'middle' : 'end'}
                      height={ventasPeriodo === 'dia' ? 30 : 60}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                      formatter={(value, name) => [
                        name === 'monto' ? formatCurrency(value) : value,
                        name === 'monto' ? 'Monto' : 'Cantidad'
                      ]}
                    />
                    <Bar dataKey="cantidad" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}ader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="hora" 
                    tick={{ fontSize: 10 }}
                    interval={2}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value, name) => [
                      name === 'monto' ? formatCurrency(value) : value,
                      name === 'monto' ? 'Monto' : 'Cantidad'
                    ]}
                  />
                  <Bar dataKey="cantidad" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Panel */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas
              {alertas.length > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {alertas.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-56">
              {alertas.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay alertas pendientes
                </p>
              ) : (
                <div className="space-y-3">
                  {alertas.map((alerta, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "p-3 rounded-md border-l-4",
                        alerta.nivel === 'danger' && "bg-red-50 dark:bg-red-900/20 border-red-500",
                        alerta.nivel === 'warning' && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500",
                        alerta.nivel === 'info' && "bg-blue-50 dark:bg-blue-900/20 border-blue-500"
                      )}
                    >
                      <p className="text-sm font-medium">{alerta.mensaje}</p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        {alerta.tipo.replace(/_/g, ' ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Stock Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Low Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <ArrowDown className="h-5 w-5" />
              Productos con Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.productos_bajo_stock?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Todos los productos tienen stock suficiente
              </p>
            ) : (
              <div className="space-y-2">
                {stats?.productos_bajo_stock?.slice(0, 5).map((prod, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <span className="text-sm font-medium">{prod.producto_nombre}</span>
                    <Badge variant="destructive">
                      {prod.stock_total} / {prod.alerta_minima}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* High Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <ArrowUp className="h-5 w-5" />
              Productos con Mayor Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.productos_alto_stock?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No hay datos de stock disponibles
              </p>
            ) : (
              <div className="space-y-2">
                {stats?.productos_alto_stock?.slice(0, 5).map((prod, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <span className="text-sm font-medium">{prod.producto_nombre}</span>
                    <Badge className="badge-success">
                      {prod.stock_total} unidades
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
