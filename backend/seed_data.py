"""
Script para poblar la base de datos con datos iniciales
Ejecutar: python seed_data.py
"""
import asyncio
from sqlalchemy import select
from database import init_db, async_session_maker
from models import Empresa, Usuario, Rol, Permiso, RolPermiso, UsuarioRol
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed_database():
    print("🌱 Iniciando seed de base de datos...")
    
    # Inicializar tablas
    await init_db()
    print("✅ Tablas creadas")
    
    async with async_session_maker() as session:
        # 1. Crear Empresa
        result = await session.execute(select(Empresa).where(Empresa.ruc == "12345678901"))
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
            session.add(empresa)
            await session.commit()
            await session.refresh(empresa)
            print(f"✅ Empresa creada: {empresa.razon_social}")
        else:
            print(f"ℹ️  Empresa ya existe: {empresa.razon_social}")
        
        # 2. Crear Rol Administrador
        result = await session.execute(select(Rol).where(Rol.nombre == "Administrador"))
        rol_admin = result.scalar_one_or_none()
        
        if not rol_admin:
            rol_admin = Rol(
                nombre="Administrador",
                descripcion="Acceso total al sistema",
                empresa_id=empresa.id,
                estado=True
            )
            session.add(rol_admin)
            await session.commit()
            await session.refresh(rol_admin)
            print(f"✅ Rol creado: {rol_admin.nombre}")
        else:
            print(f"ℹ️  Rol ya existe: {rol_admin.nombre}")
        
        # 3. Crear Usuario Administrador
        result = await session.execute(select(Usuario).where(Usuario.email == "admin@luzbrill.com"))
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
            session.add(usuario)
            await session.commit()
            await session.refresh(usuario)
            print(f"✅ Usuario creado: {usuario.email}")
            print(f"   📧 Email: admin@luzbrill.com")
            print(f"   🔑 Password: admin123")
        else:
            print(f"ℹ️  Usuario ya existe: {usuario.email}")
        
        # 4. Asignar Rol al Usuario
        result = await session.execute(
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
            session.add(usuario_rol)
            await session.commit()
            print(f"✅ Rol asignado al usuario")
        else:
            print(f"ℹ️  Usuario ya tiene el rol asignado")
        
        print("\n" + "="*50)
        print("🎉 Base de datos poblada exitosamente!")
        print("="*50)
        print("\n📋 CREDENCIALES DE LOGIN:")
        print(f"   📧 Email:    admin@luzbrill.com")
        print(f"   🔑 Password: admin123")
        print("="*50 + "\n")

if __name__ == "__main__":
    asyncio.run(seed_database())
