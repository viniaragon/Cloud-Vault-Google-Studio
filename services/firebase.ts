
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDyKGEEmDufB7gkuXxdcP4NgKTGxEMsdc4",
  authDomain: "cloud-vault-a176e.firebaseapp.com",
  projectId: "cloud-vault-a176e",
  storageBucket: "cloud-vault-a176e.firebasestorage.app",
  messagingSenderId: "642163320158",
  appId: "1:642163320158:web:429d98d14742cb458b1bcf",
  measurementId: "G-X5MDHR5TS9"
};

// Initialize Firebase
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

export const auth = app.auth();

// Conectar ao database nomeado "cloud-valut-storage" ao invés do default
export const db = getFirestore(app, 'cloud-valut-storage');

export const storage = app.storage();

export default app;
