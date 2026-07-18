import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getDatabase, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDD7I03wQtn9JZEgN9GLO7-KIvOfR8xt8Y",
    authDomain: "hn-app-cb931.firebaseapp.com",
    projectId: "hn-app-cb931",
    storageBucket: "hn-app-cb931.firebasestorage.app",
    messagingSenderId: "813740870093",
    appId: "1:813740870093:web:688831769c0a3843cfdc84",
    databaseURL: "https://hn-app-cb931-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export { serverTimestamp };
export default app;