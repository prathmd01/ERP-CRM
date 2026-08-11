import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Customer, Challan } from '../types';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [recentChallans, setRecentChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CRM edit state
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'LEAD' | 'ACTIVE' | 'INACTIVE'>('LEAD');
  const [followUpDate, setFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'SALES';

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<{ success: boolean; data: any }>(`/customers/${id}`);
      const data = response.data.data;
      
      setCustomer(data);
      setRecentChallans(data.challans || []);
      setNotes(data.notes || '');
      setStatus(data.status);
      setFollowUpDate(data.followUpDate ? new Date(data.followUpDate).toISOString().slice(0, 10) : '');
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const handleCrmSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);

    try {
      const payload = {
        notes,
        status,
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
      };

      await api.put(`/customers/${id}`, payload);
      setEditing(false);
      fetchCustomerDetails();
    } catch (err: any) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700">
        <p className="font-bold">Error loading customer details</p>
        <p className="text-sm">{error || 'Customer not found'}</p>
        <Link to="/customers" className="mt-4 inline-block text-xs font-semibold text-indigo-700 underline">
          Back to Customer List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link to="/customers" className="inline-flex items-center text-sm font-semibold text-indigo-650 hover:text-indigo-850">
          ← Back to CRM Customer Directory
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Customer Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-150 p-6 space-y-6 lg:col-span-2">
          <div className="flex justify-between items-start border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-800">{customer.name}</h2>
              <p className="text-sm font-medium text-gray-400 mt-1">{customer.businessName}</p>
            </div>
            <span
              className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                customer.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-700'
                  : customer.status === 'INACTIVE'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {customer.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Mobile Number
              </span>
              <span className="text-gray-800 font-semibold">{customer.mobile}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Email Address
              </span>
              <span className="text-gray-800 font-semibold">{customer.email}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Customer Type
              </span>
              <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 uppercase">
                {customer.customerType}
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                GSTIN
              </span>
              <span className="text-gray-800 font-mono font-semibold">{customer.gstNumber || 'Not Provided'}</span>
            </div>
            <div className="md:col-span-2">
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Full Address
              </span>
              <span className="text-gray-800 font-medium">{customer.address}</span>
            </div>
          </div>
        </div>

        {/* CRM Follow-Up Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-150 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-extrabold text-gray-800 flex items-center border-b border-gray-100 pb-3">
              <span className="mr-2">📅</span> CRM Follow-Up Ledger
            </h3>

            {!editing ? (
              <div className="space-y-4 text-sm">
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Next Follow-Up Date
                  </span>
                  <span className="font-semibold text-gray-800">
                    {customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : 'No date scheduled'}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Follow-Up Notes
                  </span>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 min-h-[80px] whitespace-pre-line text-xs font-medium leading-relaxed">
                    {customer.notes || 'No comments log.'}
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => setEditing(true)}
                    className="w-full py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-lg border border-indigo-200 transition"
                  >
                    ✏️ Update Follow-Up details
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleCrmSave} className="space-y-4">
                {saveError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-2 rounded text-xs text-red-700">
                    ⚠️ {saveError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Next Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    CRM Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="LEAD">LEAD</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    CRM Notes / Activity Description
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 h-24"
                    placeholder="Enter customer response or next steps..."
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="flex-1 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow transition"
                  >
                    {saving ? 'Saving...' : 'Save Details'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Recent Challans history */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-150 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-extrabold text-gray-800 flex items-center">
            <span className="mr-2">📄</span> Sales Challans History
          </h3>
        </div>
        <div className="overflow-x-auto">
          {recentChallans.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-3">Challan Number</th>
                  <th className="px-6 py-3">Total Quantity</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {recentChallans.map((challan) => (
                  <tr key={challan.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-indigo-650">
                      <Link to={`/challans/${challan.id}`}>{challan.challanNumber}</Link>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">{challan.totalQuantity}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(challan.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                          challan.status === 'CONFIRMED'
                            ? 'bg-green-100 text-green-700'
                            : challan.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {challan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/challans/${challan.id}`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-850"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-gray-400 text-sm">
              No sales challans recorded for this customer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
