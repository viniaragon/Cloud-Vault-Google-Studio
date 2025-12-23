
import { FileMetadata, Device } from '../types';
import { db, storage, auth } from './firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'files';

// Helper to safely convert Firestore timestamps
const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (value && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  return new Date(value);
};

// Helper to remove undefined fields
const cleanObject = (obj: any) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as any);
};

// --- FILE FUNCTIONS ---

export const saveFileToStorage = async (metadata: FileMetadata, file: File): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");

  const filePath = `files/${user.uid}/${Date.now()}_${file.name}`;
  const storageRef = storage.ref(filePath);

  // Upload Compat (storage ainda usa compat)
  const snapshot = await storageRef.put(file);
  const downloadURL = await snapshot.ref.getDownloadURL();

  const { url, id, ...rest } = metadata;

  const fileData = cleanObject({
    ...rest,
    id: metadata.id,
    url: downloadURL,
    storagePath: filePath,
    userId: user.uid,
    createdAt: new Date()
  });

  // Firestore Modular API
  await addDoc(collection(db, COLLECTION_NAME), fileData);

  return downloadURL;
};

export const updateFileInStorage = async (id: string, changes: Partial<FileMetadata>): Promise<void> => {
  const q = query(collection(db, COLLECTION_NAME), where("id", "==", id));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const docRef = querySnapshot.docs[0].ref;
    const { url, ...otherChanges } = changes as any;
    const safeChanges = cleanObject(otherChanges);

    if (Object.keys(safeChanges).length > 0) {
      await updateDoc(docRef, safeChanges);
    }
  }
};

export const getAllFilesFromStorage = async (): Promise<FileMetadata[]> => {
  const user = auth.currentUser;
  if (!user) {
    return [];
  }

  try {
    const q = query(collection(db, COLLECTION_NAME), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(q);

    const files: FileMetadata[] = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const safeDate = toDate(data.uploadDate || data.createdAt);

      return {
        id: data.id,
        name: data.name,
        size: data.size,
        type: data.type,
        mimeType: data.mimeType,
        url: data.url,
        uploadDate: safeDate,
        uploader: data.uploader,
        aiSummary: data.aiSummary,
        isAnalyzing: data.isAnalyzing
      } as FileMetadata;
    });

    files.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
    return files;
  } catch (error) {
    console.error("Erro ao buscar arquivos:", error);
    return [];
  }
};

export const deleteFileFromStorage = async (id: string): Promise<void> => {
  const q = query(collection(db, COLLECTION_NAME), where("id", "==", id));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();

    if (data.storagePath) {
      const storageRef = storage.ref(data.storagePath);
      try {
        await storageRef.delete();
      } catch (e) {
        console.warn("Arquivo não encontrado no storage ou já deletado", e);
      }
    }
    await deleteDoc(docSnap.ref);
  }
};

// --- REAL-TIME SUBSCRIPTION ---
export const subscribeToFiles = (callback: (files: FileMetadata[]) => void) => {
  const user = auth.currentUser;
  if (!user) {
    callback([]);
    return () => { };
  }

  const q = query(collection(db, COLLECTION_NAME), where("userId", "==", user.uid));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const files: FileMetadata[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const safeDate = toDate(data.uploadDate || data.createdAt);

      return {
        id: data.id,
        name: data.name,
        size: data.size,
        type: data.type,
        mimeType: data.mimeType,
        url: data.url,
        uploadDate: safeDate,
        uploader: data.uploader,
        aiSummary: data.aiSummary,
        isAnalyzing: data.isAnalyzing
      } as FileMetadata;
    });

    files.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());

    callback(files);
  }, (error) => {
    console.error("Erro no listener de arquivos:", error);
  });

  return unsubscribe;
};

// --- FUNÇÕES DE IMPRESSÃO (Dispositivos) ---

export const sendPrintJob = async (fileUrl: string, deviceId: string, printerName: string) => {
  await addDoc(collection(db, 'fila_impressao'), {
    pc_alvo_id: deviceId,
    impressora_alvo: printerName,
    url_arquivo: fileUrl,
    status: 'pendente',
    created_at: new Date()
  });
};

export const getOnlineDevices = async (): Promise<Device[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'dispositivos_online'));

    const devices: Device[] = [];
    const now = new Date();

    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();

      let lastSeenDate = new Date(0);
      if (data.ultimo_visto) {
        lastSeenDate = toDate(data.ultimo_visto);
      }

      const diffMs = now.getTime() - lastSeenDate.getTime();
      const diffMinutes = diffMs / 1000 / 60;
      const isOnline = diffMinutes < 2.5;

      devices.push({
        id: docSnap.id,
        name: data.nome || data.name || 'PC Sem Nome',
        status: isOnline ? 'online' : 'offline',
        impressoras: data.impressoras || [],
        ultimo_visto: lastSeenDate
      } as Device);
    });

    devices.sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === 'online' ? -1 : 1;
    });

    return devices;

  } catch (error) {
    console.error("Erro ao buscar dispositivos:", error);
    return [];
  }
};

export const deleteDevice = async (deviceId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'dispositivos_online', deviceId));
    console.log(`Dispositivo ${deviceId} deletado com sucesso.`);
  } catch (error) {
    console.error("Erro ao deletar dispositivo:", error);
    throw error;
  }
};
