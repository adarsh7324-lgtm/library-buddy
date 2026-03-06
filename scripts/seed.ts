import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { addMonths, format, subDays, addDays } from "date-fns";

const firebaseConfig = {
    apiKey: "AIzaSyCq72b6eTwU7-qjXzusiZlOlgIQeZmEpnU",
    authDomain: "library-buddy-cb62d.firebaseapp.com",
    projectId: "library-buddy-cb62d",
    storageBucket: "library-buddy-cb62d.firebasestorage.app",
    messagingSenderId: "888938627718",
    appId: "1:888938627718:web:4e6b009450029b57760707"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TARGET_LIBRARIES = ['librarypro', 'demolibrary'];

const NAMES = [
    "Aarav Sharma", "Vivaan Gupta", "Aditya Singh", "Vihaan Patel", "Arjun Kumar",
    "Sai Ram", "Ayaan Joshi", "Krishna Iyer", "Ishaan Desai", "Shaurya Reddy",
    "Diya Mehta", "Aadhya Menon", "Ananya Verma", "Saanvi Nair", "Myra Saxena",
    "Pari Bhatia", "Aarohi Roy", "Anika Das", "Navya Pillai", "Vidhi Chauhan",
    "Pranav Ahuja", "Kabir Rathi", "Siddharth Nambiar", "Dhruv Sengupta", "Manav Tiwari",
    "Kiara Choudhury", "Ira Ghosh", "Sara Pandey", "Kavya Soni", "Avni Rao"
];

const TIME_SLOTS = [
    { start: '08:00', end: '12:00' },
    { start: '12:00', end: '16:00' },
    { start: '16:00', end: '20:00' },
    { start: '09:00', end: '18:00' }, // full day
    { start: '18:00', end: '23:00' },
    { start: '06:00', end: '14:00' },
];

async function seed() {
    console.log("Starting DB seed...");
    // 30 members
    const members = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
        // distribute across statuses: 20 active, 5 expiring soon, 5 expired
        let startDate;
        let months = [1, 3, 6][Math.floor(Math.random() * 3)];

        let status;
        if (i < 20) {
            status = 'Active';
            startDate = subDays(today, Math.floor(Math.random() * 10) + 1); // 1 to 10 days ago
        } else if (i < 25) {
            status = 'Expiring Soon';
            // expires in 1 to 7 days.
            // if duration is 1 month, startDate should be ~25 days ago
            months = 1;
            startDate = subDays(today, 30 - Math.floor(Math.random() * 6) - 1);
        } else {
            status = 'Expired';
            months = 1;
            startDate = subDays(today, 40 + Math.floor(Math.random() * 10)); // ~40-50 days ago
        }

        const expiryDate = addMonths(startDate, months);
        const timeSlot = TIME_SLOTS[i % TIME_SLOTS.length];

        // Seat assignment 1 through 20 (since we assume total seats might be 20, let's overlap to test)
        const seatNumber = `Seat ${(i % 15) + 1}`;

        const member = {
            fullName: NAMES[i],
            phone: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
            countryCode: '+91',
            address: `Block ${String.fromCharCode(65 + (i % 5))}, Street ${i % 10 + 1}, Some City`,
            idProofNumber: `ABC${1000 + i}XY`,
            months,
            feesPaid: months * 500,
            startDate: format(startDate, 'yyyy-MM-dd'),
            expiryDate: format(expiryDate, 'yyyy-MM-dd'),
            status,
            seatNumber: status === 'Expired' ? '' : seatNumber, // clear seat if expired to match logic roughly
            startTime: timeSlot.start,
            endTime: timeSlot.end,
            photoUrl: null
        };
        members.push(member);
    }

    for (const libId of TARGET_LIBRARIES) {
        console.log(`Seeding for library: ${libId}`);
        for (const m of members) {
            const docRef = await addDoc(collection(db, 'members'), {
                ...m,
                libraryId: libId
            });
            console.log(`Added member ${m.fullName} to ${libId} with ID: ${docRef.id}`);
        }
    }

    console.log("Seeding complete!");
    process.exit(0);
}

seed().catch(console.error);
