# Análisis de Implementación de Permisos - Luz Brill ERP
**Fecha:** 6 de febrero de 2026

## 🔴 PROBLEMAS CRÍTICOS DETECTADOS

### 1. **BACKEND SIN VALIDACIÓN DE PERMISOS**
❌ **CRÍTICO:** El backend NO valida permisos en ningún endpoint.
- No existe función `get_current_usuario` con validación de permisos
- Todos los endpoints solo verifican token JWT válido (autenticación)
- NO hay autorización por permisos específicos
- **Riesgo:** Cualquier usuario autenticado puede acceder a cualquier endpoint

### 2. **FRONTEND: Rutas no protegidas por permisos**
⚠️ **IMPORTANTE:** El componente `ProtectedRoute` solo verifica autenticación
- Solo revisa si hay usuario logueado
- NO valida permisos específicos por ruta
- `canAccessRoute` solo se usa para filtrar menú, no para bloquear acceso real
- **Riesgo:** Usuario puede acceder directo a URL aunque no tenga permiso

---

## ANÁLISIS POR MÓDULO

### ✅ VENTAS (Parcialmente Implementado)

| Permiso | Frontend | Backend | Notas |
|---------|----------|---------|-------|
| `ventas.crear` | ✅ Ruta protegida en menú | ❌ Sin validación | Solo verifica en menú |
| `ventas.ver` | ⚠️ Parcial | ❌ Sin validación | No valida en GET /ventas |
| `ventas.anular` | ❌ No implementado | ❌ Sin validación | Falta validación |
| `ventas.modificar_precio` | ✅ Implementado | ❌ Sin validación | ✅ Input deshabilitado + validación |
| `ventas.aplicar_descuento` | ✅ Implementado | ❌ Sin validación | ✅ Descuento no se aplica |
| `ventas.imprimir_boleta` | ❌ No implementado | ❌ Sin validación | PrintModal sin restricción |
| `ventas.imprimir_factura` | ❌ No implementado | ❌ Sin validación | PrintModal sin restricción |
| `ventas.ver_historial` | ✅ Ruta protegida en menú | ❌ Sin validación | Solo verifica en menú |

**Implementados correctamente:**
- ✅ `ventas.modificar_precio`: Input deshabilitado + toast de error
- ✅ `ventas.aplicar_descuento`: Descuento se calcula en 0 si no tiene permiso

**Faltan:**
- ❌ Validar `ventas.anular` antes de anular venta
- ❌ Validar `ventas.imprimir_*` en PrintModal
- ❌ Backend debe validar todos estos permisos

---

### ❌ PRODUCTOS (Solo protección de ruta)

| Permiso | Frontend | Backend | Notas |
|---------|----------|---------|-------|
| `productos.ver` | ✅ Ruta protegida | ❌ Sin validación | Solo menú |
| `productos.crear` | ❌ No implementado | ❌ Sin validación | Botón "Crear" sin restricción |
| `productos.editar` | ❌ No implementado | ❌ Sin validación | Modal de edición sin restricción |
| `productos.eliminar` | ❌ No implementado | ❌ Sin validación | Botón eliminar sin restricción |
| `productos.modificar_precio` | ❌ No implementado | ❌ Sin validación | Campos de precio sin restricción |

**Acción requerida:**
- Deshabilitar botón "Nuevo Producto" si no tiene `productos.crear`
- Deshabilitar botón editar si no tiene `productos.editar`
- Deshabilitar botón eliminar si no tiene `productos.eliminar`
- Hacer readonly campos de precio si no tiene `productos.modificar_precio`

---

### ❌ STOCK (Solo protección de ruta)

| Permiso | Frontend | Backend | Notas |
|---------|----------|---------|-------|
| `stock.ver` | ✅ Ruta protegida | ❌ Sin validación | Solo menú |
| `stock.entrada` | ❌ No implementado | ❌ Sin validación | Botón "Entrada" sin restricción |
| `stock.salida` | ❌ No implementado | ❌ Sin validación | Botón "Salida" sin restricción |
| `stock.traspasar` | ❌ No implementado | ❌ Sin validación | Botón "Traspaso" sin restricción |
| `stock.ajustar` | ❌ No implementado | ❌ Sin validación | No existe función |

**Acción requerida:**
- Ocultar/deshabilitar botón "Entrada" si no tiene permiso
- Ocultar/deshabilitar botón "Salida" si no tiene permiso
- Ocultar/deshabilitar botón "Traspaso" si no tiene permiso

---

### ❌ CLIENTES (Solo protección de ruta)

| Permiso | Frontend | Backend | Notas |
|---------|----------|---------|-------|
| `clientes.ver` | ✅ Ruta protegida | ❌ Sin validación | Solo menú |
| `clientes.crear` | ❌ No implementado | ❌ Sin validación | Botón sin restricción |
| `clientes.editar` | ❌ No implementado | ❌ Sin validación | Botón sin restricción |
| `clientes.ver_creditos` | ❌ No implementado | ❌ Sin validación | Sección créditos sin restricción |

---

### ❌ PROVEEDORES (Solo protección de ruta)

| Permiso | Frontend | Backend | Notas |
|---------|----------|---------|-------|
| `proveedores.ver` | ✅ Ruta protegida | ❌ Sin validación | Solo menú |
| `proveedores.crear` | ❌ No implementado | ❌ Sin validación | Sin restricción |
| `proveedores.editar` | ❌ No implementado | ❌ Sin validación | Sin restricción |
| `proveedores.gestionar_deudas` | ❌ No implementado | ❌ Sin validación | Sin restricción |

---

### ❌ FUNCIONARIOS (Solo protección de ruta)

| Permiso | Frontend | Backend | Notas |
|---------|----------|---------|-------|
| `funcionarios.ver` | ✅ Ruta protegida | ❌ Sin validación | Solo menú |
| `funcionarios.crear` | ❌ No implementado | ❌ Sin validación | Sin restricción |
| `funcionarios.editar` | ❌ No implementado | ❌ Sin validación | Sin restricción |
| `funcionarios.ver_salarios` | ❌ No implementado | ❌ Sin validación | Sin restricción |
| `funcionarios.adelantos` | ❌ No implementado | ❌ Sin validación | Sin restricción |
| `funcionarios.pagar_salarios` | ❌ No implementado | ❌ Sin validación | Sin restricción |

---

### ⚠️ DELIVERY (Parcialmente Implementado)

| Permiso | Frontend | Backend | Notas |
|---------|----------|---------|-------|
| `delivery.ver` | ✅ Ruta protegida | ❌ Sin validación | Solo menú |
| `delivery.crear` | ❌ No implementado | ❌ Sin validación | Se crea desde Ventas |
| `delivery.actualizar_estado` | ❌ No implementado | ❌ Sin validación | Sin restricción |
| `delivery.eliminar` | ✅ Implementado | ❌ Sin validación | ✅ Botón condicionado |

**Implementado:**
- ✅ `delivery.eliminar`: Botón solo aparece con permiso

---

### ❌ FLOTA (Solo protección de ruta)

| Permiso | Frontend | Backend | Notas |
|---------|----------|---------|-------|
| `flota.ver` | ✅ Ruta protegida | ❌ Sin validación | Solo menú |
| `flota.gestionar` | ❌ No implementado | ❌ Sin validación | Sin restricción |

---

### ❌ LABORATORIO (Solo protección de ruta)

| Permiso | Frontend | Backend | Notas |
|---------|----------|---------|-------|
| `laboratorio.crear` | ❌ No implementado | ❌ Sin validación | Sin restricción |
| `laboratorio.ver` | ✅ Ruta protegida | ❌ Sin validación | Solo menú |

---

### ❌ USUARIOS (Solo protección de ruta)

| Permiso | Frontend | Backend | Notas |
|---------|----------|---------|-------|
| `usuarios.ver` | ❌ No implementado | ❌ Sin validación | Incluido en gestionar |
| `usuarios.gestionar` | ✅ Ruta protegida | ❌ Sin validación | Solo menú |

---

### ❌ ROLES (Solo protección de ruta)

| Permiso | Frontend | Backend | Notas |
|---------|----------|---------|-------|
| `roles.gestionar` | ✅ Ruta protegida | ❌ Sin validación | Misma página que usuarios |

---

### ❌ SISTEMA (Solo protección de ruta)

| Permiso | Frontend | Backend | Notas |
|---------|----------|---------|-------|
| `sistema.configurar` | ✅ Ruta protegida | ❌ Sin validación | Solo menú |

---

### ❌ REPORTES (Solo protección de ruta)

| Permiso | Frontend | Backend | Notas |
|---------|----------|---------|-------|
| `reportes.ver` | ✅ Ruta protegida | ❌ Sin validación | Solo menú |
| `reportes.exportar` | ❌ No implementado | ❌ Sin validación | Botones sin restricción |

---

### ❌ FACTURAS (Solo protección de ruta)

| Permiso | Frontend | Backend | Notas |
|---------|----------|---------|-------|
| `facturas.ver` | ✅ Ruta protegida | ❌ Sin validación | Solo menú |

---

### ✅ DASHBOARD (Protegido correctamente)

| Permiso | Frontend | Backend | Notas |
|---------|----------|---------|-------|
| `dashboard.ver` | ✅ Ruta protegida | ❌ Sin validación | Solo menú |

---

## RESUMEN ESTADÍSTICO

### Frontend
- **Rutas protegidas en menú:** 14/14 ✅
- **Rutas protegidas con validación real:** 0/14 ❌
- **Acciones con validación de permisos:** 4/60+ ❌
  - `ventas.modificar_precio` ✅
  - `ventas.aplicar_descuento` ✅
  - `delivery.eliminar` ✅
  - Home (módulos filtrados) ✅

### Backend
- **Endpoints con validación de permisos:** 0/150+ ❌
- **Solo valida autenticación JWT:** Sí
- **Función de autorización:** No existe

---

## RECOMENDACIONES PRIORITARIAS

### 🔴 URGENTE - Backend

1. **Crear función de autorización**
```python
async def get_current_usuario(
    token: str = Depends(oauth2_scheme),
    required_permission: str = None,
    db: AsyncSession = Depends(get_db)
):
    # Decodificar JWT
    # Cargar usuario con permisos
    # Validar permiso requerido
    # Lanzar 403 si no tiene permiso
```

2. **Aplicar en todos los endpoints**
```python
@api_router.post("/ventas")
async def crear_venta(
    data: VentaCreate,
    usuario: Usuario = Depends(lambda: get_current_usuario(required_permission="ventas.crear")),
    db: AsyncSession = Depends(get_db)
):
```

### 🟠 IMPORTANTE - Frontend

3. **Mejorar ProtectedRoute**
```javascript
const ProtectedRoute = ({ children, permission }) => {
  const { user, loading, hasPermission } = useApp();
  
  if (!user) return <Navigate to="/login" />;
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/home" />;
  }
  return children;
};
```

4. **Aplicar en App.js**
```javascript
<Route 
  path="/ventas" 
  element={
    <ProtectedRoute permission="ventas.crear">
      <Layout><Ventas /></Layout>
    </ProtectedRoute>
  } 
/>
```

5. **Agregar validaciones en páginas**
- Deshabilitar botones CRUD según permisos
- Hacer readonly campos restringidos
- Ocultar secciones sin acceso

---

## NIVEL DE SEGURIDAD ACTUAL

🔴 **BAJO - VULNERABILIDADES CRÍTICAS**

**Problemas:**
- Backend acepta cualquier petición con token válido
- Frontend permite acceso directo a URLs
- Solo 4 de 60+ acciones están protegidas
- Admin bypass hace inútil el sistema de permisos

**Riesgo:**
- Usuario con rol limitado puede:
  - Acceder a cualquier endpoint directamente
  - Modificar datos sin restricciones
  - Ver información confidencial
  - Ejecutar acciones no autorizadas

**Solución:**
Implementar autorizació completa en backend (prioritario) y mejorar validaciones en frontend.
