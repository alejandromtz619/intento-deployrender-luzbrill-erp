# Luz Brill ERP - PRD (Product Requirements Document)

## Información General
- **Nombre**: Luz Brill ERP
- **Versión**: 1.0.0
- **Stack**: FastAPI + SQLAlchemy (SQLite) + React
- **País**: Paraguay
- **IVA**: 10% (incluido en precios)
- **Moneda**: PYG (Guaraní Paraguayo)

## Credenciales de Acceso
- **Admin**: admin@luzbrill.com / admin123
- **Empresa**: Luz Brill S.A. (RUC: 80012345-6)

## Arquitectura Implementada

### Backend (/app/backend/)
- **server.py**: API FastAPI con todos los endpoints
- **models.py**: Modelos SQLAlchemy (28 tablas)
- **schemas.py**: Pydantic schemas para validación
- **database.py**: Conexión SQLite/PostgreSQL async

### Frontend (/app/frontend/src/)
- **pages/**: 14 páginas (Login, Home, Dashboard, etc.)
- **components/**: Layout, CurrencyTicker
- **context/**: AppContext (auth, tema, API)

## Módulos Implementados

### 1. Login y Autenticación
- JWT con bcrypt
- Sesión persistente en localStorage
- Redirect a /home post-login

### 2. Home
- 3 botones grandes: Dashboard, Ventas, Delivery
- Acceso rápido a módulos principales

### 3. Dashboard
- Cotización USD/PYG y BRL/PYG en tiempo real (ExchangeRate-API)
- Estadísticas: Ventas Hoy, Deliverys Pendientes, Stock Bajo
- Gráfico: Ventas por Hora (Recharts)
- Panel de Alertas (vencimientos, stock bajo)

### 4. Ventas
- Selección obligatoria de cliente
- Soporte para representación de otro cliente
- Scanner código de barras USB
- Productos y Materias de Laboratorio
- Cálculo automático: Subtotal, Descuento %, IVA 10%, Total
- Tipos de pago: Efectivo, Tarjeta, Transferencia, Cheque, Crédito
- Opción delivery con vehículo y responsable

### 5. Laboratorio
- Items únicos con código de barra
- Estado: DISPONIBLE / VENDIDO
- Solo una venta por materia

### 6. Productos
- CRUD completo con imagen
- Código de barra único
- Categorías y Marcas
- Stock total calculado

### 7. Proveedores
- CRUD con datos fiscales
- Sistema de deudas con registro de pagos

### 8. Clientes
- CRUD con RUC, cédula, dirección
- Descuento % por cliente
- Flag "Acepta Cheque"

### 9. Funcionarios
- CRUD con cargo, salario, IPS
- Sistema de adelantos de salario
- Cálculo mensual: Salario - Total Adelantos

### 10. Stock/Inventario
- Multi-almacén (Depósito, Tienda, etc.)
- Entradas y salidas automáticas
- Traspasos entre almacenes
- Alertas de stock mínimo

### 11. Flota
- Vehículos: Moto, Automóvil, Camioneta
- Alertas de vencimiento: Habilitación, Cédula Verde

### 12. Facturas (SIFEN Ready)
- Estructura preparada para SIFEN
- Documentos electrónicos pendientes

### 13. Usuarios y Perfiles
- CRUD usuarios
- Roles: ADMIN, GERENTE, VENDEDOR, DELIVERY
- Permisos granulares (14 permisos definidos)

### 14. Sistema
- Modo Oscuro / Claro por usuario
- 6 colores personalizables
- Soporte técnico: Alejandro Martinez (0976 574 271)

## Features Implementadas (P0 - Crítico)
- ✅ Login y autenticación JWT
- ✅ Dashboard con cotización en tiempo real
- ✅ Módulo de Ventas completo
- ✅ Stock multi-almacén
- ✅ Responsive PC y smartphone
- ✅ Temas personalizables por usuario

## Próximos Pasos (P1)
- [ ] Integración SIFEN para facturación electrónica
- [ ] Créditos mensuales por cliente
- [ ] Ciclos de salario automáticos
- [ ] Reportes PDF de ventas
- [ ] Backup automático de base de datos

## Backlog (P2)
- [ ] Notificaciones push de alertas
- [ ] Dashboard con métricas históricas
- [ ] Multi-empresa desde selector
- [ ] API móvil optimizada
- [ ] Integración con impresora fiscal

## Fecha de Implementación
- **MVP Completo**: 28 Enero 2026
