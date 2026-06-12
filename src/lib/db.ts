import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function saveCreation(type: 'image' | 'video' | 'magazine', dataUrl: string, prompt?: string) {
  if (!auth.currentUser) {
    try {
      const guestCreationsStr = localStorage.getItem('guest_creations') || '[]';
      const guestCreations = JSON.parse(guestCreationsStr);
      const newCreation = {
        id: `guest_creation_${Date.now()}`,
        userId: 'guest',
        type,
        dataUrl,
        prompt: prompt || null,
        createdAt: new Date().toISOString()
      };
      guestCreations.unshift(newCreation);
      localStorage.setItem('guest_creations', JSON.stringify(guestCreations));
      
      // Dispatch custom event so React components can react instantly
      window.dispatchEvent(new CustomEvent('guest_creation_saved', { detail: newCreation }));
      
      return { id: newCreation.id };
    } catch (err) {
      console.error("Local storage save failed:", err);
      throw new Error("Failed to save creation locally.");
    }
  }
  
  const pathForWrite = 'creations';
  try {
    const docRef = await addDoc(collection(db, pathForWrite), {
      userId: auth.currentUser.uid,
      type,
      dataUrl,
      prompt: prompt || null,
      createdAt: serverTimestamp()
    });
    return docRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForWrite);
  }
}

