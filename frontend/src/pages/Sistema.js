import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { Settings, Sun, Moon, Palette, Phone, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const colorOptions = [
  { id: 'blue', name: 'Azul', hex: '#0044CC' },
  { id: 'green', name: 'Verde', hex: '#10B981' },
  { id: 'purple', name: 'Púrpura', hex: '#8B5CF6' },
  { id: 'red', name: 'Rojo', hex: '#EF4444' },
  { id: 'orange', name: 'Naranja', hex: '#F97316' },
  { id: 'teal', name: 'Turquesa', hex: '#14B8A6' },
];

const Sistema = () => {
  const { user, theme, setTheme, primaryColor, setPrimaryColor, api } = useApp();
  const [saving, setSaving] = useState(false);

  const handleSavePreferences = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      await api('/preferencias', {
        method: 'POST',
        body: JSON.stringify({
          usuario_id: user.id,
          tema: theme,
          color_primario: colorOptions.find(c => c.id === primaryColor)?.hex || '#0044CC'
        })
      });
      toast.success('Preferencias guardadas');
    } catch (e) {
      toast.error('Error al guardar preferencias');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl" data-testid="sistema-page">
      <div>
        <h1 className="text-2xl font-bold">Configuración del Sistema</h1>
        <p className="text-muted-foreground">Personaliza tu experiencia en Luz Brill ERP</p>
      </div>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Apariencia
          </CardTitle>
          <CardDescription>
            Estas preferencias son solo para tu usuario y no afectan a otros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <div>
                <Label>Modo Oscuro</Label>
                <p className="text-sm text-muted-foreground">
                  Cambia entre tema claro y oscuro
                </p>
              </div>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              data-testid="theme-switch"
            />
          </div>

          <Separator />

          {/* Color Selection */}
          <div>
            <Label className="mb-3 block">Color Principal</Label>
            <div className="grid grid-cols-6 gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setPrimaryColor(color.id)}
                  className={cn(
                    "w-full aspect-square rounded-lg transition-all",
                    "hover:scale-105 hover:shadow-lg",
                    primaryColor === color.id && "ring-2 ring-offset-2 ring-foreground"
                  )}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                  data-testid={`color-${color.id}`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Color actual: {colorOptions.find(c => c.id === primaryColor)?.name || 'Azul'}
            </p>
          </div>

          <Button onClick={handleSavePreferences} disabled={saving} className="w-full">
            {saving ? 'Guardando...' : 'Guardar Preferencias'}
          </Button>
        </CardContent>
      </Card>

      {/* Support Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Soporte Técnico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-secondary p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Alejandro Martinez</p>
                <p className="text-sm text-muted-foreground">Ether - Soporte Técnico</p>
                <p className="text-primary font-mono mt-1">0976 574 271</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Versión</span>
              <span className="font-mono">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Usuario</span>
              <span>{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA Paraguay</span>
              <span className="font-mono">10%</span>
            </div>
            <Separator className="my-2" />
            <p className="text-xs text-muted-foreground text-center">
              Luz Brill ERP © 2024 - Sistema de Gestión Empresarial
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Sistema;
