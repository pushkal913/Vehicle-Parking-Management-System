import { collection, getDocs, doc, setDoc, getDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export const SECTIONS = [
  { code: 'N', name: 'North Lot' },
  { code: 'S', name: 'South Lot' },
  { code: 'E', name: 'East Deck' },
  { code: 'W', name: 'West Deck' },
  { code: 'C', name: 'Central Plaza' },
];

const TOTAL_SLOTS = 80; // 16 per section

export const parkingService = {
  // Initialize 80 slots if none exist
  async ensureInitialized() {
    const colRef = collection(db, 'parkingSlots');
    const snap = await getDocs(colRef);
    if (!snap.empty) return { initialized: false, count: snap.size };

    const perSection = TOTAL_SLOTS / SECTIONS.length; // 16
    const ops = [];
    for (const section of SECTIONS) {
      for (let i = 1; i <= perSection; i++) {
        const slotNumber = `${section.code}-${String(i).padStart(2, '0')}`;
        const id = `${section.code}-${i}`;
        const data = {
          id,
          slotNumber,
          section: section.name,
          index: i,
          vehicleType: 'car',
          maintenanceStatus: 'operational',
          currentBookingId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        ops.push(setDoc(doc(db, 'parkingSlots', id), data));
      }
    }
    await Promise.all(ops);
    return { initialized: true, count: TOTAL_SLOTS };
  },

  async listSlots({ sections = [], onlyAvailable = false } = {}) {
    const colRef = collection(db, 'parkingSlots');
    let qRef = colRef;
    if (sections && sections.length === 1) {
      qRef = query(colRef, where('section', '==', sections[0]));
    }
    // For multiple sections, fetch all and filter client-side (Firestore limitation)
    const snap = await getDocs(qRef);
    let items = snap.docs.map((d) => ({ ...d.data(), _id: d.id }));
    if (sections && sections.length > 1) {
      items = items.filter((s) => sections.includes(s.section));
    }
    if (onlyAvailable) {
      items = items.filter((s) => !s.currentBookingId);
    }
    return items;
  },

  async getSlotById(id) {
    const d = await getDoc(doc(db, 'parkingSlots', id));
    return d.exists() ? { ...d.data(), _id: d.id } : null;
  },

  async setCurrentBooking(slotId, bookingId) {
    await updateDoc(doc(db, 'parkingSlots', slotId), {
      currentBookingId: bookingId,
      updatedAt: new Date(),
    });
  },

  async clearCurrentBooking(slotId, bookingId) {
    const d = await getDoc(doc(db, 'parkingSlots', slotId));
    if (!d.exists()) return;
    const data = d.data();
    if (data.currentBookingId === bookingId) {
      await updateDoc(doc(db, 'parkingSlots', slotId), {
        currentBookingId: null,
        updatedAt: new Date(),
      });
    }
  },
};

export default parkingService;
