import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../config/firebase';
import { collection, onSnapshot, getDocs, query, orderBy } from 'firebase/firestore';
import { 
  Calendar, 
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Car,
  User
} from 'lucide-react';
import { toast } from 'react-toastify';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: '7',
    location: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sections, setSections] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [slotsMap, setSlotsMap] = useState({});

  useEffect(() => {
    // Realtime listeners for bookings, users, and slots
    const unsubs = [];
    setLoading(true);
    try {
      // Users map
      unsubs.push(onSnapshot(collection(db, 'users'), (snap) => {
        const map = {};
        snap.forEach((d) => { map[d.id] = { _id: d.id, ...d.data() }; });
        setUsersMap(map);
      }));

      // Slots map and distinct sections
      unsubs.push(onSnapshot(collection(db, 'parkingSlots'), (snap) => {
        const map = {};
        const secs = new Set();
        snap.forEach((d) => {
          const s = { _id: d.id, ...d.data() };
          map[d.id] = s;
          if (s.section) secs.add(s.section);
        });
        setSlotsMap(map);
        setSections(Array.from(secs).sort());
      }));

      // Bookings ordered by createdAt desc
      const bq = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
      unsubs.push(onSnapshot(bq, (snap) => {
        const items = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
        setBookings(items);
        setLoading(false);
      }));
    } catch (e) {
      console.error('Error wiring admin bookings listeners:', e);
      setLoading(false);
    }
    return () => { unsubs.forEach((u) => { try { u(); } catch {} }); };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bookings, filters, searchTerm]);

  // Enriched view of bookings with user and slot details
  const enriched = useMemo(() => {
    return bookings.map((b) => ({
      ...b,
      user: usersMap[b.userId] || null,
      parkingSlot: slotsMap[b.slotId] || null,
    }));
  }, [bookings, usersMap, slotsMap]);

  const applyFilters = () => {
  let filtered = [...enriched];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(booking => booking.status === filters.status);
    }

    // Filter by section
    if (filters.location !== 'all') {
      filtered = filtered.filter(booking => booking.parkingSlot?.section === filters.location);
    }

    // Filter by date range
    if (filters.dateRange !== 'all') {
  const days = parseInt(filters.dateRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
  filtered = filtered.filter(booking => new Date(booking.createdAt) >= cutoffDate);
    }

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.user?.email?.toLowerCase().includes(q) ||
        booking.user?.firstName?.toLowerCase().includes(q) ||
        booking.user?.lastName?.toLowerCase().includes(q) ||
        (booking.parkingSlot?.slotNumber?.toString()?.toLowerCase() || '').includes(q) ||
        booking.vehicleNumber?.toLowerCase().includes(q)
      );
    }

    setFilteredBookings(filtered);
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      // Update Firestore status to cancelled
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'bookings', bookingId), { status: 'cancelled', updatedAt: new Date().toISOString() });
      toast.success('Booking cancelled successfully');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { class: 'badge-success', icon: CheckCircle, text: 'Active' },
      completed: { class: 'badge-primary', icon: CheckCircle, text: 'Completed' },
      cancelled: { class: 'badge-danger', icon: XCircle, text: 'Cancelled' },
      expired: { class: 'badge-warning', icon: Clock, text: 'Expired' }
    };

    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span className={`badge ${config.class}`}>
        <Icon size={12} style={{ marginRight: '4px' }} />
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading bookings...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <h1 className="page-title">All Bookings</h1>
          <p className="page-subtitle">View and manage every booking in the system</p>
        </div>
      </div>

      {/* Filters */}
      <div className="container">
        <div className="card-header">
          <h3 className="card-title">
            <Filter size={20} style={{ marginRight: '8px' }} />
            Filters & Search
          </h3>
        </div>

        <div className="grid grid-4">
          <div className="form-group">
            <label className="form-label">
              <Search size={16} style={{ marginRight: '6px' }} />
              Search
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by user, slot, or vehicle"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-input"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <select
              className="form-input"
              value={filters.location}
              onChange={(e) => setFilters({...filters, location: e.target.value})}
            >
              <option value="all">All Locations</option>
              {sections.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date Range</label>
            <select
              className="form-input"
              value={filters.dateRange}
              onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
            >
              <option value="all">All Time</option>
              <option value="1">Today</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '15px' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>
            Showing {filteredBookings.length} of {enriched.length} bookings
          </span>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="container">
        <div className="card">
          {filteredBookings.length > 0 ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Slot</th>
                    <th>Vehicle</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking._id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '500' }}>
                            {booking.user?.firstName || 'Unknown'} {booking.user?.lastName || ''}
                          </span>
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {booking.user?.email || '—'}
                          </span>
                          <span style={{ fontSize: '11px', color: '#888' }}>
                            {booking.user?.role || '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '500' }}>
                            {booking.parkingSlot?.slotNumber || 'N/A'}
                          </span>
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            <MapPin size={12} style={{ marginRight: '4px' }} />
                            {booking.parkingSlot?.section || booking.parkingSlot?.location || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Car size={14} style={{ color: '#666' }} />
                        {booking.vehicleNumber || '—'}
                      </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
                          <span>{formatDateTime(booking.startTime)}</span>
                          <span style={{ color: '#666' }}>to</span>
                          <span>{formatDateTime(booking.endTime)}</span>
                        </div>
                      </td>
                      <td>{getStatusBadge(booking.status)}</td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {formatDateTime(booking.createdAt)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          
                          {booking.status === 'active' && (
                            <button
                              onClick={() => handleCancelBooking(booking._id)}
                              className="btn btn-danger btn-sm"
                              title="Cancel Booking"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Calendar className="empty-state-icon" />
              <h3>No bookings found</h3>
              <p>No bookings match your current search criteria</p>
              <button
                onClick={() => {
                  setFilters({ status: 'all', dateRange: '7', location: 'all' });
                  setSearchTerm('');
                }}
                className="btn btn-outline"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{bookings.filter(b => b.status === 'active').length}</div>
          <div className="stat-label">Active Bookings</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{bookings.filter(b => b.status === 'completed').length}</div>
          <div className="stat-label">Completed</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{bookings.filter(b => b.status === 'cancelled').length}</div>
          <div className="stat-label">Cancelled</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{bookings.length}</div>
          <div className="stat-label">Total Bookings</div>
        </div>
      </div>
    </div>
  );
};

export default AdminBookings;
