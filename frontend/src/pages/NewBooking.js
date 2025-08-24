import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { parkingService, SECTIONS } from '../services/parkingService';
import { bookingService } from '../services/bookingService';
import { toast } from 'react-toastify';
import { Play, Plus } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function NewBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuth();
  const params = new URLSearchParams(location.search);
  const preselectedSlot = params.get('slot') || '';

  const [slots, setSlots] = useState([]);
  const [slotId, setSlotId] = useState(preselectedSlot);
  const [section, setSection] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    make: '', model: '', year: '', color: '', licensePlate: '', vehicleType: 'car'
  });
  const sectionNames = useMemo(() => SECTIONS.map(s => s.name), []);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.info('Please login to make a booking');
      navigate('/login');
      return;
    }
    load();
  }, []);

  const load = async () => {
    await parkingService.ensureInitialized();
    const items = await parkingService.listSlots({ onlyAvailable: true });
    setSlots(items);
    // ensure vehicles in context reflect Firestore latest
    try {
      const uid = user.id || user.uid;
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const currentVehicles = snap.data().vehicles || snap.data().vehicleInfo || [];
        updateUser({ vehicles: currentVehicles });
        if (!vehicleNumber && currentVehicles.length > 0) {
          setVehicleNumber(currentVehicles[0].licensePlate || currentVehicles[0].plate || '');
        }
      }
    } catch {}
    // Pre-fill vehicle from profile vehicles if present
  const vehicles = (user?.vehicles || user?.vehicleInfo || []);
    if (!vehicleNumber && vehicles.length > 0) {
      setVehicleNumber(vehicles[0].licensePlate || vehicles[0].plate || '');
    }
    if (preselectedSlot) {
      const found = items.find(s => s._id === preselectedSlot);
      if (found) {
        // Slot is available; auto-select its section and keep slot
        setSection(found.section);
        setSlotId(preselectedSlot);
      } else {
        // Slot not in available list (may be occupied). Still set the section for convenience.
        try {
          const s = await parkingService.getSlotById(preselectedSlot);
          if (s?.section) setSection(s.section);
        } catch (e) {
          // ignore
        }
        setSlotId('');
      }
    }
  };

  const availableInSection = useMemo(() => {
    return slots.filter(s => !section || s.section === section);
  }, [slots, section]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (!slotId) throw new Error('Please select a slot');
      if (!startTime || !endTime) throw new Error('Please select start and end time');
      const created = await bookingService.createBooking({
        userId: user.id || user.uid || user.userId,
        slotId,
        startTime,
        endTime,
        vehicleNumber,
      });
      toast.success('Booking created');
      navigate('/bookings');
    } catch (err) {
      toast.error(err.message || 'Failed to create booking');
    }
  };

  const addVehicleInline = async () => {
    try {
      const v = newVehicle;
      if (!v.licensePlate) throw new Error('License Plate is required');
  // Merge with latest vehicles from Firestore and persist
  const uid = user.id || user.uid;
  const snap = await getDoc(doc(db, 'users', uid));
  const existing = snap.exists() ? (snap.data().vehicles || snap.data().vehicleInfo || []) : [];
  const updatedVehicles = [ ...existing, {
          _id: Math.random().toString(36).slice(2),
          make: v.make, model: v.model, year: v.year, color: v.color, licensePlate: v.licensePlate.toUpperCase(), vehicleType: v.vehicleType
        }];
  const { authService } = await import('../services/authService');
      await authService.updateUserProfile(user.id || user.uid, { vehicles: updatedVehicles });
      // update local user context so selectors refresh
      updateUser({ vehicles: updatedVehicles });
      setVehicleNumber(v.licensePlate.toUpperCase());
      setShowAddVehicle(false);
      toast.success('Vehicle added');
    } catch (err) {
      toast.error(err.message || 'Failed to add vehicle');
    }
  };

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1 className="page-title">New Booking</h1>
        <p className="page-subtitle">Select a slot and time window (2-8 hours)</p>
      </div>

      <form onSubmit={handleCreate} className="card" style={{ padding: 16 }}>
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">Section</label>
            <select className="form-input" value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="">Any</option>
              {sectionNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Slot</label>
            <select className="form-input" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
              <option value="">Select a slot</option>
              {availableInSection.map((s) => (
                <option key={s._id} value={s._id}>{s.slotNumber} - {s.section}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Start</label>
            <input type="datetime-local" className="form-input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">End</label>
            <input type="datetime-local" className="form-input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>

          <div className="form-group">
      <label className="form-label">Select Vehicle</label>
            {(user?.vehicles?.length || user?.vehicleInfo?.length) ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="form-input" value={vehicleNumber} onChange={(e)=>setVehicleNumber(e.target.value)}>
                  <option value="">Select vehicle</option>
                  {(user?.vehicles || user?.vehicleInfo || []).map(v => (
                    <option key={v._id || v.licensePlate} value={v.licensePlate || v.plate}>{(v.licensePlate || v.plate)} - {v.make} {v.model}</option>
                  ))}
                </select>
                <button type="button" className="btn btn-outline" title="Add new vehicle" onClick={()=>setShowAddVehicle(true)}>
                  <Plus size={16} /> Add
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
        <input type="text" className="form-input" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="Enter license plate (e.g., ABC-1234)" />
                <button type="button" className="btn btn-outline" title="Add new vehicle" onClick={()=>setShowAddVehicle(true)}>
                  <Plus size={16} /> Add
                </button>
              </div>
            )}
            {showAddVehicle && (
              <div className="card" style={{ marginTop: 8, padding: 12 }}>
                <div className="grid grid-3">
                  <input className="form-input" placeholder="Make" value={newVehicle.make} onChange={(e)=>setNewVehicle({...newVehicle, make: e.target.value})} />
                  <input className="form-input" placeholder="Model" value={newVehicle.model} onChange={(e)=>setNewVehicle({...newVehicle, model: e.target.value})} />
                  <input className="form-input" placeholder="Year" value={newVehicle.year} onChange={(e)=>setNewVehicle({...newVehicle, year: e.target.value})} />
                  <input className="form-input" placeholder="Color" value={newVehicle.color} onChange={(e)=>setNewVehicle({...newVehicle, color: e.target.value})} />
                  <input className="form-input" placeholder="License Plate" value={newVehicle.licensePlate} onChange={(e)=>setNewVehicle({...newVehicle, licensePlate: e.target.value})} />
                  <select className="form-input" value={newVehicle.vehicleType} onChange={(e)=>setNewVehicle({...newVehicle, vehicleType: e.target.value})}>
                    <option value="car">Car</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="truck">Truck</option>
                    <option value="suv">SUV</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="button" className="btn btn-success" onClick={addVehicleInline}><Play size={16} /> Save Vehicle</button>
                  <button type="button" className="btn btn-secondary" onClick={()=>setShowAddVehicle(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary">Create Booking</button>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/bookings')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
