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
import { Building2, Plus, Loader2, Search, Edit, Trash2, DollarSign, Check } from 'lucide-react';
import { toast } from 'sonner';

const Proveedores = () => {
  const { api, empresa } = useApp();
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deudaDialogOpen, setDeudaDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [deudas, setDeudas] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState({
    nombre: '',
    ruc: '',
    direccion: '',
    telefono: '',
    email: ''
  });

  const [deudaForm, setDeudaForm] = useState({
    monto: '',
    descripcion: ''
  });

  const fetchProveedores = async () => {
    if (!empresa?.id) return;
    try {
      const data = await api(`/proveedores?empresa_id=${empresa.id}`);
      setProveedores(data);
    } catch (e) {
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProveedores();
  }, [empresa?.id]);

  const resetForm = () => {
    setFormData({ nombre: '', ruc: '', direccion: '', telefono: '', email: '' });
    setEditingId(null);
  };

  const handleEdit = (proveedor) => {
    setFormData({
      nombre: proveedor.nombre,
      ruc: proveedor.ruc || '',
      direccion: proveedor.direccion || '',
      telefono: proveedor.telefono || '',
      email: proveedor.email || ''
    });
    setEditingId(proveedor.id);
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
      if (editingId) {
        await api(`/proveedores/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        toast.success('Proveedor actualizado');
      } else {
        await api('/proveedores', {
          method: 'POST',
          body: JSON.stringify({ ...formData, empresa_id: empresa.id })
        });
        toast.success('Proveedor creado');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchProveedores();
    } catch (e) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Desactivar este proveedor?')) return;
    try {
      await api(`/proveedores/${id}`, { method: 'DELETE' });
      toast.success('Proveedor desactivado');
      fetchProveedores();
    } catch (e) {
      toast.error('Error al eliminar');
    }
  };

  const fetchDeudas = async (proveedorId) => {
    try {
      const data = await api(`/proveedores/${proveedorId}/deudas`);
      setDeudas(data);
    } catch (e) {
      toast.error('Error al cargar deudas');
    }
  };

  const handleVerDeudas = (proveedor) => {
    setSelectedProveedor(proveedor);
    fetchDeudas(proveedor.id);
    setDeudaDialogOpen(true);
  };

  const handleCrearDeuda = async (e) => {
    e.preventDefault();
    if (!deudaForm.monto) {
      toast.error('El monto es requerido');
      return;
    }

    try {
      await api(`/proveedores/${selectedProveedor.id}/deudas`, {
        method: 'POST',
        body: JSON.stringify({
          monto: parseFloat(deudaForm.monto),
          descripcion: deudaForm.descripcion
        })
      });
      toast.success('Deuda registrada');
      setDeudaForm({ monto: '', descripcion: '' });
      fetchDeudas(selectedProveedor.id);
    } catch (e) {
      toast.error('Error al crear deuda');
    }
  };

  const handlePagarDeuda = async (deudaId) => {
    try {
      await api(`/deudas/${deudaId}/pagar`, { method: 'PUT' });
      toast.success('Deuda pagada');
      fetchDeudas(selectedProveedor.id);
    } catch (e) {
      toast.error('Error al pagar deuda');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(value);
  };

  const filteredProveedores = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.ruc?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="proveedores-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-muted-foreground">Gestión de proveedores y deudas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="crear-proveedor-btn">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar' : 'Nuevo'} Proveedor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  data-testid="proveedor-nombre"
                />
              </div>
              <div>
                <Label>RUC</Label>
                <Input
                  value={formData.ruc}
                  onChange={(e) => setFormData({...formData, ruc: e.target.value})}
                />
              </div>
              <div>
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
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Guardar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Deudas Dialog */}
      <Dialog open={deudaDialogOpen} onOpenChange={setDeudaDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Deudas - {selectedProveedor?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <form onSubmit={handleCrearDeuda} className="flex gap-2">
              <Input
                type="number"
                placeholder="Monto"
                value={deudaForm.monto}
                onChange={(e) => setDeudaForm({...deudaForm, monto: e.target.value})}
                className="flex-1"
              />
              <Input
                placeholder="Descripción"
                value={deudaForm.descripcion}
                onChange={(e) => setDeudaForm({...deudaForm, descripcion: e.target.value})}
                className="flex-1"
              />
              <Button type="submit">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {deudas.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Sin deudas registradas</p>
              ) : (
                deudas.map((deuda) => (
                  <div key={deuda.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="font-mono-data font-medium">{formatCurrency(deuda.monto)}</p>
                      <p className="text-xs text-muted-foreground">{deuda.descripcion || 'Sin descripción'}</p>
                    </div>
                    {deuda.pagado ? (
                      <Badge className="badge-success">Pagado</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handlePagarDeuda(deuda.id)}>
                        <Check className="h-4 w-4 mr-1" /> Pagar
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Listado ({filteredProveedores.length})
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
                <TableHead>Proveedor</TableHead>
                <TableHead>RUC</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProveedores.map((proveedor) => (
                <TableRow key={proveedor.id}>
                  <TableCell>
                    <p className="font-medium">{proveedor.nombre}</p>
                    {proveedor.direccion && (
                      <p className="text-xs text-muted-foreground">{proveedor.direccion}</p>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{proveedor.ruc || '-'}</TableCell>
                  <TableCell>{proveedor.telefono || '-'}</TableCell>
                  <TableCell>{proveedor.email || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleVerDeudas(proveedor)}>
                        <DollarSign className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(proveedor)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(proveedor.id)}>
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

export default Proveedores;
