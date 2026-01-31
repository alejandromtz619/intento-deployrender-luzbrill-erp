import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Truck, Plus, Loader2, Search, Filter, MapPin, User, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const estadoColors = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  EN_CAMINO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ENTREGADO: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELADO: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};

const Delivery = () => {
  const { api, empresa } = useApp();
  const [entregas, setEntregas] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filtros, setFiltros] = useState({
    fechaDesde: new Date().toISOString().split('T')[0],
    fechaHasta: '',
    vehiculoId: '',
    responsableId: '',
    estado: ''
  });

  const fetchData = async () => {
    if (!empresa?.id) return;
    try {
      let url = `/entregas?empresa_id=${empresa.id}`;
      if (filtros.fechaDesde) url += `&fecha_desde=${filtros.fechaDesde}`;
      if (filtros.fechaHasta) url += `&fecha_hasta=${filtros.fechaHasta}`;
      if (filtros.vehiculoId) url += `&vehiculo_id=${filtros.vehiculoId}`;
      if (filtros.responsableId) url += `&responsable_id=${filtros.responsableId}`;
      if (filtros.estado) url += `&estado=${filtros.estado}`;
      
      const [entregasData, vehiculosData, usuariosData] = await Promise.all([
        api(url),
        api(`/vehiculos?empresa_id=${empresa.id}`),
        api(`/usuarios?empresa_id=${empresa.id}`)
      ]);
      
      setEntregas(entregasData);
      setVehiculos(vehiculosData);
      setUsuarios(usuariosData);
    } catch (e) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [empresa?.id, filtros]);

  const handleCambiarEstado = async (id, nuevoEstado) => {
    try {
      await api(`/entregas/${id}/estado?estado=${nuevoEstado}`, { method: 'PUT' });
      toast.success('Estado actualizado');
      fetchData();
    } catch (e) {
      toast.error('Error al actualizar estado');
    }
  };

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
    <div className="space-y-6" data-testid="delivery-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Delivery</h1>
          <p className="text-muted-foreground">Gestión de entregas y pedidos</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label>Fecha Desde</Label>
              <Input
                type="date"
                value={filtros.fechaDesde}
                onChange={(e) => setFiltros({...filtros, fechaDesde: e.target.value})}
              />
            </div>
            <div>
              <Label>Fecha Hasta</Label>
              <Input
                type="date"
                value={filtros.fechaHasta}
                onChange={(e) => setFiltros({...filtros, fechaHasta: e.target.value})}
              />
            </div>
            <div>
              <Label>Vehículo</Label>
              <Select value={filtros.vehiculoId} onValueChange={(v) => setFiltros({...filtros, vehiculoId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {vehiculos.map(v => (
                    <SelectItem key={v.id} value={v.id.toString()}>{v.tipo} - {v.chapa}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsable</Label>
              <Select value={filtros.responsableId} onValueChange={(v) => setFiltros({...filtros, responsableId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {usuarios.map(u => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={filtros.estado} onValueChange={(v) => setFiltros({...filtros, estado: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="EN_CAMINO">En Camino</SelectItem>
                  <SelectItem value="ENTREGADO">Entregado</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de entregas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Entregas ({entregas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entregas.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay entregas para mostrar</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {entregas.map((entrega) => (
                <Card key={entrega.id} className="card-hover" data-testid={`entrega-card-${entrega.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={cn(estadoColors[entrega.estado])}>
                        {entrega.estado.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        #{entrega.venta_id}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{entrega.cliente_nombre}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{entrega.vehiculo_chapa}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{entrega.responsable_nombre}</span>
                      </div>
                    </div>

                    {entrega.estado !== 'ENTREGADO' && entrega.estado !== 'CANCELADO' && (
                      <div className="mt-4 flex gap-2">
                        {entrega.estado === 'PENDIENTE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleCambiarEstado(entrega.id, 'EN_CAMINO')}
                          >
                            En Camino
                          </Button>
                        )}
                        {entrega.estado === 'EN_CAMINO' && (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleCambiarEstado(entrega.id, 'ENTREGADO')}
                          >
                            Entregar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCambiarEstado(entrega.id, 'CANCELADO')}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Delivery;
