# Fix: Filtro de Tipo de Pago en Dashboard

## Problema Identificado
El filtro de tipo de pago (Contado vs Crédito) en el dashboard solo funcionaba para los períodos "día" y "semana", pero no para "mes", "trimestre", "semestre" y "año".

### Causa Raíz
Los primeros dos períodos (día y semana) utilizaban un array `base_filters` que incluía la condición del `tipo_pago`, pero los períodos restantes usaban consultas con filtros inline que no incluían esta condición.

```python
# ✅ CORRECTO (día y semana)
base_filters = [
    Venta.empresa_id == empresa_id,
    Venta.estado == EstadoVenta.CONFIRMADA
]

if tipo_pago == 'contado':
    base_filters.append(Venta.tipo_pago.in_([TipoPago.EFECTIVO, TipoPago.TARJETA, TipoPago.TRANSFERENCIA, TipoPago.CHEQUE]))
elif tipo_pago == 'credito':
    base_filters.append(Venta.tipo_pago == TipoPago.CREDITO)

result = await db.execute(
    select(...).where(and_(*base_filters))
)

# ❌ INCORRECTO (mes, trimestre, semestre, año)
result = await db.execute(
    select(...)
    .where(
        Venta.empresa_id == empresa_id,
        Venta.estado == EstadoVenta.CONFIRMADA,
        Venta.creado_en >= fecha_inicio_dt  # ← No incluye tipo_pago!
    )
)
```

## Solución Implementada

Se actualizaron todos los períodos para usar el mismo patrón `base_filters`:

### Cambios en `backend/server.py` - Función `obtener_ventas_por_periodo()`

#### 1. Período "mes" (línea ~2269)
```python
elif periodo == "mes":
    fecha_inicio = today - timedelta(days=29)
    fecha_inicio_dt = datetime.combine(fecha_inicio, datetime.min.time()).replace(tzinfo=timezone.utc)
    
    base_filters.append(Venta.creado_en >= fecha_inicio_dt)  # ← Agregado
    
    result = await db.execute(
        select(...)
        .where(and_(*base_filters))  # ← Usa base_filters
    )
```

#### 2. Período "trimestre" (línea ~2311)
```python
elif periodo == "trimestre":
    fecha_inicio = today - timedelta(days=90)
    fecha_inicio_dt = datetime.combine(fecha_inicio, datetime.min.time()).replace(tzinfo=timezone.utc)
    
    base_filters.append(Venta.creado_en >= fecha_inicio_dt)  # ← Agregado
    
    result = await db.execute(
        select(...)
        .where(and_(*base_filters))  # ← Usa base_filters
    )
```

#### 3. Período "semestre" (línea ~2353)
```python
elif periodo == "semestre":
    fecha_inicio = today - timedelta(days=180)
    fecha_inicio_dt = datetime.combine(fecha_inicio, datetime.min.time()).replace(tzinfo=timezone.utc)
    
    base_filters.append(Venta.creado_en >= fecha_inicio_dt)  # ← Agregado
    
    result = await db.execute(
        select(...)
        .where(and_(*base_filters))  # ← Usa base_filters
    )
```

#### 4. Período "año" (línea ~2407)
```python
elif periodo == "anio":
    fecha_inicio = today - timedelta(days=365)
    fecha_inicio_dt = datetime.combine(fecha_inicio, datetime.min.time()).replace(tzinfo=timezone.utc)
    
    base_filters.append(Venta.creado_en >= fecha_inicio_dt)  # ← Agregado
    
    result = await db.execute(
        select(...)
        .where(and_(*base_filters))  # ← Usa base_filters
    )
```

## Deployment

### Paso 1: Commit y Push
```bash
git add backend/server.py
git commit -m "fix: Aplicar filtro tipo_pago a todos los períodos en dashboard"
git push origin dev
```

### Paso 2: Verificación
1. Esperar a que Render redeploy automáticamente (~3-5 minutos)
2. Ir a Dashboard
3. Seleccionar "Crédito" en el selector "Tipo Pago"
4. Cambiar entre períodos: día, semana, **mes, trimestre, semestre, año**
5. Verificar que solo aparecen ventas a crédito en todos los períodos
6. Repetir con "Contado"

### Comportamiento Esperado
- **"Todos"**: Muestra todas las ventas confirmadas
- **"Contado"**: Filtra solo ventas con tipo_pago = EFECTIVO, TARJETA, TRANSFERENCIA, CHEQUE
- **"Crédito"**: Filtra solo ventas con tipo_pago = CREDITO

## Migración de Permiso `delivery.eliminar`

El botón de eliminar delivery no aparece porque el permiso no existe en la base de datos de producción.

### Aplicar Migración en Render

1. Ir a Render Dashboard → luzbrill-db → Shell
2. Ejecutar:
```bash
# Conectarse a la base de datos
psql $DATABASE_URL

# Copiar y pegar el contenido de backend/migrations/003_add_delivery_eliminar_permission.sql
INSERT INTO permisos (clave, descripcion)
VALUES ('delivery.eliminar', 'Eliminar entregas')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'Administrador'
AND p.clave = 'delivery.eliminar'
AND NOT EXISTS (
    SELECT 1 FROM roles_permisos rp
    WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
);

# Verificar
SELECT * FROM permisos WHERE clave = 'delivery.eliminar';

# Salir
\q
```

3. Hacer logout/login en el frontend para refrescar permisos

## Testing

### Test Manual - Filtro de Pago
```bash
# Backend local
curl "http://localhost:8000/api/ventas/periodo?empresa_id=1&periodo=mes&tipo_pago=credito&metrica=monto"

# Producción
curl "https://luzbrill-backend.ddelvalle.xyz/api/ventas/periodo?empresa_id=1&periodo=mes&tipo_pago=credito&metrica=monto"
```

### Test Manual - Delete Delivery
1. Ir a módulo Delivery
2. Click en una orden pendiente
3. Verificar que aparece botón "Eliminar" (rojo, esquina inferior izquierda)
4. Click en Eliminar → Confirmar
5. Verificar que la orden desaparece

## Archivos Modificados
- `backend/server.py` - Función `obtener_ventas_por_periodo()` (líneas ~2180-2450)
- `backend/migrations/003_add_delivery_eliminar_permission.sql` - Nueva migración

## Checklist
- [x] Código modificado (backend/server.py)
- [x] Migración SQL creada
- [ ] Commit + Push a `dev`
- [ ] Render autodeploy completado
- [ ] Testing filtro en todos los períodos
- [ ] Migración SQL aplicada en Render DB
- [ ] Testing botón eliminar delivery
- [ ] Merge a `main` (después de testing)

---

**Fecha**: Enero 2026  
**Versión**: v1.3.1  
**Ticket**: Dashboard Payment Filter + Delivery Delete Permission
