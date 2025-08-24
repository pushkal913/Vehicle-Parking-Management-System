import { collection, addDoc, getDocs, getDoc, doc, updateDoc, orderBy, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { parkingService } from './parkingService';

export const bookingService = {
  async createBooking({ userId, slotId, startTime, endTime, vehicleNumber }) {
    // Basic validations
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start) || isNaN(end) || end <= start) {
      throw new Error('Invalid start/end time');
    }
    // Optional policy: 2-8 hours
    const hours = (end - start) / (1000 * 60 * 60);
    if (hours < 2 || hours > 8) {
      throw new Error('Booking must be between 2 and 8 hours');
    }

    // Ensure slot is available
    const slot = await parkingService.getSlotById(slotId);
    if (!slot) throw new Error('Slot not found');
    if (slot.maintenanceStatus !== 'operational') throw new Error('Slot under maintenance');
    if (slot.currentBookingId) throw new Error('Slot already occupied');

    // Create booking
    const bookingData = {
      userId,
      slotId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      vehicleNumber: vehicleNumber || 'N/A',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ref = await addDoc(collection(db, 'bookings'), bookingData);
    await parkingService.setCurrentBooking(slotId, ref.id);
    return { id: ref.id, ...bookingData };
  },

  async cancelBooking(bookingId) {
    const bRef = doc(db, 'bookings', bookingId);
    const snap = await getDoc(bRef);
    if (!snap.exists()) throw new Error('Booking not found');
    const b = snap.data();

    await updateDoc(bRef, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
    await parkingService.clearCurrentBooking(b.slotId, bookingId);
  },

  async completeExpiredBookingsNow() {
    const now = new Date();
    const qRef = query(collection(db, 'bookings'), where('status', '==', 'active'));
    const snap = await getDocs(qRef);
    const ops = [];
    for (const d of snap.docs) {
      const b = d.data();
      if (new Date(b.endTime) <= now) {
        ops.push(updateDoc(doc(db, 'bookings', d.id), { status: 'completed', updatedAt: new Date().toISOString() }));
        ops.push(parkingService.clearCurrentBooking(b.slotId, d.id));
      }
    }
    await Promise.all(ops);
  },

  async getUserBookings(userId) {
    await this.completeExpiredBookingsNow();
    const qRef = query(collection(db, 'bookings'), where('userId', '==', userId));
    const snap = await getDocs(qRef);
    const items = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
    // Sort desc by createdAt
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return items;
  },

  async getBookingById(bookingId) {
    const d = await getDoc(doc(db, 'bookings', bookingId));
    return d.exists() ? { _id: d.id, ...d.data() } : null;
  },
};

export default bookingService;
