import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
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
import { FlaskConical, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const Laboratorio = () => {
  const { api, empresa } = useApp();
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    codigo_barra: '',
    precio: ''
  });

  const fetchMaterias = async () => {
    if (!empresa?.id) return;
    try {
      const data = await api(`/materias-laboratorio?empresa_id=${empresa.id}`);
      setMaterias(data);
    } catch (e) {
      toast.error('Error al cargar materias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterias();
  }, [empresa?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.codigo_barra || !formData.precio) {
      toast.error('Complete todos los campos requeridos');
      return;
    }
    
    setSubmitting(true);
    try {
      await api('/materias-laboratorio', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          empresa_id: empresa.id,
          precio: parseFloat(formData.precio)
        })
      });
      
      toast.success('Materia creada exitosamente');
      setDialogOpen(false);
      setFormData({ nombre: '', descripcion: '', codigo_barra: '', precio: '' });
      fetchMaterias();
    } catch (e) {
      toast.error(e.message || 'Error al crear materia');
    } finally {
      setSubmitting(false);
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
    <div className="space-y-6" data-testid="laboratorio-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laboratorio</h1>
          <p className="text-muted-foreground">
            Crear items únicos para ventas (solo se pueden vender una vez)
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="crear-materia-btn">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Materia
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Materia</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Nombre de la materia"
                  data-testid="materia-nombre"
                />
              </div>
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Descripción detallada..."
                  data-testid="materia-descripcion"
                />
              </div>
              <div>
                <Label htmlFor="codigo_barra">Código de Barra *</Label>
                <Input
                  id="codigo_barra"
                  value={formData.codigo_barra}
                  onChange={(e) => setFormData({...formData, codigo_barra: e.target.value})}
                  placeholder="Código único"
                  className="font-mono"
                  data-testid="materia-codigo"
                />
              </div>
              <div>
                <Label htmlFor="precio">Precio de Venta (Gs.) *</Label>
                <Input
                  id="precio"
                  type="number"
                  value={formData.precio}
                  onChange={(e) => setFormData({...formData, precio: e.target.value})}
                  placeholder="0"
                  data-testid="materia-precio"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} data-testid="guardar-materia-btn">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Guardar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Listado de Materias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {materias.length === 0 ? (
            <div className="text-center py-12">
              <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay materias de laboratorio creadas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-compact">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materias.map((materia) => (
                  <TableRow key={materia.id} data-testid={`materia-row-${materia.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{materia.nombre}</p>
                        {materia.descripcion && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {materia.descripcion}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{materia.codigo_barra}</TableCell>
                    <TableCell className="font-mono-data">{formatCurrency(materia.precio)}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        materia.estado === 'DISPONIBLE' ? 'badge-success' : 'badge-warning'
                      )}>
                        {materia.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(materia.creado_en).toLocaleDateString('es-PY')}
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

export default Laboratorio;
