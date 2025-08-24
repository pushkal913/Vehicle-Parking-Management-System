import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { Users, UserPlus, MapPin, Calendar, Plus, XCircle, Circle, RefreshCw, CheckCircle, Clock, Car, GraduationCap, Briefcase, Shield } from 'lucide-react';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalSlots: 0, activeBookings: 0, totalVehicles: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [slotsMap, setSlotsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribers = [];
    setLoading(true);
    try {
      unsubscribers.push(onSnapshot(collection(db, 'users'), (snap) => setStats((s) => ({ ...s, totalUsers: snap.size }))));
      // Users map for enrichment
      unsubscribers.push(onSnapshot(collection(db, 'users'), (snap) => {
        const map = {};
        snap.forEach((d) => { map[d.id] = { _id: d.id, ...d.data() }; });
        setUsersMap(map);
      }));
      // Slots stats and map for enrichment
      unsubscribers.push(onSnapshot(collection(db, 'parkingSlots'), (snap) => {
        setStats((s) => ({ ...s, totalSlots: snap.size }));
        const map = {};
        snap.forEach((d) => { map[d.id] = { _id: d.id, ...d.data() }; });
        setSlotsMap(map);
      }));
      // Total registered vehicles across users
      unsubscribers.push(onSnapshot(collection(db, 'users'), (snap) => {
        let count = 0;
        snap.forEach((d) => {
          const u = d.data();
          const list = u.vehicles || u.vehicleInfo || [];
          count += Array.isArray(list) ? list.length : 0;
        });
        setStats((s) => ({ ...s, totalVehicles: count }));
      }));
      unsubscribers.push(onSnapshot(query(collection(db, 'bookings'), where('status', '==', 'active')), (snap) => setStats((s) => ({ ...s, activeBookings: snap.size }))));
  // Payments and revenue removed (free access)
      // Recent bookings for activity panel
      unsubscribers.push(
        onSnapshot(query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(10)), (snap) => {
          const items = snap.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
          setRecentBookings(items);
        })
      );
    } catch (e) {
      console.error('Admin dashboard init error:', e);
      toast.error('Failed to initialize dashboard');
    } finally {
      setLoading(false);
    }
    return () => { unsubscribers.forEach((u) => { try { u && u(); } catch {} }); };
  }, []);

  const toSafeDate = (val) => {
    if (!val) return null;
    try {
      if (typeof val?.toDate === 'function') return val.toDate();
      return new Date(val);
    } catch {
      return null;
    }
  };
  const formatDate = (d) => {
    const dt = toSafeDate(d);
    if (!dt) return '—';
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const formatRange = (start, end) => {
    const sDt = toSafeDate(start);
    const eDt = toSafeDate(end);
    if (!sDt || !eDt) return null;
    const s = sDt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const e = eDt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `${s} to ${e}`;
  };
  const getActivityIcon = (t) => t === 'booking_cancelled' ? <XCircle size={16} style={{ color: '#ef4444' }} /> : t === 'booking_created' ? <Plus size={16} style={{ color: '#3b82f6' }} /> : <UserPlus size={16} style={{ color: '#10b981' }} />;

  const statusBadge = (status) => {
    const map = {
      active: { cls: 'badge-success', text: 'Active', icon: CheckCircle },
      completed: { cls: 'badge-primary', text: 'Completed', icon: CheckCircle },
      cancelled: { cls: 'badge-danger', text: 'Cancelled', icon: XCircle },
      expired: { cls: 'badge-warning', text: 'Expired', icon: Clock },
    };
    const conf = map[status] || map.active;
    const Icon = conf.icon;
    return (
      <span className={`badge ${conf.cls}`} style={{ margin: 0 }}>
        <Icon size={12} /> {conf.text}
      </span>
    );
  };

  const activities = useMemo(() => {
    return recentBookings.map((b) => {
      const userKey = b.userId || b.userUID || b.userUid || b.uid || b.user?.id || b.user;
      const slotKey = b.slotId || b.parkingSlotId || b.slot?.id || b.parkingSlotIdRef;
      const user = usersMap[userKey];
      const slot = slotsMap[slotKey];
      const actionType = b.status === 'cancelled' ? 'booking_cancelled' : b.status === 'completed' ? 'booking_completed' : 'booking_created';
      const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown User';
      const email = user?.email || '';
      const slotLabel = slot?.slotNumber ? `Slot ${slot.slotNumber}` : (slotKey || 'N/A');
  const location = slot?.section || slot?.location || 'Unknown';
      const when = b.status === 'cancelled' ? (b.updatedAt || b.createdAt) : b.createdAt;
      const timeRange = formatRange(b.startTime, b.endTime);
      const role = user?.role === 'superadmin' ? 'Admin' : (user?.isFaculty ? 'Faculty' : 'Student');
      const roleIcon = user?.role === 'superadmin' ? 'admin' : (user?.isFaculty ? 'faculty' : 'student');
      const idValue = user?.isFaculty ? (user?.employeeId || null) : (user?.studentId || null);
      const vehicle = b?.vehicleNumber && b.vehicleNumber !== 'N/A' ? b.vehicleNumber : null;
      return {
        id: b._id,
        actionType,
        displayName,
        email,
        status: b.status,
        slotLabel,
        location,
        when,
        timeRange,
        role,
        roleIcon,
        idValue,
        vehicle,
      };
    });
  }, [recentBookings, usersMap, slotsMap]);

  // Lightweight dot separator for inline activity chips
  const Sep = () => <span style={{ color: '#d1d5db', margin: '0 6px' }}>•</span>;

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Manage your parking system</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-primary"><div className="stat-icon"><Users size={24} /></div><div className="stat-content"><div className="stat-value">{stats.totalUsers}</div><div className="stat-label">Total Users</div></div></div>
        <div className="stat-card stat-success"><div className="stat-icon"><MapPin size={24} /></div><div className="stat-content"><div className="stat-value">{stats.totalSlots}</div><div className="stat-label">Parking Slots</div></div></div>
  <button
          onClick={() => navigate('/admin/bookings')}
          className="stat-card stat-warning"
          style={{ textAlign: 'left', border: 'none', background: 'white', cursor: 'pointer' }}
        >
          <div className="stat-icon"><Calendar size={24} /></div>
          <div className="stat-content"><div className="stat-value">{stats.activeBookings}</div><div className="stat-label">Active Bookings</div></div>
        </button>
        <button
          onClick={() => navigate('/admin/vehicles')}
          className="stat-card stat-info"
          style={{ textAlign: 'left', border: 'none', background: 'white', cursor: 'pointer' }}
        >
          <div className="stat-icon"><Car size={24} /></div>
          <div className="stat-content"><div className="stat-value">{stats.totalVehicles}</div><div className="stat-label">Registered Vehicles</div></div>
        </button>
  {/* Revenue card removed (free access) */}
      </div>

      <div className="container"><div className="card"><div className="card-header"><h3 className="card-title">Quick Actions</h3></div>
        <div className="grid grid-4" style={{ gap: '15px', padding: '20px' }}>
          <button onClick={() => navigate('/admin/users')} className="quick-action-btn"><Users size={24} /><span>Manage Users</span></button>
          <button onClick={() => navigate('/admin/parking-slots')} className="quick-action-btn"><MapPin size={24} /><span>Manage Slots</span></button>
          <button onClick={() => navigate('/admin/bookings')} className="quick-action-btn"><Calendar size={24} /><span>View Bookings</span></button>
          <button onClick={() => navigate('/admin/vehicles')} className="quick-action-btn"><Car size={24} /><span>Registered Vehicles</span></button>
        </div>
      </div></div>

      <div className="container"><div className="card"><div className="card-header"><h3 className="card-title">Recent Activity</h3><div className="btn btn-outline btn-sm" title="Realtime updates enabled"><RefreshCw size={16} />Live</div></div>
        <div style={{ padding: '20px' }}>{activities.length > 0 ? (
          <div className="activity-list">
            {activities.map((a) => (
              <div key={a.id} className="activity-item" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="activity-icon">
                  {getActivityIcon(a.actionType)}
                </div>
                <div className="activity-content" style={{ display: 'grid', alignItems: 'center', width: '100%', columnGap: 16, rowGap: 2, gridTemplateColumns: 'minmax(260px, 2fr) 120px 220px 160px minmax(260px, 2fr)' }}>
                  {/* Col 1: Name + Email (top) and Time (below) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.displayName}</span>
                      {a.email && <span style={{ color: '#6b7280', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>({a.email})</span>}
                    </div>
                    <div className="activity-time" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
                      <Calendar size={14} style={{ color: '#64748b' }} />
                      <span>{a.timeRange ? a.timeRange : formatDate(a.when)}</span>
                    </div>
                  </div>

                  {/* Col 2: Status */}
                  <div>{statusBadge(a.status)}</div>

                  {/* Col 3: Role + ID */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
                    {a.roleIcon === 'admin' ? <Shield size={14} style={{ color: '#ef4444' }} /> : a.roleIcon === 'faculty' ? <Briefcase size={14} style={{ color: '#3b82f6' }} /> : <GraduationCap size={14} style={{ color: '#10b981' }} />}
                    <span>{a.role}{a.idValue ? ` • ${a.idValue}` : ''}</span>
                  </div>

                  {/* Col 4: Vehicle (placeholder when missing) */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
                    {a.vehicle ? (<><Car size={14} style={{ color: '#64748b' }} /><span>{a.vehicle}</span></>) : <span style={{ color: '#9ca3af' }}>—</span>}
                  </div>

                  {/* Col 5: Slot + Location */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
                    <MapPin size={14} style={{ color: '#64748b' }} />
                    <span>{a.slotLabel} • {a.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state"><Circle className="empty-state-icon" /><p>No recent activity</p></div>
        )}
        </div>
      </div></div>

      <div className="container"><div className="card"><div className="card-header"><h3 className="card-title">System Status</h3></div>
        <div style={{ padding: '20px' }}><div className="grid grid-2">
          <div className="status-item"><div className="status-indicator status-online"></div><div><div className="status-title">Database</div><div className="status-text">Connected</div></div></div>
          <div className="status-item"><div className="status-indicator status-online"></div><div><div className="status-title">API Server</div><div className="status-text">Running</div></div></div>
          <div className="status-item"><div className="status-indicator status-warning"></div><div><div className="status-title">Maintenance</div><div className="status-text">2 slots under maintenance</div></div></div>
          {/* Payment Gateway status removed (no payments) */}
        </div></div>
      </div></div>
    </div>
  );
};

export default AdminDashboard;
