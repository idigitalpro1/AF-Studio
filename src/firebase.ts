import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const realAuth = getAuth(app);

// Simulated/Custom auth state
let currentMockUser: any = null;

try {
  const saved = localStorage.getItem('aspen_simulated_user');
  if (saved) {
    currentMockUser = JSON.parse(saved);
  }
} catch (e) {
  console.error("Failed to load saved simulated user:", e);
}

const authListeners = new Set<(user: any) => void>();

export const auth: any = {
  get currentUser() {
    return currentMockUser || realAuth.currentUser;
  },
  signOut: async () => {
    currentMockUser = null;
    localStorage.removeItem('aspen_simulated_user');
    authListeners.forEach(listener => listener(null));
    try {
      await realAuth.signOut();
    } catch (e) {
      // Ignore signOut errors if offline/suspended
    }
  }
};

export function signInSimulated(email: string, displayName: string) {
  currentMockUser = {
    uid: 'patrick_sweeney_id',
    email: email,
    displayName: displayName,
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    emailVerified: true,
    isAnonymous: false,
    tenantId: null,
    providerData: [{ providerId: 'google.com', uid: 'patrick_sweeney_id' }]
  };
  try {
    localStorage.setItem('aspen_simulated_user', JSON.stringify(currentMockUser));
  } catch (e) {
    console.error("Failed to save simulated user:", e);
  }
  authListeners.forEach(listener => listener(currentMockUser));
}

// We need a custom onAuthStateChanged that supports both mock and real auth listeners
export function onAuthStateChanged(authInstance: any, listener: (user: any) => void) {
  authListeners.add(listener);
  
  // Trigger immediately with the current state (either mock or real)
  setTimeout(() => {
    listener(auth.currentUser);
  }, 0);

  // Still observe real auth if state changes
  const unsubReal = realAuth.onAuthStateChanged((user) => {
    if (user && !currentMockUser) {
      listener(user);
    }
  });

  return () => {
    authListeners.delete(listener);
    unsubReal();
  };
}

export { db };

