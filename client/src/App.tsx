import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/CustomerList';
import CustomerDetail from './pages/CustomerDetail';
import ProductList from './pages/ProductList';
import InventoryList from './pages/InventoryList';
import ChallanList from './pages/ChallanList';
import ChallanNew from './pages/ChallanNew';
import ChallanDetail from './pages/ChallanDetail';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Fallback to Dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Customers CRM */}
            <Route
              path="customers"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                  <CustomerList />
                </ProtectedRoute>
              }
            />
            <Route
              path="customers/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                  <CustomerDetail />
                </ProtectedRoute>
              }
            />

            {/* Products Catalog */}
            <Route path="products" element={<ProductList />} />

            {/* Inventory Ledger & Movements */}
            <Route path="inventory" element={<InventoryList />} />

            {/* Sales Challans */}
            <Route
              path="challans"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                  <ChallanList />
                </ProtectedRoute>
              }
            />
            <Route
              path="challans/new"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SALES']}>
                  <ChallanNew />
                </ProtectedRoute>
              }
            />
            <Route
              path="challans/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                  <ChallanDetail />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all redirection */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
