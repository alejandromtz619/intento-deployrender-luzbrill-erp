import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  FileText, Download, Loader2, Package, Users, Building2, 
  DollarSign, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const Reportes = () => {
  const { empresa, API_URL, token } = useApp();
  const [loading, setLoading] = useState({});
  
  // Filters for Ventas report
  const [ventasFechaDesde, setVentasFechaDesde] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [ventasFechaHasta, setVentasFechaHasta] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [ventasTipoPago, setVentasTipoPago] = useState('TODOS');
  const [ventasEstado, setVentasEstado] = useState('CONFIRMADO');
  
  // Filters for Stock report
  const [stockFechaDesde, setStockFechaDesde] = useState('');
  const [stockFechaHasta, setStockFechaHasta] = useState('');
  const [stockSoloAlertas, setStockSoloAlertas] = useState('NO');
  
  // Filters for Deudas Proveedores
  const [deudasFechaDesde, setDeudasFechaDesde] = useState('');
  const [deudasFechaHasta, setDeudasFechaHasta] = useState('');
  const [deudasEstado, setDeudasEstado] = useState('PENDIENTE');
  
  // Filters for Créditos Clientes
  const [creditosFechaDesde, setCreditosFechaDesde] = useState('');
  const [creditosFechaHasta, setCreditosFechaHasta] = useState('');
  const [creditosEstado, setCreditosEstado] = useState('PENDIENTE');

  const downloadReport = async (tipo, params = {}) => {
    if (!empresa?.id) return;
    
    setLoading({ ...loading, [tipo]: true });
    
    try {
      let url = `${API_URL}/reportes/${tipo}?empresa_id=${empresa.id}`;
      
      // Add extra params
      Object.entries(params).forEach(([key, value]) => {
        if (value) url += `&${key}=${value}`;
      });
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Error al generar reporte');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Get filename from Content-Disposition header or create one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `reporte_${tipo}_${new Date().toISOString().split('T')[0]}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.+)/);
        if (match) filename = match[1];
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('Reporte descargado');
    } catch (e) {
      toast.error(e.message || 'Error al descargar reporte');
    } finally {
      setLoading({ ...loading, [tipo]: false });
    }
  };

  const reportes = [
    {
      id: 'ventas',
      titulo: 'Reporte de Ventas',
      descripcion: 'Listado de ventas confirmadas por rango de fechas',
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
      filters: [
        {
          type: 'dateRange',
          fromState: ventasFechaDesde,
          toState: ventasFechaHasta,
          fromSetter: setVentasFechaDesde,
          toSetter: setVentasFechaHasta
        },
        {
          type: 'select',
          label: 'Tipo de Pago',
          state: ventasTipoPago,
          setter: setVentasTipoPago,
          options: [
            { value: 'TODOS', label: 'Todos los pagos' },
            { value: 'EFECTIVO', label: 'Efectivo' },
            { value: 'TARJETA', label: 'Tarjeta' },
            { value: 'TRANSFERENCIA', label: 'Transferencia' },
            { value: 'CHEQUE', label: 'Cheque' },
            { value: 'CREDITO', label: 'Crédito' }
          ]
        },
        {
          type: 'select',
          label: 'Estado',
          state: ventasEstado,
          setter: setVentasEstado,
          options: [
            { value: 'TODOS', label: 'Todos los estados' },
            { value: 'CONFIRMADO', label: 'Solo Confirmadas' },
            { value: 'ANULADO', label: 'Solo Anuladas' }
          ]
        }
      ],
      getParams: () => ({
        fecha_desde: ventasFechaDesde,
        fecha_hasta: ventasFechaHasta,
        tipo_pago: ventasTipoPago !== 'TODOS' ? ventasTipoPago : undefined,
        estado: ventasEstado !== 'TODOS' ? ventasEstado : undefined
      })
    },
    {
      id: 'stock',
      titulo: 'Reporte de Stock',
      descripcion: 'Estado actual del inventario con alertas de stock bajo',
      icon: Package,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      filters: [
        {
          type: 'dateRange',
          label: 'Movimientos desde',
          fromState: stockFechaDesde,
          toState: stockFechaHasta,
          fromSetter: setStockFechaDesde,
          toSetter: setStockFechaHasta,
          optional: true
        },
        {
          type: 'select',
          label: 'Filtrar por',
          state: stockSoloAlertas,
          setter: setStockSoloAlertas,
          options: [
            { value: 'NO', label: 'Todos los productos' },
            { value: 'SI', label: 'Solo con stock bajo' }
          ]
        }
      ],
      getParams: () => ({
        fecha_desde: stockFechaDesde || undefined,
        fecha_hasta: stockFechaHasta || undefined,
        solo_alertas: stockSoloAlertas === 'SI' ? 'true' : undefined
      })
    },
    {
      id: 'deudas-proveedores',
      titulo: 'Deudas a Proveedores',
      descripcion: 'Listado de deudas pendientes con proveedores',
      icon: Building2,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      filters: [
        {
          type: 'dateRange',
          label: 'Fecha de emisión',
          fromState: deudasFechaDesde,
          toState: deudasFechaHasta,
          fromSetter: setDeudasFechaDesde,
          toSetter: setDeudasFechaHasta,
          optional: true
        },
        {
          type: 'select',
          label: 'Estado',
          state: deudasEstado,
          setter: setDeudasEstado,
          options: [
            { value: 'TODOS', label: 'Todos los estados' },
            { value: 'PENDIENTE', label: 'Solo Pendientes' },
            { value: 'PAGADO', label: 'Solo Pagadas' }
          ]
        }
      ],
      getParams: () => ({
        fecha_desde: deudasFechaDesde || undefined,
        fecha_hasta: deudasFechaHasta || undefined,
        estado: deudasEstado !== 'TODOS' ? deudasEstado : undefined
      })
    },
    {
      id: 'creditos-clientes',
      titulo: 'Créditos de Clientes',
      descripcion: 'Listado de créditos pendientes de cobro',
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      filters: [
        {
          type: 'dateRange',
          label: 'Fecha de venta',
          fromState: creditosFechaDesde,
          toState: creditosFechaHasta,
          fromSetter: setCreditosFechaDesde,
          toSetter: setCreditosFechaHasta,
          optional: true
        },
        {
          type: 'select',
          label: 'Estado',
          state: creditosEstado,
          setter: setCreditosEstado,
          options: [
            { value: 'TODOS', label: 'Todos los estados' },
            { value: 'PENDIENTE', label: 'Solo Pendientes' },
            { value: 'PAGADO', label: 'Solo Pagados' }
          ]
        }
      ],
      getParams: () => ({
        fecha_desde: creditosFechaDesde || undefined,
        fecha_hasta: creditosFechaHasta || undefined,
        estado: creditosEstado !== 'TODOS' ? creditosEstado : undefined
      })
    }
  ];

  return (
    <div className="space-y-6" data-testid="reportes-page">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">Genera y descarga reportes en formato PDF</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportes.map((reporte) => {
          const Icon = reporte.icon;
          return (
            <Card key={reporte.id} className="overflow-hidden">
              <CardHeader className={`${reporte.bgColor}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-background ${reporte.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{reporte.titulo}</CardTitle>
                    <CardDescription>{reporte.descripcion}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {reporte.filters && (
                  <div className="space-y-3 mb-4">
                    {reporte.filters.map((filter, idx) => {
                      if (filter.type === 'dateRange') {
                        return (
                          <div key={idx}>
                            {filter.label && (
                              <Label className="text-xs mb-2 block">
                                {filter.label} {filter.optional && '(Opcional)'}
                              </Label>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Desde</Label>
                                <Input
                                  type="date"
                                  value={filter.fromState}
                                  onChange={(e) => filter.fromSetter(e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Hasta</Label>
                                <Input
                                  type="date"
                                  value={filter.toState}
                                  onChange={(e) => filter.toSetter(e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      if (filter.type === 'select') {
                        return (
                          <div key={idx}>
                            <Label className="text-xs mb-1 block">{filter.label}</Label>
                            <Select value={filter.state} onValueChange={filter.setter}>
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {filter.options.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }
                      
                      return null;
                    })}
                  </div>
                )}
                
                <Button
                  className="w-full"
                  onClick={() => downloadReport(reporte.id, reporte.getParams())}
                  disabled={loading[reporte.id]}
                >
                  {loading[reporte.id] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Descargar PDF
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Reportes;
