import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Tu configuración de Firebase (obtenla del panel de Firebase)
const firebaseConfig = {
    apiKey: "AIzaSyA5A4oFjxdJWDZUUvFPJUW6lgwLfxhgJ0Q",
    authDomain: "gojirapp.firebaseapp.com",
    databaseURL: "https://gojirapp-default-rtdb.firebaseio.com",
    projectId: "gojirapp",
    storageBucket: "gojirapp.appspot.com",
    messagingSenderId: "270466661797",
    appId: "1:270466661797:web:9f984e23520e2fb084fc4c"
  };

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Servicios de Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;