
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  doc, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { ChatUser, Conversation, UserMessage } from '../types';

// --- Gerenciamento de Usuários ---

// Salva/Atualiza usuário público para ser encontrado na busca
export const syncUserToFirestore = async (user: ChatUser) => {
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    email: user.email,
    name: user.name,
    lastSeen: serverTimestamp()
  }, { merge: true });
};

// Busca usuários por email (exato ou parcial se implementar lógica avançada)
export const searchUsersByEmail = async (emailQuery: string, currentUserId: string): Promise<ChatUser[]> => {
  const usersRef = collection(db, 'users');
  // Busca exata por simplicidade. Para "starts with", precisaria de lógica >= e <=
  const q = query(usersRef, where("email", "==", emailQuery));
  
  const snapshot = await getDocs(q);
  const foundUsers: ChatUser[] = [];
  
  snapshot.forEach(doc => {
    const data = doc.data() as ChatUser;
    if (data.uid !== currentUserId) {
      foundUsers.push(data);
    }
  });

  return foundUsers;
};

// --- Gerenciamento de Conversas ---

// Cria ou retorna ID de conversa existente entre dois usuários
export const getOrCreateConversation = async (currentUser: ChatUser, otherUser: ChatUser): Promise<string> => {
  // 1. Verifica se já existe conversa (solução simples: query por participants array)
  // Nota: Firestore queries em arrays podem ser complexas. 
  // Uma estratégia comum é gerar um ID determinístico (ex: uid1_uid2 ordenado)
  
  const uids = [currentUser.uid, otherUser.uid].sort();
  const chatId = `${uids[0]}_${uids[1]}`;
  
  const chatRef = doc(db, 'conversations', chatId);
  
  // Usamos setDoc com merge para garantir que existe, sem sobrescrever se já tiver dados
  await setDoc(chatRef, {
    id: chatId,
    participants: uids,
    participantDetails: {
      [currentUser.uid]: currentUser,
      [otherUser.uid]: otherUser
    },
    updatedAt: serverTimestamp()
  }, { merge: true });

  return chatId;
};

// Envia mensagem
export const sendUserMessage = async (chatId: string, senderId: string, text: string) => {
  const messagesRef = collection(db, 'conversations', chatId, 'messages');
  const chatRef = doc(db, 'conversations', chatId);

  // Adiciona mensagem
  await addDoc(messagesRef, {
    senderId,
    text,
    timestamp: serverTimestamp()
  });

  // Atualiza metadados da conversa (última mensagem)
  await setDoc(chatRef, {
    lastMessage: text,
    lastMessageDate: serverTimestamp()
  }, { merge: true });
};

// --- Hooks / Listeners (para usar dentro de useEffects) ---

// Ouve lista de conversas do usuário
export const subscribeToConversations = (userId: string, callback: (chats: Conversation[]) => void) => {
  // CORREÇÃO: Removemos orderBy('updatedAt', 'desc') da query.
  // Isso evita o erro "The query requires an index" do Firestore.
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Conversation));
    
    // Ordenamos as conversas aqui no cliente (mais recente primeiro)
    chats.sort((a, b) => {
      // Tenta usar a data da última mensagem, ou fallback para data de atualização
      const dateA = a.lastMessageDate?.seconds || (a as any).updatedAt?.seconds || 0;
      const dateB = b.lastMessageDate?.seconds || (b as any).updatedAt?.seconds || 0;
      return dateB - dateA;
    });

    callback(chats);
  });
};

// Ouve mensagens de uma conversa específica
export const subscribeToMessages = (chatId: string, callback: (msgs: UserMessage[]) => void) => {
  const q = query(
    collection(db, 'conversations', chatId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(100)
  );

  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as UserMessage));
    callback(msgs);
  });
};
