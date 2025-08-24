import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, updatePassword, updateProfile as fbUpdateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import { User, Mail, Building, CreditCard, Car, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });

  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    department: ''
  });

  const [vehicleForm, setVehicleForm] = useState({
    make: '',
    model: '',
    year: '',
    color: '',
    licensePlate: '',
    vehicleType: 'car'
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const uid = user?.id || user?.uid;
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) throw new Error('User profile not found');
      const userData = { id: uid, ...snap.data() };
      setProfile(userData);
      const veh = userData.vehicles || userData.vehicleInfo || [];
      setVehicles(veh);
      setProfileForm({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        department: userData.department || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const uid = user?.id || user?.uid;
      await updateDoc(doc(db, 'users', uid), { ...profileForm, updatedAt: new Date() });
      // Also update Firebase Auth displayName to keep it in sync
      const fullName = `${profileForm.firstName || ''} ${profileForm.lastName || ''}`.trim();
      if (auth.currentUser) {
        try {
          await fbUpdateProfile(auth.currentUser, { displayName: fullName });
        } catch (err) {
          console.warn('Failed to update auth displayName:', err);
        }
      }
      const updated = { ...profile, ...profileForm, displayName: fullName };
      setProfile(updated);
      updateUser(updated);
      setEditingProfile(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleVehicleAdd = async (e) => {
    e.preventDefault();
    try {
      const uid = user?.id || user?.uid;
      const vehs = [ ...vehicles, { ...vehicleForm, _id: Math.random().toString(36).slice(2), licensePlate: vehicleForm.licensePlate.toUpperCase() } ];
  await updateDoc(doc(db, 'users', uid), { vehicles: vehs, updatedAt: new Date() });
      setVehicles(vehs);
  updateUser({ vehicles: vehs });
      setVehicleForm({ make:'', model:'', year:'', color:'', licensePlate:'', vehicleType:'car' });
      setAddingVehicle(false);
      toast.success('Vehicle added successfully');
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast.error('Failed to add vehicle');
    }
  };

  const handleVehicleDelete = async (vehicleId) => {
    if (!window.confirm('Are you sure you want to remove this vehicle?')) {
      return;
    }

    try {
      const uid = user?.id || user?.uid;
      const next = vehicles.filter(v => (v._id || v.licensePlate) !== vehicleId);
      await updateDoc(doc(db, 'users', uid), { vehicles: next, updatedAt: new Date() });
      setVehicles(next);
  // Keep AuthContext in sync so selectors update immediately
  updateUser({ vehicles: next });
      toast.success('Vehicle removed successfully');
    } catch (error) {
      console.error('Error removing vehicle:', error);
      toast.error('Failed to remove vehicle');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading profile...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account information and vehicles</p>
      </div>

      {/* Profile Information */}
      <div className="container">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <h2 className="card-title">Profile Information</h2>
            <button
              onClick={() => setEditingProfile(!editingProfile)}
              className="btn btn-outline btn-sm"
            >
              <Edit size={16} />
              {editingProfile ? 'Cancel' : 'Edit'}
            </button>
            <button
              onClick={async () => {
                try {
                  await sendPasswordResetEmail(auth, user?.email || profile?.email);
                  toast.success('Password reset email sent');
                } catch (e) {
                  toast.error(e.message || 'Failed to send reset email');
                }
              }}
              className="btn btn-warning btn-sm"
              title="Send password reset email"
            >
              Reset Password
            </button>
            <button
              onClick={() => setShowChangePassword(!showChangePassword)}
              className="btn btn-secondary btn-sm"
              title="Change password without email"
            >
              {showChangePassword ? 'Close' : 'Change Password'}
            </button>
          </div>
        </div>

        {showChangePassword && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const { current, next, confirm } = pwdForm;
                if (!current || !next || !confirm) throw new Error('All fields are required');
                if (next !== confirm) throw new Error('New passwords do not match');
                if (next.length < 8) throw new Error('New password must be at least 8 characters');
                const hasMix = /[A-Z]/.test(next) && /[a-z]/.test(next) && /[0-9]/.test(next) && /[^A-Za-z0-9]/.test(next);
                if (!hasMix) throw new Error('Use upper, lower, number, and symbol');

                const email = user?.email || profile?.email;
                const credential = EmailAuthProvider.credential(email, current);
                await reauthenticateWithCredential(auth.currentUser, credential);
                await updatePassword(auth.currentUser, next);
                toast.success('Password updated');
                setPwdForm({ current: '', next: '', confirm: '' });
                setShowChangePassword(false);
              } catch (err) {
                toast.error(err.message || 'Failed to update password');
              }
            }}
            style={{ margin: '0 20px 20px', padding: '16px', background: '#f9fafb', borderRadius: '6px' }}
         >
            <h3 style={{ marginBottom: 10, fontSize: 16 }}>Change Password</h3>
            <div className="grid grid-3">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type="password" className="form-input" value={pwdForm.current} onChange={(e)=>setPwdForm({...pwdForm, current: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" className="form-input" value={pwdForm.next} onChange={(e)=>setPwdForm({...pwdForm, next: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" className="form-input" value={pwdForm.confirm} onChange={(e)=>setPwdForm({...pwdForm, confirm: e.target.value})} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Update Password</button>
          </form>
        )}

        {editingProfile ? (
          <form onSubmit={handleProfileUpdate}>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">
                  <User size={16} style={{ display: 'inline', marginRight: '6px' }} />
                  First Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({...profileForm, firstName: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <User size={16} style={{ display: 'inline', marginRight: '6px' }} />
                  Last Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({...profileForm, lastName: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Building size={16} style={{ display: 'inline', marginRight: '6px' }} />
                Department
              </label>
              <input
                type="text"
                className="form-input"
                value={profileForm.department}
                onChange={(e) => setProfileForm({...profileForm, department: e.target.value})}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Update Profile
            </button>
          </form>
        ) : (
          <div className="grid grid-2">
            <div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', color: '#666', fontSize: '12px' }}>FULL NAME</label>
                <p style={{ margin: '4px 0', fontSize: '16px' }}>
                  {profile?.firstName} {profile?.lastName}
                </p>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', color: '#666', fontSize: '12px' }}>EMAIL</label>
                <p style={{ margin: '4px 0', fontSize: '16px' }}>{profile?.email}</p>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', color: '#666', fontSize: '12px' }}>ROLE</label>
                <p style={{ margin: '4px 0', fontSize: '16px' }}>
                  {profile?.role === 'superadmin' ? 'Administrator' : profile?.isFaculty ? 'Faculty' : 'Student'}
                </p>
              </div>
            </div>

            <div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', color: '#666', fontSize: '12px' }}>DEPARTMENT</label>
                <p style={{ margin: '4px 0', fontSize: '16px' }}>{profile?.department}</p>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', color: '#666', fontSize: '12px' }}>
                  {profile?.isFaculty ? 'EMPLOYEE ID' : 'STUDENT ID'}
                </label>
                <p style={{ margin: '4px 0', fontSize: '16px' }}>
                  {profile?.isFaculty ? profile?.employeeId : profile?.studentId}
                </p>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', color: '#666', fontSize: '12px' }}>MEMBER SINCE</label>
                <p style={{ margin: '4px 0', fontSize: '16px' }}>
                  {new Date(profile?.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vehicles Section */}
      <div className="container">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">My Vehicles ({vehicles.length}/3)</h2>
            {vehicles.length < 3 && (
              <button
                onClick={() => setAddingVehicle(!addingVehicle)}
                className="btn btn-primary btn-sm"
              >
                <Plus size={16} />
                Add Vehicle
              </button>
            )}
          </div>
        </div>

        {addingVehicle && (
          <form onSubmit={handleVehicleAdd} style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <h3 style={{ marginBottom: '15px' }}>Add New Vehicle</h3>
            
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Make</label>
                <input
                  type="text"
                  className="form-input"
                  value={vehicleForm.make}
                  onChange={(e) => setVehicleForm({...vehicleForm, make: e.target.value})}
                  placeholder="e.g., Toyota"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Model</label>
                <input
                  type="text"
                  className="form-input"
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm({...vehicleForm, model: e.target.value})}
                  placeholder="e.g., Camry"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Year</label>
                <input
                  type="number"
                  className="form-input"
                  value={vehicleForm.year}
                  onChange={(e) => setVehicleForm({...vehicleForm, year: e.target.value})}
                  placeholder="e.g., 2020"
                  min="1990"
                  max="2030"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Color</label>
                <input
                  type="text"
                  className="form-input"
                  value={vehicleForm.color}
                  onChange={(e) => setVehicleForm({...vehicleForm, color: e.target.value})}
                  placeholder="e.g., Blue"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">License Plate</label>
                <input
                  type="text"
                  className="form-input"
                  value={vehicleForm.licensePlate}
                  onChange={(e) => setVehicleForm({...vehicleForm, licensePlate: e.target.value.toUpperCase()})}
                  placeholder="e.g., ABC1234"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vehicle Type</label>
                <select
                  className="form-input"
                  value={vehicleForm.vehicleType}
                  onChange={(e) => setVehicleForm({...vehicleForm, vehicleType: e.target.value})}
                  required
                >
                  <option value="car">Car</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="truck">Truck</option>
                  <option value="suv">SUV</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-success">
                Add Vehicle
              </button>
              <button
                type="button"
                onClick={() => setAddingVehicle(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {vehicles.length > 0 ? (
          <div className="grid grid-2">
            {vehicles.map((vehicle) => {
              const vid = vehicle._id || vehicle.licensePlate;
              return (
              <div key={vid} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <Car size={20} style={{ color: '#2563eb' }} />
                      <h3 style={{ margin: 0 }}>{vehicle.year} {vehicle.make} {vehicle.model}</h3>
                    </div>
                    
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      <p style={{ margin: '4px 0' }}>
                        <strong>License:</strong> {vehicle.licensePlate}
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <strong>Color:</strong> {vehicle.color}
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <strong>Type:</strong> {vehicle.vehicleType}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleVehicleDelete(vid)}
                    className="btn btn-danger btn-sm"
                    title="Remove vehicle"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Car className="empty-state-icon" />
            <h3>No vehicles registered</h3>
            <p>Add your vehicle information to start booking parking slots</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
