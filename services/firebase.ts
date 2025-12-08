
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

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
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

export const auth = app.auth();
export const db = app.firestore();
export const storage = app.storage();

export default app;
