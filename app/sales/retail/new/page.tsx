'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Item {
  id: string;
  code: string;
  name: string;
  retail_price: number;
  unit_of_measure: string;
  barcode?: string;
}

interface ItemStoreStock {
  id: string;
  item_id: string;
  store_id: string;
  quantity_on_hand: number;
  items: Item | null;
}

interface LineItem {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  batch_no: string;
  price: number;
  quantity: number;
  discount_percent: number;
  discount_value: number;
  net_value: number;
  available_qty: number;
}

interface Store {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface Employee {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
}

interface SavedSale {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
}

export default function NewRetailSalePage() {
  const router = useRouter();
  const itemSearchRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // State
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Master data
  const [stores, setStores] = useState<Store[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Search
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<ItemStoreStock[]>([]);
  
  // Form data
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [refNumber, setRefNumber] = useState('');
  const [storeId, setStoreId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [description, setDescription] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  
  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [savedSale, setSavedSale] = useState<SavedSale | null>(null);
  
  // Fetch initial data
  useEffect(() => {
    fetchStores();
    fetchEmployees();
    fetchCustomers();
    generateRefNumber();
  }, []);
  
  // Set default store to "Main Store" when stores are loaded
  useEffect(() => {
    if (stores.length > 0 && !storeId) {
      const mainStore = stores.find(s => s.name.toLowerCase().includes('main'));
      if (mainStore) {
        setStoreId(mainStore.id);
      }
    }
  }, [stores]);
  
  // Search items when query changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!storeId || itemSearch.length < 2) {
      setSearchResults([]);
      setShowItemDropdown(false);
      return;
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchItems();
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [itemSearch, storeId]);
  
  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores');
      const data = await res.json();
      if (data.success) {
        setStores(data.data || data.stores || []);
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
    }
  };
  
  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };
  
  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };
  
  const searchItems = async () => {
    try {
      setSearching(true);
      const res = await fetch(`/api/item-store-stock?store_id=${storeId}`);
      const data = await res.json();
      
      if (!data.success || !data.data) {
        setSearchResults([]);
        setShowItemDropdown(true);
        return;
      }
      
      const searchLower = itemSearch.toLowerCase();
      const filtered = data.data.filter((stock: ItemStoreStock) => {
        const item = stock.items;
        if (!item) return false;
        
        return (
          item.name.toLowerCase().includes(searchLower) ||
          item.code.toLowerCase().includes(searchLower) ||
          (item.barcode && item.barcode.toLowerCase().includes(searchLower))
        );
      });
      
      setSearchResults(filtered.slice(0, 20));
      setShowItemDropdown(true);
    } catch (err) {
      console.error('Error searching items:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };
  
  const generateRefNumber = async () => {
    try {
      const res = await fetch('/api/sales-retail/next-number');
      const data = await res.json();
      if (data.success) {
        setRefNumber(data.data.next_number);
      }
    } catch (err) {
      const fallback = `SINV-${Date.now()}`;
      setRefNumber(fallback);
    }
  };
  
  const handleItemSelect = (storeItem: ItemStoreStock) => {
    const item = storeItem.items;
    if (!item) return;
    
    const existingIndex = items.findIndex(i => i.item_id === storeItem.item_id);
    
    if (existingIndex >= 0) {
      const newItems = [...items];
      if (newItems[existingIndex].quantity < storeItem.quantity_on_hand) {
        newItems[existingIndex].quantity += 1;
        calculateLineItem(newItems[existingIndex]);
        setItems(newItems);
      } else {
        setError(`Maximum stock (${storeItem.quantity_on_hand}) reached for ${item.name}`);
        setTimeout(() => setError(''), 3000);
      }
    } else {
      const newItem: LineItem = {
        id: `item-${Date.now()}-${Math.random()}`,
        item_id: storeItem.item_id,
        item_code: item.code,
        item_name: item.name,
        batch_no: '',
        price: item.retail_price,
        quantity: 1,
        discount_percent: 0,
        discount_value: 0,
        net_value: item.retail_price,
        available_qty: storeItem.quantity_on_hand,
      };
      setItems([...items, newItem]);
    }
    
    setItemSearch('');
    setSearchResults([]);
    setShowItemDropdown(false);
    itemSearchRef.current?.focus();
  };
  
  const calculateLineItem = (item: LineItem) => {
    const subtotal = item.price * item.quantity;
    item.discount_value = subtotal * (item.discount_percent / 100);
    item.net_value = subtotal - item.discount_value;
  };
  
  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    
    if (field === 'quantity') {
      const qty = parseInt(value) || 0;
      if (qty > item.available_qty) {
        setError(`Cannot exceed available stock of ${item.available_qty}`);
        setTimeout(() => setError(''), 3000);
        return;
      }
      item.quantity = qty;
    } else if (field === 'price') {
      item.price = parseFloat(value) || 0;
    } else if (field === 'discount_percent') {
      item.discount_percent = parseFloat(value) || 0;
    } else if (field === 'discount_value') {
      item.discount_value = parseFloat(value) || 0;
    } else {
      (item as any)[field] = value;
    }
    
    calculateLineItem(item);
    setItems(newItems);
    setError('');
  };
  
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };
  
  const calculateTotals = () => {
    const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discount_value, 0);
    const netTotal = totalValue - totalDiscount;
    return { totalValue, totalDiscount, netTotal };
  };
  
  const handleSave = async () => {
    if (!storeId) {
      setError('Please select a store');
      return;
    }
    
    if (items.length === 0) {
      setError('Please add at least one item');
      return;
    }
    
    for (const item of items) {
      if (item.quantity <= 0) {
        setError(`Invalid quantity for ${item.item_name}`);
        return;
      }
      if (item.quantity > item.available_qty) {
        setError(`Insufficient stock for ${item.item_name}`);
        return;
      }
    }
    
    try {
      setLoading(true);
      setError('');
      
      const { netTotal, totalDiscount } = calculateTotals();
      
      const res = await fetch('/api/sales-retail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          customer_id: customerId || null,
          employee_id: employeeId || null,
          payment_method: 'cash',
          payment_status: 'paid',
          description: description || null,
          sale_date: saleDate,
          subtotal: netTotal + totalDiscount,
          discount: totalDiscount,
          total_amount: netTotal,
          items: items.map(item => ({
            item_id: item.item_id,
            batch_no: item.batch_no || null,
            quantity: item.quantity,
            unit_price: item.price,
            discount_percent: item.discount_percent,
            discount_value: item.discount_value,
            net_value: item.net_value,
          })),
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create sale');
      }
      
      setSuccess('Sale created successfully!');
      setSavedSale(data.data);
      
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sale');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  const handlePrint = async () => {
    if (!storeId) {
      setError('Please select a store');
      return;
    }
    
    if (items.length === 0) {
      setError('Please add at least one item');
      return;
    }
    
    // Show payment modal
    setShowPaymentModal(true);
    setCashReceived('');
  };
  
  const handleConfirmPayment = async () => {
    const cash = parseFloat(cashReceived) || 0;
    const totals = calculateTotals();
    
    if (cash < totals.netTotal) {
      setError('Insufficient cash amount');
      return;
    }
    
    try {
      // Save the sale first
      const sale = await handleSave();
      
      if (!sale) {
        throw new Error('Failed to save sale');
      }
      
      // Close modal and print
      setShowPaymentModal(false);
      
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        window.print();
        
        // After print, redirect to sales list
        setTimeout(() => {
          router.push('/sales/retail');
        }, 1000);
      }, 500);
      
    } catch (err) {
      console.error('Error during print:', err);
      setError('Failed to process payment and print');
    }
  };
  
  const handleDelete = () => {
    if (confirm('Are you sure you want to clear all items?')) {
      setItems([]);
      setItemSearch('');
      setDescription('');
    }
  };
  
  const handleCancel = () => {
    if (items.length > 0) {
      if (confirm('Discard unsaved changes?')) {
        router.push('/sales/retail');
      }
    } else {
      router.push('/sales/retail');
    }
  };
  
  const handleExit = () => {
    if (items.length > 0) {
      if (confirm('Exit without saving?')) {
        router.push('/dashboard');
      }
    } else {
      router.push('/dashboard');
    }
  };
  
  const totals = calculateTotals();
  const changeAmount = (parseFloat(cashReceived) || 0) - totals.netTotal;
  const selectedStore = stores.find(s => s.id === storeId);
  const selectedCustomer = customers.find(c => c.id === customerId);
  const selectedEmployee = employees.find(e => e.id === employeeId);
  
  return (
    <>
  
{/* Print Bill - Professional Dot-Matrix Invoice */}
<div className="print:block hidden">
  <style dangerouslySetInnerHTML={{ __html: `
    @media print {
      @page { 
        size: 9.5in 5.5in;
        margin: 0;
        padding: 0;
      }
      body { 
        margin: 0;
        padding: 0;
        font-family: 'Courier New', monospace;
        font-size: 10pt;
        line-height: 1.2;
      }
      * {
        margin: 0;
        padding: 0;
      }
    }
  `}} />
  
  <div style={{
    width: '9.5in',
    height: '5.5in',
    fontFamily: "'Courier New', monospace",
    fontSize: '10pt',
    lineHeight: '1.3',
    padding: '0.3in 0.4in',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  }}>
    {/* ==================== HEADER ==================== */}
    <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '0.15in', marginBottom: '0.1in' }}>
      <div style={{ fontSize: '12pt', fontWeight: 'bold', letterSpacing: '2px' }}>JANASIRI STORES</div>
      <div style={{ fontSize: '9pt', marginTop: '2px' }}>No.171, Colombo Street, Kandy</div>
      <div style={{ fontSize: '9pt' }}>Tel: 0814-951470 | Email: janasiri171@gmail.com</div>
      <div style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '3px' }}>~~ WHOLESALE INVOICE ~~</div>
    </div>
    
    {/* ==================== INVOICE DETAILS ==================== */}
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', marginBottom: '0.1in', borderBottom: '1px dotted #000', paddingBottom: '0.1in' }}>
      <div>
        <div><strong>Invoice #:</strong> {savedSale?.invoice_number || refNumber}</div>
        <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</div>
        <div><strong>Time:</strong> {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        {selectedStore && (
          <>
            <div><strong>Store:</strong> {selectedStore.name}</div>
            {selectedEmployee && <div><strong>Cashier:</strong> {selectedEmployee.name}</div>}
            {selectedCustomer && <div><strong>Customer:</strong> {selectedCustomer.name}</div>}
          </>
        )}
      </div>
    </div>
    
    {/* ==================== ITEMS TABLE ==================== */}
    <div style={{ marginBottom: '0.08in', flex: '1' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '9pt',
        borderTop: '1px solid #000',
        borderBottom: '1px solid #000'
      }}>
        <thead>
          <tr style={{ height: '0.25in' }}>
            <th style={{ textAlign: 'left', paddingLeft: '2px', borderBottom: '1px dashed #000' }}>SL</th>
            <th style={{ textAlign: 'left', paddingLeft: '4px', borderBottom: '1px dashed #000' }}>ITEM DESCRIPTION</th>
            <th style={{ textAlign: 'right', paddingRight: '4px', borderBottom: '1px dashed #000' }}>QTY</th>
            <th style={{ textAlign: 'right', paddingRight: '4px', borderBottom: '1px dashed #000' }}>RATE</th>
            <th style={{ textAlign: 'right', paddingRight: '4px', borderBottom: '1px dashed #000' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id} style={{ height: '0.22in' }}>
              <td style={{ textAlign: 'center', paddingLeft: '2px', paddingRight: '2px' }}>{idx + 1}</td>
              <td style={{ paddingLeft: '4px', fontSize: '8.5pt' }}>
                <div>{item.item_name}</div>
                <div style={{ fontSize: '8pt', color: '#666' }}>({item.item_code})</div>
              </td>
              <td style={{ textAlign: 'right', paddingRight: '4px' }}>{item.quantity.toFixed(2)}</td>
              <td style={{ textAlign: 'right', paddingRight: '4px' }}>{item.price.toFixed(2)}</td>
              <td style={{ textAlign: 'right', paddingRight: '4px', fontWeight: 'bold' }}>{item.net_value.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    {/* ==================== TOTALS SECTION ==================== */}
    <div style={{ borderTop: '1px solid #000', borderBottom: '1px dashed #000', paddingTop: '0.08in', paddingBottom: '0.08in', marginBottom: '0.08in' }}>
      <table style={{ width: '100%', fontSize: '9pt', marginLeft: 'auto' }}>
        <tbody>
          <tr>
            <td style={{ textAlign: 'right', paddingRight: '8px', width: '70%' }}>SUBTOTAL:</td>
            <td style={{ textAlign: 'right', paddingRight: '4px', width: '30%', fontWeight: 'bold' }}>Rs. {totals.totalValue.toFixed(2)}</td>
          </tr>
          {totals.totalDiscount > 0 && (
            <tr>
              <td style={{ textAlign: 'right', paddingRight: '8px' }}>DISCOUNT (-)</td>
              <td style={{ textAlign: 'right', paddingRight: '4px', fontWeight: 'bold', color: '#d97706' }}>Rs. {totals.totalDiscount.toFixed(2)}</td>
            </tr>
          )}
          <tr style={{ borderTop: '1px dashed #000', fontWeight: 'bold', fontSize: '10pt' }}>
            <td style={{ textAlign: 'right', paddingRight: '8px', paddingTop: '3px' }}>TOTAL PAYABLE:</td>
            <td style={{ textAlign: 'right', paddingRight: '4px', paddingTop: '3px' }}>Rs. {totals.netTotal.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    {/* ==================== PAYMENT INFO ==================== */}
    {cashReceived && parseFloat(cashReceived) > 0 && (
      <div style={{ borderTop: '1px dashed #000', paddingTop: '0.08in', marginBottom: '0.08in', fontSize: '9pt' }}>
        <table style={{ width: '100%', marginLeft: 'auto' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'right', paddingRight: '8px', width: '70%' }}>CASH RECEIVED:</td>
              <td style={{ textAlign: 'right', paddingRight: '4px', width: '30%', fontWeight: 'bold' }}>Rs. {parseFloat(cashReceived).toFixed(2)}</td>
            </tr>
            <tr style={{ fontWeight: 'bold', fontSize: '10pt' }}>
              <td style={{ textAlign: 'right', paddingRight: '8px' }}>CHANGE:</td>
              <td style={{ textAlign: 'right', paddingRight: '4px' }}>Rs. {changeAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )}
    
    {/* ==================== FOOTER ==================== */}
    <div style={{ textAlign: 'center', borderTop: '1px dashed #000', paddingTop: '0.1in', fontSize: '7.5pt', lineHeight: '1.4' }}>
      <div>*** THANK YOU FOR YOUR BUSINESS ***</div>
      <div style={{ marginTop: '3px' }}>JANASIRI STORES | Est. 2020</div>
      <div>Powered by Soft-Master Technologies (Pvt) Ltd.</div>
      <div style={{ fontSize: '7pt', marginTop: '2px' }}>Contact: 0814-951470 / 077-3889082</div>
      <div style={{ marginTop: '3px', letterSpacing: '1px' }}>{"=" .repeat(50)}</div>
    </div>
  </div>
</div> 
      {/* Screen UI */}
      <div className="min-h-screen bg-gray-100 py-4 px-2 print:hidden">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow p-3 mb-3">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg font-bold text-white">New Retail Sale</h1>
                <p className="text-blue-100 text-xs">Point of Sale - Create New Invoice</p>
              </div>
              <div className="text-right">
                <p className="text-blue-100 text-xs">Invoice No:</p>
                <p className="text-white font-bold font-mono">{refNumber}</p>
              </div>
            </div>
          </div>
          
          {/* Messages */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-2 mb-3 rounded">
              <p className="text-red-800 text-xs font-medium">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-2 mb-3 rounded">
              <p className="text-green-800 text-xs font-medium">{success}</p>
            </div>
          )}
          
          {/* Main Card */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            {/* Top Controls */}
            <div className="grid grid-cols-12 gap-2 mb-3">
              {/* Item Search */}
              <div className="col-span-3 relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Item</label>
                <input
                  ref={itemSearchRef}
                  type="text"
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setShowItemDropdown(true);
                  }}
                  onFocus={() => itemSearch.length >= 2 && setShowItemDropdown(true)}
                  onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)}
                  placeholder="Search name/code..."
                  disabled={!storeId}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                />
                
                {searching && (
                  <div className="absolute right-2 top-7 text-blue-500">
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
                
                {/* Search Dropdown */}
                {showItemDropdown && storeId && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((si) => {
                        const item = si.items;
                        if (!item) return null;
                        return (
                          <div
                            key={si.id}
                            onClick={() => handleItemSelect(si)}
                            className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                          >
                            <div className="font-medium text-xs text-gray-900">{item.name}</div>
                            <div className="flex justify-between items-center mt-0.5 text-xs text-gray-600">
                              <span className="text-xs">{item.code}</span>
                              <div className="flex gap-2 text-xs">
                                <span className="text-green-600 font-semibold">Qty: {si.quantity_on_hand}</span>
                                <span className="text-blue-600 font-semibold">Rs. {item.retail_price}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : itemSearch.length >= 2 ? (
                      <div className="p-2 text-xs text-gray-500 text-center">
                        {searching ? 'Searching...' : 'No items found'}
                      </div>
                    ) : (
                      <div className="p-2 text-xs text-gray-500 text-center">
                        Type at least 2 characters
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Store */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Store *</label>
                <select
                  value={storeId}
                  onChange={(e) => {
                    setStoreId(e.target.value);
                    setItems([]);
                    setItemSearch('');
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Customer */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Walk-in</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Employee */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Employee</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Date */}
              <div className="col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Items Table */}
            <div className="bg-gray-50 rounded p-2 mb-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="px-1 py-1.5 text-left text-xs font-bold">Code</th>
                    <th className="px-1 py-1.5 text-left text-xs font-bold">Item</th>
                    <th className="px-1 py-1.5 text-left text-xs font-bold">Batch</th>
                    <th className="px-1 py-1.5 text-right text-xs font-bold">Price</th>
                    <th className="px-1 py-1.5 text-center text-xs font-bold">Qty</th>
                    <th className="px-1 py-1.5 text-right text-xs font-bold">Dis%</th>
                    <th className="px-1 py-1.5 text-right text-xs font-bold">Dis Val</th>
                    <th className="px-1 py-1.5 text-right text-xs font-bold">Net</th>
                    <th className="px-1 py-1.5 text-center text-xs font-bold">✕</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-1 py-6 text-center text-gray-500">
                        <p className="text-xs">No items added. Search and select items above.</p>
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => (
                      <tr key={item.id} className="border-b border-gray-200 hover:bg-white">
                        <td className="px-1 py-1">
                          <input type="text" value={item.item_code} readOnly className="w-16 px-1 py-0.5 text-xs bg-white border border-gray-300 rounded" />
                        </td>
                        <td className="px-1 py-1">
                          <input type="text" value={item.item_name} readOnly className="w-full px-1 py-0.5 text-xs bg-white border border-gray-300 rounded font-medium" />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={item.batch_no}
                            onChange={(e) => handleItemChange(index, 'batch_no', e.target.value)}
                            className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded"
                            placeholder="Batch"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                            step="0.01"
                            className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded text-right"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            min="1"
                            className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded text-center font-semibold"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            value={item.discount_percent}
                            onChange={(e) => handleItemChange(index, 'discount_percent', e.target.value)}
                            step="0.01"
                            min="0"
                            max="100"
                            className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded text-right"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            value={item.discount_value.toFixed(2)}
                            readOnly
                            className="w-16 px-1 py-0.5 text-xs bg-orange-50 border border-orange-300 rounded text-right text-orange-600 font-semibold"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            value={item.net_value.toFixed(2)}
                            readOnly
                            className="w-20 px-1 py-0.5 text-xs bg-blue-50 border border-blue-300 rounded text-right text-blue-700 font-bold"
                          />
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button onClick={() => handleRemoveItem(index)} className="text-red-600 hover:text-red-800 font-bold text-xs">✕</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Bottom Section */}
            <div className="grid grid-cols-12 gap-3 mb-3">
              {/* Description */}
              <div className="col-span-5">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Notes..."
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
              
              {/* Totals */}
              <div className="col-span-7 bg-gradient-to-br from-blue-50 to-indigo-50 rounded p-3 border border-blue-200">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-700">Total Value</span>
                    <input type="text" value={`Rs. ${totals.totalValue.toFixed(2)}`} readOnly className="w-32 px-2 py-1 text-xs bg-white border border-gray-300 rounded text-right font-bold" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-700">Discount</span>
                    <input type="text" value={`Rs. ${totals.totalDiscount.toFixed(2)}`} readOnly className="w-32 px-2 py-1 text-xs bg-white border border-orange-300 rounded text-right font-bold text-orange-600" />
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-blue-300">
                    <span className="text-sm font-bold text-gray-900">Net Total</span>
                    <input type="text" value={`Rs. ${totals.netTotal.toFixed(2)}`} readOnly className="w-32 px-2 py-1.5 text-sm bg-blue-600 border border-blue-800 rounded text-right font-bold text-white" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-5 gap-2">
              <button onClick={handleExit} disabled={loading} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded shadow hover:shadow-lg transition disabled:opacity-50">
                <span className="text-xs">Esc</span> Exit
              </button>
              <button onClick={handleSave} disabled={loading || items.length === 0} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded shadow hover:shadow-lg transition disabled:opacity-50">
                <span className="text-xs">F8</span> Save
              </button>
              <button onClick={handleDelete} disabled={loading || items.length === 0} className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold rounded shadow hover:shadow-lg transition disabled:opacity-50">
                <span className="text-xs">F9</span> Delete
              </button>
              <button onClick={handleCancel} disabled={loading} className="px-3 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs font-bold rounded shadow hover:shadow-lg transition disabled:opacity-50">
                <span className="text-xs">F12</span> Cancel
              </button>
              <button onClick={handlePrint} disabled={loading || items.length === 0} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow hover:shadow-lg transition disabled:opacity-50">
                <span className="text-xs">F2</span> Print
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment Modal - Semi-transparent background showing sales list behind */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-lg shadow-2xl p-5 w-80">
            <h2 className="text-lg font-bold mb-4 text-gray-900">Cash Payment</h2>
            
            <div className="space-y-3 mb-5">
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-700">Total Amount:</span>
                  <span className="text-xl font-bold text-blue-600">Rs. {totals.netTotal.toFixed(2)}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cash Received:</label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  step="0.01"
                  autoFocus
                  className="w-full px-3 py-2 text-base border-2 border-gray-300 rounded focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-right font-bold"
                  placeholder="0.00"
                />
              </div>
              
              {cashReceived && parseFloat(cashReceived) >= totals.netTotal && (
                <div className="bg-green-50 p-3 rounded border-2 border-green-300">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-700">Change:</span>
                    <span className="text-xl font-bold text-green-600">Rs. {changeAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
              
              {cashReceived && parseFloat(cashReceived) > 0 && parseFloat(cashReceived) < totals.netTotal && (
                <div className="bg-red-50 p-2 rounded border border-red-300">
                  <p className="text-xs text-red-700 font-semibold">
                    Insufficient! Need Rs. {(totals.netTotal - parseFloat(cashReceived)).toFixed(2)} more
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setCashReceived('');
                }}
                className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm font-bold rounded transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={!cashReceived || parseFloat(cashReceived) < totals.netTotal || loading}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Print Bill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}