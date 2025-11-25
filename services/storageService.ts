import { FileMetadata, Device } from '../types';
import { db, storage, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where,
  doc,
  onSnapshot
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';

const COLLECTION_NAME = 'files';

// Helper para converter datas do Firestore com segurança
const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  return new Date(value);
};

// Helper para remover campos undefined
const cleanObject = (obj: any) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as any);
};

// --- FUNÇÕES DE ARQUIVOS ---

export const saveFileToStorage = async (metadata: FileMetadata, file: File): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");

  const filePath = `files/${user.uid}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, filePath);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);

  const { url, id, ...rest } = metadata;
  
  const fileData = cleanObject({
    ...rest,
    id: metadata.id,
    url: downloadURL,
    storagePath: filePath,
    userId: user.uid,
    createdAt: new Date()
  });
  
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

// Função original mantida para referência, mas a aplicação usará a subscribeToFiles
export const getAllFilesFromStorage = async (): Promise<FileMetadata[]> => {
  const user = auth.currentUser;
  if (!user) {
    return [];
  }

  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where("userId", "==", user.uid)
    );

    const querySnapshot = await getDocs(q);
    
    const files: FileMetadata[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
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
      const storageRef = ref(storage, data.storagePath);
      try {
        await deleteObject(storageRef);
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
    return () => {}; // Retorna função de limpeza vazia
  }

  const q = query(
    collection(db, COLLECTION_NAME), 
    where("userId", "==", user.uid)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const files: FileMetadata[] = snapshot.docs.map(doc => {
      const data = doc.data();
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

    // Ordenação no cliente
    files.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
    
    callback(files);
  }, (error) => {
    console.error("Erro no listener de arquivos:", error);
  });

  return unsubscribe;
};

// --- FUNÇÕES DE IMPRESSÃO (Dispositivos) ---

export const sendPrintJob = async (fileUrl: string, deviceId: string, printerName: string) => {
  const collectionRef = collection(db, 'fila_impressao');
  await addDoc(collectionRef, {
    pc_alvo_id: deviceId,
    impressora_alvo: printerName,
    url_arquivo: fileUrl,
    status: 'pendente',
    created_at: new Date()
  });
};

export const getOnlineDevices = async (): Promise<Device[]> => {
  try {
    const q = query(collection(db, 'dispositivos_online'));
    const snapshot = await getDocs(q);
    
    const devices: Device[] = [];
    const now = new Date();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      let lastSeenDate = new Date(0);
      if (data.ultimo_visto) {
        if (typeof data.ultimo_visto.toDate === 'function') {
          lastSeenDate = data.ultimo_visto.toDate();
        } else {
          lastSeenDate = new Date(data.ultimo_visto);
        }
      }

      const diffMs = now.getTime() - lastSeenDate.getTime();
      const diffMinutes = diffMs / 1000 / 60;
      const isOnline = diffMinutes < 2.5;

      devices.push({
        id: doc.id,
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

// FUNÇÃO DE DELETAR O PC
export const deleteDevice = async (deviceId: string): Promise<void> => {
  try {
    const deviceRef = doc(db, 'dispositivos_online', deviceId);
    await deleteDoc(deviceRef);
    console.log(`Dispositivo ${deviceId} deletado com sucesso.`);
  } catch (error) {
    console.error("Erro ao deletar dispositivo:", error);
    throw error;
  }
};
