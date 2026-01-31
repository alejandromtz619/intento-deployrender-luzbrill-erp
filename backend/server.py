from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
from typing import List, Optional
import os
import logging
import httpx
import bcrypt
import jwt

# Local imports
from database import get_db, init_db, engine, Base
from models import (
    Empresa, Usuario, Rol, Permiso, RolPermiso, UsuarioRol,
    Cliente, CreditoCliente, Proveedor, ProveedorProducto, DeudaProveedor,
    Categoria, Marca, Producto, MateriaLaboratorio, EstadoMateria,
    Almacen, StockActual, MovimientoStock, TipoMovimientoStock,
    Venta, VentaItem, EstadoVenta, TipoPago,
    Funcionario, AdelantoSalario, CicloSalario,
    Vehiculo, TipoVehiculo, Entrega, EstadoEntrega,
    Factura, DocumentoElectronico, PreferenciaUsuario
)
from schemas import (
    EmpresaCreate, EmpresaResponse,
    UsuarioCreate, UsuarioResponse, UsuarioLogin, TokenResponse,
    RolCreate, RolResponse, PermisoResponse,
    ClienteCreate, ClienteResponse, CreditoClienteCreate, CreditoClienteResponse,
    ProveedorCreate, ProveedorResponse, DeudaProveedorCreate, DeudaProveedorResponse,
    CategoriaCreate, CategoriaResponse, MarcaCreate, MarcaResponse,
    ProductoCreate, ProductoResponse, ProductoConStock,
    MateriaLaboratorioCreate, MateriaLaboratorioResponse,
    AlmacenCreate, AlmacenResponse, StockActualCreate, StockActualResponse, StockConDetalles,
    MovimientoStockCreate, MovimientoStockResponse, TraspasoStockCreate,
    VentaCreate, VentaResponse, VentaConDetalles, VentaItemResponse,
    FuncionarioCreate, FuncionarioResponse,
    AdelantoSalarioCreate, AdelantoSalarioResponse,
    CicloSalarioCreate, CicloSalarioResponse,
    VehiculoCreate, VehiculoResponse,
    EntregaCreate, EntregaResponse, EntregaConDetalles,
    FacturaCreate, FacturaResponse,
    PreferenciaUsuarioCreate, PreferenciaUsuarioResponse,
    DashboardStats, VentasPorHora, StockBajo, CotizacionDivisa, Alerta
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'luzbrill-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Luz Brill ERP API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router
api_router = APIRouter(prefix="/api")

# ==================== AUTH HELPERS ====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(usuario_id: int) -> str:
    payload = {
        "sub": str(usuario_id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ==================== ROOT ====================
@api_router.get("/")
async def root():
    return {"message": "Luz Brill ERP API v1.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.post("/seed-database")
async def seed_database(db: AsyncSession = Depends(get_db)):
    """
    Endpoint para poblar la base de datos con datos iniciales
    Solo usar en primera configuración
    """
    try:
        # 1. Crear Empresa
        result = await db.execute(select(Empresa).where(Empresa.ruc == "12345678901"))
        empresa = result.scalar_one_or_none()
        
        if not empresa:
            empresa = Empresa(
                ruc="12345678901",
                razon_social="Luz Brill S.A.",
                nombre_comercial="Luz Brill",
                direccion="Av. Principal 123",
                telefono="123456789",
                email="contacto@luzbrill.com",
                estado=True
            )
            db.add(empresa)
            await db.commit()
            await db.refresh(empresa)
        
        # 2. Crear Rol Administrador
        result = await db.execute(select(Rol).where(Rol.nombre == "Administrador"))
        rol_admin = result.scalar_one_or_none()
        
        if not rol_admin:
            rol_admin = Rol(
                nombre="Administrador",
                descripcion="Acceso total al sistema",
                empresa_id=empresa.id,
                estado=True
            )
            db.add(rol_admin)
            await db.commit()
            await db.refresh(rol_admin)
        
        # 3. Crear Usuario Administrador
        result = await db.execute(select(Usuario).where(Usuario.email == "admin@luzbrill.com"))
        usuario = result.scalar_one_or_none()
        
        if not usuario:
            usuario = Usuario(
                email="admin@luzbrill.com",
                password_hash=hash_password("admin123"),
                nombre="Admin",
                apellido="Sistema",
                telefono="123456789",
                empresa_id=empresa.id,
                estado=True
            )
            db.add(usuario)
            await db.commit()
            await db.refresh(usuario)
        
        # 4. Asignar Rol al Usuario
        result = await db.execute(
            select(UsuarioRol).where(
                UsuarioRol.usuario_id == usuario.id,
                UsuarioRol.rol_id == rol_admin.id
            )
        )
        usuario_rol = result.scalar_one_or_none()
        
        if not usuario_rol:
            usuario_rol = UsuarioRol(
                usuario_id=usuario.id,
                rol_id=rol_admin.id
            )
            db.add(usuario_rol)
            await db.commit()
        
        return {
            "status": "success",
            "message": "Base de datos poblada exitosamente",
            "credentials": {
                "email": "admin@luzbrill.com",
                "password": "admin123"
            }
        }
    except Exception as e:
        logger.error(f"Error al poblar base de datos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al poblar base de datos: {str(e)}")

# ==================== EMPRESA ====================
@api_router.post("/empresas", response_model=EmpresaResponse)
async def crear_empresa(data: EmpresaCreate, db: AsyncSession = Depends(get_db)):
    empresa = Empresa(**data.model_dump())
    db.add(empresa)
    await db.commit()
    await db.refresh(empresa)
    return empresa

@api_router.get("/empresas", response_model=List[EmpresaResponse])
async def listar_empresas(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Empresa).where(Empresa.estado == True))
    return result.scalars().all()

@api_router.get("/empresas/{empresa_id}", response_model=EmpresaResponse)
async def obtener_empresa(empresa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Empresa).where(Empresa.id == empresa_id))
    empresa = result.scalar_one_or_none()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return empresa

# ==================== AUTH ====================
@api_router.post("/auth/register", response_model=TokenResponse)
async def registrar_usuario(data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    existing = await db.execute(select(Usuario).where(Usuario.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    usuario = Usuario(
        email=data.email,
        password_hash=hash_password(data.password),
        nombre=data.nombre,
        apellido=data.apellido,
        telefono=data.telefono,
        empresa_id=data.empresa_id
    )
    db.add(usuario)
    await db.commit()
    await db.refresh(usuario)
    
    token = create_token(usuario.id)
    return TokenResponse(access_token=token, usuario=UsuarioResponse.model_validate(usuario))

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UsuarioLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.email == data.email))
    usuario = result.scalar_one_or_none()
    
    if not usuario or not verify_password(data.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if not usuario.activo:
        raise HTTPException(status_code=401, detail="Usuario inactivo")
    
    token = create_token(usuario.id)
    return TokenResponse(access_token=token, usuario=UsuarioResponse.model_validate(usuario))

@api_router.get("/auth/me", response_model=UsuarioResponse)
async def obtener_usuario_actual(usuario_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario

# ==================== USUARIOS ====================
@api_router.get("/usuarios", response_model=List[UsuarioResponse])
async def listar_usuarios(empresa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Usuario).where(Usuario.empresa_id == empresa_id, Usuario.activo == True)
    )
    return result.scalars().all()

@api_router.get("/usuarios/{usuario_id}", response_model=UsuarioResponse)
async def obtener_usuario(usuario_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario

@api_router.put("/usuarios/{usuario_id}", response_model=UsuarioResponse)
async def actualizar_usuario(usuario_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    for key, value in data.items():
        if hasattr(usuario, key) and key not in ['id', 'password_hash']:
            setattr(usuario, key, value)
    
    await db.commit()
    await db.refresh(usuario)
    return usuario

@api_router.delete("/usuarios/{usuario_id}")
async def eliminar_usuario(usuario_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    usuario.activo = False
    await db.commit()
    return {"message": "Usuario desactivado"}

# ==================== ROLES Y PERMISOS ====================
@api_router.post("/roles", response_model=RolResponse)
async def crear_rol(data: RolCreate, db: AsyncSession = Depends(get_db)):
    rol = Rol(**data.model_dump())
    db.add(rol)
    await db.commit()
    await db.refresh(rol)
    return rol

@api_router.get("/roles", response_model=List[RolResponse])
async def listar_roles(empresa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Rol).where(Rol.empresa_id == empresa_id))
    return result.scalars().all()

@api_router.get("/permisos", response_model=List[PermisoResponse])
async def listar_permisos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Permiso))
    return result.scalars().all()

@api_router.post("/roles/{rol_id}/permisos/{permiso_id}")
async def asignar_permiso_rol(rol_id: int, permiso_id: int, db: AsyncSession = Depends(get_db)):
    rol_permiso = RolPermiso(rol_id=rol_id, permiso_id=permiso_id)
    db.add(rol_permiso)
    await db.commit()
    return {"message": "Permiso asignado"}

@api_router.post("/usuarios/{usuario_id}/roles/{rol_id}")
async def asignar_rol_usuario(usuario_id: int, rol_id: int, db: AsyncSession = Depends(get_db)):
    usuario_rol = UsuarioRol(usuario_id=usuario_id, rol_id=rol_id)
    db.add(usuario_rol)
    await db.commit()
    return {"message": "Rol asignado"}

# ==================== CLIENTES ====================
@api_router.post("/clientes", response_model=ClienteResponse)
async def crear_cliente(data: ClienteCreate, db: AsyncSession = Depends(get_db)):
    cliente = Cliente(**data.model_dump())
    db.add(cliente)
    await db.commit()
    await db.refresh(cliente)
    return cliente

@api_router.get("/clientes", response_model=List[ClienteResponse])
async def listar_clientes(empresa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Cliente).where(Cliente.empresa_id == empresa_id, Cliente.estado == True)
    )
    return result.scalars().all()

@api_router.get("/clientes/{cliente_id}", response_model=ClienteResponse)
async def obtener_cliente(cliente_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente

@api_router.put("/clientes/{cliente_id}", response_model=ClienteResponse)
async def actualizar_cliente(cliente_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    for key, value in data.items():
        if hasattr(cliente, key) and key != 'id':
            setattr(cliente, key, value)
    
    await db.commit()
    await db.refresh(cliente)
    return cliente

@api_router.delete("/clientes/{cliente_id}")
async def eliminar_cliente(cliente_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    cliente.estado = False
    await db.commit()
    return {"message": "Cliente desactivado"}

# ==================== CREDITOS CLIENTES ====================
@api_router.post("/clientes/{cliente_id}/creditos", response_model=CreditoClienteResponse)
async def crear_credito_cliente(cliente_id: int, data: CreditoClienteCreate, db: AsyncSession = Depends(get_db)):
    credito = CreditoCliente(cliente_id=cliente_id, **data.model_dump(exclude={'cliente_id'}))
    db.add(credito)
    await db.commit()
    await db.refresh(credito)
    return credito

@api_router.get("/clientes/{cliente_id}/creditos", response_model=List[CreditoClienteResponse])
async def listar_creditos_cliente(cliente_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CreditoCliente).where(CreditoCliente.cliente_id == cliente_id))
    return result.scalars().all()

@api_router.put("/creditos/{credito_id}", response_model=CreditoClienteResponse)
async def actualizar_credito(credito_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CreditoCliente).where(CreditoCliente.id == credito_id))
    credito = result.scalar_one_or_none()
    if not credito:
        raise HTTPException(status_code=404, detail="Crédito no encontrado")
    
    for key, value in data.items():
        if hasattr(credito, key) and key != 'id':
            setattr(credito, key, value)
    
    await db.commit()
    await db.refresh(credito)
    return credito

# ==================== PROVEEDORES ====================
@api_router.post("/proveedores", response_model=ProveedorResponse)
async def crear_proveedor(data: ProveedorCreate, db: AsyncSession = Depends(get_db)):
    proveedor = Proveedor(**data.model_dump())
    db.add(proveedor)
    await db.commit()
    await db.refresh(proveedor)
    return proveedor

@api_router.get("/proveedores", response_model=List[ProveedorResponse])
async def listar_proveedores(empresa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Proveedor).where(Proveedor.empresa_id == empresa_id, Proveedor.estado == True)
    )
    return result.scalars().all()

@api_router.get("/proveedores/{proveedor_id}", response_model=ProveedorResponse)
async def obtener_proveedor(proveedor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Proveedor).where(Proveedor.id == proveedor_id))
    proveedor = result.scalar_one_or_none()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return proveedor

@api_router.put("/proveedores/{proveedor_id}", response_model=ProveedorResponse)
async def actualizar_proveedor(proveedor_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Proveedor).where(Proveedor.id == proveedor_id))
    proveedor = result.scalar_one_or_none()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    for key, value in data.items():
        if hasattr(proveedor, key) and key != 'id':
            setattr(proveedor, key, value)
    
    await db.commit()
    await db.refresh(proveedor)
    return proveedor

@api_router.delete("/proveedores/{proveedor_id}")
async def eliminar_proveedor(proveedor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Proveedor).where(Proveedor.id == proveedor_id))
    proveedor = result.scalar_one_or_none()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    proveedor.estado = False
    await db.commit()
    return {"message": "Proveedor desactivado"}

# ==================== DEUDAS PROVEEDORES ====================
@api_router.post("/proveedores/{proveedor_id}/deudas", response_model=DeudaProveedorResponse)
async def crear_deuda_proveedor(proveedor_id: int, data: DeudaProveedorCreate, db: AsyncSession = Depends(get_db)):
    deuda = DeudaProveedor(proveedor_id=proveedor_id, **data.model_dump(exclude={'proveedor_id'}))
    db.add(deuda)
    await db.commit()
    await db.refresh(deuda)
    return deuda

@api_router.get("/proveedores/{proveedor_id}/deudas", response_model=List[DeudaProveedorResponse])
async def listar_deudas_proveedor(proveedor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DeudaProveedor).where(DeudaProveedor.proveedor_id == proveedor_id))
    return result.scalars().all()

@api_router.put("/deudas/{deuda_id}/pagar")
async def pagar_deuda(deuda_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DeudaProveedor).where(DeudaProveedor.id == deuda_id))
    deuda = result.scalar_one_or_none()
    if not deuda:
        raise HTTPException(status_code=404, detail="Deuda no encontrada")
    
    deuda.pagado = True
    await db.commit()
    return {"message": "Deuda marcada como pagada"}

# ==================== CATEGORIAS ====================
@api_router.post("/categorias", response_model=CategoriaResponse)
async def crear_categoria(data: CategoriaCreate, db: AsyncSession = Depends(get_db)):
    categoria = Categoria(**data.model_dump())
    db.add(categoria)
    await db.commit()
    await db.refresh(categoria)
    return categoria

@api_router.get("/categorias", response_model=List[CategoriaResponse])
async def listar_categorias(empresa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Categoria).where(Categoria.empresa_id == empresa_id))
    return result.scalars().all()

# ==================== MARCAS ====================
@api_router.post("/marcas", response_model=MarcaResponse)
async def crear_marca(data: MarcaCreate, db: AsyncSession = Depends(get_db)):
    marca = Marca(**data.model_dump())
    db.add(marca)
    await db.commit()
    await db.refresh(marca)
    return marca

@api_router.get("/marcas", response_model=List[MarcaResponse])
async def listar_marcas(empresa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Marca).where(Marca.empresa_id == empresa_id))
    return result.scalars().all()

# ==================== PRODUCTOS ====================
@api_router.post("/productos", response_model=ProductoResponse)
async def crear_producto(data: ProductoCreate, db: AsyncSession = Depends(get_db)):
    producto = Producto(**data.model_dump())
    db.add(producto)
    await db.commit()
    await db.refresh(producto)
    return producto

@api_router.get("/productos", response_model=List[ProductoConStock])
async def listar_productos(empresa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Producto, Categoria, Marca)
        .outerjoin(Categoria, Producto.categoria_id == Categoria.id)
        .outerjoin(Marca, Producto.marca_id == Marca.id)
        .where(Producto.empresa_id == empresa_id, Producto.activo == True)
    )
    productos = []
    for row in result.all():
        producto, categoria, marca = row
        # Get total stock
        stock_result = await db.execute(
            select(func.coalesce(func.sum(StockActual.cantidad), 0))
            .where(StockActual.producto_id == producto.id)
        )
        stock_total = stock_result.scalar() or 0
        
        prod_dict = ProductoResponse.model_validate(producto).model_dump()
        prod_dict['stock_total'] = stock_total
        prod_dict['categoria_nombre'] = categoria.nombre if categoria else None
        prod_dict['marca_nombre'] = marca.nombre if marca else None
        productos.append(ProductoConStock(**prod_dict))
    
    return productos

@api_router.get("/productos/{producto_id}", response_model=ProductoConStock)
async def obtener_producto(producto_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Producto, Categoria, Marca)
        .outerjoin(Categoria, Producto.categoria_id == Categoria.id)
        .outerjoin(Marca, Producto.marca_id == Marca.id)
        .where(Producto.id == producto_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    producto, categoria, marca = row
    stock_result = await db.execute(
        select(func.coalesce(func.sum(StockActual.cantidad), 0))
        .where(StockActual.producto_id == producto.id)
    )
    stock_total = stock_result.scalar() or 0
    
    prod_dict = ProductoResponse.model_validate(producto).model_dump()
    prod_dict['stock_total'] = stock_total
    prod_dict['categoria_nombre'] = categoria.nombre if categoria else None
    prod_dict['marca_nombre'] = marca.nombre if marca else None
    return ProductoConStock(**prod_dict)

@api_router.get("/productos/codigo/{codigo_barra}", response_model=ProductoConStock)
async def buscar_producto_por_codigo(codigo_barra: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Producto, Categoria, Marca)
        .outerjoin(Categoria, Producto.categoria_id == Categoria.id)
        .outerjoin(Marca, Producto.marca_id == Marca.id)
        .where(Producto.codigo_barra == codigo_barra)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    producto, categoria, marca = row
    stock_result = await db.execute(
        select(func.coalesce(func.sum(StockActual.cantidad), 0))
        .where(StockActual.producto_id == producto.id)
    )
    stock_total = stock_result.scalar() or 0
    
    prod_dict = ProductoResponse.model_validate(producto).model_dump()
    prod_dict['stock_total'] = stock_total
    prod_dict['categoria_nombre'] = categoria.nombre if categoria else None
    prod_dict['marca_nombre'] = marca.nombre if marca else None
    return ProductoConStock(**prod_dict)

@api_router.put("/productos/{producto_id}", response_model=ProductoResponse)
async def actualizar_producto(producto_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Producto).where(Producto.id == producto_id))
    producto = result.scalar_one_or_none()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    for key, value in data.items():
        if hasattr(producto, key) and key != 'id':
            setattr(producto, key, value)
    
    await db.commit()
    await db.refresh(producto)
    return producto

@api_router.delete("/productos/{producto_id}")
async def eliminar_producto(producto_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Producto).where(Producto.id == producto_id))
    producto = result.scalar_one_or_none()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    producto.activo = False
    await db.commit()
    return {"message": "Producto desactivado"}

# ==================== MATERIAS LABORATORIO ====================
@api_router.post("/materias-laboratorio", response_model=MateriaLaboratorioResponse)
async def crear_materia_laboratorio(data: MateriaLaboratorioCreate, db: AsyncSession = Depends(get_db)):
    # Check unique barcode
    existing = await db.execute(
        select(MateriaLaboratorio).where(MateriaLaboratorio.codigo_barra == data.codigo_barra)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Código de barra ya existe")
    
    # Check against products
    existing_prod = await db.execute(
        select(Producto).where(Producto.codigo_barra == data.codigo_barra)
    )
    if existing_prod.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Código de barra ya existe en productos")
    
    materia = MateriaLaboratorio(**data.model_dump())
    db.add(materia)
    await db.commit()
    await db.refresh(materia)
    return materia

@api_router.get("/materias-laboratorio", response_model=List[MateriaLaboratorioResponse])
async def listar_materias_laboratorio(empresa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MateriaLaboratorio).where(MateriaLaboratorio.empresa_id == empresa_id)
    )
    return result.scalars().all()

@api_router.get("/materias-laboratorio/disponibles", response_model=List[MateriaLaboratorioResponse])
async def listar_materias_disponibles(empresa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MateriaLaboratorio).where(
            MateriaLaboratorio.empresa_id == empresa_id,
            MateriaLaboratorio.estado == EstadoMateria.DISPONIBLE
        )
    )
    return result.scalars().all()

# ==================== ALMACENES ====================
@api_router.post("/almacenes", response_model=AlmacenResponse)
async def crear_almacen(data: AlmacenCreate, db: AsyncSession = Depends(get_db)):
    almacen = Almacen(**data.model_dump())
    db.add(almacen)
    await db.commit()
    await db.refresh(almacen)
    return almacen

@api_router.get("/almacenes", response_model=List[AlmacenResponse])
async def listar_almacenes(empresa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Almacen).where(Almacen.empresa_id == empresa_id))
    return result.scalars().all()

# ==================== STOCK ====================
@api_router.post("/stock", response_model=StockActualResponse)
async def crear_actualizar_stock(data: StockActualCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(StockActual).where(
            StockActual.producto_id == data.producto_id,
            StockActual.almacen_id == data.almacen_id
        )
    )
    stock = result.scalar_one_or_none()
    
    if stock:
        stock.cantidad = data.cantidad
        if data.alerta_minima is not None:
            stock.alerta_minima = data.alerta_minima
    else:
        stock = StockActual(**data.model_dump())
        db.add(stock)
    
    await db.commit()
    await db.refresh(stock)
    return stock

@api_router.get("/stock", response_model=List[StockConDetalles])
async def listar_stock(empresa_id: int, almacen_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    query = (
        select(StockActual, Producto, Almacen)
        .join(Producto, StockActual.producto_id == Producto.id)
        .join(Almacen, StockActual.almacen_id == Almacen.id)
        .where(Producto.empresa_id == empresa_id)
    )
    if almacen_id:
        query = query.where(StockActual.almacen_id == almacen_id)
    
    result = await db.execute(query)
    stocks = []
    for row in result.all():
        stock, producto, almacen = row
        stock_dict = StockActualResponse.model_validate(stock).model_dump()
        stock_dict['producto_nombre'] = producto.nombre
        stock_dict['almacen_nombre'] = almacen.nombre
        stocks.append(StockConDetalles(**stock_dict))
    
    return stocks

@api_router.post("/stock/entrada", response_model=MovimientoStockResponse)
async def entrada_stock(data: MovimientoStockCreate, db: AsyncSession = Depends(get_db)):
    # Update stock
    result = await db.execute(
        select(StockActual).where(
            StockActual.producto_id == data.producto_id,
            StockActual.almacen_id == data.almacen_id
        )
    )
    stock = result.scalar_one_or_none()
    
    if stock:
        stock.cantidad += data.cantidad
    else:
        stock = StockActual(
            producto_id=data.producto_id,
            almacen_id=data.almacen_id,
            cantidad=data.cantidad
        )
        db.add(stock)
    
    # Create movement
    movimiento = MovimientoStock(
        producto_id=data.producto_id,
        almacen_id=data.almacen_id,
        tipo=TipoMovimientoStock.ENTRADA,
        cantidad=data.cantidad,
        referencia_tipo=data.referencia_tipo,
        referencia_id=data.referencia_id
    )
    db.add(movimiento)
    
    await db.commit()
    await db.refresh(movimiento)
    return movimiento

@api_router.post("/stock/traspaso", response_model=dict)
async def traspasar_stock(data: TraspasoStockCreate, db: AsyncSession = Depends(get_db)):
    # Check origin stock
    result_origen = await db.execute(
        select(StockActual).where(
            StockActual.producto_id == data.producto_id,
            StockActual.almacen_id == data.almacen_origen_id
        )
    )
    stock_origen = result_origen.scalar_one_or_none()
    
    if not stock_origen or stock_origen.cantidad < data.cantidad:
        raise HTTPException(status_code=400, detail="Stock insuficiente en almacén origen")
    
    # Decrease origin
    stock_origen.cantidad -= data.cantidad
    
    # Increase destination
    result_destino = await db.execute(
        select(StockActual).where(
            StockActual.producto_id == data.producto_id,
            StockActual.almacen_id == data.almacen_destino_id
        )
    )
    stock_destino = result_destino.scalar_one_or_none()
    
    if stock_destino:
        stock_destino.cantidad += data.cantidad
    else:
        stock_destino = StockActual(
            producto_id=data.producto_id,
            almacen_id=data.almacen_destino_id,
            cantidad=data.cantidad
        )
        db.add(stock_destino)
    
    # Create movements
    mov_salida = MovimientoStock(
        producto_id=data.producto_id,
        almacen_id=data.almacen_origen_id,
        tipo=TipoMovimientoStock.TRASPASO,
        cantidad=-data.cantidad
    )
    mov_entrada = MovimientoStock(
        producto_id=data.producto_id,
        almacen_id=data.almacen_destino_id,
        tipo=TipoMovimientoStock.TRASPASO,
        cantidad=data.cantidad
    )
    db.add(mov_salida)
    db.add(mov_entrada)
    
    await db.commit()
    return {"message": "Traspaso realizado correctamente"}

@api_router.put("/stock/{stock_id}/alerta", response_model=StockActualResponse)
async def configurar_alerta_stock(stock_id: int, alerta_minima: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StockActual).where(StockActual.id == stock_id))
    stock = result.scalar_one_or_none()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock no encontrado")
    
    stock.alerta_minima = alerta_minima
    await db.commit()
    await db.refresh(stock)
    return stock

# ==================== VENTAS ====================
@api_router.post("/ventas", response_model=VentaResponse)
async def crear_venta(data: VentaCreate, db: AsyncSession = Depends(get_db)):
    # Get client discount
    cliente_result = await db.execute(select(Cliente).where(Cliente.id == data.cliente_id))
    cliente = cliente_result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    descuento_porcentaje = cliente.descuento_porcentaje or Decimal('0')
    
    # Calculate totals
    subtotal = Decimal('0')
    items_data = []
    
    for item in data.items:
        item_total = Decimal(str(item.cantidad)) * item.precio_unitario
        subtotal += item_total
        items_data.append({
            **item.model_dump(),
            'total': item_total
        })
        
        # Validate stock for products
        if item.producto_id:
            stock_result = await db.execute(
                select(func.coalesce(func.sum(StockActual.cantidad), 0))
                .where(StockActual.producto_id == item.producto_id)
            )
            stock_total = stock_result.scalar() or 0
            if stock_total < item.cantidad:
                prod_result = await db.execute(select(Producto).where(Producto.id == item.producto_id))
                prod = prod_result.scalar_one_or_none()
                raise HTTPException(
                    status_code=400, 
                    detail=f"Stock insuficiente para {prod.nombre if prod else 'producto'}. Disponible: {stock_total}"
                )
    
    # Apply discount
    descuento = subtotal * descuento_porcentaje / Decimal('100')
    subtotal_con_descuento = subtotal - descuento
    
    # Calculate IVA (10% Paraguay)
    iva = subtotal_con_descuento * Decimal('10') / Decimal('110')
    total = subtotal_con_descuento
    
    # Create sale
    venta = Venta(
        empresa_id=data.empresa_id,
        cliente_id=data.cliente_id,
        usuario_id=data.usuario_id,
        representante_cliente_id=data.representante_cliente_id,
        total=total,
        iva=iva,
        descuento=descuento,
        tipo_pago=data.tipo_pago,
        es_delivery=data.es_delivery,
        estado=EstadoVenta.BORRADOR
    )
    db.add(venta)
    await db.flush()
    
    # Create items
    for item_data in items_data:
        venta_item = VentaItem(venta_id=venta.id, **item_data)
        db.add(venta_item)
    
    await db.commit()
    await db.refresh(venta)
    return venta

@api_router.post("/ventas/{venta_id}/confirmar", response_model=VentaResponse)
async def confirmar_venta(venta_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Venta).options(selectinload(Venta.items)).where(Venta.id == venta_id)
    )
    venta = result.scalar_one_or_none()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    if venta.estado != EstadoVenta.BORRADOR:
        raise HTTPException(status_code=400, detail="La venta ya fue procesada")
    
    # Process stock and materias
    for item in venta.items:
        if item.producto_id:
            # Decrease stock from first available warehouse
            stock_result = await db.execute(
                select(StockActual)
                .where(StockActual.producto_id == item.producto_id, StockActual.cantidad > 0)
                .order_by(StockActual.cantidad.desc())
            )
            stocks = stock_result.scalars().all()
            
            cantidad_restante = item.cantidad
            for stock in stocks:
                if cantidad_restante <= 0:
                    break
                    
                a_descontar = min(stock.cantidad, cantidad_restante)
                stock.cantidad -= a_descontar
                cantidad_restante -= a_descontar
                
                # Create movement
                mov = MovimientoStock(
                    producto_id=item.producto_id,
                    almacen_id=stock.almacen_id,
                    tipo=TipoMovimientoStock.SALIDA,
                    cantidad=-a_descontar,
                    referencia_tipo='venta',
                    referencia_id=venta.id
                )
                db.add(mov)
        
        elif item.materia_laboratorio_id:
            # Mark materia as sold
            materia_result = await db.execute(
                select(MateriaLaboratorio).where(MateriaLaboratorio.id == item.materia_laboratorio_id)
            )
            materia = materia_result.scalar_one_or_none()
            if materia:
                materia.estado = EstadoMateria.VENDIDO
    
    venta.estado = EstadoVenta.CONFIRMADA
    await db.commit()
    await db.refresh(venta)
    return venta

@api_router.get("/ventas", response_model=List[VentaConDetalles])
async def listar_ventas(
    empresa_id: int,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Venta, Cliente)
        .join(Cliente, Venta.cliente_id == Cliente.id)
        .where(Venta.empresa_id == empresa_id)
        .order_by(Venta.creado_en.desc())
    )
    
    if fecha_desde:
        query = query.where(Venta.creado_en >= datetime.fromisoformat(fecha_desde))
    if fecha_hasta:
        query = query.where(Venta.creado_en <= datetime.fromisoformat(fecha_hasta))
    
    result = await db.execute(query)
    ventas = []
    for row in result.all():
        venta, cliente = row
        # Get items
        items_result = await db.execute(
            select(VentaItem).where(VentaItem.venta_id == venta.id)
        )
        items = [VentaItemResponse.model_validate(i) for i in items_result.scalars().all()]
        
        venta_dict = VentaResponse.model_validate(venta).model_dump()
        venta_dict['items'] = items
        venta_dict['cliente_nombre'] = f"{cliente.nombre} {cliente.apellido or ''}"
        venta_dict['cliente_ruc'] = cliente.ruc
        ventas.append(VentaConDetalles(**venta_dict))
    
    return ventas

@api_router.get("/ventas/{venta_id}", response_model=VentaConDetalles)
async def obtener_venta(venta_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Venta, Cliente)
        .join(Cliente, Venta.cliente_id == Cliente.id)
        .where(Venta.id == venta_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    venta, cliente = row
    items_result = await db.execute(
        select(VentaItem).where(VentaItem.venta_id == venta.id)
    )
    items = [VentaItemResponse.model_validate(i) for i in items_result.scalars().all()]
    
    venta_dict = VentaResponse.model_validate(venta).model_dump()
    venta_dict['items'] = items
    venta_dict['cliente_nombre'] = f"{cliente.nombre} {cliente.apellido or ''}"
    venta_dict['cliente_ruc'] = cliente.ruc
    return VentaConDetalles(**venta_dict)

@api_router.post("/ventas/{venta_id}/anular", response_model=VentaResponse)
async def anular_venta(venta_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Venta).where(Venta.id == venta_id))
    venta = result.scalar_one_or_none()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    venta.estado = EstadoVenta.ANULADA
    await db.commit()
    await db.refresh(venta)
    return venta

# ==================== FUNCIONARIOS ====================
@api_router.post("/funcionarios", response_model=FuncionarioResponse)
async def crear_funcionario(data: FuncionarioCreate, db: AsyncSession = Depends(get_db)):
    funcionario = Funcionario(**data.model_dump())
    db.add(funcionario)
    await db.commit()
    await db.refresh(funcionario)
    return funcionario

@api_router.get("/funcionarios", response_model=List[FuncionarioResponse])
async def listar_funcionarios(empresa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Funcionario).where(Funcionario.empresa_id == empresa_id, Funcionario.activo == True)
    )
    return result.scalars().all()

@api_router.get("/funcionarios/{funcionario_id}", response_model=FuncionarioResponse)
async def obtener_funcionario(funcionario_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Funcionario).where(Funcionario.id == funcionario_id))
    funcionario = result.scalar_one_or_none()
    if not funcionario:
        raise HTTPException(status_code=404, detail="Funcionario no encontrado")
    return funcionario

@api_router.put("/funcionarios/{funcionario_id}", response_model=FuncionarioResponse)
async def actualizar_funcionario(funcionario_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Funcionario).where(Funcionario.id == funcionario_id))
    funcionario = result.scalar_one_or_none()
    if not funcionario:
        raise HTTPException(status_code=404, detail="Funcionario no encontrado")
    
    for key, value in data.items():
        if hasattr(funcionario, key) and key != 'id':
            setattr(funcionario, key, value)
    
    await db.commit()
    await db.refresh(funcionario)
    return funcionario

@api_router.delete("/funcionarios/{funcionario_id}")
async def eliminar_funcionario(funcionario_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Funcionario).where(Funcionario.id == funcionario_id))
    funcionario = result.scalar_one_or_none()
    if not funcionario:
        raise HTTPException(status_code=404, detail="Funcionario no encontrado")
    
    funcionario.activo = False
    await db.commit()
    return {"message": "Funcionario desactivado"}

# ==================== ADELANTOS ====================
@api_router.post("/funcionarios/{funcionario_id}/adelantos", response_model=AdelantoSalarioResponse)
async def crear_adelanto(funcionario_id: int, data: AdelantoSalarioCreate, db: AsyncSession = Depends(get_db)):
    adelanto = AdelantoSalario(funcionario_id=funcionario_id, monto=data.monto)
    db.add(adelanto)
    await db.commit()
    await db.refresh(adelanto)
    return adelanto

@api_router.get("/funcionarios/{funcionario_id}/adelantos", response_model=List[AdelantoSalarioResponse])
async def listar_adelantos(funcionario_id: int, periodo: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(AdelantoSalario).where(AdelantoSalario.funcionario_id == funcionario_id)
    
    if periodo:
        # Filter by month
        year, month = map(int, periodo.split('-'))
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        query = query.where(
            AdelantoSalario.creado_en >= start_date,
            AdelantoSalario.creado_en < end_date
        )
    
    result = await db.execute(query.order_by(AdelantoSalario.creado_en.desc()))
    return result.scalars().all()

# ==================== CICLOS SALARIO ====================
@api_router.post("/funcionarios/{funcionario_id}/ciclos", response_model=CicloSalarioResponse)
async def crear_ciclo_salario(funcionario_id: int, data: CicloSalarioCreate, db: AsyncSession = Depends(get_db)):
    ciclo = CicloSalario(funcionario_id=funcionario_id, **data.model_dump(exclude={'funcionario_id'}))
    db.add(ciclo)
    await db.commit()
    await db.refresh(ciclo)
    return ciclo

@api_router.put("/ciclos/{ciclo_id}/pagar")
async def pagar_ciclo(ciclo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CicloSalario).where(CicloSalario.id == ciclo_id))
    ciclo = result.scalar_one_or_none()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
    
    ciclo.pagado = True
    await db.commit()
    return {"message": "Ciclo marcado como pagado"}

# ==================== VEHICULOS ====================
@api_router.post("/vehiculos", response_model=VehiculoResponse)
async def crear_vehiculo(data: VehiculoCreate, db: AsyncSession = Depends(get_db)):
    vehiculo = Vehiculo(**data.model_dump())
    db.add(vehiculo)
    await db.commit()
    await db.refresh(vehiculo)
    return vehiculo

@api_router.get("/vehiculos", response_model=List[VehiculoResponse])
async def listar_vehiculos(empresa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vehiculo).where(Vehiculo.empresa_id == empresa_id))
    return result.scalars().all()

@api_router.put("/vehiculos/{vehiculo_id}", response_model=VehiculoResponse)
async def actualizar_vehiculo(vehiculo_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vehiculo).where(Vehiculo.id == vehiculo_id))
    vehiculo = result.scalar_one_or_none()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    for key, value in data.items():
        if hasattr(vehiculo, key) and key != 'id':
            setattr(vehiculo, key, value)
    
    await db.commit()
    await db.refresh(vehiculo)
    return vehiculo

@api_router.delete("/vehiculos/{vehiculo_id}")
async def eliminar_vehiculo(vehiculo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vehiculo).where(Vehiculo.id == vehiculo_id))
    vehiculo = result.scalar_one_or_none()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    await db.delete(vehiculo)
    await db.commit()
    return {"message": "Vehículo eliminado"}

# ==================== ENTREGAS ====================
@api_router.post("/entregas", response_model=EntregaResponse)
async def crear_entrega(data: EntregaCreate, db: AsyncSession = Depends(get_db)):
    entrega = Entrega(**data.model_dump())
    db.add(entrega)
    await db.commit()
    await db.refresh(entrega)
    return entrega

@api_router.get("/entregas", response_model=List[EntregaConDetalles])
async def listar_entregas(
    empresa_id: int,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    vehiculo_id: Optional[int] = None,
    responsable_id: Optional[int] = None,
    estado: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Entrega, Venta, Cliente, Vehiculo, Usuario)
        .join(Venta, Entrega.venta_id == Venta.id)
        .join(Cliente, Venta.cliente_id == Cliente.id)
        .join(Vehiculo, Entrega.vehiculo_id == Vehiculo.id)
        .join(Usuario, Entrega.responsable_usuario_id == Usuario.id)
        .where(Venta.empresa_id == empresa_id)
    )
    
    if fecha_desde:
        query = query.where(Entrega.fecha_entrega >= datetime.fromisoformat(fecha_desde))
    if fecha_hasta:
        query = query.where(Entrega.fecha_entrega <= datetime.fromisoformat(fecha_hasta))
    if vehiculo_id:
        query = query.where(Entrega.vehiculo_id == vehiculo_id)
    if responsable_id:
        query = query.where(Entrega.responsable_usuario_id == responsable_id)
    if estado:
        query = query.where(Entrega.estado == EstadoEntrega(estado))
    
    result = await db.execute(query.order_by(Entrega.fecha_entrega.desc()))
    entregas = []
    for row in result.all():
        entrega, venta, cliente, vehiculo, usuario = row
        entrega_dict = EntregaResponse.model_validate(entrega).model_dump()
        entrega_dict['cliente_nombre'] = f"{cliente.nombre} {cliente.apellido or ''}"
        entrega_dict['vehiculo_chapa'] = vehiculo.chapa
        entrega_dict['responsable_nombre'] = f"{usuario.nombre} {usuario.apellido or ''}"
        entregas.append(EntregaConDetalles(**entrega_dict))
    
    return entregas

@api_router.put("/entregas/{entrega_id}/estado")
async def actualizar_estado_entrega(entrega_id: int, estado: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Entrega).where(Entrega.id == entrega_id))
    entrega = result.scalar_one_or_none()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")
    
    entrega.estado = EstadoEntrega(estado)
    await db.commit()
    return {"message": "Estado actualizado"}

# ==================== FACTURAS ====================
@api_router.post("/facturas", response_model=FacturaResponse)
async def crear_factura(data: FacturaCreate, db: AsyncSession = Depends(get_db)):
    factura = Factura(**data.model_dump())
    db.add(factura)
    await db.commit()
    await db.refresh(factura)
    return factura

@api_router.get("/facturas", response_model=List[FacturaResponse])
async def listar_facturas(empresa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Factura)
        .join(Venta, Factura.venta_id == Venta.id)
        .where(Venta.empresa_id == empresa_id)
        .order_by(Factura.creado_en.desc())
    )
    return result.scalars().all()

# ==================== PREFERENCIAS ====================
@api_router.post("/preferencias", response_model=PreferenciaUsuarioResponse)
async def crear_actualizar_preferencias(data: PreferenciaUsuarioCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PreferenciaUsuario).where(PreferenciaUsuario.usuario_id == data.usuario_id)
    )
    pref = result.scalar_one_or_none()
    
    if pref:
        pref.tema = data.tema
        pref.color_primario = data.color_primario
    else:
        pref = PreferenciaUsuario(**data.model_dump())
        db.add(pref)
    
    await db.commit()
    await db.refresh(pref)
    return pref

@api_router.get("/preferencias/{usuario_id}", response_model=PreferenciaUsuarioResponse)
async def obtener_preferencias(usuario_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PreferenciaUsuario).where(PreferenciaUsuario.usuario_id == usuario_id)
    )
    pref = result.scalar_one_or_none()
    if not pref:
        # Return default preferences
        return PreferenciaUsuarioResponse(
            id=0,
            usuario_id=usuario_id,
            tema="light",
            color_primario="#0044CC"
        )
    return pref

# ==================== COTIZACION DIVISAS ====================
@api_router.get("/cotizacion", response_model=CotizacionDivisa)
async def obtener_cotizacion():
    """Get USD/PYG and BRL/PYG exchange rates"""
    try:
        async with httpx.AsyncClient() as client:
            # Using exchangerate-api free tier
            response = await client.get(
                "https://api.exchangerate-api.com/v4/latest/USD",
                timeout=10.0
            )
            data = response.json()
            
            usd_pyg = Decimal(str(data['rates'].get('PYG', 7500)))
            brl_rate = Decimal(str(data['rates'].get('BRL', 5.0)))
            brl_pyg = usd_pyg / brl_rate
            
            return CotizacionDivisa(
                usd_pyg=usd_pyg,
                brl_pyg=brl_pyg.quantize(Decimal('0.01')),
                manual=False,
                fecha_actualizacion=datetime.now(timezone.utc)
            )
    except Exception as e:
        logger.error(f"Error fetching exchange rates: {e}")
        # Return default values
        return CotizacionDivisa(
            usd_pyg=Decimal('7500'),
            brl_pyg=Decimal('1500'),
            manual=True,
            fecha_actualizacion=datetime.now(timezone.utc)
        )

# ==================== DASHBOARD ====================
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def obtener_estadisticas_dashboard(empresa_id: int, db: AsyncSession = Depends(get_db)):
    today = datetime.now(timezone.utc).date()
    today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
    today_end = datetime.combine(today, datetime.max.time()).replace(tzinfo=timezone.utc)
    
    # Sales today
    ventas_hoy_result = await db.execute(
        select(
            func.coalesce(func.sum(Venta.total), 0),
            func.count(Venta.id)
        )
        .where(
            Venta.empresa_id == empresa_id,
            Venta.estado == EstadoVenta.CONFIRMADA,
            Venta.creado_en >= today_start,
            Venta.creado_en <= today_end
        )
    )
    ventas_row = ventas_hoy_result.first()
    ventas_hoy = ventas_row[0] if ventas_row else Decimal('0')
    cantidad_ventas = ventas_row[1] if ventas_row else 0
    
    # Pending deliveries
    deliverys_result = await db.execute(
        select(func.count(Entrega.id))
        .join(Venta, Entrega.venta_id == Venta.id)
        .where(
            Venta.empresa_id == empresa_id,
            Entrega.estado == EstadoEntrega.PENDIENTE
        )
    )
    deliverys_pendientes = deliverys_result.scalar() or 0
    
    # Products with low stock
    stock_bajo_result = await db.execute(
        select(Producto.id, Producto.nombre, func.sum(StockActual.cantidad), StockActual.alerta_minima)
        .join(StockActual, Producto.id == StockActual.producto_id)
        .where(
            Producto.empresa_id == empresa_id,
            Producto.activo == True,
            StockActual.alerta_minima.isnot(None)
        )
        .group_by(Producto.id, Producto.nombre, StockActual.alerta_minima)
        .having(func.sum(StockActual.cantidad) <= StockActual.alerta_minima)
    )
    productos_bajo_stock = [
        StockBajo(
            producto_id=row[0],
            producto_nombre=row[1],
            stock_total=row[2] or 0,
            alerta_minima=row[3] or 0
        )
        for row in stock_bajo_result.all()
    ]
    
    # Sales by hour
    ventas_por_hora_result = await db.execute(
        select(
            func.extract('hour', Venta.creado_en).label('hora'),
            func.count(Venta.id),
            func.coalesce(func.sum(Venta.total), 0)
        )
        .where(
            Venta.empresa_id == empresa_id,
            Venta.estado == EstadoVenta.CONFIRMADA,
            Venta.creado_en >= today_start,
            Venta.creado_en <= today_end
        )
        .group_by(func.extract('hour', Venta.creado_en))
        .order_by('hora')
    )
    ventas_por_hora = [
        VentasPorHora(hora=int(row[0]), cantidad=row[1], monto=row[2])
        for row in ventas_por_hora_result.all()
    ]
    
    # Top stock products
    alto_stock_result = await db.execute(
        select(Producto.id, Producto.nombre, func.sum(StockActual.cantidad))
        .join(StockActual, Producto.id == StockActual.producto_id)
        .where(Producto.empresa_id == empresa_id, Producto.activo == True)
        .group_by(Producto.id, Producto.nombre)
        .order_by(func.sum(StockActual.cantidad).desc())
        .limit(5)
    )
    productos_alto_stock = [
        {"producto_id": row[0], "producto_nombre": row[1], "stock_total": row[2] or 0}
        for row in alto_stock_result.all()
    ]
    
    return DashboardStats(
        ventas_hoy=ventas_hoy,
        cantidad_ventas_hoy=cantidad_ventas,
        deliverys_pendientes=deliverys_pendientes,
        productos_stock_bajo=len(productos_bajo_stock),
        creditos_por_vencer=0,  # TODO: Implement
        ventas_por_hora=ventas_por_hora,
        productos_bajo_stock=productos_bajo_stock,
        productos_alto_stock=productos_alto_stock
    )

# ==================== ALERTAS ====================
@api_router.get("/alertas", response_model=List[Alerta])
async def obtener_alertas(empresa_id: int, db: AsyncSession = Depends(get_db)):
    alertas = []
    today = date.today()
    
    # Products expiring soon (30 days)
    fecha_limite = today + timedelta(days=30)
    productos_vencimiento = await db.execute(
        select(Producto)
        .where(
            Producto.empresa_id == empresa_id,
            Producto.activo == True,
            Producto.fecha_vencimiento.isnot(None),
            Producto.fecha_vencimiento <= fecha_limite
        )
    )
    for prod in productos_vencimiento.scalars().all():
        dias = (prod.fecha_vencimiento - today).days
        nivel = "danger" if dias <= 7 else "warning"
        alertas.append(Alerta(
            tipo="vencimiento_producto",
            mensaje=f"{prod.nombre} vence en {dias} días",
            nivel=nivel,
            referencia_id=prod.id
        ))
    
    # Vehicles with expiring documents
    vehiculos_result = await db.execute(
        select(Vehiculo)
        .where(
            Vehiculo.empresa_id == empresa_id,
            or_(
                and_(
                    Vehiculo.vencimiento_habilitacion.isnot(None),
                    Vehiculo.vencimiento_habilitacion <= fecha_limite
                ),
                and_(
                    Vehiculo.vencimiento_cedula_verde.isnot(None),
                    Vehiculo.vencimiento_cedula_verde <= fecha_limite
                )
            )
        )
    )
    for veh in vehiculos_result.scalars().all():
        if veh.vencimiento_habilitacion and veh.vencimiento_habilitacion <= fecha_limite:
            dias = (veh.vencimiento_habilitacion - today).days
            nivel = "danger" if dias <= 7 else "warning"
            alertas.append(Alerta(
                tipo="vencimiento_habilitacion",
                mensaje=f"Habilitación de {veh.chapa} vence en {dias} días",
                nivel=nivel,
                referencia_id=veh.id
            ))
        if veh.vencimiento_cedula_verde and veh.vencimiento_cedula_verde <= fecha_limite:
            dias = (veh.vencimiento_cedula_verde - today).days
            nivel = "danger" if dias <= 7 else "warning"
            alertas.append(Alerta(
                tipo="vencimiento_cedula_verde",
                mensaje=f"Cédula verde de {veh.chapa} vence en {dias} días",
                nivel=nivel,
                referencia_id=veh.id
            ))
    
    # Low stock alerts
    stock_bajo = await db.execute(
        select(Producto.id, Producto.nombre, func.sum(StockActual.cantidad), StockActual.alerta_minima)
        .join(StockActual, Producto.id == StockActual.producto_id)
        .where(
            Producto.empresa_id == empresa_id,
            Producto.activo == True,
            StockActual.alerta_minima.isnot(None)
        )
        .group_by(Producto.id, Producto.nombre, StockActual.alerta_minima)
        .having(func.sum(StockActual.cantidad) <= StockActual.alerta_minima)
    )
    for row in stock_bajo.all():
        alertas.append(Alerta(
            tipo="stock_bajo",
            mensaje=f"{row[1]} tiene stock bajo ({row[2]} unidades)",
            nivel="warning",
            referencia_id=row[0]
        ))
    
    return alertas

# ==================== SEED DATA ====================
@api_router.post("/seed")
async def seed_data(db: AsyncSession = Depends(get_db)):
    """Create initial data for testing"""
    # Check if already seeded
    existing = await db.execute(select(Empresa))
    if existing.scalar_one_or_none():
        return {"message": "Data already seeded"}
    
    # Create default empresa
    empresa = Empresa(
        nombre="Luz Brill S.A.",
        ruc="80012345-6",
        direccion="Asunción, Paraguay",
        telefono="021-123456",
        email="contacto@luzbrill.com"
    )
    db.add(empresa)
    await db.flush()
    
    # Create admin user
    admin = Usuario(
        empresa_id=empresa.id,
        email="admin@luzbrill.com",
        password_hash=hash_password("admin123"),
        nombre="Administrador",
        apellido="Sistema"
    )
    db.add(admin)
    
    # Create permisos
    permisos_data = [
        ("ventas.crear", "Crear ventas"),
        ("ventas.ver", "Ver ventas"),
        ("ventas.anular", "Anular ventas"),
        ("productos.crear", "Crear productos"),
        ("productos.editar", "Editar productos"),
        ("productos.eliminar", "Eliminar productos"),
        ("stock.ajustar", "Ajustar stock"),
        ("clientes.crear", "Crear clientes"),
        ("clientes.editar", "Editar clientes"),
        ("funcionarios.ver", "Ver funcionarios"),
        ("funcionarios.editar", "Editar funcionarios"),
        ("usuarios.gestionar", "Gestionar usuarios"),
        ("sistema.configurar", "Configurar sistema"),
    ]
    for clave, desc in permisos_data:
        db.add(Permiso(clave=clave, descripcion=desc))
    
    # Create roles
    for rol_nombre in ["ADMIN", "GERENTE", "VENDEDOR", "DELIVERY"]:
        db.add(Rol(empresa_id=empresa.id, nombre=rol_nombre, descripcion=f"Rol {rol_nombre}"))
    
    # Create categories
    categorias = ["Pinturas", "Herramientas", "Materiales", "Accesorios"]
    for cat in categorias:
        db.add(Categoria(empresa_id=empresa.id, nombre=cat))
    
    # Create brands
    marcas = ["Alba", "Sherwin Williams", "Sinteplast", "Tersuave"]
    for marca in marcas:
        db.add(Marca(empresa_id=empresa.id, nombre=marca))
    
    # Create warehouses
    db.add(Almacen(empresa_id=empresa.id, nombre="Depósito Principal", ubicacion="Planta Baja"))
    db.add(Almacen(empresa_id=empresa.id, nombre="Tienda", ubicacion="Local Comercial"))
    
    # Create occasional client
    db.add(Cliente(
        empresa_id=empresa.id,
        nombre="Cliente",
        apellido="Ocasional",
        ruc="00000000-0"
    ))
    
    await db.commit()
    return {"message": "Data seeded successfully", "empresa_id": empresa.id}

# Include router
app.include_router(api_router)

# Startup event
@app.on_event("startup")
async def startup():
    await init_db()
    logger.info("Database initialized")

@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()
    logger.info("Database connection closed")
