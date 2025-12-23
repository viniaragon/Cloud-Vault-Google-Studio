
import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { ChatUser, Conversation, UserMessage } from '../types';

// --- Gerenciamento de Usuários ---

export const syncUserToFirestore = async (user: ChatUser) => {
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    name: user.name,
    lastSeen: serverTimestamp()
  }, { merge: true });
};

export const searchUsersByEmail = async (emailQuery: string, currentUserId: string): Promise<ChatUser[]> => {
  const q = query(collection(db, 'users'), where("email", "==", emailQuery));
  const snapshot = await getDocs(q);
  const foundUsers: ChatUser[] = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data() as ChatUser;
    if (data.uid !== currentUserId) {
      foundUsers.push(data);
    }
  });

  return foundUsers;
};

// --- Gerenciamento de Conversas ---

export const getOrCreateConversation = async (currentUser: ChatUser, otherUser: ChatUser): Promise<string> => {
  const uids = [currentUser.uid, otherUser.uid].sort();
  const chatId = `${uids[0]}_${uids[1]}`;

  await setDoc(doc(db, 'conversations', chatId), {
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

export const sendUserMessage = async (chatId: string, senderId: string, text: string) => {
  // Adiciona a mensagem na subcoleção
  await addDoc(collection(db, 'conversations', chatId, 'messages'), {
    senderId,
    text,
    timestamp: serverTimestamp()
  });

  // Atualiza a conversa pai
  await setDoc(doc(db, 'conversations', chatId), {
    lastMessage: text,
    lastMessageDate: serverTimestamp()
  }, { merge: true });
};

// --- Hooks / Listeners ---

export const subscribeToConversations = (userId: string, callback: (chats: Conversation[]) => void) => {
  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', userId));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    } as Conversation));

    // Ordenação no cliente (evita erros de índice composto)
    chats.sort((a, b) => {
      const dateA = a.lastMessageDate?.seconds || (a as any).updatedAt?.seconds || 0;
      const dateB = b.lastMessageDate?.seconds || (b as any).updatedAt?.seconds || 0;
      return dateB - dateA;
    });

    callback(chats);
  });

  return unsubscribe;
};

export const subscribeToMessages = (chatId: string, callback: (msgs: UserMessage[]) => void) => {
  const q = query(
    collection(db, 'conversations', chatId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(100)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    } as UserMessage));
    callback(msgs);
  });

  return unsubscribe;
};
