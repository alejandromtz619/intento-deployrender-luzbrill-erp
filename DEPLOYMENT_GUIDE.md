# 🚀 Guía de Deployment en Render

Esta guía te llevará paso a paso para hacer deploy de tu aplicación Luz Brill ERP en Render sin perder funcionalidad.

## 📋 Pre-requisitos

1. Cuenta en [Render.com](https://render.com)
2. Repositorio Git (GitHub, GitLab o Bitbucket)
3. Tu código debe estar pusheado al repositorio

---

## 🗄️ PARTE 1: Crear la Base de Datos PostgreSQL

### Paso 1.1: Crear la Base de Datos
1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Click en **"New +"** → **"PostgreSQL"**
3. Configura:
   - **Name**: `luzbrill-db`
   - **Database**: `luzbrill`
   - **User**: `luzbrill` (automático)
   - **Region**: Elige la más cercana (ej: Oregon)
   - **PostgreSQL Version**: 15 o superior
   - **Plan**: Free (o el que prefieras)
4. Click en **"Create Database"**
5. **IMPORTANTE**: Copia la **Internal Database URL** (la necesitarás para el backend)
   - Se ve algo así: `postgresql://usuario:password@host/database`

---

## 🔧 PARTE 2: Deployar el Backend (FastAPI)

### Paso 2.1: Crear Web Service para Backend
1. En Render Dashboard, click **"New +"** → **"Web Service"**
2. Conecta tu repositorio Git
3. Configura el servicio:
   - **Name**: `luzbrill-backend`
   - **Region**: Misma que la base de datos
   - **Branch**: `main` (o tu rama principal)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`

### Paso 2.2: Configurar Variables de Entorno
En la sección **"Environment Variables"**, agrega:

```
DATABASE_URL = [Pega aquí la Internal Database URL que copiaste]
JWT_SECRET = [Genera un string aleatorio seguro, ej: openssl rand -hex 32]
CORS_ORIGINS = * 
PORT = 10000
```

**Nota sobre CORS_ORIGINS**: 
- Temporalmente usa `*` para testing
- Después de deployar frontend, cámbialo a: `https://tu-frontend-url.onrender.com`

### Paso 2.3: Configuraciones Avanzadas
- **Plan**: Free (o el que prefieras)
- **Auto-Deploy**: Yes (para deployar automáticamente con cada push)
- **Health Check Path**: `/api/health`

### Paso 2.4: Deploy
1. Click **"Create Web Service"**
2. Espera a que el deploy termine (5-10 minutos)
3. **Copia la URL de tu backend** (ej: `https://luzbrill-backend.onrender.com`)
4. Verifica que funciona visitando: `https://tu-backend-url.onrender.com/api/health`
   - Deberías ver: `{"status": "healthy", "timestamp": "..."}`

---

## 🎨 PARTE 3: Deployar el Frontend (React)

### Paso 3.1: Crear Web Service para Frontend
1. En Render Dashboard, click **"New +"** → **"Web Service"**
2. Conecta el mismo repositorio
3. Configura el servicio:
   - **Name**: `luzbrill-frontend`
   - **Region**: Misma que backend
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Runtime**: `Node`
   - **Build Command**: `yarn install && yarn build`
   - **Start Command**: `npx serve -s build -l $PORT`

### Paso 3.2: Configurar Variables de Entorno
En **"Environment Variables"**, agrega:

```
REACT_APP_API_URL = https://[URL-DE-TU-BACKEND]/api
NODE_VERSION = 18.18.0
```

**Ejemplo**: Si tu backend es `https://luzbrill-backend.onrender.com`, entonces:
```
REACT_APP_API_URL = https://luzbrill-backend.onrender.com/api
```

### Paso 3.3: Deploy
1. Click **"Create Web Service"**
2. Espera a que el deploy termine (5-10 minutos)
3. **Copia la URL de tu frontend** (ej: `https://luzbrill-frontend.onrender.com`)

---

## 🔄 PARTE 4: Actualizar CORS en Backend

### Paso 4.1: Actualizar Variable de Entorno
1. Ve al servicio del **backend** en Render
2. Ve a **"Environment"**
3. Edita la variable `CORS_ORIGINS`:
   ```
   https://luzbrill-frontend.onrender.com,http://localhost:3000
   ```
   (Reemplaza con tu URL real del frontend)
4. Click **"Save Changes"**
5. El backend se re-deployará automáticamente

---

## ✅ PARTE 5: Verificación Final

### Checklist de Verificación:
- [ ] Base de datos PostgreSQL corriendo
- [ ] Backend responde en `/api/health`
- [ ] Frontend carga correctamente
- [ ] Puedes hacer login
- [ ] Las funcionalidades principales funcionan
- [ ] Los plugins de webpack-health y visual-edits están funcionando
- [ ] No hay errores de CORS en la consola del navegador

### URLs Finales:
- 🗄️ **Database**: [Internal URL visible solo en Render]
- 🔧 **Backend API**: `https://tu-backend.onrender.com/api`
- 🎨 **Frontend**: `https://tu-frontend.onrender.com`

---

## 🔍 IMPORTANTE: Características Preservadas

✅ **Todas tus funcionalidades se mantienen**:
- Módulos completos (Clientes, Proveedores, Productos, Stock, Ventas, etc.)
- Plugins de webpack (health-check, visual-edits)
- Configuración de CRACO
- Todos los componentes UI de shadcn/ui
- Sistema de autenticación JWT
- Integración con APIs externas (emergentintegrations)
- Context API y hooks personalizados

---

## 🐛 Troubleshooting

### Backend no inicia:
- Verifica que `DATABASE_URL` esté correcta
- Revisa los logs en Render Dashboard
- Asegúrate que `requirements.txt` incluye todas las dependencias

### Frontend no conecta con Backend:
- Verifica que `REACT_APP_API_URL` esté correcta
- Chequea CORS en backend
- Mira la consola del navegador (F12) para errores

### Base de datos no conecta:
- Usa la **Internal Database URL**, no la External
- Verifica que backend y DB estén en la misma región

### Build del Frontend falla:
- Aumenta la memoria del servicio si es Free tier
- Verifica que `yarn.lock` esté en el repo
- Revisa los logs de build

---

## 🔐 Seguridad Post-Deploy

1. **Cambia JWT_SECRET** a un valor aleatorio fuerte
2. **Configura CORS** correctamente (no dejes `*`)
3. **Activa HTTPS** (Render lo hace automáticamente)
4. **Configura dominio custom** (opcional)

---

## 📊 Monitoreo

Render te da:
- 📈 **Logs en tiempo real** para debugging
- 🔄 **Auto-deploy** desde Git
- 📊 **Métricas de uso**
- 🚨 **Alertas de caídas**

---

## 💰 Planes y Costos

**Free Tier**:
- ✅ Backend + Frontend + DB gratis
- ⚠️ Se duerme después de 15 min de inactividad
- ⚠️ 750 horas/mes de compute

**Paid Tier** ($7-21/mes por servicio):
- ✅ Sin sleep
- ✅ Más recursos
- ✅ Mejor performance

---

## 🎉 ¡Listo!

Tu aplicación Luz Brill ERP está ahora en producción en Render, manteniendo todas las funcionalidades y plugins de Emergent.

### Próximos pasos:
1. Configurar dominio personalizado (opcional)
2. Configurar backups de base de datos
3. Monitorear logs regularmente
4. Configurar notificaciones de errores

---

## 📞 Soporte

- [Render Docs](https://render.com/docs)
- [Render Community](https://community.render.com)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

