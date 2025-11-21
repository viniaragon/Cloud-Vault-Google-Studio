import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDyKGEEmDufB7gkuXxdcP4NgKTGxEMsdc4",
  authDomain: "cloud-vault-a176e.firebaseapp.com",
  projectId: "cloud-vault-a176e",
  storageBucket: "cloud-vault-a176e.firebasestorage.app",
  messagingSenderId: "642163320158",
  appId: "1:642163320158:web:9e91fa72dab9ad808b1bcf",
  measurementId: "G-5JQJ1B0V2X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app, "cloud-valut-storage"); 
export const storage = getStorage(app);