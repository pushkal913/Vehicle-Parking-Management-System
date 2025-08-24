import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Car, 
  Clock, 
  Users, 
  Filter,
  Search,
  RefreshCw,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import { parkingService, SECTIONS } from '../services/parkingService';
import { useAuth } from '../contexts/AuthContext';

const ParkingSlots = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [slots, setSlots] = useState([]);
  const [filteredSlots, setFilteredSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    sections: [],
    vehicleType: '',
    availability: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const vehicleTypes = ['car', 'motorcycle', 'truck', 'suv'];

  const sectionNames = useMemo(() => SECTIONS.map(s => s.name), []);

  useEffect(() => {
    initAndFetch();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [slots, filters, searchTerm]);

  const initAndFetch = async () => {
    try {
      setLoading(true);
      await parkingService.ensureInitialized();
      const items = await parkingService.listSlots();
      setSlots(items);
    } catch (error) {
      console.error('Error fetching parking slots:', error);
      toast.error('Failed to load parking slots');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...slots];

    // Filter by availability
    if (filters.availability === 'available') {
      filtered = filtered.filter(slot => !slot.currentBookingId);
    } else if (filters.availability === 'occupied') {
      filtered = filtered.filter(slot => !!slot.currentBookingId);
    }

    // Filter by sections (multi)
    if (filters.sections && filters.sections.length > 0) {
      filtered = filtered.filter(slot => filters.sections.includes(slot.section));
    }

    // Filter by vehicle type
    if (filters.vehicleType) {
      filtered = filtered.filter(slot => slot.vehicleType === filters.vehicleType);
    }

    // Search filter
  if (searchTerm) {
      filtered = filtered.filter(slot => 
    slot.slotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    slot.section.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSlots(filtered);
  };

  const handleBookSlot = async (slotId) => {
    try {
      if (!isAuthenticated) {
        toast.info('Please login to book a slot');
        navigate('/login');
        return;
      }
      navigate(`/bookings/new?slot=${encodeURIComponent(slotId)}`);
    } catch (error) {
      console.error('Error booking slot:', error);
      toast.error('Failed to initiate booking');
    }
  };

  const getSlotStatusBadge = (slot) => {
  if (slot.maintenanceStatus !== 'operational') {
      return <span className="badge badge-warning">Maintenance</span>;
    }
  if (!slot.currentBookingId) return <span className="badge badge-success">Available</span>;
  return <span className="badge badge-danger">Occupied</span>;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading parking slots...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">Parking Slots</h1>
          <p className="page-subtitle">Find and book available parking spaces</p>
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
              placeholder="Search by slot number or location"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Sections</label>
            <select
              className="form-input"
              multiple
              value={filters.sections}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                setFilters({ ...filters, sections: selected });
              }}
            >
              {sectionNames.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
            <small className="form-hint">Hold Ctrl/Cmd to multi-select</small>
            {filters.sections?.length > 0 && (
              <div className="chips" aria-label="Selected sections">
                {filters.sections.map(section => (
                  <span key={section} className="chip">
                    {section}
                    <button
                      type="button"
                      className="chip-close"
                      onClick={() => {
                        const next = filters.sections.filter(s => s !== section);
                        setFilters({ ...filters, sections: next });
                      }}
                      aria-label={`Remove ${section}`}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Vehicle Type</label>
            <select
              className="form-input"
              value={filters.vehicleType}
              onChange={(e) => setFilters({...filters, vehicleType: e.target.value})}
            >
              <option value="">All Types</option>
              {vehicleTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Availability</label>
            <select
              className="form-input"
              value={filters.availability}
              onChange={(e) => setFilters({...filters, availability: e.target.value})}
            >
              <option value="all">All Slots</option>
              <option value="available">Available Only</option>
              <option value="occupied">Occupied Only</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={initAndFetch}
            className="btn btn-outline btn-sm"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          
          <span style={{ color: '#666', fontSize: '14px' }}>
            Showing {filteredSlots.length} of {slots.length} slots
          </span>

          {/* Legend */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto', color: '#6b7280', fontSize: 12 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#ecfdf5', border: '2px solid #10b981', borderRadius: 3 }}></span>
            Available
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#fee2e2', border: '2px solid #ef4444', borderRadius: 3, marginLeft: 10 }}></span>
            Occupied
          </span>
        </div>
      </div>

      {/* Parking Slots Grid (visual lot) */}
      <div className="container">
        {filteredSlots.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(80px, 1fr))', gap: '10px' }}>
            {filteredSlots.map((slot) => {
              const occupied = !!slot.currentBookingId;
              return (
                <button
                  key={slot._id}
                  onClick={() => !occupied && handleBookSlot(slot._id)}
                  className="card"
                  style={{
                    padding: '10px',
                    textAlign: 'center',
                    border: '2px solid',
                    borderColor: occupied ? '#ef4444' : '#10b981',
                    background: occupied ? '#fee2e2' : '#ecfdf5',
                    cursor: occupied ? 'not-allowed' : 'pointer'
                  }}
                  disabled={occupied || slot.maintenanceStatus !== 'operational'}
                  title={`${slot.section} - ${slot.slotNumber}`}
                >
                  <div style={{ fontWeight: 700 }}>{slot.slotNumber}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{slot.section}</div>
                  <div style={{ marginTop: 6 }}>
                    {getSlotStatusBadge(slot)}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Car className="empty-state-icon" />
            <h3>No parking slots found</h3>
            <p>Try adjusting your search criteria or filters</p>
            <button
              onClick={() => {
                setFilters({ sections: [], vehicleType: '', availability: 'all' });
                setSearchTerm('');
              }}
              className="btn btn-outline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{slots.filter(s => !s.currentBookingId).length}</div>
            <div className="stat-label">Available Slots</div>
          </div>
        
        <div className="stat-card">
          <div className="stat-value">{slots.filter(s => !!s.currentBookingId).length}</div>
          <div className="stat-label">Occupied Slots</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{sectionNames.length}</div>
          <div className="stat-label">Locations</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{slots.length}</div>
          <div className="stat-label">Total Slots</div>
        </div>
      </div>
    </div>
  );
};

export default ParkingSlots;
