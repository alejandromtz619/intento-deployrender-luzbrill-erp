import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { FileText, Loader2, AlertTriangle } from 'lucide-react';

const Facturas = () => {
  const { api, empresa } = useApp();
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFacturas = async () => {
      if (!empresa?.id) return;
      try {
        const data = await api(`/facturas?empresa_id=${empresa.id}`);
        setFacturas(data);
      } catch (e) {
        console.error('Error al cargar facturas:', e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFacturas();
  }, [empresa?.id]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="facturas-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facturas</h1>
          <p className="text-muted-foreground">Documentos de facturación</p>
        </div>
      </div>

      {/* SIFEN Notice */}
      <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Módulo en preparación para SIFEN
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Este módulo está preparado para la integración con el Sistema Integrado de 
                Facturación Electrónica Nacional (SIFEN) de Paraguay. La funcionalidad completa 
                estará disponible próximamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Listado de Facturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {facturas.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay facturas registradas</p>
              <p className="text-sm text-muted-foreground mt-2">
                Las facturas se generarán automáticamente al confirmar ventas con datos fiscales
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-compact">
                  <TableHead>Número</TableHead>
                  <TableHead>Venta #</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>IVA</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facturas.map((factura) => (
                  <TableRow key={factura.id}>
                    <TableCell className="font-mono font-medium">{factura.numero}</TableCell>
                    <TableCell>#{factura.venta_id}</TableCell>
                    <TableCell className="font-mono-data">{formatCurrency(factura.total)}</TableCell>
                    <TableCell className="font-mono-data">{formatCurrency(factura.iva)}</TableCell>
                    <TableCell>
                      <Badge className="badge-success">{factura.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(factura.creado_en).toLocaleDateString('es-PY')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Facturas;
