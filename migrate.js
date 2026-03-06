import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';

// Firebase Config
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

// Supabase Config
const supabaseUrl = 'https://olqwlikslvyvypnrmlcb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9scXdsaWtzbHZ5dnlwbnJtbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTk0MjIsImV4cCI6MjA4ODM5NTQyMn0.FZVqnkB6tkqGJO5MQNQZJ6bAlt73sDSccKTWC87m3mw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    try {
        console.log("Migrating members...");
        const membersSnap = await getDocs(collection(db, 'members'));
        const members = membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (members.length > 0) {
            const { error } = await supabase.from('members').upsert(members);
            if (error) throw error;
        }
        console.log(`Migrated ${members.length} members.`);

        console.log("Migrating payments...");
        const paymentsSnap = await getDocs(collection(db, 'payments'));
        const payments = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (payments.length > 0) {
            const { error } = await supabase.from('payments').upsert(payments);
            if (error) throw error;
        }
        console.log(`Migrated ${payments.length} payments.`);

        console.log("Migrating deleted_payments...");
        const deletedPaymentsSnap = await getDocs(collection(db, 'deleted_payments'));
        const deletedPayments = deletedPaymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (deletedPayments.length > 0) {
            const { error } = await supabase.from('deleted_payments').upsert(deletedPayments);
            if (error) throw error;
        }
        console.log(`Migrated ${deletedPayments.length} deleted_payments.`);

        console.log("Migrating settings...");
        const settingsSnap = await getDocs(collection(db, 'settings'));
        const settings = settingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (settings.length > 0) {
            const { error } = await supabase.from('settings').upsert(settings);
            if (error) throw error;
        }
        console.log(`Migrated ${settings.length} settings.`);

        console.log("Migration complete!");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

migrate();
