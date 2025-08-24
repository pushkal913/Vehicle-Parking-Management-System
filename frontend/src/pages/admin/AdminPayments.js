import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../config/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { DollarSign, Search, Filter, Receipt, CheckCircle, XCircle, Clock } from 'lucide-react';

const statusBadge = (status) => {
  const map = {
    succeeded: { cls: 'badge-success', label: 'Succeeded', Icon: CheckCircle },
    pending: { cls: 'badge-warning', label: 'Pending', Icon: Clock },
    failed: { cls: 'badge-danger', label: 'Failed', Icon: XCircle },
  };
  const { cls, label, Icon } = map[status] || map.pending;
  return (
    <span className={`badge ${cls}`}>
      <Icon size={12} style={{ marginRight: 4 }} />
      {label}
    </span>
  );
};

export default function AdminPayments() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'payments'), orderBy('createdAt', 'desc')), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(list);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      const term = search.trim().toLowerCase();
      const matches = !term ||
        p.userEmail?.toLowerCase().includes(term) ||
        p.userId?.toLowerCase().includes(term) ||
        p.bookingId?.toLowerCase().includes(term) ||
        String(p.amount).includes(term);
      const statusOk = status === 'all' || p.status === status;
      return matches && statusOk;
    });
  }, [items, search, status]);

  const fmt = (iso) => new Date(iso).toLocaleString();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payments</h1>
        <p className="page-subtitle">Realtime log of payments. Booking payments to be added later.</p>
      </div>

      <div className="container">
        <div className="grid grid-3">
          <div className="form-group">
            <label className="form-label"><Search size={14} style={{ marginRight: 6 }} />Search</label>
            <input className="form-input" placeholder="User, booking or amount" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label"><Filter size={14} style={{ marginRight: 6 }} />Status</label>
            <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="succeeded">Succeeded</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="card">
          {filtered.length ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>User</th>
                    <th>Booking</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Receipt size={14} />
                          <span>{p.id}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong>{p.userEmail || '—'}</strong>
                          <span style={{ color: '#6b7280', fontSize: 12 }}>{p.userId || '—'}</span>
                        </div>
                      </td>
                      <td><span style={{ fontSize: 12 }}>{p.bookingId || '—'}</span></td>
                      <td>${Number(p.amount || 0).toFixed(2)}</td>
                      <td>{statusBadge(p.status)}</td>
                      <td>{fmt(p.createdAt)}</td>
                      <td>{p.method || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <DollarSign className="empty-state-icon" />
              <h3>No payments yet</h3>
              <p>Payments will appear here in realtime once enabled.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
