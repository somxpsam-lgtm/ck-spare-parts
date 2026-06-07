import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAIKzFoWfhKTSAq2rZEJsY30WfrDNlYF8w",
  authDomain: "ck-group-2bac8.firebaseapp.com",
  databaseURL: "https://ck-group-2bac8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ck-group-2bac8",
  storageBucket: "ck-group-2bac8.firebasestorage.app",
  messagingSenderId: "797644637062",
  appId: "1:797644637062:web:2393bdcc678316cb9fe207",
  measurementId: "G-BEJ062MMZH"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
