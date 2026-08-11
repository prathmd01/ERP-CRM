import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Product, StockMovement, PaginatedResult } from '../types';

export const InventoryList: React.FC = () => {
  const { user } = useAuth();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'STOCK' | 'MOVEMENTS'>('STOCK');

  // Stock Tab State
  const [stockList, setStockList] = useState<Product[]>([]);
  const [stockTotal, setStockTotal] = useState(0);
  const [stockPage, setStockPage] = useState(1);
  const [stockLimit] = useState(10);
  const [stockTotalPages, setStockTotalPages] = useState(1);
  const [stockSearch, setStockSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState<string | null>(null);

  // Movements Tab State
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [moveTotal, setMoveTotal] = useState(0);
  const [movePage, setMovePage] = useState(1);
  const [moveLimit] = useState(15);
  const [moveTotalPages, setMoveTotalPages] = useState(1);
  const [moveLoading, setMoveLoading] = useState(true);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Manual Movement Modal
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    productId: '',
    quantity: 1,
    movementType: 'IN' as 'IN' | 'OUT',
    reason: '',
  });

  const canAdjust = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  // Fetch Current Stocks
  const fetchStock = async () => {
    try {
      setStockLoading(true);
      setStockError(null);
      const params = new URLSearchParams({
        page: stockPage.toString(),
        limit: stockLimit.toString(),
      });
      if (stockSearch) params.append('search', stockSearch);
      if (lowStockFilter) params.append('lowStock', 'true');

      const response = await api.get<{ success: boolean; data: PaginatedResult<Product> }>(
        `/inventory?${params.toString()}`
      );
      setStockList(response.data.data.items);
      setStockTotal(response.data.data.total);
      setStockTotalPages(response.data.data.totalPages);
    } catch (err: any) {
      setStockError(getErrorMessage(err));
    } finally {
      setStockLoading(false);
    }
  };

  // Fetch Stock Movements Log
  const fetchMovements = async () => {
    try {
      setMoveLoading(true);
      setMoveError(null);
      const response = await api.get<{ success: boolean; data: PaginatedResult<StockMovement> }>(
        `/inventory/movements?page=${movePage}&limit=${moveLimit}`
      );
      setMovements(response.data.data.items);
      setMoveTotal(response.data.data.total);
      setMoveTotalPages(response.data.data.totalPages);
    } catch (err: any) {
      setMoveError(getErrorMessage(err));
    } finally {
      setMoveLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'STOCK') {
      fetchStock();
    } else {
      fetchMovements();
    }
  }, [activeTab, stockPage, stockSearch, lowStockFilter, movePage]);

  // Load all products for manual movements selection
  const loadProductsDropdown = async () => {
    try {
      setModalLoading(true);
      setModalError(null);
      const response = await api.get<{ success: boolean; data: PaginatedResult<Product> }>('/products?limit=100');
      setAllProducts(response.data.data.items);
      if (response.data.data.items.length > 0) {
        setFormData((prev) => ({ ...prev, productId: response.data.data.items[0].id }));
      }
    } catch (err: any) {
      setModalError(getErrorMessage(err));
    } finally {
      setModalLoading(false);
    }
  };

  const openMovementModal = () => {
    setModalError(null);
    setFormData({
      productId: '',
      quantity: 1,
      movementType: 'IN',
      reason: '',
    });
    loadProductsDropdown();
    setShowMoveModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? Math.max(1, Number(value)) : value,
    }));
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSubmitting(true);

    try {
      await api.post('/inventory/movements', formData);
      setShowMoveModal(false);
      // Reload active tab
      if (activeTab === 'STOCK') {
        fetchStock();
      } else {
        fetchMovements();
      }
    } catch (err: any) {
      setModalError(getErrorMessage(err));
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4 rounded-t-xl shadow-sm">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('STOCK')}
            className={`pb-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'STOCK'
                ? 'border-indigo-600 text-indigo-650'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Current Inventory Stock
          </button>
          {canAdjust && (
          <button
            onClick={() => setActiveTab('MOVEMENTS')}
            className={`pb-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'MOVEMENTS'
                ? 'border-indigo-600 text-indigo-650'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🔄 Stock Movements Log
          </button>
          )}
        </div>

        {canAdjust && (
          <button
            onClick={openMovementModal}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-650 hover:bg-indigo-750 text-white text-sm font-semibold rounded-lg shadow transition"
          >
            ⚙️ Post Stock Movement
          </button>
        )}
      </div>

      {/* TABS CONTAINER */}
      <div className="bg-white rounded-b-xl shadow-sm border-x border-b border-gray-100 overflow-hidden p-6">
        {activeTab === 'STOCK' ? (
          /* TAB 1: CURRENT STOCK */
          <div className="space-y-6">
            {/* Search filter controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 border-b border-gray-100 pb-4">
              <input
                type="text"
                placeholder="Filter by product name, SKU..."
                value={stockSearch}
                onChange={(e) => {
                  setStockSearch(e.target.value);
                  setStockPage(1);
                }}
                className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 w-full md:max-w-xs"
              />
              <label className="inline-flex items-center space-x-2 text-sm text-gray-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={lowStockFilter}
                  onChange={(e) => {
                    setLowStockFilter(e.target.checked);
                    setStockPage(1);
                  }}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-orange-650 font-bold">⚠️ Show Low Stock Only</span>
              </label>
            </div>

            {stockLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
              </div>
            ) : stockError ? (
              <div className="text-center text-red-500">{stockError}</div>
            ) : stockList.length === 0 ? (
              <div className="text-center text-gray-400 py-12">No inventory items found.</div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-100">
                        <th className="px-6 py-3.5">SKU</th>
                        <th className="px-6 py-3.5">Product</th>
                        <th className="px-6 py-3.5">Warehouse Location</th>
                        <th className="px-6 py-3.5">Current Stock</th>
                        <th className="px-6 py-3.5">Minimum stock</th>
                        <th className="px-6 py-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {stockList.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-6 py-4 font-mono font-bold text-gray-600 text-xs">{item.sku}</td>
                          <td className="px-6 py-4 font-semibold text-gray-850">{item.name}</td>
                          <td className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">{item.warehouse}</td>
                          <td className="px-6 py-4 font-bold text-gray-800">{item.currentStock} units</td>
                          <td className="px-6 py-4 text-gray-450">{item.minimumStock} units</td>
                          <td className="px-6 py-4">
                            {item.isLowStock ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 animate-pulse">
                                ⚠️ Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                🟢 Healthy
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between mt-4">
                  <span className="text-xs text-gray-500 font-medium">
                    Showing {stockList.length} of {stockTotal} products
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setStockPage((p) => Math.max(1, p - 1))}
                      disabled={stockPage === 1}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                    >
                      ◀ Previous
                    </button>
                    <span className="text-xs flex items-center px-2 font-medium text-gray-600">
                      Page {stockPage} of {stockTotalPages || 1}
                    </span>
                    <button
                      onClick={() => setStockPage((p) => Math.min(stockTotalPages, p + 1))}
                      disabled={stockPage === stockTotalPages || stockTotalPages === 0}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                    >
                      Next ▶
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: MOVEMENTS LOGS */
          <div className="space-y-6">
            {moveLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
              </div>
            ) : moveError ? (
              <div className="text-center text-red-500">{moveError}</div>
            ) : movements.length === 0 ? (
              <div className="text-center text-gray-400 py-12">No stock movements recorded.</div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-100">
                        <th className="px-6 py-3.5">Timestamp</th>
                        <th className="px-6 py-3.5">Product SKU</th>
                        <th className="px-6 py-3.5">Product Name</th>
                        <th className="px-6 py-3.5">Type</th>
                        <th className="px-6 py-3.5">Qty</th>
                        <th className="px-6 py-3.5">Reason</th>
                        <th className="px-6 py-3.5">Logged By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {movements.map((move) => (
                        <tr key={move.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-6 py-4 text-xs font-semibold text-gray-500">
                            {new Date(move.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-gray-650 text-xs">
                            {move.product?.sku || 'N/A'}
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-800">{move.product?.name || 'Deleted Product'}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                                move.movementType === 'IN'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-105 text-orange-700'
                              }`}
                            >
                              {move.movementType === 'IN' ? '📥 STOCK IN' : '📤 STOCK OUT'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-extrabold text-gray-805">{move.quantity}</td>
                          <td className="px-6 py-4 text-xs font-medium text-gray-650">{move.reason}</td>
                          <td className="px-6 py-4 text-xs text-gray-550 font-medium">
                            {move.user?.name || move.createdBy}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between mt-4">
                  <span className="text-xs text-gray-500 font-medium">
                    Showing {movements.length} of {moveTotal} movements
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setMovePage((p) => Math.max(1, p - 1))}
                  disabled={movePage === 1}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                    >
                      ◀ Previous
                    </button>
                    <span className="text-xs flex items-center px-2 font-medium text-gray-600">
                      Page {movePage} of {moveTotalPages || 1}
                    </span>
                    <button
                      onClick={() => setMovePage((p) => Math.min(moveTotalPages, p + 1))}
                      disabled={movePage === moveTotalPages || moveTotalPages === 0}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                    >
                      Next ▶
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Stock Adjust Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-indigo-50/20 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">⚙️ Post Stock Adjust Transaction</h3>
              <button
                onClick={() => setShowMoveModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            {modalLoading ? (
              <div className="p-8 text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
                <span className="text-xs text-gray-400 mt-2 block">Loading products catalog...</span>
              </div>
            ) : (
              <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
                {modalError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-700">
                    ⚠️ {modalError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Select Product *
                  </label>
                  <select
                    name="productId"
                    required
                    value={formData.productId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="" disabled>-- Choose Product --</option>
                    {allProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.sku}] - Current Stock: {p.currentStock}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      Adjustment Type *
                    </label>
                    <select
                      name="movementType"
                      required
                      value={formData.movementType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="IN">📥 STOCK IN (+)</option>
                      <option value="OUT">📤 STOCK OUT (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      required
                      min="1"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Reason / Explanation *
                  </label>
                  <input
                    type="text"
                    name="reason"
                    required
                    value={formData.reason}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="E.g., Supplier delivery, Damaged unit write-off..."
                  />
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowMoveModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-750 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow transition"
                  >
                    {modalSubmitting ? 'Posting...' : 'Post Adjust'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryList;
