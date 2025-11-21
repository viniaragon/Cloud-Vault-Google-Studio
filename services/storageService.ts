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
  // Se for um Timestamp do Firestore (tem o método toDate)
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  // Se for string ou número ou já for Date
  return new Date(value);
};

// Helper para remover campos undefined que quebram o Firestore
const cleanObject = (obj: any) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as any);
};

export const saveFileToStorage = async (metadata: FileMetadata, file: File): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");

  // 1. Upload File to Firebase Storage
  const filePath = `files/${user.uid}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, filePath);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref); // <--- Já temos a URL aqui

  // 2. Save Metadata to Firestore
  const { url, id, ...rest } = metadata;
  
  // Prepara o objeto
  const fileData = cleanObject({
    ...rest,
    id: metadata.id,
    url: downloadURL,
    storagePath: filePath,
    userId: user.uid,
    createdAt: new Date() 
  });
  
  await addDoc(collection(db, COLLECTION_NAME), fileData);

  return downloadURL; // <--- ADICIONE ESTE RETORNO
};

export const updateFileInStorage = async (id: string, changes: Partial<FileMetadata>): Promise<void> => {
  const q = query(collection(db, COLLECTION_NAME), where("id", "==", id));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const docRef = querySnapshot.docs[0].ref;
    // Remove a URL (que não deve mudar) e campos undefined
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
    console.log("Tentativa de buscar arquivos sem usuário logado.");
    return [];
  }

  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where("userId", "==", user.uid)
    );

    const querySnapshot = await getDocs(q);
    console.log(`Encontrados ${querySnapshot.size} arquivos para o usuário.`);
    
    const files: FileMetadata[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Usar o helper toDate para processar Timestamps corretamente
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

    // Sort by date descending (newest first)
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

    // Deleta do Storage (arquivo físico)
    if (data.storagePath) {
      const storageRef = ref(storage, data.storagePath);
      try {
        await deleteObject(storageRef);
      } catch (e) {
        console.warn("Arquivo não encontrado no storage ou já deletado", e);
      }
    }

    // Deleta do Firestore (metadados)
    await deleteDoc(docSnap.ref);
  }
};

// --- NOVAS FUNÇÕES DE IMPRESSÃO ---

// 1. Envia o pedido para a fila (O Robô vai ler isso)
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

// 2. Busca os computadores disponíveis (Você pode usar num useEffect depois)
export const getOnlineDevices = async (): Promise<Device[]> => {
  try {
    const q = query(collection(db, 'dispositivos_online'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.nome || data.name || 'PC Sem Nome', // <--- A CORREÇÃO ESTÁ AQUI (Lê 'nome' ou 'name')
        status: data.status,
        impressoras: data.impressoras || [],
        ultimo_visto: data.ultimo_visto
      } as Device;
    });
  } catch (error) {
    console.error("Erro ao buscar dispositivos:", error);
    return [];
  }
};