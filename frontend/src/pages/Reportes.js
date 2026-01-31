import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  FileText, Download, Loader2, Package, Users, Building2, 
  DollarSign, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const Reportes = () => {
  const { empresa, API_URL, token } = useApp();
  const [loading, setLoading] = useState({});
  
  // Date filters for ventas report
  const [fechaDesde, setFechaDesde] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [fechaHasta, setFechaHasta] = useState(
    new Date().toISOString().split('T')[0]
  );

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
      needsDates: true
    },
    {
      id: 'stock',
      titulo: 'Reporte de Stock',
      descripcion: 'Estado actual del inventario con alertas de stock bajo',
      icon: Package,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      needsDates: false
    },
    {
      id: 'deudas-proveedores',
      titulo: 'Deudas a Proveedores',
      descripcion: 'Listado de deudas pendientes con proveedores',
      icon: Building2,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      needsDates: false
    },
    {
      id: 'creditos-clientes',
      titulo: 'Créditos de Clientes',
      descripcion: 'Listado de créditos pendientes de cobro',
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      needsDates: false
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
                {reporte.needsDates && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <Label className="text-xs">Desde</Label>
                      <Input
                        type="date"
                        value={fechaDesde}
                        onChange={(e) => setFechaDesde(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Hasta</Label>
                      <Input
                        type="date"
                        value={fechaHasta}
                        onChange={(e) => setFechaHasta(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                
                <Button
                  className="w-full"
                  onClick={() => downloadReport(
                    reporte.id,
                    reporte.needsDates ? { fecha_desde: fechaDesde, fecha_hasta: fechaHasta } : {}
                  )}
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
