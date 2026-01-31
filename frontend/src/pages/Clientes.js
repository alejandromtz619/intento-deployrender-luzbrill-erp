import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
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
import { Users, Plus, Loader2, Search, Edit, Trash2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const Clientes = () => {
  const { api, empresa } = useApp();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    ruc: '',
    cedula: '',
    direccion: '',
    telefono: '',
    email: '',
    acepta_cheque: false,
    descuento_porcentaje: '0'
  });

  const fetchClientes = async () => {
    if (!empresa?.id) return;
    try {
      const data = await api(`/clientes?empresa_id=${empresa.id}`);
      setClientes(data);
    } catch (e) {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, [empresa?.id]);

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellido: '',
      ruc: '',
      cedula: '',
      direccion: '',
      telefono: '',
      email: '',
      acepta_cheque: false,
      descuento_porcentaje: '0'
    });
    setEditingId(null);
  };

  const handleEdit = (cliente) => {
    setFormData({
      nombre: cliente.nombre,
      apellido: cliente.apellido || '',
      ruc: cliente.ruc || '',
      cedula: cliente.cedula || '',
      direccion: cliente.direccion || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      acepta_cheque: cliente.acepta_cheque || false,
      descuento_porcentaje: cliente.descuento_porcentaje?.toString() || '0'
    });
    setEditingId(cliente.id);
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre) {
      toast.error('El nombre es requerido');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        descuento_porcentaje: parseFloat(formData.descuento_porcentaje) || 0
      };

      if (editingId) {
        await api(`/clientes/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        toast.success('Cliente actualizado');
      } else {
        await api('/clientes', {
          method: 'POST',
          body: JSON.stringify({ ...payload, empresa_id: empresa.id })
        });
        toast.success('Cliente creado');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchClientes();
    } catch (e) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Desactivar este cliente?')) return;
    try {
      await api(`/clientes/${id}`, { method: 'DELETE' });
      toast.success('Cliente desactivado');
      fetchClientes();
    } catch (e) {
      toast.error('Error al eliminar');
    }
  };

  const filteredClientes = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.ruc?.toLowerCase().includes(search.toLowerCase()) ||
    c.telefono?.includes(search)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="clientes-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gestión de clientes y créditos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="crear-cliente-btn">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar' : 'Nuevo'} Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    data-testid="cliente-nombre"
                  />
                </div>
                <div>
                  <Label>Apellido</Label>
                  <Input
                    value={formData.apellido}
                    onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                  />
                </div>
                <div>
                  <Label>RUC</Label>
                  <Input
                    value={formData.ruc}
                    onChange={(e) => setFormData({...formData, ruc: e.target.value})}
                    placeholder="Para facturación"
                    data-testid="cliente-ruc"
                  />
                </div>
                <div>
                  <Label>Cédula</Label>
                  <Input
                    value={formData.cedula}
                    onChange={(e) => setFormData({...formData, cedula: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Dirección</Label>
                  <Input
                    value={formData.direccion}
                    onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    data-testid="cliente-telefono"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Descuento (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.descuento_porcentaje}
                    onChange={(e) => setFormData({...formData, descuento_porcentaje: e.target.value})}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="acepta_cheque"
                    checked={formData.acepta_cheque}
                    onCheckedChange={(checked) => setFormData({...formData, acepta_cheque: checked})}
                  />
                  <Label htmlFor="acepta_cheque">Acepta Cheque</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} data-testid="guardar-cliente-btn">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Guardar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Listado ({filteredClientes.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="table-compact">
                <TableHead>Cliente</TableHead>
                <TableHead>RUC</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Descuento</TableHead>
                <TableHead>Cheque</TableHead>
                <TableHead className="w-20">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.map((cliente) => (
                <TableRow key={cliente.id} data-testid={`cliente-row-${cliente.id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{cliente.nombre} {cliente.apellido}</p>
                      {cliente.email && (
                        <p className="text-xs text-muted-foreground">{cliente.email}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{cliente.ruc || '-'}</TableCell>
                  <TableCell>{cliente.telefono || '-'}</TableCell>
                  <TableCell>
                    {cliente.descuento_porcentaje > 0 && (
                      <Badge className="badge-success">{cliente.descuento_porcentaje}%</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {cliente.acepta_cheque && <Badge className="badge-info">Sí</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(cliente)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cliente.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Clientes;
