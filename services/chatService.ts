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

// Busca usuários por email
export const searchUsersByEmail = async (emailQuery: string, currentUserId: string): Promise<ChatUser[]> => {
  const usersRef = collection(db, 'users');
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

// A FUNÇÃO QUE ESTAVA FALTANDO:
export const getOrCreateConversation = async (currentUser: ChatUser, otherUser: ChatUser): Promise<string> => {
  const uids = [currentUser.uid, otherUser.uid].sort();
  const chatId = `${uids[0]}_${uids[1]}`;
  
  const chatRef = doc(db, 'conversations', chatId);
  
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

  await addDoc(messagesRef, {
    senderId,
    text,
    timestamp: serverTimestamp()
  });

  await setDoc(chatRef, {
    lastMessage: text,
    lastMessageDate: serverTimestamp()
  }, { merge: true });
};

// --- Hooks / Listeners ---

export const subscribeToConversations = (userId: string, callback: (chats: Conversation[]) => void) => {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Conversation));
    
    chats.sort((a, b) => {
      const dateA = a.lastMessageDate?.seconds || (a as any).updatedAt?.seconds || 0;
      const dateB = b.lastMessageDate?.seconds || (b as any).updatedAt?.seconds || 0;
      return dateB - dateA;
    });

    callback(chats);
  });
};

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