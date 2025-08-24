import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  Car, 
  Calendar, 
  User, 
  Clock, 
  MapPin, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

const Dashboard = () => {
  const { user, updateUser } = useAuth();
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeBookings: 0,
    totalVehicles: 0,
    availableSlots: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    make: '',
    model: '',
    year: '',
    color: '',
    licensePlate: '',
    vehicleType: 'car'
  });

  useEffect(() => {
    // If superadmin, do not load standard dashboard
    if (user?.role === 'superadmin') return;
    fetchDashboardData();
  }, [user?.id, user?.uid]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Load user's recent bookings from Firestore
  const qRef = query(collection(db, 'bookings'), where('userId', '==', user.id || user.uid || user.userId));
  const snap = await getDocs(qRef);
      let myBookings = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
      myBookings.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
      const recent = myBookings.slice(0,5);

      // Get availability stats from parkingService via Firestore slots
      // Lazy import to avoid circular
      const { parkingService } = await import('../services/parkingService');
      await parkingService.ensureInitialized();
      const slots = await parkingService.listSlots();

  // vehicles from Firestore user document to ensure latest
  const uid = user.id || user.uid || user.userId;
  const uSnap = await getDoc(doc(db, 'users', uid));
  const uData = uSnap.exists() ? uSnap.data() : {};
  const userVehicles = (uData.vehicles || uData.vehicleInfo || []);
  setVehicles(userVehicles);
  const totalVehicles = userVehicles.length || 0;
      const availableSlots = slots.filter(s => !s.currentBookingId).length;
      const activeBookings = myBookings.filter(b => b.status === 'active').length;

      setStats({
        totalBookings: myBookings.length,
        activeBookings,
        totalVehicles,
        availableSlots
      });

      // enrich bookings with slot + section/location
  const slotById = new Map(slots.map(s => [s._id, s]));
      const enriched = recent.map(b => ({
        ...b,
        parkingSlot: slotById.get(b.slotId) || null,
        location: (slotById.get(b.slotId)?.section) || 'Unknown'
      }));

      setRecentBookings(enriched);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      const uid = user.id || user.uid || user.userId;
      const newVehicle = {
        ...vehicleForm,
        _id: Math.random().toString(36).slice(2),
        licensePlate: (vehicleForm.licensePlate || '').toUpperCase()
      };
      const next = [...vehicles, newVehicle];
      await updateDoc(doc(db, 'users', uid), { vehicles: next, updatedAt: new Date() });
      setVehicles(next);
      setStats(s => ({ ...s, totalVehicles: next.length }));
      updateUser({ vehicles: next });
      setShowAddVehicle(false);
      setVehicleForm({ make:'', model:'', year:'', color:'', licensePlate:'', vehicleType:'car' });
    } catch (err) {
      console.error('Error adding vehicle from dashboard:', err);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { icon: Clock, class: 'badge-success', text: 'Active' },
      completed: { icon: CheckCircle, class: 'badge-info', text: 'Completed' },
      cancelled: { icon: XCircle, class: 'badge-danger', text: 'Cancelled' },
      expired: { icon: AlertCircle, class: 'badge-warning', text: 'Expired' }
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
        <span>Loading dashboard...</span>
      </div>
    );
  }

  // If superadmin, use the Admin Dashboard as the primary dashboard
  if (user?.role === 'superadmin') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="page-subtitle">
            {user?.role === 'superadmin' ? 'System Administrator' : user?.isFaculty ? 'Faculty Member' : 'Student'} • {user?.department}
          </p>
        </div>
      </div>

      {/* Smart Vehicle Alert */}
      {user?.role !== 'superadmin' && vehicles.length === 0 && (
        <div className="container">
          <div className="card" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertCircle size={20} style={{ color: '#f97316' }} />
                <div>
                  <h3 style={{ margin: 0, color: '#9a3412' }}>Add a vehicle to start booking parking slots</h3>
                  <p style={{ margin: '6px 0 0', color: '#9a3412' }}>You haven’t registered any vehicles yet. Add one below to enable bookings.</p>
                </div>
              </div>
              <button onClick={() => setShowAddVehicle(!showAddVehicle)} className="btn btn-primary btn-sm">
                {showAddVehicle ? 'Close' : 'Add Vehicle'}
              </button>
            </div>

            {showAddVehicle && (
              <form onSubmit={handleAddVehicle} style={{ marginTop: 16 }}>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Make</label>
                    <input className="form-input" value={vehicleForm.make} onChange={(e)=>setVehicleForm({...vehicleForm, make:e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Model</label>
                    <input className="form-input" value={vehicleForm.model} onChange={(e)=>setVehicleForm({...vehicleForm, model:e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <input type="number" min="1990" max="2030" className="form-input" value={vehicleForm.year} onChange={(e)=>setVehicleForm({...vehicleForm, year:e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Color</label>
                    <input className="form-input" value={vehicleForm.color} onChange={(e)=>setVehicleForm({...vehicleForm, color:e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">License Plate</label>
                    <input className="form-input" value={vehicleForm.licensePlate} onChange={(e)=>setVehicleForm({...vehicleForm, licensePlate:e.target.value.toUpperCase()})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Type</label>
                    <select className="form-input" value={vehicleForm.vehicleType} onChange={(e)=>setVehicleForm({...vehicleForm, vehicleType:e.target.value})} required>
                      <option value="car">Car</option>
                      <option value="motorcycle">Motorcycle</option>
                      <option value="truck">Truck</option>
                      <option value="suv">SUV</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" className="btn btn-success">Save Vehicle</button>
                  <button type="button" className="btn btn-secondary" onClick={()=>setShowAddVehicle(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalBookings}</div>
          <div className="stat-label">Total Bookings</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats.activeBookings}</div>
          <div className="stat-label">Active Bookings</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats.totalVehicles}</div>
          <div className="stat-label">Registered Vehicles</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats.availableSlots}</div>
          <div className="stat-label">Available Slots</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="container">
        <h2 style={{ marginBottom: '20px', fontSize: '1.4rem' }}>Quick Actions</h2>
        <div className="grid grid-3">
          <Link to="/parking" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <Car size={24} style={{ color: '#2563eb' }} />
              <h3 style={{ margin: 0 }}>Book Parking</h3>
            </div>
            <p style={{ color: '#666', margin: 0 }}>
              Reserve a parking slot for your next visit
            </p>
          </Link>

          <Link to="/bookings" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <Calendar size={24} style={{ color: '#10b981' }} />
              <h3 style={{ margin: 0 }}>My Bookings</h3>
            </div>
            <p style={{ color: '#666', margin: 0 }}>
              View and manage your parking reservations
            </p>
          </Link>

          <Link to="/profile" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <User size={24} style={{ color: '#f59e0b' }} />
              <h3 style={{ margin: 0 }}>Profile</h3>
            </div>
            <p style={{ color: '#666', margin: 0 }}>
              Update your profile and vehicle information
            </p>
          </Link>
        </div>
      </div>

      {/* Admin Quick Actions */}
  {user?.role === 'superadmin' && (
        <div className="container">
          <h2 style={{ marginBottom: '20px', fontSize: '1.4rem' }}>Admin Actions</h2>
          <div className="grid grid-3">
            <Link to="/admin" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <TrendingUp size={24} style={{ color: '#8b5cf6' }} />
                <h3 style={{ margin: 0 }}>Dashboard</h3>
              </div>
              <p style={{ color: '#666', margin: 0 }}>
                View system statistics and analytics
              </p>
            </Link>

            <Link to="/admin/users" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <User size={24} style={{ color: '#ef4444' }} />
                <h3 style={{ margin: 0 }}>Manage Users</h3>
              </div>
              <p style={{ color: '#666', margin: 0 }}>
                View and manage all system users
              </p>
            </Link>

            <Link to="/admin/reports" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <TrendingUp size={24} style={{ color: '#06b6d4' }} />
                <h3 style={{ margin: 0 }}>Reports</h3>
              </div>
              <p style={{ color: '#666', margin: 0 }}>
                Generate booking and revenue reports
              </p>
            </Link>
          </div>
        </div>
      )}

      {/* Recent Bookings */}
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Recent Bookings</h2>
          <Link to="/bookings" className="btn btn-outline btn-sm">
            View All
          </Link>
        </div>

        {recentBookings.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Location</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>
                      <strong>{booking.parkingSlot?.slotNumber || 'N/A'}</strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} style={{ color: '#666' }} />
                        {booking.location || booking.parkingSlot?.section || 'Unknown'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>
                        <div>{formatDate(booking.startTime)}</div>
                        <div style={{ color: '#666' }}>
                          to {formatDate(booking.endTime)}
                        </div>
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(booking.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Calendar className="empty-state-icon" />
            <h3>No bookings yet</h3>
            <p>Start by booking your first parking slot!</p>
            <Link to="/parking" className="btn btn-primary">
              Book Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
