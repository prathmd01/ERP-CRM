import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api';
import { Customer, Product, PaginatedResult } from '../types';

interface LineItem {
  productId: string;
  quantity: number;
}

export const ChallanNew: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ productId: '', quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch customers & products (limit 100 for dropdowns)
        const [custRes, prodRes] = await Promise.all([
          api.get<{ success: boolean; data: PaginatedResult<Customer> }>('/customers?limit=100'),
          api.get<{ success: boolean; data: PaginatedResult<Product> }>('/products?limit=100'),
        ]);

        setCustomers(custRes.data.data.items);
        setProducts(prodRes.data.data.items);

        // Pre-select first customer
        if (custRes.data.data.items.length > 0) {
          setCustomerId(custRes.data.data.items[0].id);
        }
      } catch (err: any) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddLine = () => {
    setLineItems((prev) => [...prev, { productId: '', quantity: 1 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            [field]: field === 'quantity' ? Math.max(1, Number(value)) : value,
          };
        }
        return item;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Form Validations
    if (!customerId) {
      setSubmitError('Please select a customer.');
      return;
    }

    const invalidLines = lineItems.some((item) => !item.productId || item.quantity <= 0);
    if (invalidLines) {
      setSubmitError('Please ensure all line items have a selected product and positive quantity.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post<{ success: boolean; data: { id: string } }>('/challans', {
        customerId,
        items: lineItems,
      });
      // Redirect to newly created challan's detail page
      navigate(`/challans/${response.data.data.id}`);
    } catch (err: any) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to get selected product information
  const getProductInfo = (productId: string) => {
    return products.find((p) => p.id === productId);
  };

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
        <p className="font-bold">Error initializing challan builder</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link to="/challans" className="text-sm font-semibold text-indigo-650 hover:text-indigo-850">
          ← Back to Challans Directory
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-150 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-indigo-50/20">
          <h2 className="text-lg font-bold text-gray-800">Create New Sales Challan</h2>
          <p className="text-xs text-gray-500 mt-1">Challan will be saved as DRAFT. Stock will not be updated until confirmed.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {submitError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-750">
              ⚠️ {submitError}
            </div>
          )}

          {/* Customer Selection */}
          <div className="max-w-md">
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
              Select Customer *
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="" disabled>-- Select Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName} ({c.name})
                </option>
              ))}
            </select>
          </div>

          {/* Line Items Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-gray-700">Line Items</h3>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-3 py-1 bg-green-50 text-green-700 hover:bg-green-100 text-xs font-bold rounded border border-green-200 transition"
              >
                ➕ Add Line
              </button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => {
                const prodInfo = getProductInfo(item.productId);
                const hasStockWarning = prodInfo && prodInfo.currentStock < item.quantity;
                const totalLineCost = prodInfo ? Number(prodInfo.unitPrice) * item.quantity : 0;

                return (
                  <div
                    key={index}
                    className="flex flex-col md:flex-row md:items-end gap-3 p-4 bg-gray-50/50 rounded-lg border border-gray-200"
                  >
                    {/* Product Dropdown */}
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                        Product *
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleLineChange(index, 'productId', e.target.value)}
                        required
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      >
                        <option value="">-- Select Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} [{p.sku}] (Stock: {p.currentStock})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Stock indicator info */}
                    {prodInfo && (
                      <div className="w-28 text-xs space-y-0.5 mb-2 md:mb-0">
                        <div className="text-gray-400">Unit Price:</div>
                        <div className="font-semibold text-gray-700">₹{Number(prodInfo.unitPrice).toFixed(2)}</div>
                      </div>
                    )}

                    {/* Quantity Input */}
                    <div className="w-24">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        min="1"
                        required
                        onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      />
                    </div>

                    {/* Subtotal Display */}
                    {prodInfo && (
                      <div className="w-24 text-xs space-y-0.5 mb-2 md:mb-0">
                        <div className="text-gray-400">Subtotal:</div>
                        <div className="font-bold text-gray-800">₹{totalLineCost.toFixed(2)}</div>
                      </div>
                    )}

                    {/* Remove Action Button */}
                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(index)}
                        disabled={lineItems.length === 1}
                        className="px-2 py-1.5 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-650 text-xs font-semibold rounded border border-red-200 transition"
                      >
                        ✕ Remove
                      </button>
                    </div>

                    {/* Insufficient Stock Warning */}
                    {hasStockWarning && (
                      <div className="w-full md:w-auto text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded md:self-center">
                        ⚠️ Order exceeds current stock ({prodInfo.currentStock})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">
              Total Quantity:{' '}
              <strong className="text-gray-800">
                {lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}
              </strong>
            </span>
            <div className="flex space-x-2">
              <Link
                to="/challans"
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-md transition"
              >
                {submitting ? 'Saving Draft...' : '💾 Save as DRAFT'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChallanNew;
