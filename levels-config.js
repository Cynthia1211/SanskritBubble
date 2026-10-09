import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Word bank database. Keep this app separate from the app used for auth and scores.
const firebaseConfig = {
  apiKey: "AIzaSyALvfiCQdOjOOGAPc1T1nv6_eILsyfUDnw",
  authDomain: "sanskritbubble.firebaseapp.com",
  projectId: "sanskritbubble",
  storageBucket: "sanskritbubble.firebasestorage.app",
  messagingSenderId: "442540356958",
  appId: "1:442540356958:web:a27a11ee1397adedec8bcf",
  measurementId: "G-26KK87XTSZ"
};

const levelsApp = initializeApp(firebaseConfig, 'levels');
const levelsDb = getFirestore(levelsApp);

export { levelsDb };
