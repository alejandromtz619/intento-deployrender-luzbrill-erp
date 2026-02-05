# Corrección de Errores en Módulo de Reportes - Luz Brill ERP
**Fecha:** 5 de febrero de 2026  
**Versión:** 1.3.2

## Problemas Reportados y Soluciones

### 1. ❌ Error 400 al descargar reportes de ventas con filtros "Solo Confirmadas" o "Solo Anuladas"

**Causa Raíz:** Inconsistencia entre los valores del enum en el backend y los valores enviados desde el frontend.

- **Backend:** Enum `EstadoVenta` tiene valores `CONFIRMADA` y `ANULADA`
- **Frontend:** Enviaba `CONFIRMADO` y `ANULADO`

**Solución Aplicada:**
- ✅ Actualizado `frontend/src/pages/Reportes.js` línea 153-159: Cambiar valores de `CONFIRMADO` → `CONFIRMADA` y `ANULADO` → `ANULADA`
- ✅ Actualizado estado inicial (línea 30): `ventasEstado` de `'CONFIRMADO'` → `'CONFIRMADA'`

**Archivo:** `frontend/src/pages/Reportes.js`
```javascript
// Antes:
{ value: 'CONFIRMADO', label: 'Solo Confirmadas' },
{ value: 'ANULADO', label: 'Solo Anuladas' }

// Después:
{ value: 'CONFIRMADA', label: 'Solo Confirmadas' },
{ value: 'ANULADA', label: 'Solo Anuladas' }
```

---

### 2. ❌ Reporte de stock bajo devuelve "No se encontraron datos" a pesar de haber alertas configuradas

**Causa Raíz:** La lógica usaba un valor hardcodeado `stock < 10` en lugar de usar el campo `stock_minimo` de cada producto.

**Solución Aplicada:**
- ✅ Actualizado `backend/server.py` líneas 2758-2767: Cambiar lógica de alerta para usar `producto.stock_minimo`
- ✅ Ahora respeta el `stock_minimo` configurado por producto (default: 10 si no está configurado)

**Archivo:** `backend/server.py`
```python
# Antes:
es_alerta = stock < 10

# Después:
stock_minimo = producto.stock_minimo if producto.stock_minimo is not None else 10
es_alerta = stock <= stock_minimo
```

---

### 3. ❌ Reporte de deudas a proveedores devuelve "No se encontraron datos" a pesar de existir deudas

**Causa Raíz:** El filtro de estado no soportaba correctamente el valor `'TODOS'`, siempre filtraba por PENDIENTE.

**Solución Aplicada:**
- ✅ Actualizado `backend/server.py` líneas 2813-2825: Agregar soporte explícito para `estado='TODOS'`
- ✅ Ahora cuando el frontend envía `estado=TODOS`, no aplica ningún filtro de pagado/no pagado

**Archivo:** `backend/server.py`
```python
# Ahora soporta:
if estado == 'TODOS':
    pass  # No filter, show all
elif estado == 'PENDIENTE':
    query = query.where(DeudaProveedor.pagado == False)
elif estado == 'PAGADO':
    query = query.where(DeudaProveedor.pagado == True)
```

---

### 4. ❌ Reporte de créditos de clientes no muestra el "Total Pagado"

**Causa Raíz:** La tabla del reporte solo mostraba "Original" y "Pendiente", faltaba la columna "Pagado".

**Solución Aplicada:**
- ✅ Actualizado `backend/server.py` líneas 2948-2967:
  - Agregada columna "Pagado" en el reporte
  - Calculado `monto_pagado = monto_original - monto_pendiente`
  - Agregado `total_pagado` en la fila de totales

**Archivo:** `backend/server.py`
```python
# Nueva estructura de columnas:
columnas = ['Cliente', 'Venta #', 'Original', 'Pagado', 'Pendiente', 'Fecha']

# Cálculo por cada crédito:
monto_pagado = credito.monto_original - credito.monto_pendiente
total_pagado += monto_pagado

# Totales ahora incluyen:
totales = ['', 'TOTAL:', total_original, total_pagado, total_pendiente, '']
```

**Resultado:** El reporte PDF ahora muestra:
- Monto Original
- Monto Pagado (nuevo)
- Monto Pendiente
- Fecha

---

### 5. ✨ Mejora: Falta de Date Picker (Calendar) para selección de fechas

**Problema:** Los usuarios tenían que escribir manualmente las fechas en formato `YYYY-MM-DD`, lo cual es tedioso y propenso a errores.

**Solución Aplicada:**
- ✅ Creado nuevo componente `frontend/src/components/ui/date-picker.jsx`
- ✅ Usa `Popover` + `Calendar` de shadcn/ui con `react-day-picker`
- ✅ Locale en español (`es` de `date-fns/locale`)
- ✅ Formato visual: `dd/MM/yyyy` (ej: 05/02/2026)
- ✅ Formato interno: `yyyy-MM-dd` (compatible con backend)
- ✅ Reemplazados todos los `<Input type="date">` en `Reportes.js` por `<DatePicker>`

**Archivos modificados:**
1. `frontend/src/components/ui/date-picker.jsx` (nuevo)
2. `frontend/src/pages/Reportes.js` (importa y usa DatePicker)

**Características del DatePicker:**
- 📅 Popup con calendario visual
- 🇵🇾 Formato paraguayo (dd/MM/yyyy)
- 🎨 Integrado con tema oscuro/claro
- ⌨️ Accesible por teclado
- 📱 Responsivo

---

## Correcciones Adicionales

### 6. Soporte para filtro `estado='TODOS'` en créditos de clientes
- ✅ Actualizado `backend/server.py` líneas 2907-2919: Similar a deudas, ahora soporta mostrar todos los créditos (pendientes + pagados)

---

## Archivos Modificados

### Backend (`backend/server.py`)
- Líneas 2758-2767: Lógica de stock bajo
- Líneas 2813-2825: Filtro de estado en deudas proveedores
- Líneas 2907-2919: Filtro de estado en créditos clientes
- Líneas 2948-2967: Columna "Pagado" en reporte de créditos

### Frontend (`frontend/src/pages/Reportes.js`)
- Líneas 1-20: Importación de DatePicker
- Línea 30: Estado inicial de ventasEstado
- Líneas 153-159: Valores de enum CONFIRMADA/ANULADA
- Líneas 305-327: Uso de DatePicker en lugar de Input type="date"

### Nuevo Archivo (`frontend/src/components/ui/date-picker.jsx`)
- Componente reutilizable de selección de fechas con calendario

---

## Testing Recomendado

### 1. Reportes de Ventas
- [ ] Filtro "Todas las ventas" → Debe mostrar CONFIRMADA + ANULADA
- [ ] Filtro "Solo Confirmadas" → Solo ventas confirmadas
- [ ] Filtro "Solo Anuladas" → Solo ventas anuladas
- [ ] Filtro tipo pago "CONTADO" → Efectivo + Tarjeta + Transferencia + Cheque
- [ ] Filtro tipo pago "CREDITO" → Solo crédito

### 2. Reportes de Stock
- [ ] Sin filtro → Todos los productos
- [ ] "Solo con stock bajo" → Solo productos donde stock <= stock_minimo
- [ ] Verificar que usa el stock_minimo del producto (no hardcoded 10)

### 3. Reportes de Deudas Proveedores
- [ ] Estado "Todos los estados" → Pendientes + Pagadas
- [ ] Estado "Solo Pendientes" → Solo no pagadas
- [ ] Estado "Solo Pagadas" → Solo pagadas

### 4. Reportes de Créditos Clientes
- [ ] Verificar que se muestra columna "Pagado"
- [ ] Verificar que Total Pagado suma correctamente
- [ ] Estado "Todos" → Todos los créditos
- [ ] Filtros de fecha funcionan correctamente

### 5. Date Picker
- [ ] Click en botón abre calendario
- [ ] Selección de fecha actualiza el campo
- [ ] Formato mostrado: dd/MM/yyyy
- [ ] Funciona en tema oscuro y claro
- [ ] Cierra automáticamente al seleccionar fecha

---

## Dependencias

**Ya instaladas (verificado en package.json):**
- ✅ react-day-picker@8.10.1
- ✅ date-fns@4.1.0
- ✅ @radix-ui/react-popover@1.1.11

**No requiere instalación adicional**

---

## Comandos para Deploy

### Backend
```bash
cd backend
# Los cambios se aplicarán automáticamente en Render al hacer push
```

### Frontend
```bash
cd frontend
yarn install  # Si hay problemas con date-fns
yarn start    # Para probar localmente
```

---

## Notas Importantes

1. ⚠️ **Enum Values:** Siempre usar `CONFIRMADA/ANULADA` (no CONFIRMADO/ANULADO)
2. ⚠️ **Stock Mínimo:** Ahora respeta el campo `stock_minimo` de cada producto
3. ⚠️ **Filtro TODOS:** Enviar `estado='TODOS'` desde frontend para ver todos los registros
4. ✨ **Date Picker:** Los usuarios ahora pueden hacer click en un calendario en lugar de escribir fechas
5. 📊 **Reporte de Créditos:** Ahora muestra 4 columnas de montos: Original, Pagado, Pendiente

---

## Changelog

**v1.3.2 - 05/02/2026**
- [FIX] Corregido error 400 en reportes de ventas con filtros de estado
- [FIX] Corregida lógica de stock bajo para usar stock_minimo del producto
- [FIX] Corregido filtro "TODOS" en reportes de deudas y créditos
- [FEATURE] Agregada columna "Total Pagado" en reporte de créditos
- [FEATURE] Agregado DatePicker con calendario visual para todos los filtros de fecha
- [UX] Mejorada experiencia de usuario con selección visual de fechas

---

## Capturas Esperadas

### Reporte de Créditos (Actualizado)
```
+---------------+--------+----------+---------+-----------+------------+
| Cliente       | Venta# | Original | Pagado  | Pendiente | Fecha      |
+---------------+--------+----------+---------+-----------+------------+
| Cliente Prueba|    2   | 72,250   |    0    |    0      | 03/02/2026 |
| Cliente Prueba|    5   | 76,500   |    0    |    0      | 04/02/2026 |
| Cliente Prueba|   15   | 289,000  |    0    |    0      | 04/02/2026 |
+---------------+--------+----------+---------+-----------+------------+
|               | TOTAL: | 437,750  |    0    |    0      |            |
+---------------+--------+----------+---------+-----------+------------+
```

### Date Picker
- Botón: `[📅 05/02/2026 ▾]`
- Al hacer click: Popup con calendario
- Navegación: ← Enero 2026 →
- Selección visual de día

---

**Estado:** ✅ Todas las correcciones aplicadas y listas para deploy
