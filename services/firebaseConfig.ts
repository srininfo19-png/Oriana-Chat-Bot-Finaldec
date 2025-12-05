// INSTRUCTIONS FOR SYNC:
// 1. Create a project at https://console.firebase.google.com/
// 2. Add a Web App to get these config values.
// 3. Create a Firestore Database in "Test Mode".
// 4. Paste your config below.

export const firebaseConfig = {
  // REPLACE THE EMPTY STRINGS WITH YOUR KEYS TO ENABLE SYNC
 const firebaseConfig = {
  apiKey: "AIzaSyBve0majosLh9BoDzexIzARid_xoz7aPak",
  authDomain: "orianachatbot.firebaseapp.com",
  projectId: "orianachatbot",
  storageBucket: "orianachatbot.firebasestorage.app",
  messagingSenderId: "245608008938",
  appId: "1:245608008938:web:d023d5c094ebb6119d9b93",
  measurementId: "G-00W47VLPXB"
};

export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey !== "" && firebaseConfig.projectId !== "";
};