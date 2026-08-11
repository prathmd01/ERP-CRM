import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Challan, PaginatedResult } from '../types';

export const ChallanList: React.FC = () => {
  const { user } = useAuth();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canCreate = user?.role === 'ADMIN' || user?.role === 'SALES';

  const fetchChallans = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: stockPage().toString(), // Helper is page.toString()
        limit: limit.toString(),
      });
      params.append('page', page.toString());
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get<{ success: boolean; data: PaginatedResult<Challan> }>(
        `/challans?${params.toString()}`
      );
      setChallans(response.data.data.items);
      setTotal(response.data.data.total);
      setTotalPages(response.data.data.totalPages);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Fix typo in helper invocation
  const stockPage = () => page;

  useEffect(() => {
    fetchChallans();
  }, [page, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Search & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by challan number, customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 w-full md:max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        {canCreate && (
          <Link
            to="/challans/new"
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-650 hover:bg-indigo-750 text-white text-sm font-semibold rounded-lg shadow transition"
          >
            ➕ Create Sales Challan
          </Link>
        )}
      </div>

      {/* Challans Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : challans.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No challans found. Adjust search or filters.
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-100">
                    <th className="px-6 py-4">Challan Number</th>
                    <th className="px-6 py-4">Customer Name</th>
                    <th className="px-6 py-4">Total Qty</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created By</th>
                    <th className="px-6 py-4">Creation Date</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {challans.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-indigo-650">
                        <Link to={`/challans/${c.id}`}>{c.challanNumber}</Link>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        {c.customer?.businessName || c.customer?.name}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-700">{c.totalQuantity} units</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            c.status === 'CONFIRMED'
                              ? 'bg-green-100 text-green-700'
                              : c.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-500">{c.user?.name || c.createdBy}</td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-500">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/challans/${c.id}`}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-850"
                        >
                          Invoice Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">
                Showing {challans.length} of {total} challans
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  ◀ Previous
                </button>
                <span className="text-xs flex items-center px-2 font-medium text-gray-600">
                  Page {page} of {totalPages || 1}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || totalPages === 0}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Next ▶
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallanList;
