import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';

// Firebase Config
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Supabase Config
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
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
