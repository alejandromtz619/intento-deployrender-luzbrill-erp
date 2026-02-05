# Correcciones de Tema y Zona Horaria - 5 de Febrero 2026

## Problemas Reportados

1. **Falta de responsividad al tema**: El reloj y el checkbox de venta pendiente no respetaban el tema (modo oscuro/claro)
2. **Hora incorrecta en ventas**: Después de crear una venta, el sistema mostraba las 21:00 hs cuando el reloj del sistema indicaba 18:50 hs (desfase de ~3 horas)

## Cambios Implementados

### 1. Frontend - Responsividad de Tema

#### Clock.js (`frontend/src/components/Clock.js`)
**Antes:**
```javascript
<ClockIcon className="h-4 w-4 text-neutral-400" />
<span className="font-mono text-sm font-semibold text-neutral-100">
<span className="font-mono text-xs text-neutral-400">
```

**Después:**
```javascript
<ClockIcon className="h-4 w-4 text-muted-foreground" />
<span className="font-mono text-sm font-semibold text-foreground">
<span className="font-mono text-xs text-muted-foreground">
```

**Cambio:** Uso de clases de Tailwind CSS que responden a las variables CSS del tema en lugar de colores hardcoded.

#### Ventas.js (`frontend/src/pages/Ventas.js`)
**Antes:**
```javascript
<div className="flex items-center space-x-2 bg-yellow-50 p-2 rounded">
  <Label htmlFor="crearPendiente" className="text-sm">
```

**Después:**
```javascript
<div className="flex items-center space-x-2 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded border border-yellow-200 dark:border-yellow-800">
  <Label htmlFor="crearPendiente" className="text-sm text-yellow-900 dark:text-yellow-100">
```

**Cambio:** Agregado soporte para modo oscuro con colores apropiados y bordes para mejor visibilidad.

---

### 2. Backend - Zona Horaria de Paraguay

#### models.py (`backend/models.py`)

**Agregado al inicio del archivo:**
```python
from datetime import datetime
from zoneinfo import ZoneInfo
import enum

# Timezone configuration
PARAGUAY_TZ = ZoneInfo("America/Asuncion")

def now_paraguay():
    """Obtiene la fecha y hora actual en zona horaria de Paraguay"""
    return datetime.now(PARAGUAY_TZ)
```

**Modelos actualizados:**

Los siguientes modelos fueron actualizados de `server_default=func.now()` a `default=now_paraguay`:

1. **Venta** (línea 349)
   - Campo: `creado_en`
   - Impacto: Registro correcto de hora de creación de ventas

2. **CreditoCliente** (línea 185)
   - Campo: `creado_en`
   - Impacto: Registro correcto de creación de créditos asociados a ventas

3. **PagoCredito** (línea 197)
   - Campo: `fecha_pago`
   - Impacto: Registro correcto de pagos de créditos

4. **MovimientoStock** (línea 338)
   - Campo: `creado_en`
   - Impacto: Registro correcto de movimientos de stock asociados a ventas

5. **MateriaLaboratorio** (línea 299)
   - Campo: `creado_en`
   - Impacto: Registro correcto de creación de materias de laboratorio vendidas

6. **Factura** (línea 463)
   - Campo: `creado_en`
   - Impacto: Registro correcto de emisión de facturas

## Diferencias Técnicas

### `server_default=func.now()` vs `default=now_paraguay`

**Antes (server_default):**
- La fecha/hora se calcula en el servidor de base de datos
- Usa la zona horaria del servidor de BD (típicamente UTC)
- **Resultado:** Desfase de 3-4 horas con hora local de Paraguay

**Después (default + creado_en explícito):**
- La fecha/hora se calcula en Python/FastAPI
- Usa explícitamente `America/Asuncion` timezone
- **Resultado:** Hora correcta de Paraguay, respetando DST automáticamente

**Nota importante:** Cambiar solo el modelo no es suficiente. Debido a que la base de datos puede tener la definición anterior cacheada, es necesario establecer explícitamente el campo `creado_en=now_paraguay()` al crear los objetos en `server.py`.

## Cambios Adicionales en server.py

Para garantizar que todos los timestamps nuevos usen la zona horaria correcta, se actualizaron los siguientes endpoints:

### Objetos actualizados con `creado_en=now_paraguay()`:

1. **Venta** (línea ~1230)
   ```python
   venta = Venta(..., creado_en=now_paraguay())
   ```

2. **CreditoCliente** (3 ubicaciones)
   - Endpoint `/api/clientes/{cliente_id}/creditos` POST
   - En `confirmar_venta`
   - En `confirmar_venta_pendiente`
   ```python
   credito = CreditoCliente(..., creado_en=now_paraguay())
   ```

3. **PagoCredito**
   ```python
   pago = PagoCredito(..., fecha_pago=now_paraguay())
   ```

4. **MovimientoStock** (8 ubicaciones)
   - Entrada de stock
   - Traspaso (salida y entrada)
   - Salida manual
   - Confirmación de venta (2 lugares)
   - Anulación de venta
   ```python
   movimiento = MovimientoStock(..., creado_en=now_paraguay())
   ```

5. **MateriaLaboratorio**
   ```python
   materia = MateriaLaboratorio(**data.model_dump(), creado_en=now_paraguay())
   ```

6. **Factura**
   ```python
   factura = Factura(**data.model_dump(), creado_en=now_paraguay())
   ```

## Zona Horaria de Paraguay

- **Zona horaria estándar:** GMT-4 (PYT - Paraguay Time)
- **Horario de verano (DST):** GMT-3 (PYST - Paraguay Summer Time)
- **Identificador:** `America/Asuncion`
- **Manejo automático:** `ZoneInfo` maneja automáticamente los cambios de DST

## Impacto en Base de Datos Existente

**Registros existentes:** No se ven afectados. Mantienen sus timestamps originales.

**Nuevos registros:** Usarán la zona horaria de Paraguay correctamente.

**Nota:** Los registros creados antes de este fix pueden tener timestamps en UTC. Para reportes que requieran precisión temporal, considerar:
- Convertir timestamps antiguos durante la lectura
- Filtrar por rangos de fecha en lugar de timestamps exactos

## Verificación

Para verificar que el fix funciona correctamente:

1. Crear una nueva venta
2. Verificar que el campo `creado_en` refleje la hora actual de Paraguay
3. Comparar con el reloj del sistema (debe coincidir)

```python
# En el backend, verificar:
from models import now_paraguay
print(now_paraguay())  # Debe mostrar hora local de Paraguay
```

## Archivos Modificados

- `frontend/src/components/Clock.js`
- `frontend/src/pages/Ventas.js`
- `backend/models.py`

## Notas Adicionales

- El archivo `server.py` ya tenía la función `now_paraguay()` implementada desde el fix anterior (ver `PARAGUAY_TIMEZONE_FIX.md`)
- Este fix complementa el anterior, aplicando la zona horaria a nivel de modelo ORM
- Los otros modelos que usan `server_default=func.now()` no fueron modificados en este fix, pero pueden ser actualizados en el futuro si es necesario

## Testing Recomendado

1. ✅ Verificar que el reloj se vea correctamente en modo claro y oscuro
2. ✅ Verificar que el checkbox de venta pendiente sea visible en ambos temas
3. ✅ Crear una venta y verificar timestamp correcto
4. ✅ Verificar que los movimientos de stock tengan hora correcta
5. ✅ Verificar que las facturas se registren con hora correcta

---

**Fecha de implementación:** 5 de febrero de 2026  
**Versión:** 1.3.4
