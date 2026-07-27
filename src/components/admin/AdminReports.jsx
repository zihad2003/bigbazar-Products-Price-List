import React, { useState, useMemo } from 'react';
import {
  BarChart3, Calendar, Download, Printer, TrendingUp, DollarSign,
  ShoppingBag, Package, Users, CheckCircle2, Clock, XCircle, Truck,
  Sparkles, Filter, ChevronRight, Search, FileText, ArrowUpRight,
  PieChart, CreditCard, AlertCircle, RotateCcw, ChevronDown, Layers
} from 'lucide-react';

export default function AdminReports({ orders = [], products = [], reviews = [] }) {
  const [activeReportTab, setActiveReportTab] = useState('monthly'); // 'monthly' | 'sales' | 'products' | 'customers' | 'financial'
  const [timeFilter, setTimeFilter] = useState('all'); // 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year'
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Helper to parse dates safely
  const parseOrderDate = (dateString) => {
    if (!dateString) return new Date();
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Helper to format currency
  const formatTaka = (amount) => {
    const num = Number(amount) || 0;
    return `৳${num.toLocaleString('en-BD')}`;
  };

  // Filter orders by selected global time range
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter(o => {
      if (o.status === 'Deleted') return false; // exclude deleted orders from revenue reports
      if (timeFilter === 'all') return true;

      const orderDate = parseOrderDate(o.created_at);
      if (timeFilter === 'this_month') {
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }
      if (timeFilter === 'last_month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return orderDate.getMonth() === lastMonth.getMonth() && orderDate.getFullYear() === lastMonth.getFullYear();
      }
      if (timeFilter === 'last_3_months') {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        return orderDate >= threeMonthsAgo;
      }
      if (timeFilter === 'this_year') {
        return orderDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [orders, timeFilter]);

  // Aggregate Month-Wise Data Report
  const monthlyDataReport = useMemo(() => {
    const monthsMap = {};

    // Group valid orders by YYYY-MM
    filteredOrders.forEach(o => {
      const date = parseOrderDate(o.created_at);
      const year = date.getFullYear();
      const monthIndex = date.getMonth();
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!monthsMap[key]) {
        monthsMap[key] = {
          key,
          monthName,
          year,
          monthIndex,
          totalOrders: 0,
          pendingOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          totalRevenue: 0,
          advancePaidTotal: 0,
          balanceDueTotal: 0,
          deliveryChargesTotal: 0,
          mirsaraiOrdersCount: 0,
          outsideOrdersCount: 0,
          ordersList: []
        };
      }

      const m = monthsMap[key];
      const totalAmt = Number(o.total_amount) || 0;
      const delCharge = Number(o.delivery_charge) || 0;

      // Calculate advance payment logic matching shop calculations
      const advance = o.is_advance_paid
        ? (o.is_exclusive_order ? 500 : (o.delivery_area === 'mirsarai' && delCharge === 0 ? 100 : delCharge))
        : 0;
      const due = o.payment_status === 'Fully Paid' ? 0 : Math.max(0, totalAmt - advance);

      m.totalOrders += 1;
      m.totalRevenue += totalAmt;
      m.advancePaidTotal += advance;
      m.balanceDueTotal += due;
      m.deliveryChargesTotal += delCharge;
      m.ordersList.push(o);

      if (o.status === 'Pending') m.pendingOrders += 1;
      else if (o.status === 'Delivered' || o.status === 'Completed') m.deliveredOrders += 1;
      else if (o.status === 'Cancelled') m.cancelledOrders += 1;

      if (o.delivery_area === 'mirsarai') m.mirsaraiOrdersCount += 1;
      else m.outsideOrdersCount += 1;
    });

    // Convert map to sorted array (newest months first)
    const sorted = Object.values(monthsMap).sort((a, b) => b.key.localeCompare(a.key));

    // Calculate averages & growth rates
    return sorted.map((m, index) => {
      const prevMonth = sorted[index + 1];
      const revenueGrowth = prevMonth && prevMonth.totalRevenue > 0
        ? (((m.totalRevenue - prevMonth.totalRevenue) / prevMonth.totalRevenue) * 100).toFixed(1)
        : null;

      const avgOrderValue = m.totalOrders > 0 ? Math.round(m.totalRevenue / m.totalOrders) : 0;

      return {
        ...m,
        revenueGrowth,
        avgOrderValue
      };
    });
  }, [filteredOrders]);

  // Currently selected month for deep dive modal/view
  const activeMonthDetail = useMemo(() => {
    if (!selectedMonthKey) return monthlyDataReport[0] || null;
    return monthlyDataReport.find(m => m.key === selectedMonthKey) || monthlyDataReport[0] || null;
  }, [monthlyDataReport, selectedMonthKey]);

  // Overall Business Key Performance Indicators
  const overallKPIs = useMemo(() => {
    const totalRev = filteredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const totalOrdersCount = filteredOrders.length;
    const totalAdvance = filteredOrders.reduce((sum, o) => {
      const charge = Number(o.delivery_charge) || 0;
      return sum + (o.is_advance_paid
        ? (o.is_exclusive_order ? 500 : (o.delivery_area === 'mirsarai' && charge === 0 ? 100 : charge))
        : 0);
    }, 0);
    const totalDue = filteredOrders.reduce((sum, o) => {
      const total = Number(o.total_amount) || 0;
      const charge = Number(o.delivery_charge) || 0;
      const advance = o.is_advance_paid
        ? (o.is_exclusive_order ? 500 : (o.delivery_area === 'mirsarai' && charge === 0 ? 100 : charge))
        : 0;
      return sum + (o.payment_status === 'Fully Paid' ? 0 : Math.max(0, total - advance));
    }, 0);

    const avgOrderVal = totalOrdersCount > 0 ? Math.round(totalRev / totalOrdersCount) : 0;
    const deliveredCount = filteredOrders.filter(o => o.status === 'Delivered' || o.status === 'Completed').length;
    const deliveryRate = totalOrdersCount > 0 ? Math.round((deliveredCount / totalOrdersCount) * 100) : 0;

    return {
      totalRevenue: totalRev,
      totalOrders: totalOrdersCount,
      totalAdvance,
      totalDue,
      avgOrderValue: avgOrderVal,
      deliveredCount,
      deliveryRate
    };
  }, [filteredOrders]);

  // Top Selling Products Breakdown
  const productPerformance = useMemo(() => {
    const prodMap = {};

    filteredOrders.forEach(o => {
      const name = o.product_name || 'Unknown Product';
      const pid = o.product_id || name;

      if (!prodMap[pid]) {
        prodMap[pid] = {
          id: pid,
          name,
          totalQty: 0,
          totalRevenue: 0,
          ordersCount: 0
        };
      }

      const qty = Number(o.quantity) || 1;
      const amt = Number(o.total_amount) || 0;

      prodMap[pid].totalQty += qty;
      prodMap[pid].totalRevenue += amt;
      prodMap[pid].ordersCount += 1;
    });

    return Object.values(prodMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredOrders]);

  // Delivery Area Breakdown
  const deliveryAreaStats = useMemo(() => {
    const areas = { mirsarai: { name: 'Mirsarai (Local)', count: 0, revenue: 0 }, outside: { name: 'Outside Mirsarai', count: 0, revenue: 0 } };

    filteredOrders.forEach(o => {
      const areaKey = o.delivery_area === 'mirsarai' ? 'mirsarai' : 'outside';
      areas[areaKey].count += 1;
      areas[areaKey].revenue += (Number(o.total_amount) || 0);
    });

    return areas;
  }, [filteredOrders]);

  // CSV Export Generator Function
  const exportToCSV = (type = 'monthly') => {
    let csvRows = [];
    let filename = `big_bazar_report_${type}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (type === 'monthly') {
      csvRows.push(['Month-Year', 'Total Orders', 'Delivered Orders', 'Pending Orders', 'Cancelled Orders', 'Gross Revenue (BDT)', 'Advance Collected (BDT)', 'Outstanding Due (BDT)', 'Avg Order Value (BDT)']);
      monthlyDataReport.forEach(m => {
        csvRows.push([
          `"${m.monthName}"`,
          m.totalOrders,
          m.deliveredOrders,
          m.pendingOrders,
          m.cancelledOrders,
          m.totalRevenue,
          m.advancePaidTotal,
          m.balanceDueTotal,
          m.avgOrderValue
        ]);
      });
    } else if (type === 'products') {
      csvRows.push(['Product Name', 'Total Orders', 'Quantity Sold', 'Gross Revenue (BDT)']);
      productPerformance.forEach(p => {
        csvRows.push([`"${p.name}"`, p.ordersCount, p.totalQty, p.totalRevenue]);
      });
    } else if (type === 'orders') {
      csvRows.push(['Order ID', 'Date', 'Customer Name', 'Phone', 'Address', 'Area', 'Product', 'Total Amount', 'Advance Paid', 'Due Balance', 'Status']);
      filteredOrders.forEach(o => {
        const total = Number(o.total_amount) || 0;
        const charge = Number(o.delivery_charge) || 0;
        const advance = o.is_advance_paid
          ? (o.is_exclusive_order ? 500 : (o.delivery_area === 'mirsarai' && charge === 0 ? 100 : charge))
          : 0;
        const due = o.payment_status === 'Fully Paid' ? 0 : Math.max(0, total - advance);

        csvRows.push([
          `"#${o.id.toString().slice(-6).toUpperCase()}"`,
          `"${new Date(o.created_at).toLocaleDateString()}"`,
          `"${o.customer_name || 'N/A'}"`,
          `"${o.customer_phone || 'N/A'}"`,
          `"${(o.customer_address || '').replace(/"/g, '""')}"`,
          `"${o.delivery_area || 'N/A'}"`,
          `"${(o.product_name || '').replace(/"/g, '""')}"`,
          total,
          advance,
          due,
          `"${o.status || 'Pending'}"`
        ]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-24 text-white font-sans">

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-zinc-900/80 p-6 md:p-8 rounded-[36px] border border-white/5 backdrop-blur-xl shadow-2xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-[#ce112d]/10 border border-[#ce112d]/20 rounded-2xl text-[#ce112d]">
              <BarChart3 size={24} />
            </div>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic">
              Reports &amp; <span className="text-[#ce112d]">Analytics Engine</span>
            </h2>
          </div>
          <p className="text-zinc-400 text-xs font-semibold tracking-wider">
            Month-wise data analysis, sales metrics, inventory trends &amp; financial reports
          </p>
        </div>

        {/* Global Time Filter & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-black/60 p-1.5 rounded-2xl border border-white/10">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'last_3_months', label: '3 Months' },
              { id: 'this_year', label: 'This Year' }
            ].map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeFilter(tf.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  timeFilter === tf.id
                    ? 'bg-[#ce112d] text-white shadow-lg shadow-red-900/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => exportToCSV(activeReportTab === 'products' ? 'products' : 'monthly')}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2.5 rounded-2xl text-xs font-bold border border-white/10 transition-all active:scale-95 shadow-md"
            title="Download CSV Spreadsheet"
          >
            <Download size={15} className="text-[#ce112d]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-2 bg-[#ce112d] hover:bg-[#b00e26] text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-red-900/30 transition-all active:scale-95"
            title="Generate Printable Executive Report"
          >
            <Printer size={15} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-red-950/20 border border-white/5 rounded-[32px] p-6 space-y-3 relative overflow-hidden shadow-xl group hover:border-[#ce112d]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">Gross Revenue</span>
            <div className="w-10 h-10 rounded-2xl bg-[#ce112d]/10 border border-[#ce112d]/20 flex items-center justify-center text-[#ce112d]">
              <DollarSign size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black tracking-tight text-white">{formatTaka(overallKPIs.totalRevenue)}</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">From {overallKPIs.totalOrders} total orders</p>
          </div>
          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-[#ce112d] w-full" />
          </div>
        </div>

        {/* Total Advance Received */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/20 border border-white/5 rounded-[32px] p-6 space-y-3 relative overflow-hidden shadow-xl group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">Advance Collected</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black tracking-tight text-white">{formatTaka(overallKPIs.totalAdvance)}</h3>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">Confirmed Bank / bKash Receipts</p>
          </div>
          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-emerald-500" style={{ width: overallKPIs.totalRevenue > 0 ? `${(overallKPIs.totalAdvance / overallKPIs.totalRevenue) * 100}%` : '0%' }} />
          </div>
        </div>

        {/* Outstanding Receivables / Due */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/20 border border-white/5 rounded-[32px] p-6 space-y-3 relative overflow-hidden shadow-xl group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">Balance Due (COD)</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black tracking-tight text-white">{formatTaka(overallKPIs.totalDue)}</h3>
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-1">Pending Delivery Collection</p>
          </div>
          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-amber-500" style={{ width: overallKPIs.totalRevenue > 0 ? `${(overallKPIs.totalDue / overallKPIs.totalRevenue) * 100}%` : '0%' }} />
          </div>
        </div>

        {/* Average Order Value & Delivery Rate */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-blue-950/20 border border-white/5 rounded-[32px] p-6 space-y-3 relative overflow-hidden shadow-xl group hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">Avg Order Value (AOV)</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black tracking-tight text-white">{formatTaka(overallKPIs.avgOrderValue)}</h3>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">{overallKPIs.deliveryRate}% Fulfillment Rate</p>
          </div>
          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-blue-500" style={{ width: `${Math.min(overallKPIs.deliveryRate, 100)}%` }} />
          </div>
        </div>

      </div>

      {/* Navigation Sub-Tabs for Reports */}
      <div className="flex border-b border-white/10 gap-2 sm:gap-6 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'monthly', label: '📅 Month-Wise Data Report', count: monthlyDataReport.length },
          { id: 'sales', label: '📊 Sales & Revenue Analytics' },
          { id: 'products', label: '📦 Product & Inventory Trends', count: productPerformance.length },
          { id: 'customers', label: '👤 Delivery & Customer Insights' },
          { id: 'financial', label: '💵 Financial Cash Flow Statement' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id)}
            className={`flex items-center gap-2 pb-4 text-xs sm:text-sm font-black uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${
              activeReportTab === tab.id
                ? 'border-[#ce112d] text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeReportTab === tab.id ? 'bg-[#ce112d] text-white' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── SUB-TAB 1: MONTH-WISE DATA REPORT ── */}
      {activeReportTab === 'monthly' && (
        <div className="space-y-8">

          {/* Month Comparison Visual Bar Graph */}
          {monthlyDataReport.length > 0 && (
            <div className="bg-zinc-900 border border-white/5 rounded-[36px] p-6 md:p-8 space-y-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-tight italic">
                    Monthly Revenue <span className="text-[#ce112d]">Comparison</span>
                  </h3>
                  <p className="text-zinc-500 text-xs font-semibold">Visual comparison of monthly sales performance</p>
                </div>
                <span className="text-xs text-zinc-400 font-bold bg-zinc-800 px-3 py-1.5 rounded-xl border border-white/5">
                  {monthlyDataReport.length} Months Tracked
                </span>
              </div>

              {/* Bar Graph Visual */}
              <div className="h-48 flex items-end gap-3 sm:gap-6 pt-6 border-b border-white/5 px-2">
                {monthlyDataReport.slice(0, 8).reverse().map((m) => {
                  const maxRevenue = Math.max(...monthlyDataReport.map(x => x.totalRevenue)) || 1;
                  const heightPercent = Math.max(10, Math.round((m.totalRevenue / maxRevenue) * 100));
                  const isSelected = activeMonthDetail?.key === m.key;

                  return (
                    <div
                      key={m.key}
                      onClick={() => setSelectedMonthKey(m.key)}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end cursor-pointer group"
                    >
                      <div className="text-[10px] font-bold text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1 whitespace-nowrap">
                        {formatTaka(m.totalRevenue)}
                      </div>
                      <div
                        className={`w-full rounded-t-2xl transition-all duration-500 group-hover:brightness-125 relative overflow-hidden ${
                          isSelected
                            ? 'bg-gradient-to-t from-[#ce112d] to-red-400 shadow-lg shadow-red-900/50'
                            : 'bg-zinc-800 hover:bg-zinc-700'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      >
                        <div className="absolute top-0 inset-x-0 h-1 bg-white/30" />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors truncate max-w-full ${
                        isSelected ? 'text-[#ce112d]' : 'text-zinc-500 group-hover:text-zinc-300'
                      }`}>
                        {m.monthName.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detailed Month-Wise Data Table */}
          <div className="bg-zinc-900 border border-white/5 rounded-[36px] overflow-hidden shadow-2xl">
            <div className="p-6 md:p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tight italic">
                  Month-Wise <span className="text-[#ce112d]">Data Matrix</span>
                </h3>
                <p className="text-zinc-500 text-xs font-semibold">Detailed breakdown by calendar month</p>
              </div>
              <button
                onClick={() => exportToCSV('monthly')}
                className="flex items-center gap-2 text-xs font-bold text-[#ce112d] bg-[#ce112d]/10 hover:bg-[#ce112d]/20 px-4 py-2 rounded-xl border border-[#ce112d]/20 transition-all self-start sm:self-auto"
              >
                <Download size={14} /> Download Month Matrix CSV
              </button>
            </div>

            {monthlyDataReport.length === 0 ? (
              <div className="py-24 text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto text-zinc-600">
                  <Calendar size={32} />
                </div>
                <p className="text-zinc-400 text-sm font-bold">No orders found for the selected time filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/50 text-[10px] font-black uppercase text-zinc-400 tracking-widest border-b border-white/5">
                      <th className="py-4 px-6">Month</th>
                      <th className="py-4 px-4 text-center">Orders</th>
                      <th className="py-4 px-4 text-center">Delivered</th>
                      <th className="py-4 px-4 text-center">Pending</th>
                      <th className="py-4 px-6 text-right">Gross Revenue</th>
                      <th className="py-4 px-6 text-right">Advance Paid</th>
                      <th className="py-4 px-6 text-right">Balance Due</th>
                      <th className="py-4 px-6 text-right">AOV</th>
                      <th className="py-4 px-6 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-semibold text-zinc-300">
                    {monthlyDataReport.map((m) => {
                      const isSelected = activeMonthDetail?.key === m.key;
                      return (
                        <tr
                          key={m.key}
                          className={`hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-[#ce112d]/5' : ''}`}
                        >
                          <td className="py-4 px-6 font-bold text-white italic">
                            <div className="flex items-center gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-[#ce112d]' : 'bg-zinc-700'}`} />
                              <span>{m.monthName}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-white">{m.totalOrders}</td>
                          <td className="py-4 px-4 text-center text-emerald-400 font-bold">{m.deliveredOrders}</td>
                          <td className="py-4 px-4 text-center text-amber-400 font-bold">{m.pendingOrders}</td>
                          <td className="py-4 px-6 text-right font-black text-white">{formatTaka(m.totalRevenue)}</td>
                          <td className="py-4 px-6 text-right font-bold text-emerald-400">{formatTaka(m.advancePaidTotal)}</td>
                          <td className="py-4 px-6 text-right font-bold text-amber-400">{formatTaka(m.balanceDueTotal)}</td>
                          <td className="py-4 px-6 text-right font-bold text-blue-400">{formatTaka(m.avgOrderValue)}</td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => setSelectedMonthKey(m.key)}
                              className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                isSelected
                                  ? 'bg-[#ce112d] text-white border-[#ce112d]'
                                  : 'bg-zinc-800 text-zinc-400 border-white/5 hover:bg-zinc-700 hover:text-white'
                              }`}
                            >
                              {isSelected ? 'Viewing' : 'Inspect'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Active Month Deep Dive Panel */}
          {activeMonthDetail && (
            <div className="bg-gradient-to-b from-zinc-900 to-black border border-[#ce112d]/30 rounded-[36px] p-6 md:p-8 space-y-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#ce112d] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">Month Breakdown</span>
                    <h3 className="text-xl font-bold uppercase tracking-tight text-white">{activeMonthDetail.monthName}</h3>
                  </div>
                  <p className="text-zinc-400 text-xs mt-1">Granular breakdown for orders received in this calendar month</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="bg-zinc-900 border border-white/10 px-4 py-2 rounded-2xl">
                    <span className="text-zinc-500 uppercase font-bold text-[10px] block">Mirsarai Orders</span>
                    <span className="text-white font-black text-sm">{activeMonthDetail.mirsaraiOrdersCount}</span>
                  </div>
                  <div className="bg-zinc-900 border border-white/10 px-4 py-2 rounded-2xl">
                    <span className="text-zinc-500 uppercase font-bold text-[10px] block">Outside Orders</span>
                    <span className="text-white font-black text-sm">{activeMonthDetail.outsideOrdersCount}</span>
                  </div>
                </div>
              </div>

              {/* Month Order List Preview */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase text-zinc-400 tracking-wider">Orders List ({activeMonthDetail.ordersList.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeMonthDetail.ordersList.slice(0, 6).map(o => (
                    <div key={o.id} className="bg-zinc-900/90 border border-white/5 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-[#ce112d]">#{o.id.toString().slice(-6).toUpperCase()}</span>
                        <span className="text-zinc-500">{new Date(o.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-black text-white truncate">{o.product_name}</p>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                        <span className="text-zinc-400">{o.customer_name || 'Customer'}</span>
                        <span className="text-white font-bold">{formatTaka(o.total_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {activeMonthDetail.ordersList.length > 6 && (
                  <p className="text-center text-xs text-zinc-500 italic pt-2">
                    + {activeMonthDetail.ordersList.length - 6} more orders in this month (exported in CSV)
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── SUB-TAB 2: SALES & REVENUE ANALYTICS ── */}
      {activeReportTab === 'sales' && (
        <div className="space-y-8">

          {/* Revenue & Payment Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Delivery Area Revenue */}
            <div className="bg-zinc-900 border border-white/5 rounded-[36px] p-6 md:p-8 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-tight text-white">Delivery Area Breakdown</h3>
                  <p className="text-zinc-500 text-xs">Mirsarai Local vs Outside Delivery Revenue</p>
                </div>
                <Truck className="text-[#ce112d]" size={20} />
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="text-zinc-300">Mirsarai Local ({deliveryAreaStats.mirsarai.count} Orders)</span>
                    <span className="text-white">{formatTaka(deliveryAreaStats.mirsarai.revenue)}</span>
                  </div>
                  <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-[#ce112d] transition-all duration-1000"
                      style={{
                        width: overallKPIs.totalRevenue > 0
                          ? `${(deliveryAreaStats.mirsarai.revenue / overallKPIs.totalRevenue) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="text-zinc-300">Outside Mirsarai / Courier ({deliveryAreaStats.outside.count} Orders)</span>
                    <span className="text-white">{formatTaka(deliveryAreaStats.outside.revenue)}</span>
                  </div>
                  <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-blue-500 transition-all duration-1000"
                      style={{
                        width: overallKPIs.totalRevenue > 0
                          ? `${(deliveryAreaStats.outside.revenue / overallKPIs.totalRevenue) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Order Status Distribution */}
            <div className="bg-zinc-900 border border-white/5 rounded-[36px] p-6 md:p-8 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-tight text-white">Fulfillment Status</h3>
                  <p className="text-zinc-500 text-xs">Order status breakdown</p>
                </div>
                <PieChart className="text-amber-400" size={20} />
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Delivered</span>
                  <span className="text-2xl font-black text-white">{overallKPIs.deliveredCount}</span>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-amber-400 uppercase block mb-1">Pending</span>
                  <span className="text-2xl font-black text-white">
                    {filteredOrders.filter(o => o.status === 'Pending').length}
                  </span>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-red-400 uppercase block mb-1">Cancelled</span>
                  <span className="text-2xl font-black text-white">
                    {filteredOrders.filter(o => o.status === 'Cancelled').length}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ── SUB-TAB 3: PRODUCT & INVENTORY TRENDS ── */}
      {activeReportTab === 'products' && (
        <div className="space-y-8">
          <div className="bg-zinc-900 border border-white/5 rounded-[36px] overflow-hidden shadow-2xl p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tight italic">
                  Top Performing <span className="text-[#ce112d]">Products</span>
                </h3>
                <p className="text-zinc-500 text-xs font-semibold">Ranked by revenue contribution and units sold</p>
              </div>
              <button
                onClick={() => exportToCSV('products')}
                className="flex items-center gap-2 text-xs font-bold text-[#ce112d] bg-[#ce112d]/10 hover:bg-[#ce112d]/20 px-4 py-2 rounded-xl border border-[#ce112d]/20 transition-all self-start sm:self-auto"
              >
                <Download size={14} /> Export Products CSV
              </button>
            </div>

            <div className="divide-y divide-white/5 pt-4">
              {productPerformance.slice(0, 15).map((p, index) => (
                <div key={p.id} className="py-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-sm font-black text-zinc-500 w-6">#{index + 1}</span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{p.name}</h4>
                      <p className="text-[11px] text-zinc-500 font-semibold">{p.ordersCount} Orders • {p.totalQty} Units Sold</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-[#ce112d]">{formatTaka(p.totalRevenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 4: CUSTOMER & ORDER INSIGHTS ── */}
      {activeReportTab === 'customers' && (
        <div className="bg-zinc-900 border border-white/5 rounded-[36px] p-6 md:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-tight italic">
                Recent Orders <span className="text-[#ce112d]">Log</span>
              </h3>
              <p className="text-zinc-500 text-xs font-semibold">Individual order log with advance and due payment details</p>
            </div>
            <button
              onClick={() => exportToCSV('orders')}
              className="flex items-center gap-2 text-xs font-bold text-[#ce112d] bg-[#ce112d]/10 hover:bg-[#ce112d]/20 px-4 py-2 rounded-xl border border-[#ce112d]/20 transition-all"
            >
              <Download size={14} /> Download Full Orders CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/50 text-[10px] font-black uppercase text-zinc-400 tracking-widest border-b border-white/5">
                  <th className="py-4 px-4">Ref #</th>
                  <th className="py-4 px-4">Date</th>
                  <th className="py-4 px-4">Customer</th>
                  <th className="py-4 px-4">Area</th>
                  <th className="py-4 px-4 text-right">Total</th>
                  <th className="py-4 px-4 text-right">Advance</th>
                  <th className="py-4 px-4 text-right">Due</th>
                  <th className="py-4 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-semibold text-zinc-300">
                {filteredOrders.slice(0, 20).map((o) => {
                  const total = Number(o.total_amount) || 0;
                  const charge = Number(o.delivery_charge) || 0;
                  const advance = o.is_advance_paid
                    ? (o.is_exclusive_order ? 500 : (o.delivery_area === 'mirsarai' && charge === 0 ? 100 : charge))
                    : 0;
                  const due = o.payment_status === 'Fully Paid' ? 0 : Math.max(0, total - advance);

                  return (
                    <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#ce112d]">#{o.id.toString().slice(-6).toUpperCase()}</td>
                      <td className="py-3 px-4 text-zinc-400">{new Date(o.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-bold text-white">{o.customer_name || 'Customer'}</td>
                      <td className="py-3 px-4 text-zinc-400 uppercase text-[10px] font-bold">{o.delivery_area || 'N/A'}</td>
                      <td className="py-3 px-4 text-right font-black text-white">{formatTaka(total)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">{formatTaka(advance)}</td>
                      <td className="py-3 px-4 text-right font-bold text-amber-400">{formatTaka(due)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                          o.status === 'Delivered' || o.status === 'Completed'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : o.status === 'Pending'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {o.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 5: FINANCIAL & CASH FLOW STATEMENT ── */}
      {activeReportTab === 'financial' && (
        <div className="bg-zinc-900 border border-white/5 rounded-[36px] p-6 md:p-8 space-y-8 shadow-2xl">
          <div className="border-b border-white/5 pb-4">
            <h3 className="text-xl font-bold uppercase tracking-tight italic">
              Executive Financial <span className="text-[#ce112d]">Statement</span>
            </h3>
            <p className="text-zinc-500 text-xs font-semibold">Summary of income, cash flow advances, and open receivables</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/50 p-6 rounded-3xl border border-white/5 space-y-4">
              <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider">Revenue &amp; Collections</h4>
              <div className="space-y-3 divide-y divide-white/5 text-sm font-semibold">
                <div className="flex justify-between py-2">
                  <span className="text-zinc-400">Total Billed Gross Revenue</span>
                  <span className="text-white font-black">{formatTaka(overallKPIs.totalRevenue)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-emerald-400">Total Advance Receipts (bKash/Bank)</span>
                  <span className="text-emerald-400 font-black">{formatTaka(overallKPIs.totalAdvance)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-amber-400">Pending COD Due Collection</span>
                  <span className="text-amber-400 font-black">{formatTaka(overallKPIs.totalDue)}</span>
                </div>
              </div>
            </div>

            <div className="bg-black/50 p-6 rounded-3xl border border-white/5 space-y-4">
              <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider">Order Volume Metrics</h4>
              <div className="space-y-3 divide-y divide-white/5 text-sm font-semibold">
                <div className="flex justify-between py-2">
                  <span className="text-zinc-400">Total Processed Orders</span>
                  <span className="text-white font-black">{overallKPIs.totalOrders}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-zinc-400">Average Order Value (AOV)</span>
                  <span className="text-blue-400 font-black">{formatTaka(overallKPIs.avgOrderValue)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-zinc-400">Successfully Delivered</span>
                  <span className="text-emerald-400 font-black">{overallKPIs.deliveredCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Executive Summary Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-[32px] max-w-2xl w-full p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tight text-white">Print Executive Report</h3>
                <p className="text-zinc-500 text-xs">Print or save as PDF for record keeping</p>
              </div>
              <button onClick={() => setShowPrintModal(false)} className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5">
                ✕
              </button>
            </div>

            <div className="p-6 bg-white text-black rounded-2xl font-sans space-y-6 text-sm">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-[#ce112d]">BIG BAZAR</h1>
                  <p className="text-xs text-gray-500">Official Admin Performance Report</p>
                </div>
                <div className="text-right text-xs text-gray-600">
                  <p>Date: {new Date().toLocaleDateString()}</p>
                  <p>Filter: {timeFilter.toUpperCase()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-gray-500 uppercase">Gross Revenue</p>
                  <p className="text-lg font-bold">{formatTaka(overallKPIs.totalRevenue)}</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-gray-500 uppercase">Total Orders</p>
                  <p className="text-lg font-bold">{overallKPIs.totalOrders}</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-gray-500 uppercase">Advance Collected</p>
                  <p className="text-lg font-bold">{formatTaka(overallKPIs.totalAdvance)}</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-gray-500 uppercase">Balance Due</p>
                  <p className="text-lg font-bold">{formatTaka(overallKPIs.totalDue)}</p>
                </div>
              </div>

              <p className="text-center text-xs text-gray-400 pt-4 border-t">Generated automatically from Big Bazar Admin Management Dashboard.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#ce112d] shadow-lg shadow-red-900/30"
              >
                Print Now / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
