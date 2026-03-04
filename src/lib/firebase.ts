import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCq72b6eTwU7-qjXzusiZlOlgIQeZmEpnU",
    authDomain: "library-buddy-cb62d.firebaseapp.com",
    projectId: "library-buddy-cb62d",
    storageBucket: "library-buddy-cb62d.firebasestorage.app",
    messagingSenderId: "888938627718",
    appId: "1:888938627718:web:4e6b009450029b57760707"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
export const storage = getStorage(app);
