import React, { useState, useEffect } from 'react';
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
  DialogTrigger,
} from '../components/ui/dialog';
import { Warehouse, Plus, Loader2, Search, ArrowRight, Bell, Package } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const Stock = () => {
  const { api, empresa } = useApp();
  const [stock, setStock] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [traspasoDialogOpen, setTraspasoDialogOpen] = useState(false);
  const [almacenDialogOpen, setAlmacenDialogOpen] = useState(false);
  const [selectedAlmacen, setSelectedAlmacen] = useState('');
  const [search, setSearch] = useState('');
  
  const [entradaForm, setEntradaForm] = useState({
    producto_id: '',
    almacen_id: '',
    cantidad: ''
  });

  const [traspasoForm, setTraspasoForm] = useState({
    producto_id: '',
    almacen_origen_id: '',
    almacen_destino_id: '',
    cantidad: ''
  });

  const [almacenForm, setAlmacenForm] = useState({
    nombre: '',
    ubicacion: ''
  });

  const fetchData = async () => {
    if (!empresa?.id) return;
    try {
      let stockUrl = `/stock?empresa_id=${empresa.id}`;
      if (selectedAlmacen) stockUrl += `&almacen_id=${selectedAlmacen}`;
      
      const [stockData, almacenesData, productosData] = await Promise.all([
        api(stockUrl),
        api(`/almacenes?empresa_id=${empresa.id}`),
        api(`/productos?empresa_id=${empresa.id}`)
      ]);
      
      setStock(stockData);
      setAlmacenes(almacenesData);
      setProductos(productosData);
    } catch (e) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [empresa?.id, selectedAlmacen]);

  const handleEntrada = async (e) => {
    e.preventDefault();
    if (!entradaForm.producto_id || !entradaForm.almacen_id || !entradaForm.cantidad) {
      toast.error('Complete todos los campos');
      return;
    }

    try {
      await api('/stock/entrada', {
        method: 'POST',
        body: JSON.stringify({
          producto_id: parseInt(entradaForm.producto_id),
          almacen_id: parseInt(entradaForm.almacen_id),
          cantidad: parseInt(entradaForm.cantidad),
          tipo: 'ENTRADA'
        })
      });
      toast.success('Entrada registrada');
      setDialogOpen(false);
      setEntradaForm({ producto_id: '', almacen_id: '', cantidad: '' });
      fetchData();
    } catch (e) {
      toast.error('Error al registrar entrada');
    }
  };

  const handleTraspaso = async (e) => {
    e.preventDefault();
    if (!traspasoForm.producto_id || !traspasoForm.almacen_origen_id || 
        !traspasoForm.almacen_destino_id || !traspasoForm.cantidad) {
      toast.error('Complete todos los campos');
      return;
    }

    if (traspasoForm.almacen_origen_id === traspasoForm.almacen_destino_id) {
      toast.error('Los almacenes deben ser diferentes');
      return;
    }

    try {
      await api('/stock/traspaso', {
        method: 'POST',
        body: JSON.stringify({
          producto_id: parseInt(traspasoForm.producto_id),
          almacen_origen_id: parseInt(traspasoForm.almacen_origen_id),
          almacen_destino_id: parseInt(traspasoForm.almacen_destino_id),
          cantidad: parseInt(traspasoForm.cantidad)
        })
      });
      toast.success('Traspaso realizado');
      setTraspasoDialogOpen(false);
      setTraspasoForm({ producto_id: '', almacen_origen_id: '', almacen_destino_id: '', cantidad: '' });
      fetchData();
    } catch (e) {
      toast.error(e.message || 'Error al realizar traspaso');
    }
  };

  const handleCrearAlmacen = async (e) => {
    e.preventDefault();
    if (!almacenForm.nombre) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      await api('/almacenes', {
        method: 'POST',
        body: JSON.stringify({ ...almacenForm, empresa_id: empresa.id })
      });
      toast.success('Almacén creado');
      setAlmacenDialogOpen(false);
      setAlmacenForm({ nombre: '', ubicacion: '' });
      fetchData();
    } catch (e) {
      toast.error('Error al crear almacén');
    }
  };

  const handleSetAlerta = async (stockId, alertaMinima) => {
    try {
      await api(`/stock/${stockId}/alerta?alerta_minima=${alertaMinima}`, { method: 'PUT' });
      toast.success('Alerta configurada');
      fetchData();
    } catch (e) {
      toast.error('Error al configurar alerta');
    }
  };

  const filteredStock = stock.filter(s =>
    s.producto_nombre?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="stock-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock / Inventario</h1>
          <p className="text-muted-foreground">Gestión de inventario multi-almacén</p>
        </div>
        <div className="flex gap-2">
          {/* Crear Almacén */}
          <Dialog open={almacenDialogOpen} onOpenChange={setAlmacenDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Almacén
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Almacén</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCrearAlmacen} className="space-y-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={almacenForm.nombre}
                    onChange={(e) => setAlmacenForm({...almacenForm, nombre: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Ubicación</Label>
                  <Input
                    value={almacenForm.ubicacion}
                    onChange={(e) => setAlmacenForm({...almacenForm, ubicacion: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full">Crear Almacén</Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Traspaso */}
          <Dialog open={traspasoDialogOpen} onOpenChange={setTraspasoDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ArrowRight className="mr-2 h-4 w-4" />
                Traspaso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Traspaso entre Almacenes</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleTraspaso} className="space-y-4">
                <div>
                  <Label>Producto</Label>
                  <Select value={traspasoForm.producto_id} onValueChange={(v) => setTraspasoForm({...traspasoForm, producto_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {productos.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Almacén Origen</Label>
                  <Select value={traspasoForm.almacen_origen_id} onValueChange={(v) => setTraspasoForm({...traspasoForm, almacen_origen_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {almacenes.map(a => (
                        <SelectItem key={a.id} value={a.id.toString()}>{a.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Almacén Destino</Label>
                  <Select value={traspasoForm.almacen_destino_id} onValueChange={(v) => setTraspasoForm({...traspasoForm, almacen_destino_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {almacenes.map(a => (
                        <SelectItem key={a.id} value={a.id.toString()}>{a.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min="1"
                    value={traspasoForm.cantidad}
                    onChange={(e) => setTraspasoForm({...traspasoForm, cantidad: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full">Realizar Traspaso</Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Entrada Stock */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="entrada-stock-btn">
                <Plus className="mr-2 h-4 w-4" />
                Entrada
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Entrada de Stock</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEntrada} className="space-y-4">
                <div>
                  <Label>Producto</Label>
                  <Select value={entradaForm.producto_id} onValueChange={(v) => setEntradaForm({...entradaForm, producto_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {productos.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Almacén</Label>
                  <Select value={entradaForm.almacen_id} onValueChange={(v) => setEntradaForm({...entradaForm, almacen_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar almacén" />
                    </SelectTrigger>
                    <SelectContent>
                      {almacenes.map(a => (
                        <SelectItem key={a.id} value={a.id.toString()}>{a.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min="1"
                    value={entradaForm.cantidad}
                    onChange={(e) => setEntradaForm({...entradaForm, cantidad: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full">Registrar Entrada</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Almacenes Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {almacenes.map((almacen) => {
          const stockAlmacen = stock.filter(s => s.almacen_id === almacen.id);
          const totalItems = stockAlmacen.reduce((sum, s) => sum + s.cantidad, 0);
          return (
            <Card 
              key={almacen.id} 
              className={cn(
                "cursor-pointer transition-all",
                selectedAlmacen === almacen.id.toString() && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedAlmacen(
                selectedAlmacen === almacen.id.toString() ? '' : almacen.id.toString()
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Warehouse className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{almacen.nombre}</p>
                    <p className="text-sm text-muted-foreground">{totalItems} items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventario {selectedAlmacen && `- ${almacenes.find(a => a.id.toString() === selectedAlmacen)?.nombre}`}
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStock.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay stock registrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-compact">
                  <TableHead>Producto</TableHead>
                  <TableHead>Almacén</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Alerta Mínima</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStock.map((item) => {
                  const isBajo = item.alerta_minima && item.cantidad <= item.alerta_minima;
                  return (
                    <TableRow key={item.id} className={cn(isBajo && "bg-red-50 dark:bg-red-900/10")}>
                      <TableCell className="font-medium">{item.producto_nombre}</TableCell>
                      <TableCell>{item.almacen_nombre}</TableCell>
                      <TableCell className="font-mono-data font-bold">{item.cantidad}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            className="w-20 h-8"
                            defaultValue={item.alerta_minima || ''}
                            onBlur={(e) => {
                              if (e.target.value) {
                                handleSetAlerta(item.id, parseInt(e.target.value));
                              }
                            }}
                          />
                          <Bell className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>
                        {isBajo ? (
                          <Badge variant="destructive">Stock Bajo</Badge>
                        ) : (
                          <Badge className="badge-success">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Stock;
