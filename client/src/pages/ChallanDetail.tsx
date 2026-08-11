import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Challan } from '../types';

export const ChallanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Actions states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const canMutate = (user?.role === 'ADMIN' || user?.role === 'SALES') && challan?.status === 'DRAFT';

  const fetchChallan = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<{ success: boolean; data: Challan }>(`/challans/${id}`);
      setChallan(response.data.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallan();
  }, [id]);

  const handleConfirm = async () => {
    if (!challan) return;
    setActionError(null);
    setActionSuccess(null);
    setActionLoading(true);

    try {
      const response = await api.post<{ success: boolean; message?: string }>(`/challans/${challan.id}/confirm`);
      setActionSuccess('Challan confirmed successfully! Inventory levels updated.');
      fetchChallan();
    } catch (err: any) {
      setActionError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!challan) return;
    setActionError(null);
    setActionSuccess(null);
    setActionLoading(true);

    try {
      await api.post(`/challans/${challan.id}/cancel`);
      setActionSuccess('Challan cancelled successfully.');
      fetchChallan();
    } catch (err: any) {
      setActionError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !challan) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700">
        <p className="font-bold">Error loading challan</p>
        <p className="text-sm">{error || 'Challan not found'}</p>
        <Link to="/challans" className="mt-4 inline-block text-xs font-semibold text-indigo-700 underline">
          Back to Challans list
        </Link>
      </div>
    );
  }

  const invoiceSubtotal = challan.items
    ? challan.items.reduce((sum, item) => sum + Number(item.unitPriceSnapshot) * item.quantity, 0)
    : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back link */}
      <div className="flex items-center justify-between">
        <Link to="/challans" className="text-sm font-semibold text-indigo-650 hover:text-indigo-850">
          ← Back to Challans Ledger
        </Link>
        <span className="text-xs text-gray-400 font-medium font-mono">Challan ID: {challan.id}</span>
      </div>

      {/* Action Banners */}
      {actionError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-800 shadow-sm">
          <strong>⚠️ Operation Failed:</strong> {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded text-sm text-green-800 shadow-sm animate-fade-in">
          <strong>🎉 Success:</strong> {actionSuccess}
        </div>
      )}

      {/* Invoice Sheet */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Invoice Top Ribbon */}
        <div className="px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between bg-indigo-50/20 gap-4">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Sales Challan No.
            </span>
            <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight font-mono">
              {challan.challanNumber}
            </h2>
            <div className="text-xs text-gray-400 mt-1">
              Created on {new Date(challan.createdAt).toLocaleDateString()}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-500 font-medium">Status:</span>
            <span
              className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                challan.status === 'CONFIRMED'
                  ? 'bg-green-150 text-green-700'
                  : challan.status === 'CANCELLED'
                  ? 'bg-red-50 text-red-750 border border-red-200'
                  : 'bg-gray-150 text-gray-700'
              }`}
            >
              {challan.status}
            </span>
          </div>
        </div>

        {/* Customer & Creator Meta Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-8 py-8 border-b border-gray-150 text-sm">
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Customer Details</h4>
            <div className="font-bold text-gray-800 text-base">{challan.customer?.name}</div>
            <div className="font-semibold text-gray-550 mt-0.5">{challan.customer?.businessName}</div>
            <div className="text-xs text-gray-450 mt-1.5 leading-relaxed max-w-[280px]">
              {challan.customer && (
                <>
                  {challan.customer.address}
                  <br />
                  📞 {challan.customer.mobile}
                </>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Operations Record</h4>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-gray-400 font-semibold mr-1">Prepared By:</span>
                <span className="font-bold text-gray-700">{challan.user?.name}</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold mr-1">Operator Email:</span>
                <span className="font-bold text-gray-600 font-mono">{challan.user?.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold mr-1">Last Update:</span>
                <span className="font-bold text-gray-600">
                  {new Date(challan.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Challan Items Table */}
        <div className="px-8 py-6">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Line Items Snapshot</h4>
          <div className="overflow-x-auto border border-gray-100 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold text-[10px] uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3">Product Name Snapshot</th>
                  <th className="px-5 py-3">Unit Price Snapshot</th>
                  <th className="px-5 py-3">Quantity</th>
                  <th className="px-5 py-3">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-105 text-sm">
                {challan.items &&
                  challan.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-gray-500">{item.skuSnapshot}</td>
                      <td className="px-5 py-3.5 font-semibold text-gray-800">{item.productNameSnapshot}</td>
                      <td className="px-5 py-3.5 font-medium text-gray-700">
                        ₹{Number(item.unitPriceSnapshot).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-gray-800">{item.quantity} units</td>
                      <td className="px-5 py-3.5 font-extrabold text-gray-800">
                        ₹{(Number(item.unitPriceSnapshot) * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Invoice Summary Totals */}
          <div className="mt-6 flex flex-col items-end space-y-2 border-t border-gray-100 pt-4 px-4">
            <div className="text-sm font-semibold text-gray-500">
              Total Quantity:{' '}
              <strong className="text-gray-800 ml-1">{challan.totalQuantity} units</strong>
            </div>
            <div className="text-base font-extrabold text-indigo-705">
              Estimated Value:{' '}
              <strong className="text-gray-805 text-lg ml-1">₹{invoiceSubtotal.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        {canMutate && (
          <div className="px-8 py-5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="px-4 py-2 border border-red-300 text-red-650 hover:bg-red-50 disabled:opacity-50 text-sm font-semibold rounded-lg shadow-sm transition"
            >
              🚫 Cancel Draft Challan
            </button>
            <button
              onClick={handleConfirm}
              disabled={actionLoading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-md transition"
            >
              {actionLoading ? 'Confirming...' : '✅ Confirm & Release Stock'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallanDetail;
