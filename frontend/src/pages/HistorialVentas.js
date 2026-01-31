import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { 
  History, Search, Filter, Printer, FileText, Receipt, Eye, 
  Loader2, Calendar, DollarSign, User, XCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import PrintModal from '../components/PrintModal';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val || 0);
};

const HistorialVentas = () => {
  const { api, empresa } = useApp();
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // Print modal state
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printVentaId, setPrintVentaId] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    fecha_desde: '',
    fecha_hasta: '',
    cliente_id: '',
    usuario_id: '',
    monto_min: '',
    monto_max: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchVentas = async () => {
    if (!empresa?.id) return;
    setLoading(true);
    try {
      let endpoint = `/ventas?empresa_id=${empresa.id}`;
      
      if (filters.fecha_desde) endpoint += `&fecha_desde=${filters.fecha_desde}`;
      if (filters.fecha_hasta) endpoint += `&fecha_hasta=${filters.fecha_hasta}`;
      if (filters.cliente_id && filters.cliente_id !== 'all') endpoint += `&cliente_id=${filters.cliente_id}`;
      if (filters.usuario_id && filters.usuario_id !== 'all') endpoint += `&usuario_id=${filters.usuario_id}`;
      if (filters.monto_min) endpoint += `&monto_min=${filters.monto_min}`;
      if (filters.monto_max) endpoint += `&monto_max=${filters.monto_max}`;
      
      const data = await api(endpoint);
      setVentas(data);
    } catch (e) {
      toast.error('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!empresa?.id) return;
    try {
      const [clientesData, usuariosData] = await Promise.all([
        api(`/clientes?empresa_id=${empresa.id}`),
        api(`/usuarios?empresa_id=${empresa.id}`)
      ]);
      setClientes(clientesData);
      setUsuarios(usuariosData);
    } catch (e) {
      console.error('Error fetching data:', e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchVentas();
  }, [empresa?.id]);

  const handleFilter = () => {
    fetchVentas();
  };

  const handleClearFilters = () => {
    setFilters({
      fecha_desde: '',
      fecha_hasta: '',
      cliente_id: '',
      usuario_id: '',
      monto_min: '',
      monto_max: '',
    });
    setTimeout(fetchVentas, 100);
  };

  const handleViewDetail = (venta) => {
    setSelectedVenta(venta);
    setDetailDialogOpen(true);
  };

  const handlePrint = (ventaId) => {
    setPrintVentaId(ventaId);
    setPrintModalOpen(true);
  };

  const handleAnular = async (ventaId) => {
    if (!window.confirm('¿Está seguro de anular esta venta?')) return;
    try {
      await api(`/ventas/${ventaId}/anular`, { method: 'POST' });
      toast.success('Venta anulada');
      fetchVentas();
    } catch (e) {
      toast.error('Error al anular venta');
    }
  };

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'COMPLETADA':
        return <Badge className="badge-success">Completada</Badge>;
      case 'PENDIENTE':
        return <Badge className="badge-warning">Pendiente</Badge>;
      case 'ANULADA':
        return <Badge variant="destructive">Anulada</Badge>;
      default:
        return <Badge>{estado}</Badge>;
    }
  };

  if (loading && ventas.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="historial-ventas-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Historial de Ventas</h1>
          <p className="text-muted-foreground">Consulta y reimpresión de documentos</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowFilters(!showFilters)}
          data-testid="toggle-filters-btn"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filtros
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Fecha Desde</Label>
                <Input
                  type="date"
                  value={filters.fecha_desde}
                  onChange={(e) => setFilters({...filters, fecha_desde: e.target.value})}
                />
              </div>
              <div>
                <Label>Fecha Hasta</Label>
                <Input
                  type="date"
                  value={filters.fecha_hasta}
                  onChange={(e) => setFilters({...filters, fecha_hasta: e.target.value})}
                />
              </div>
              <div>
                <Label>Cliente</Label>
                <Select 
                  value={filters.cliente_id || 'all'} 
                  onValueChange={(v) => setFilters({...filters, cliente_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.nombre} {c.apellido || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vendedor</Label>
                <Select 
                  value={filters.usuario_id || 'all'} 
                  onValueChange={(v) => setFilters({...filters, usuario_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {usuarios.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.nombre} {u.apellido || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monto Mínimo</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.monto_min}
                  onChange={(e) => setFilters({...filters, monto_min: e.target.value})}
                />
              </div>
              <div>
                <Label>Monto Máximo</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.monto_max}
                  onChange={(e) => setFilters({...filters, monto_max: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleFilter}>
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
              <Button variant="outline" onClick={handleClearFilters}>
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Ventas ({ventas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ventas.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay ventas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="table-compact">
                    <TableHead>ID</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo Pago</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-32">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventas.map((venta) => (
                    <TableRow key={venta.id}>
                      <TableCell className="font-mono text-sm">{venta.id}</TableCell>
                      <TableCell>
                        {new Date(venta.creado_en).toLocaleDateString('es-PY')}
                        <span className="text-xs text-muted-foreground block">
                          {new Date(venta.creado_en).toLocaleTimeString('es-PY', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{venta.cliente_nombre}</span>
                        {venta.cliente_ruc && (
                          <span className="text-xs text-muted-foreground block">
                            RUC: {venta.cliente_ruc}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{venta.tipo_pago || 'EFECTIVO'}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono-data font-medium">
                        {formatCurrency(venta.total)}
                      </TableCell>
                      <TableCell>
                        {getEstadoBadge(venta.estado)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleViewDetail(venta)}
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handlePrint(venta.id)}
                            title="Imprimir"
                            disabled={venta.estado === 'ANULADA'}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          {venta.estado !== 'ANULADA' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleAnular(venta.id)}
                              title="Anular"
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Venta #{selectedVenta?.id}</DialogTitle>
          </DialogHeader>
          {selectedVenta && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Cliente</Label>
                  <p className="font-medium">{selectedVenta.cliente_nombre}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha</Label>
                  <p className="font-medium">
                    {new Date(selectedVenta.creado_en).toLocaleString('es-PY')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo de Pago</Label>
                  <p className="font-medium">{selectedVenta.tipo_pago || 'EFECTIVO'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estado</Label>
                  <p>{getEstadoBadge(selectedVenta.estado)}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground mb-2 block">Items</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedVenta.items?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.cantidad}</TableCell>
                        <TableCell>{item.descripcion || `Producto #${item.producto_id || item.materia_id}`}</TableCell>
                        <TableCell className="text-right font-mono-data">
                          {formatCurrency(item.precio_unitario)}
                        </TableCell>
                        <TableCell className="text-right font-mono-data">
                          {formatCurrency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Descuento: {formatCurrency(selectedVenta.descuento || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    IVA 10%: {formatCurrency(selectedVenta.iva || 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold font-mono-data">
                    {formatCurrency(selectedVenta.total)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                  Cerrar
                </Button>
                <Button onClick={() => {
                  setDetailDialogOpen(false);
                  handlePrint(selectedVenta.id);
                }}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Modal */}
      <PrintModal 
        open={printModalOpen} 
        onOpenChange={setPrintModalOpen}
        ventaId={printVentaId}
      />
    </div>
  );
};

export default HistorialVentas;
