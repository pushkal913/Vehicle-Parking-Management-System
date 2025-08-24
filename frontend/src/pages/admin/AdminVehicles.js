import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Search, Filter, Car, User, Mail, Hash } from 'lucide-react';

const AdminVehicles = () => {
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');

  useEffect(() => {
    const un = onSnapshot(collection(db, 'users'), (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ _id: d.id, ...d.data() }));
      setUsers(list);
      setLoading(false);
    });
    return () => { try { un(); } catch {} };
  }, []);

  useEffect(() => {
    const rows = [];
    users.forEach((u) => {
      const vs = u.vehicles || u.vehicleInfo || [];
      vs.forEach((v) => rows.push({ ...v, user: u }));
    });
    setVehicles(rows);
  }, [users]);

  const filtered = useMemo(() => {
    let rows = [...vehicles];
    if (type !== 'all') rows = rows.filter((v) => (v.vehicleType || '').toLowerCase() === type);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((v) =>
        (v.licensePlate || '').toLowerCase().includes(q) ||
        (v.make || '').toLowerCase().includes(q) ||
        (v.model || '').toLowerCase().includes(q) ||
        (v.user?.firstName || '').toLowerCase().includes(q) ||
        (v.user?.lastName || '').toLowerCase().includes(q) ||
        (v.user?.email || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [vehicles, search, type]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading registered vehicles...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <h1 className="page-title">Registered Vehicles</h1>
          <p className="page-subtitle">All vehicles registered by standard users</p>
        </div>
      </div>

      <div className="container">
        <div className="card-header">
          <h3 className="card-title"><Filter size={20} style={{ marginRight: 8 }} />Filters & Search</h3>
        </div>
        <div className="grid grid-3">
          <div className="form-group">
            <label className="form-label"><Search size={16} style={{ marginRight: 6 }} />Search</label>
            <input className="form-input" placeholder="Search by user or vehicle" value={search} onChange={(e)=>setSearch(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-input" value={type} onChange={(e)=>setType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="car">Car</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="truck">Truck</option>
              <option value="suv">SUV</option>
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <span style={{ color: '#666', fontSize: 14 }}>Showing {filtered.length} of {vehicles.length}</span>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="card">
          {filtered.length > 0 ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Vehicle</th>
                    <th>Plate</th>
                    <th>Color</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v, idx) => (
                    <tr key={(v._id || v.licensePlate || '') + idx}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500 }}><User size={12} style={{ marginRight: 4 }} />{v.user?.firstName} {v.user?.lastName}</span>
                          <span style={{ fontSize: 12, color: '#666' }}><Mail size={12} style={{ marginRight: 4 }} />{v.user?.email}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Car size={14} style={{ color: '#2563eb' }} />
                          <span>{v.year} {v.make} {v.model}</span>
                        </div>
                      </td>
                      <td><code>{v.licensePlate}</code></td>
                      <td>{v.color}</td>
                      <td>{(v.vehicleType || '').toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Car className="empty-state-icon" />
              <h3>No vehicles found</h3>
              <p>No registered vehicles match your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminVehicles;
