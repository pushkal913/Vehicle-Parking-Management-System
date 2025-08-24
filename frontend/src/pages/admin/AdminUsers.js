import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  Users, 
  Search,
  Filter,
  Edit,
  Trash2,
  Plus,
  Shield,
  GraduationCap,
  Briefcase,
  MoreVertical,
  Eye
} from 'lucide-react';
import { toast } from 'react-toastify';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'active'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list = [];
      snap.forEach((d) => {
        const u = { _id: d.id, ...d.data() };
        list.push(u);
      });
      setUsers(list);
      setLoading(false);
    }, (err) => {
      console.error('Error loading users:', err);
      toast.error('Failed to load users');
      setLoading(false);
    });
    return () => {
      try { unsub && unsub(); } catch {}
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, filters, searchTerm]);

  // no REST fetch; using Firestore realtime above

  const applyFilters = () => {
    let filtered = [...users];

    // Filter by role
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Filter by status
    if (filters.status !== 'all') {
      const isActive = filters.status === 'active';
      filtered = filtered.filter(user => (user.isActive ?? true) === isActive);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  // Actions (role/status/delete) via REST removed; if needed, can be reintroduced via Firestore rules/functions

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Shield size={16} style={{ color: '#ef4444' }} />;
      case 'faculty':
        return <Briefcase size={16} style={{ color: '#3b82f6' }} />;
      case 'student':
        return <GraduationCap size={16} style={{ color: '#10b981' }} />;
      default:
        return <Users size={16} style={{ color: '#6b7280' }} />;
    }
  };

  const getStatusBadge = (isActive) => {
    return (
      <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const d = typeof dateString?.toDate === 'function' ? dateString.toDate() : new Date(dateString);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const vehicleCount = (u) => {
    const list = u.vehicles || u.vehicleInfo || [];
    return Array.isArray(list) ? list.length : 0;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading users...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">Manage system users and their permissions</p>
          </div>
          
          {/* Add User removed for now */}
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
              placeholder="Search by name, email, or ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-input"
              value={filters.role}
              onChange={(e) => setFilters({...filters, role: e.target.value})}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="faculty">Faculty</option>
              <option value="student">Student</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-input"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '15px' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>
            Showing {filteredUsers.length} of {users.length} users
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="container">
        <div className="card">
          {filteredUsers.length > 0 ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>ID</th>
                    <th>Email</th>
                    <th>Vehicles</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '500' }}>
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {getRoleIcon(user.role)}
                          <span style={{ textTransform: 'capitalize' }}>{user.role}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {user.employeeId || user.studentId || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#666' }}>{user.email}</span>
                      </td>
                      <td>
                        <span className="badge badge-info">{vehicleCount(user)}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {formatDate(user.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Users className="empty-state-icon" />
              <h3>No users found</h3>
              <p>No users match your current search criteria</p>
              <button onClick={() => { setFilters({ role: 'all', status: 'active' }); setSearchTerm(''); }} className="btn btn-outline">Clear Filters</button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.role === 'admin').length}</div>
          <div className="stat-label">Administrators</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.role === 'faculty').length}</div>
          <div className="stat-label">Faculty Members</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.role === 'student').length}</div>
          <div className="stat-label">Students</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => (u.isActive ?? true)).length}</div>
          <div className="stat-label">Active Users</div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
