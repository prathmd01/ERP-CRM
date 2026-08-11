import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api';
import { DashboardStats } from '../types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await api.get<{ success: boolean; data: DashboardStats }>('/dashboard');
        setStats(response.data.data);
      } catch (err: any) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700">
        <p className="font-bold">Error loading dashboard</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Customers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-400 block mb-1">Total Customers</span>
            <span className="text-3xl font-extrabold text-gray-800">{stats?.totalCustomers || 0}</span>
          </div>
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-lg text-2xl">👥</div>
        </div>

        {/* Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-400 block mb-1">Total Products</span>
            <span className="text-3xl font-extrabold text-gray-800">{stats?.totalProducts || 0}</span>
          </div>
          <div className="p-3.5 bg-green-50 text-green-600 rounded-lg text-2xl">📦</div>
        </div>

        {/* Low Stock count */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-400 block mb-1">Low Stock Products</span>
            <span className="text-3xl font-extrabold text-gray-800">{stats?.lowStockCount || 0}</span>
          </div>
          <div className={`p-3.5 rounded-lg text-2xl ${(stats?.lowStockCount || 0) > 0 ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
            ⚠️
          </div>
        </div>

        {/* Total Challans */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-400 block mb-1">Total Challans</span>
            <span className="text-3xl font-extrabold text-gray-800">{stats?.totalChallans || 0}</span>
          </div>
          <div className="p-3.5 bg-purple-50 text-purple-600 rounded-lg text-2xl">📄</div>
        </div>
      </div>

      {/* Split grid for lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Challans */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between h-full">
          <div>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-indigo-50/20">
              <h2 className="font-bold text-gray-850">Recent Sales Challans</h2>
              <Link to="/challans" className="text-xs font-semibold text-indigo-650 hover:text-indigo-800 transition">
                View All →
              </Link>
            </div>
            <div className="overflow-x-auto">
              {stats && stats.recentChallans.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 font-semibold text-[11px] uppercase tracking-wider border-b border-gray-100">
                      <th className="px-6 py-3">Challan No.</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Qty</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {stats.recentChallans.map((challan) => (
                      <tr key={challan.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-indigo-600">
                          <Link to={`/challans/${challan.id}`}>{challan.challanNumber}</Link>
                        </td>
                        <td className="px-6 py-4 truncate max-w-[150px]">
                          {challan.customer?.businessName || challan.customer?.name}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-800">{challan.totalQuantity}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                              challan.status === 'CONFIRMED'
                                ? 'bg-green-150 text-green-700'
                                : challan.status === 'CANCELLED'
                                ? 'bg-red-50 text-red-650 border border-red-200'
                                : 'bg-gray-150 text-gray-700'
                            }`}
                          >
                            {challan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-gray-400 text-sm">
                  No challans found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between h-full">
          <div>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-orange-50/20">
              <h2 className="font-bold text-gray-850 flex items-center">
                <span className="mr-2">⚠️</span> Low Stock Products
              </h2>
              <Link to="/inventory" className="text-xs font-semibold text-orange-650 hover:text-orange-850 transition">
                Stock Ledger →
              </Link>
            </div>
            <div className="overflow-x-auto">
              {stats && stats.lowStockProducts.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 font-semibold text-[11px] uppercase tracking-wider border-b border-gray-100">
                      <th className="px-6 py-3">Product Name</th>
                      <th className="px-6 py-3">SKU</th>
                      <th className="px-6 py-3">Current</th>
                      <th className="px-6 py-3">Min</th>
                      <th className="px-6 py-3">WH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {stats.lowStockProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-850">{p.name}</td>
                        <td className="px-6 py-4 text-xs font-mono text-gray-500">{p.sku}</td>
                        <td className="px-6 py-4 font-bold text-red-600">{p.currentStock}</td>
                        <td className="px-6 py-4 text-gray-450">{p.minimumStock}</td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-medium">{p.warehouse}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-gray-400 text-sm">
                  🟢 All products are above minimum stock levels.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
