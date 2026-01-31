import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { Tag, Plus, Loader2, Search, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const Marcas = () => {
  const { api, empresa } = useApp();
  const [marcas, setMarcas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [nombre, setNombre] = useState('');

  const fetchMarcas = async () => {
    if (!empresa?.id) return;
    try {
      const data = await api(`/marcas?empresa_id=${empresa.id}`);
      setMarcas(data);
    } catch (e) {
      toast.error('Error al cargar marcas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarcas();
  }, [empresa?.id]);

  const resetForm = () => {
    setNombre('');
    setEditingId(null);
  };

  const handleEdit = (marca) => {
    setNombre(marca.nombre);
    setEditingId(marca.id);
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    
    setSubmitting(true);
    try {
      if (editingId) {
        await api(`/marcas/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ nombre })
        });
        toast.success('Marca actualizada');
      } else {
        await api('/marcas', {
          method: 'POST',
          body: JSON.stringify({ nombre, empresa_id: empresa.id })
        });
        toast.success('Marca creada');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchMarcas();
    } catch (e) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta marca?')) return;
    try {
      await api(`/marcas/${id}`, { method: 'DELETE' });
      toast.success('Marca eliminada');
      fetchMarcas();
    } catch (e) {
      toast.error('Error al eliminar');
    }
  };

  const filteredMarcas = marcas.filter(m =>
    m.nombre.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="marcas-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Marcas</h1>
          <p className="text-muted-foreground">Gestión de marcas de productos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="crear-marca-btn">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Marca
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar' : 'Nueva'} Marca</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre de la marca"
                  data-testid="marca-nombre-input"
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Listado ({filteredMarcas.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar marca..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMarcas.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay marcas registradas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-compact">
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="w-20">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMarcas.map((marca) => (
                  <TableRow key={marca.id}>
                    <TableCell className="font-mono text-sm">{marca.id}</TableCell>
                    <TableCell className="font-medium">{marca.nombre}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(marca)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(marca.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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

export default Marcas;
