import { collection, addDoc, serverTimestamp, doc, runTransaction } from 'firebase/firestore';
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
      let guestCreations = [];
      try {
        guestCreations = JSON.parse(guestCreationsStr);
        if (!Array.isArray(guestCreations)) {
          guestCreations = [];
        }
      } catch (e) {
        guestCreations = [];
      }

      const newCreation = {
        id: `guest_creation_${Date.now()}`,
        userId: 'guest',
        type,
        dataUrl,
        prompt: prompt || null,
        createdAt: new Date().toISOString()
      };

      // Add to beginning of local queue
      guestCreations.unshift(newCreation);

      // Keep at most 3 creations to avoid exceeding 5MB localStorage limit with high-res base64 images
      if (guestCreations.length > 3) {
        guestCreations = guestCreations.slice(0, 3);
      }

      let saveSuccess = false;
      while (guestCreations.length > 0) {
        try {
          localStorage.setItem('guest_creations', JSON.stringify(guestCreations));
          saveSuccess = true;
          break;
        } catch (setItemErr) {
          console.warn("Storage quota exceeded, removing oldest guest creation and retrying...", setItemErr);
          if (guestCreations.length > 1) {
            // Remove the oldest element
            guestCreations.pop();
          } else {
            // Try saving with metadata only to store something without the huge base64 dataUrl
            console.error("Single creation exceeds localStorage quota. Storing metadata only.", setItemErr);
            const fallbackCreation = { ...newCreation, dataUrl: "" };
            try {
              localStorage.setItem('guest_creations', JSON.stringify([fallbackCreation]));
              saveSuccess = true;
            } catch (fallbackErr) {
              console.error("Failed to even save metadata:", fallbackErr);
            }
            break;
          }
        }
      }

      // Dispatch custom event so React components can react instantly in current session memory
      window.dispatchEvent(new CustomEvent('guest_creation_saved', { detail: newCreation }));
      
      return { id: newCreation.id };
    } catch (err) {
      console.error("Local storage save failed completely, falling back to session-only state:", err);
      const tempId = `guest_creation_${Date.now()}`;
      const fallbackCreation = {
        id: tempId,
        userId: 'guest',
        type,
        dataUrl,
        prompt: prompt || null,
        createdAt: new Date().toISOString()
      };
      try {
        window.dispatchEvent(new CustomEvent('guest_creation_saved', { detail: fallbackCreation }));
      } catch (evErr) {
        console.error("Failed to dispatch custom event:", evErr);
      }
      return { id: tempId };
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

export async function toggleLike(creationId: string): Promise<boolean> {
  if (!auth.currentUser) {
    console.warn("User must be signed in to rate/favorite items.");
    return false;
  }
  const userId = auth.currentUser.uid;
  const likeDocId = `${userId}_${creationId}`;
  
  const creationRef = doc(db, 'creations', creationId);
  const likeRef = doc(db, 'likes', likeDocId);
  
  try {
    const wasLiked = await runTransaction(db, async (transaction) => {
      const creationDoc = await transaction.get(creationRef);
      if (!creationDoc.exists()) {
        throw new Error("Creation does not exist!");
      }
      
      const likeDoc = await transaction.get(likeRef);
      const currentStars = creationDoc.data().stars || 0;
      
      if (likeDoc.exists()) {
        // User has already liked it, so UNLIKE it
        transaction.delete(likeRef);
        transaction.update(creationRef, { 
          stars: Math.max(0, currentStars - 1) 
        });
        return false;
      } else {
        // User has not liked it yet, so LIKE it
        transaction.set(likeRef, {
          userId,
          creationId,
          createdAt: serverTimestamp()
        });
        transaction.update(creationRef, { 
          stars: currentStars + 1 
        });
        return true;
      }
    });
    return wasLiked;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `creations/${creationId}`);
    return false;
  }
}


