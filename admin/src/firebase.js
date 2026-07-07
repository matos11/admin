// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDBs1S33VsltUlV1aznVyMYURxzH2IZFGk",
  authDomain: "ydm-bingo-realtime.firebaseapp.com",
  databaseURL: "https://ydm-bingo-realtime-default-rtdb.firebaseio.com",
  projectId: "ydm-bingo-realtime",
  storageBucket: "ydm-bingo-realtime.firebasestorage.app",
  messagingSenderId: "829250571964",
  appId: "1:829250571964:web:10a44173f9203202540ab9"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);