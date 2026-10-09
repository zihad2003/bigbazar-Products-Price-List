import React, { useEffect, useMemo, useState } from 'react';
import { Truck, RefreshCw, Search, Wallet, RotateCcw, Package, BarChart3 } from 'lucide-react';
import { API_URL, getToken } from '../../api/client';

const TABS = [
  { id: 'report', label: 'Report' },
  { id: 'balance', label: 'Balance' },
  { id: 'track', label: 'Track' },
  { id: 'returns', label: 'Returns' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'pickup', label: 'Pickup' },
];

async function sfFetch(path, options = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {
    throw new Error(res.status === 404
      ? 'Steadfast tools are not on the live server yet. Deploy this update, then refresh.'
      : `Invalid server response (${res.status}).`);
  }
  if (res.status === 404) {
    throw new Error('This Steadfast tool is not on the live server yet. Deploy this update, then refresh.');
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function balanceAmount(data) {
  const raw = data?.current_balance ?? data?.balance ?? data?.data?.current_balance ?? data?.data?.balance;
  if (raw == null || raw === '') return '—';
  return `৳${raw}`;
}

function deliveryStatus(status) {
  return status?.delivery_status || status?.consignment?.status || status?.status || '—';
}

function rowId(item, index) {
  return item?.id || item?.payment_id || item?.consignment_id || item?.tracking_code || index;
}

export default function AdminSteadfast() {
  const [tab, setTab] = useState('report');
  const [reportNonce, setReportNonce] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const [balance, setBalance] = useState(null);
  const [trackBy, setTrackBy] = useState('invoice');
  const [trackValue, setTrackValue] = useState('');
  const [trackResult, setTrackResult] = useState(null);

  const [returns, setReturns] = useState([]);
  const [returnPage, setReturnPage] = useState(1);
  const [returnForm, setReturnForm] = useState({ kind: 'tracking_code', value: '', reason: '' });

  const [payouts, setPayouts] = useState([]);
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutDetail, setPayoutDetail] = useState(null);

  const [stations, setStations] = useState([]);
  const [stationQuery, setStationQuery] = useState('');
  const [pickup, setPickup] = useState({
    address_id: '',
    police_station_id: '',
    address: '',
    contact_number: '',
    note: '',
    estim_qty: '1',
  });

  const loadBalance = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await sfFetch('/admin/steadfast/balance');
      setBalance(data.data || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadReturns = async (page = returnPage) => {
    setLoading(true);
    setError('');
    try {
      const data = await sfFetch(`/admin/steadfast/returns?page=${page}`);
      setReturns(data.items || []);
      setReturnPage(data.page || page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPayouts = async (page = payoutPage) => {
    setLoading(true);
    setError('');
    try {
      const data = await sfFetch(`/admin/steadfast/payments?page=${page}`);
      setPayouts(data.items || []);
      setPayoutPage(data.page || page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStations = async () => {
    if (stations.length) return;
    setLoading(true);
    setError('');
    try {
      const data = await sfFetch('/admin/steadfast/police-stations');
      setStations(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'balance') loadBalance();
    if (tab === 'returns') loadReturns(1);
    if (tab === 'payouts') loadPayouts(1);
    if (tab === 'pickup') loadStations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const filteredStations = useMemo(() => {
    const q = stationQuery.trim().toLowerCase();
    const list = q
      ? stations.filter((s) => `${s.name || ''} ${s.district || ''} ${s.bn_name || ''}`.toLowerCase().includes(q))
      : stations;
    return list.slice(0, 40);
  }, [stations, stationQuery]);

  const track = async (event) => {
    event.preventDefault();
    const value = trackValue.trim();
    if (!value) return;
    setLoading(true);
    setError('');
    setTrackResult(null);
    const key = trackBy === 'cid' ? 'cid' : trackBy;
    try {
      const data = await sfFetch(`/admin/steadfast/track?${key}=${encodeURIComponent(value)}`);
      setTrackResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitReturn = async (event) => {
    event.preventDefault();
    if (!returnForm.value.trim()) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await sfFetch('/admin/steadfast/returns', {
        method: 'POST',
        body: JSON.stringify({
          [returnForm.kind]: returnForm.value.trim(),
          reason: returnForm.reason.trim(),
        }),
      });
      setNotice('Return request sent.');
      setReturnForm({ kind: 'tracking_code', value: '', reason: '' });
      await loadReturns(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openPayout = async (item) => {
    const id = item.payment_id || item.id;
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await sfFetch(`/admin/steadfast/payments/${encodeURIComponent(id)}`);
      setPayoutDetail(data.data || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitPickup = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await sfFetch('/admin/steadfast/pickup', {
        method: 'POST',
        body: JSON.stringify(pickup),
      });
      setNotice('Pickup request sent. Steadfast will not send a second rider while one is still pending.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
            <Truck className="text-[#ce112d]" size={18} />
            Steadfast <span className="text-[#ce112d]">Courier</span>
          </h2>
          <p className="text-zinc-500 text-xs mt-0.5">
            Reports, balance, tracking, returns, payouts, and pickup. Parcel booking stays on each order.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (tab === 'report') setReportNonce((n) => n + 1);
            if (tab === 'balance') loadBalance();
            if (tab === 'returns') loadReturns(returnPage);
            if (tab === 'payouts') loadPayouts(payoutPage);
            if (tab === 'pickup') { setStations([]); loadStations(); }
          }}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#121215] border border-white/10 text-xs font-semibold text-zinc-400 hover:border-[#ce112d]/40 hover:text-white"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => { setTab(item.id); setError(''); setNotice(''); setPayoutDetail(null); }}
            className={`h-9 px-3 rounded-lg text-xs font-semibold border ${
              tab === item.id
                ? 'bg-[#ce112d] border-[#ce112d] text-white'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      {notice && <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">{notice}</div>}

      {tab === 'report' && <SteadfastReport nonce={reportNonce} />}

      {tab === 'balance' && (
        <div className="rounded-lg border border-white/10 bg-[#121215] border-t-2 border-t-[#ce112d] px-4 py-4 max-w-sm">
          <p className="text-[10px] font-medium text-zinc-500 flex items-center gap-1.5"><Wallet size={12} /> Available payout</p>
          <p className="text-2xl font-semibold text-white mt-1 tabular-nums">{balance ? balanceAmount(balance) : (loading ? '…' : '—')}</p>
          <p className="text-[10px] text-zinc-600 mt-1">Delivered COD, minus delivery charge and Steadfast’s collection fee.</p>
        </div>
      )}

      {tab === 'track' && (
        <div className="space-y-4">
          <form onSubmit={track} className="flex flex-col sm:flex-row gap-2">
            <select
              value={trackBy}
              onChange={(e) => setTrackBy(e.target.value)}
              className="h-10 px-3 rounded-lg bg-[#121215] border border-white/10 text-sm text-white"
            >
              <option value="invoice">Invoice</option>
              <option value="tracking">Tracking code</option>
              <option value="cid">Consignment ID</option>
            </select>
            <input
              value={trackValue}
              onChange={(e) => setTrackValue(e.target.value)}
              placeholder={trackBy === 'cid' ? 'Consignment ID' : trackBy === 'tracking' ? 'Tracking code' : 'Invoice / order id'}
              className="flex-1 h-10 px-3 rounded-lg bg-[#121215] border border-white/10 text-sm text-white"
            />
            <button type="submit" className="h-10 px-4 rounded-lg bg-[#ce112d] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5">
              <Search size={14} /> Track
            </button>
          </form>
          <p className="text-[11px] text-zinc-500">Use this for parcels typed into the Steadfast app. You need the invoice, tracking code, or consignment ID.</p>
          {trackResult && (
            <div className="rounded-xl border border-white/10 bg-[#121215] p-4 space-y-3">
              <p className="text-sm text-white">Status: <span className="font-semibold text-[#ce112d]">{deliveryStatus(trackResult.status)}</span></p>
              {trackResult.returnStatus && (
                <p className="text-xs text-zinc-400">Return: {deliveryStatus(trackResult.returnStatus)}</p>
              )}
              {trackResult.timeline?.length > 0 && (
                <ol className="space-y-2 border-t border-white/10 pt-3">
                  {trackResult.timeline.map((step, index) => (
                    <li key={rowId(step, index)} className="text-xs text-zinc-300">
                      <span className="text-zinc-500">{step.created_at || ''}</span>
                      <span className="block">{step.text || step.tracking_message || step.description || 'Update'}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'returns' && (
        <div className="space-y-4">
          <form onSubmit={submitReturn} className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <select
              value={returnForm.kind}
              onChange={(e) => setReturnForm((prev) => ({ ...prev, kind: e.target.value }))}
              className="h-10 px-3 rounded-lg bg-[#121215] border border-white/10 text-sm text-white"
            >
              <option value="tracking_code">Tracking code</option>
              <option value="invoice">Invoice</option>
              <option value="consignment_id">Consignment ID</option>
            </select>
            <input
              value={returnForm.value}
              onChange={(e) => setReturnForm((prev) => ({ ...prev, value: e.target.value }))}
              placeholder="Parcel reference"
              className="h-10 px-3 rounded-lg bg-[#121215] border border-white/10 text-sm text-white md:col-span-1"
            />
            <input
              value={returnForm.reason}
              onChange={(e) => setReturnForm((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Reason (optional)"
              className="h-10 px-3 rounded-lg bg-[#121215] border border-white/10 text-sm text-white"
            />
            <button type="submit" className="h-10 px-4 rounded-lg bg-[#ce112d] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5">
              <RotateCcw size={14} /> Request return
            </button>
          </form>
          <div className="rounded-xl border border-white/10 overflow-hidden bg-[#121215]">
            {returns.length === 0 ? (
              <p className="p-6 text-sm text-zinc-500 text-center">{loading ? 'Loading…' : 'No return requests on this page.'}</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-500">
                    <th className="px-3 py-2">Parcel</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((item, index) => (
                    <tr key={rowId(item, index)} className="border-b border-white/[0.04] text-zinc-200">
                      <td className="px-3 py-2">{item.tracking_code || item.invoice || item.consignment_id || '—'}</td>
                      <td className="px-3 py-2">{item.status || '—'}</td>
                      <td className="px-3 py-2 text-zinc-400">{item.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Pager page={returnPage} onPage={(page) => loadReturns(page)} disabled={loading} />
        </div>
      )}

      {tab === 'payouts' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 overflow-hidden bg-[#121215]">
            {payouts.length === 0 ? (
              <p className="p-6 text-sm text-zinc-500 text-center">{loading ? 'Loading…' : 'No payouts on this page.'}</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-500">
                    <th className="px-3 py-2">Payout</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((item, index) => (
                    <tr key={rowId(item, index)} className="border-b border-white/[0.04] text-zinc-200">
                      <td className="px-3 py-2">{item.payment_id || item.id || '—'}</td>
                      <td className="px-3 py-2">৳{item.amount ?? item.total ?? '—'}</td>
                      <td className="px-3 py-2">{item.status_label || item.status || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" onClick={() => openPayout(item)} className="text-[#ce112d] font-semibold">Parcels</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Pager page={payoutPage} onPage={(page) => loadPayouts(page)} disabled={loading} />
          {payoutDetail && (
            <div className="rounded-xl border border-white/10 bg-[#121215] p-4 text-xs text-zinc-300 space-y-1">
              <p className="text-white font-semibold">Payout parcels</p>
              <pre className="whitespace-pre-wrap break-all text-[11px] text-zinc-400">{JSON.stringify(payoutDetail, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {tab === 'pickup' && (
        <form onSubmit={submitPickup} className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
          <label className="text-xs text-zinc-400 space-y-1">
            Pickup address ID
            <input
              value={pickup.address_id}
              onChange={(e) => setPickup((prev) => ({ ...prev, address_id: e.target.value }))}
              placeholder="From Steadfast → Pickup Addresses"
              className="w-full h-10 px-3 rounded-lg bg-[#121215] border border-white/10 text-sm text-white"
            />
          </label>
          <label className="text-xs text-zinc-400 space-y-1">
            Parcel count
            <input
              value={pickup.estim_qty}
              onChange={(e) => setPickup((prev) => ({ ...prev, estim_qty: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg bg-[#121215] border border-white/10 text-sm text-white"
            />
          </label>
          <label className="text-xs text-zinc-400 space-y-1 md:col-span-2">
            Thana
            <input
              value={stationQuery}
              onChange={(e) => setStationQuery(e.target.value)}
              placeholder={stations.length ? 'Search thana' : 'Loading thanas…'}
              className="w-full h-10 px-3 rounded-lg bg-[#121215] border border-white/10 text-sm text-white"
            />
            {filteredStations.length > 0 && (
              <select
                value={pickup.police_station_id}
                onChange={(e) => setPickup((prev) => ({ ...prev, police_station_id: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-[#121215] border border-white/10 text-sm text-white"
              >
                <option value="">Select thana</option>
                {filteredStations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name || station.bn_name}{station.district ? `, ${station.district}` : ''}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="text-xs text-zinc-400 space-y-1 md:col-span-2">
            Pickup address
            <input
              value={pickup.address}
              onChange={(e) => setPickup((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg bg-[#121215] border border-white/10 text-sm text-white"
            />
          </label>
          <label className="text-xs text-zinc-400 space-y-1">
            Contact number
            <input
              value={pickup.contact_number}
              onChange={(e) => setPickup((prev) => ({ ...prev, contact_number: e.target.value }))}
              placeholder="01XXXXXXXXX"
              className="w-full h-10 px-3 rounded-lg bg-[#121215] border border-white/10 text-sm text-white"
            />
          </label>
          <label className="text-xs text-zinc-400 space-y-1">
            Note
            <input
              value={pickup.note}
              onChange={(e) => setPickup((prev) => ({ ...prev, note: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg bg-[#121215] border border-white/10 text-sm text-white"
            />
          </label>
          <button type="submit" className="md:col-span-2 h-10 px-4 rounded-lg bg-[#ce112d] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5">
            <Package size={14} /> Request pickup
          </button>
        </form>
      )}
    </div>
  );
}

const REPORT_RANGES = [
  { id: 'daily', label: 'Daily' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'custom', label: 'Custom' },
];

const REPORT_CARDS = [
  { key: 'parcels', label: 'Parcels' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'inTransit', label: 'In transit' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'returned', label: 'Returned' },
  { key: 'cod', label: 'COD', money: true },
  { key: 'deliveryCharge', label: 'Delivery charge', money: true },
  { key: 'advance', label: 'Advance', money: true },
  { key: 'due', label: 'Due', money: true },
];

function taka(amount) {
  return `৳${(Number(amount) || 0).toLocaleString('en-BD')}`;
}

function SteadfastReport({ nonce }) {
  const [range, setRange] = useState('daily');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (nextRange = range, nextFrom = from, nextTo = to) => {
    if (nextRange === 'custom' && (!nextFrom || !nextTo)) return;
    setLoading(true);
    setError('');
    const query = new URLSearchParams({ range: nextRange });
    if (nextRange === 'custom') {
      query.set('from', nextFrom);
      query.set('to', nextTo);
    }
    try {
      const data = await sfFetch(`/admin/steadfast/report?${query.toString()}`);
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range !== 'custom') load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, nonce]);

  const totals = report?.totals;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {REPORT_RANGES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setRange(item.id)}
            className={`h-9 px-3 rounded-lg text-xs font-semibold border ${
              range === item.id
                ? 'bg-white text-black border-white'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
        {range === 'custom' && (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              load('custom', from, to);
            }}
          >
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 px-2 rounded-lg bg-[#121215] border border-white/10 text-xs text-white" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 px-2 rounded-lg bg-[#121215] border border-white/10 text-xs text-white" />
            <button type="submit" className="h-9 px-3 rounded-lg bg-[#ce112d] text-white text-xs font-semibold">Show</button>
          </form>
        )}
      </div>

      <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
        <BarChart3 size={12} />
        Parcels booked from this website. App-only entries are not included.
        {report ? ` ${report.from} – ${report.to}.` : ''}
      </p>
      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {REPORT_CARDS.map((card) => (
            <div key={card.key} className="rounded-lg border border-white/10 bg-[#121215] px-3 py-2.5">
              <p className="text-[10px] text-zinc-500">{card.label}</p>
              <p className="text-lg font-semibold text-white tabular-nums mt-0.5">
                {card.money ? taka(totals[card.key]) : totals[card.key]}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-white/10 overflow-x-auto bg-[#121215]">
        {!report?.rows?.length ? (
          <p className="p-6 text-sm text-zinc-500 text-center">
            {loading ? 'Loading…' : range === 'custom' && !report ? 'Choose a start and end date.' : 'No booked parcels in this period.'}
          </p>
        ) : (
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead>
              <tr className="border-b border-white/10 text-zinc-500">
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">Parcels</th>
                <th className="px-3 py-2">Delivered</th>
                <th className="px-3 py-2">In transit</th>
                <th className="px-3 py-2">Cancelled</th>
                <th className="px-3 py-2">Returned</th>
                <th className="px-3 py-2">COD</th>
                <th className="px-3 py-2">Charge</th>
                <th className="px-3 py-2">Advance</th>
                <th className="px-3 py-2">Due</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.key} className="border-b border-white/[0.04] text-zinc-200">
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2">{row.parcels}</td>
                  <td className="px-3 py-2">{row.delivered}</td>
                  <td className="px-3 py-2">{row.inTransit}</td>
                  <td className="px-3 py-2">{row.cancelled}</td>
                  <td className="px-3 py-2">{row.returned}</td>
                  <td className="px-3 py-2">{taka(row.cod)}</td>
                  <td className="px-3 py-2">{taka(row.deliveryCharge)}</td>
                  <td className="px-3 py-2">{taka(row.advance)}</td>
                  <td className="px-3 py-2">{taka(row.due)}</td>
                </tr>
              ))}
              {totals && (
                <tr className="text-white font-semibold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2">{totals.parcels}</td>
                  <td className="px-3 py-2">{totals.delivered}</td>
                  <td className="px-3 py-2">{totals.inTransit}</td>
                  <td className="px-3 py-2">{totals.cancelled}</td>
                  <td className="px-3 py-2">{totals.returned}</td>
                  <td className="px-3 py-2">{taka(totals.cod)}</td>
                  <td className="px-3 py-2">{taka(totals.deliveryCharge)}</td>
                  <td className="px-3 py-2">{taka(totals.advance)}</td>
                  <td className="px-3 py-2">{taka(totals.due)}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Pager({ page, onPage, disabled }) {
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-400">
      <button type="button" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)} className="h-8 px-3 rounded-lg border border-white/10 disabled:opacity-40">Previous</button>
      <span>Page {page}</span>
      <button type="button" disabled={disabled} onClick={() => onPage(page + 1)} className="h-8 px-3 rounded-lg border border-white/10 disabled:opacity-40">Next</button>
    </div>
  );
}
