import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Toaster } from './components/ui/sonner';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Ventas from './pages/Ventas';
import Delivery from './pages/Delivery';
import Laboratorio from './pages/Laboratorio';
import Productos from './pages/Productos';
import Proveedores from './pages/Proveedores';
import Clientes from './pages/Clientes';
import Funcionarios from './pages/Funcionarios';
import Stock from './pages/Stock';
import Flota from './pages/Flota';
import Facturas from './pages/Facturas';
import Usuarios from './pages/Usuarios';
import Sistema from './pages/Sistema';
import Marcas from './pages/Marcas';
import Permisos from './pages/Permisos';
import HistorialVentas from './pages/HistorialVentas';
import Reportes from './pages/Reportes';

import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useApp();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Routes with Layout
const AppRoutes = () => {
  const { user } = useApp();
  
  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={user ? <Navigate to="/home" replace /> : <Login />} 
      />
      
      {/* Protected Routes */}
      <Route 
        path="/home" 
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/ventas" 
        element={
          <ProtectedRoute>
            <Layout>
              <Ventas />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/delivery" 
        element={
          <ProtectedRoute>
            <Layout>
              <Delivery />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/historial-ventas" 
        element={
          <ProtectedRoute>
            <Layout>
              <HistorialVentas />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/laboratorio" 
        element={
          <ProtectedRoute>
            <Layout>
              <Laboratorio />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/productos" 
        element={
          <ProtectedRoute>
            <Layout>
              <Productos />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/proveedores" 
        element={
          <ProtectedRoute>
            <Layout>
              <Proveedores />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/clientes" 
        element={
          <ProtectedRoute>
            <Layout>
              <Clientes />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/funcionarios" 
        element={
          <ProtectedRoute>
            <Layout>
              <Funcionarios />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/stock" 
        element={
          <ProtectedRoute>
            <Layout>
              <Stock />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/flota" 
        element={
          <ProtectedRoute>
            <Layout>
              <Flota />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/facturas" 
        element={
          <ProtectedRoute>
            <Layout>
              <Facturas />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/usuarios" 
        element={
          <ProtectedRoute>
            <Layout>
              <Usuarios />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/marcas" 
        element={
          <ProtectedRoute>
            <Layout>
              <Marcas />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/permisos" 
        element={
          <ProtectedRoute>
            <Layout>
              <Permisos />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/reportes" 
        element={
          <ProtectedRoute>
            <Layout>
              <Reportes />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/sistema" 
        element={
          <ProtectedRoute>
            <Layout>
              <Sistema />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      {/* Default Route */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
