import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { parkingService } from '../services/parkingService';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Car, 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

const Bookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: '7'
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bookings, filters, searchTerm]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const items = await bookingService.getUserBookings(user.id || user.uid || user.userId);
      // Attach slot details
      const withSlots = await Promise.all(items.map(async (b) => {
        const slot = await parkingService.getSlotById(b.slotId);
        return { ...b, parkingSlot: slot };
      }));
      setBookings(withSlots);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bookings];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(booking => booking.status === filters.status);
    }

    // Filter by date range
    if (filters.dateRange !== 'all') {
      const days = parseInt(filters.dateRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filtered = filtered.filter(booking => 
        new Date(booking.createdAt) >= cutoffDate
      );
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.parkingSlot?.slotNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.parkingSlot?.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredBookings(filtered);
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await bookingService.cancelBooking(bookingId);
      toast.success('Booking cancelled successfully');
      fetchBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error(error.message || 'Failed to cancel booking');
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

  const isBookingCancellable = (booking) => {
    return booking.status === 'active' && new Date(booking.startTime) > new Date();
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading your bookings...</span>
      </div>
    );
  }

  // Superadmin sees All Bookings in admin section
  if (user?.role === 'superadmin') {
    return <Navigate to="/admin/bookings" replace />;
  }

  return (
    <div>
      <div className="page-header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">My Bookings</h1>
            <p className="page-subtitle">Manage your parking reservations</p>
          </div>
          <Link to="/bookings/new" className="btn btn-primary">
            <Plus size={16} style={{ marginRight: '6px' }} />
            New Booking
          </Link>
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

        <div className="grid grid-3">
          <div className="form-group">
            <label className="form-label">
              <Search size={16} style={{ marginRight: '6px' }} />
              Search
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by slot, location, or vehicle"
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
            <label className="form-label">Date Range</label>
            <select
              className="form-input"
              value={filters.dateRange}
              onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
            >
              <option value="all">All Time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '15px' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>
            Showing {filteredBookings.length} of {bookings.length} bookings
          </span>
        </div>
      </div>

      {/* Bookings List */}
      <div className="container">
        {filteredBookings.length > 0 ? (
          <div className="grid grid-1">
            {filteredBookings.map((booking) => (
              <div key={booking._id} className="card">
                <div className="card-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="card-title">
                      {booking.parkingSlot?.slotNumber || 'Unknown Slot'}
                    </h3>
                    {getStatusBadge(booking.status)}
                  </div>
                </div>

                <div className="grid grid-2" style={{ marginBottom: '15px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <MapPin size={16} style={{ color: '#666' }} />
                      <span>{booking.parkingSlot?.section || booking.parkingSlot?.location || 'Unknown Location'}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Car size={16} style={{ color: '#666' }} />
                      <span>{booking.vehicleNumber}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={16} style={{ color: '#666' }} />
                      <span>{formatDate(booking.startTime)}</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Clock size={16} style={{ color: '#666' }} />
                      <span>
                        {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      Duration: {Math.round((new Date(booking.endTime) - new Date(booking.startTime)) / (1000 * 60 * 60))} hours
                    </div>

                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Booked: {formatDate(booking.createdAt)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <Link 
                    to={`/bookings/${booking._id}`}
                    className="btn btn-outline btn-sm"
                  >
                    <Edit size={14} />
                    View Details
                  </Link>

                  {isBookingCancellable(booking) && (
                    <button
                      onClick={() => handleCancelBooking(booking._id)}
                      className="btn btn-danger btn-sm"
                    >
                      <Trash2 size={14} />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Calendar className="empty-state-icon" />
            <h3>No bookings found</h3>
            <p>You haven't made any parking reservations yet, or none match your current filters.</p>
            <Link to="/bookings/new" className="btn btn-primary">
              <Plus size={16} style={{ marginRight: '6px' }} />
              Make Your First Booking
            </Link>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {bookings.length > 0 && (
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
      )}
    </div>
  );
};

export default Bookings;
