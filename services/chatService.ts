
import { db } from './firebase';
import firebase from 'firebase/compat/app';
import { ChatUser, Conversation, UserMessage } from '../types';

// --- Gerenciamento de Usuários ---

// Salva/Atualiza usuário público para ser encontrado na busca
export const syncUserToFirestore = async (user: ChatUser) => {
  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    email: user.email,
    name: user.name,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
};

// Busca usuários por email
export const searchUsersByEmail = async (emailQuery: string, currentUserId: string): Promise<ChatUser[]> => {
  const snapshot = await db.collection('users').where("email", "==", emailQuery).get();
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

export const getOrCreateConversation = async (currentUser: ChatUser, otherUser: ChatUser): Promise<string> => {
  const uids = [currentUser.uid, otherUser.uid].sort();
  const chatId = `${uids[0]}_${uids[1]}`;
  
  await db.collection('conversations').doc(chatId).set({
    id: chatId,
    participants: uids,
    participantDetails: {
      [currentUser.uid]: currentUser,
      [otherUser.uid]: otherUser
    },
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return chatId;
};

// Envia mensagem
export const sendUserMessage = async (chatId: string, senderId: string, text: string) => {
  await db.collection('conversations').doc(chatId).collection('messages').add({
    senderId,
    text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  await db.collection('conversations').doc(chatId).set({
    lastMessage: text,
    lastMessageDate: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
};

// --- Hooks / Listeners ---

export const subscribeToConversations = (userId: string, callback: (chats: Conversation[]) => void) => {
  const unsubscribe = db.collection('conversations')
    .where('participants', 'array-contains', userId)
    .onSnapshot((snapshot) => {
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

  return unsubscribe;
};

export const subscribeToMessages = (chatId: string, callback: (msgs: UserMessage[]) => void) => {
  const unsubscribe = db.collection('conversations')
    .doc(chatId)
    .collection('messages')
    .orderBy('timestamp', 'asc')
    .limit(100)
    .onSnapshot((snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserMessage));
      callback(msgs);
    });
    
  return unsubscribe;
};
