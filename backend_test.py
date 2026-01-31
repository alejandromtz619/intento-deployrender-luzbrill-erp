#!/usr/bin/env python3
"""
Luz Brill ERP Backend API Testing
Tests all critical API endpoints for the ERP system
"""

import requests
import sys
import json
from datetime import datetime
from decimal import Decimal

class LuzBrillAPITester:
    def __init__(self, base_url="https://enterprise-luz.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.empresa_id = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                self.log(f"   Response: {response.text[:200]}", "FAIL")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "ERROR")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test basic API health"""
        success, response = self.run_test("API Health Check", "GET", "/health", 200)
        return success

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test("Root Endpoint", "GET", "/", 200)
        return success

    def test_login(self):
        """Test login with admin credentials"""
        login_data = {
            "email": "admin@luzbrill.com",
            "password": "admin123"
        }
        
        success, response = self.run_test("Admin Login", "POST", "/auth/login", 200, login_data)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            if 'usuario' in response:
                self.user_id = response['usuario']['id']
                if 'empresa_id' in response['usuario']:
                    self.empresa_id = response['usuario']['empresa_id']
            self.log(f"✅ Login successful - Token acquired, User ID: {self.user_id}, Empresa ID: {self.empresa_id}")
            return True
        else:
            self.log("❌ Login failed - No token received")
            return False

    def test_seed_data(self):
        """Test seeding initial data"""
        success, response = self.run_test("Seed Data", "POST", "/seed", 200)
        if success and 'empresa_id' in response:
            if not self.empresa_id:
                self.empresa_id = response['empresa_id']
                self.log(f"✅ Empresa ID from seed: {self.empresa_id}")
        return success

    def test_cotizacion_api(self):
        """Test currency exchange rates API"""
        success, response = self.run_test("Currency Exchange Rates", "GET", "/cotizacion", 200)
        
        if success:
            required_fields = ['usd_pyg', 'brl_pyg', 'fecha_actualizacion']
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                self.log(f"❌ Cotizacion API missing fields: {missing_fields}", "FAIL")
                return False
            else:
                self.log(f"✅ Cotizacion API - USD/PYG: {response.get('usd_pyg')}, BRL/PYG: {response.get('brl_pyg')}")
                return True
        return False

    def test_dashboard_stats(self):
        """Test dashboard statistics API"""
        if not self.empresa_id:
            self.log("❌ Cannot test dashboard stats - No empresa_id", "SKIP")
            return False
            
        success, response = self.run_test(
            "Dashboard Statistics", 
            "GET", 
            f"/dashboard/stats?empresa_id={self.empresa_id}", 
            200
        )
        
        if success:
            required_fields = ['ventas_hoy', 'cantidad_ventas_hoy', 'deliverys_pendientes', 'productos_stock_bajo']
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                self.log(f"❌ Dashboard stats missing fields: {missing_fields}", "FAIL")
                return False
            else:
                self.log(f"✅ Dashboard Stats - Ventas hoy: {response.get('ventas_hoy')}, Stock bajo: {response.get('productos_stock_bajo')}")
                return True
        return False

    def test_clientes_crud(self):
        """Test Clientes CRUD operations"""
        if not self.empresa_id:
            self.log("❌ Cannot test clientes - No empresa_id", "SKIP")
            return False

        # List clientes
        success, clientes = self.run_test("List Clientes", "GET", f"/clientes?empresa_id={self.empresa_id}", 200)
        if not success:
            return False

        # Create cliente
        cliente_data = {
            "empresa_id": self.empresa_id,
            "nombre": "Cliente Test",
            "apellido": "Prueba",
            "ruc": "12345678-9",
            "telefono": "021-123456",
            "email": "test@cliente.com"
        }
        
        success, new_cliente = self.run_test("Create Cliente", "POST", "/clientes", 200, cliente_data)
        if success and 'id' in new_cliente:
            cliente_id = new_cliente['id']
            self.log(f"✅ Cliente created with ID: {cliente_id}")
            
            # Get cliente
            success, _ = self.run_test("Get Cliente", "GET", f"/clientes/{cliente_id}", 200)
            return success
        
        return False

    def test_productos_crud(self):
        """Test Productos CRUD operations"""
        if not self.empresa_id:
            self.log("❌ Cannot test productos - No empresa_id", "SKIP")
            return False

        # List productos
        success, productos = self.run_test("List Productos", "GET", f"/productos?empresa_id={self.empresa_id}", 200)
        if not success:
            return False

        # Create producto
        producto_data = {
            "empresa_id": self.empresa_id,
            "nombre": "Producto Test",
            "descripcion": "Producto de prueba",
            "codigo_barra": "TEST123456",
            "precio_compra": 10000,
            "precio_venta": 15000,
            "activo": True
        }
        
        success, new_producto = self.run_test("Create Producto", "POST", "/productos", 200, producto_data)
        if success and 'id' in new_producto:
            producto_id = new_producto['id']
            self.log(f"✅ Producto created with ID: {producto_id}")
            
            # Get producto
            success, _ = self.run_test("Get Producto", "GET", f"/productos/{producto_id}", 200)
            return success
        
        return False

    def test_stock_operations(self):
        """Test Stock operations"""
        if not self.empresa_id:
            self.log("❌ Cannot test stock - No empresa_id", "SKIP")
            return False

        # List almacenes
        success, almacenes = self.run_test("List Almacenes", "GET", f"/almacenes?empresa_id={self.empresa_id}", 200)
        if not success:
            return False

        # List stock
        success, stock = self.run_test("List Stock", "GET", f"/stock?empresa_id={self.empresa_id}", 200)
        return success

    def test_ventas_flow(self):
        """Test basic sales flow"""
        if not self.empresa_id:
            self.log("❌ Cannot test ventas - No empresa_id", "SKIP")
            return False

        # List ventas
        success, ventas = self.run_test("List Ventas", "GET", f"/ventas?empresa_id={self.empresa_id}", 200)
        return success

    def test_usuarios_management(self):
        """Test user management"""
        if not self.empresa_id:
            self.log("❌ Cannot test usuarios - No empresa_id", "SKIP")
            return False

        # List usuarios
        success, usuarios = self.run_test("List Usuarios", "GET", f"/usuarios?empresa_id={self.empresa_id}", 200)
        return success

    def test_alertas(self):
        """Test alerts system"""
        if not self.empresa_id:
            self.log("❌ Cannot test alertas - No empresa_id", "SKIP")
            return False

        success, alertas = self.run_test("Get Alertas", "GET", f"/alertas?empresa_id={self.empresa_id}", 200)
        return success

    def run_all_tests(self):
        """Run all API tests"""
        self.log("🚀 Starting Luz Brill ERP API Tests")
        self.log("=" * 50)

        # Basic connectivity tests
        if not self.test_health_check():
            self.log("❌ Health check failed - API may be down", "CRITICAL")
            return False

        if not self.test_root_endpoint():
            self.log("❌ Root endpoint failed", "CRITICAL")
            return False

        # Seed data first (creates empresa and admin user)
        self.test_seed_data()

        # Authentication test
        if not self.test_login():
            self.log("❌ Login failed - Cannot proceed with authenticated tests", "CRITICAL")
            return False

        # Core API tests
        self.test_cotizacion_api()
        self.test_dashboard_stats()
        
        # CRUD operations
        self.test_clientes_crud()
        self.test_productos_crud()
        self.test_stock_operations()
        self.test_ventas_flow()
        self.test_usuarios_management()
        self.test_alertas()

        # Print summary
        self.log("=" * 50)
        self.log(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.failed_tests:
            self.log("❌ Failed Tests:")
            for failure in self.failed_tests:
                self.log(f"   - {failure.get('test', 'Unknown')}: {failure}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"✅ Success Rate: {success_rate:.1f}%")
        
        return success_rate >= 80  # Consider 80%+ success rate as passing

def main():
    """Main test execution"""
    tester = LuzBrillAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())