// src/pages/Chat.jsx
import { useState, useEffect, useRef } from 'react';
// CORREGIDO: Importar desde react-router-dom, no react-router
import { useParams, Link } from 'react-router';
import { db, auth } from '../firebase/config';
// AÑADIDO: Necesitamos importar setDoc para crear el chat si no existe
import { doc, getDoc, collection, addDoc, onSnapshot, query, orderBy, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { FaArrowLeft, FaPaperPlane } from 'react-icons/fa';

const Chat = () => {
  const { chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const currentUser = auth.currentUser;
  // Añade un estado para manejar errores
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChatData = async () => {
      try {
        setLoading(true);
        // Obtener documento del chat
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);

        if (!chatDoc.exists()) {
          // Si el chat no existe, crearlo
          // Primero, extraer los IDs de usuario del chatId (formato: "userId1_userId2")
          const userIds = chatId.split('_');
          if (userIds.length !== 2) {
            throw new Error("Formato de chatId inválido");
          }
          
          await setDoc(chatRef, {
            participants: userIds,
            createdAt: new Date(),
            lastMessage: null,
            lastMessageTime: null
          });
          
          // Cargar el chat nuevamente
          const updatedChatDoc = await getDoc(chatRef);
          if (!updatedChatDoc.exists()) {
            throw new Error("No se pudo crear el chat");
          }
          
          // Continuar con los datos actualizados
          const chatData = updatedChatDoc.data();
          
          // Identificar al otro usuario
          const otherUserId = chatData.participants.find(id => id !== currentUser.uid);
          
          // Obtener información del otro usuario
          const otherUserDoc = await getDoc(doc(db, 'devs', otherUserId));
          
          if (otherUserDoc.exists()) {
            setOtherUser({
              id: otherUserId,
              ...otherUserDoc.data()
            });
          } else {
            throw new Error("No se pudo encontrar la información del otro usuario");
          }
        } else {
          // El chat existe, continuar normalmente
          const chatData = chatDoc.data();
          
          // Identificar al otro usuario
          const otherUserId = chatData.participants.find(id => id !== currentUser.uid);
          if (!otherUserId) {
            throw new Error("No se pudo identificar al otro usuario");
          }
          
          // Obtener información del otro usuario
          const otherUserDoc = await getDoc(doc(db, 'devs', otherUserId));
          
          if (otherUserDoc.exists()) {
            setOtherUser({
              id: otherUserId,
              ...otherUserDoc.data()
            });
          } else {
            console.warn("Información del otro usuario no encontrada");
          }
        }
        
        // Configurar la escucha de mensajes (independiente de si el chat acaba de ser creado o ya existía)
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const messageList = [];
          snapshot.forEach((doc) => {
            messageList.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          setMessages(messageList);
          setLoading(false);
          scrollToBottom();
        }, (error) => {
          console.error("Error listening to messages:", error);
          setError("Error al cargar los mensajes");
          setLoading(false);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error("Error al cargar el chat:", error);
        setError("Ocurrió un error al cargar la conversación");
        setLoading(false);
        return () => {}; // Retornar una función vacía para satisfacer el efecto
      }
    };
    
    if (chatId && currentUser) {
      const unsubscribe = fetchChatData();
      return () => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [chatId, currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;
    
    try {
      // Asegurarnos de que tenemos un otherUser antes de continuar
      if (!otherUser) {
        console.error("No se puede enviar mensaje: información del otro usuario no disponible");
        return;
      }
      
      const messageData = {
        text: inputMessage,
        senderId: currentUser.uid,
        timestamp: serverTimestamp()
      };
      
      // Añadir mensaje a la colección de mensajes
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      
      // Actualizar último mensaje en el documento del chat
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: inputMessage,
        lastMessageTime: serverTimestamp()
      });
      
      // Actualizar referencia del chat en ambos usuarios
      const userRef = doc(db, 'devs', currentUser.uid);
      const otherUserRef = doc(db, 'devs', otherUser.id);
      
      const userDoc = await getDoc(userRef);
      const otherUserDoc = await getDoc(otherUserRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userChats = userData.chats || [];
        
        // Buscar si ya existe una referencia a este chat
        const existingChatIndex = userChats.findIndex(chat => chat.chatId === chatId);
        
        if (existingChatIndex >= 0) {
          // Actualizar el chat existente
          userChats[existingChatIndex] = {
            ...userChats[existingChatIndex],
            lastMessage: inputMessage,
            lastMessageTime: new Date()
          };
        } else {
          // Añadir nuevo chat
          userChats.push({
            chatId: chatId,
            with: otherUser.id,
            withName: otherUser.name || "Usuario",
            withPhoto: otherUser.photoURL,
            withSpecialty: otherUser.mainSpecialty || "",
            isMatch: true,
            lastMessage: inputMessage,
            lastMessageTime: new Date()
          });
        }
        
        await updateDoc(userRef, { chats: userChats });
      }
      
      if (otherUserDoc.exists()) {
        const otherUserData = otherUserDoc.data();
        const otherUserChats = otherUserData.chats || [];
        
        // Buscar si ya existe una referencia a este chat
        const existingChatIndex = otherUserChats.findIndex(chat => chat.chatId === chatId);
        
        if (existingChatIndex >= 0) {
          // Actualizar el chat existente
          otherUserChats[existingChatIndex] = {
            ...otherUserChats[existingChatIndex],
            lastMessage: inputMessage,
            lastMessageTime: new Date()
          };
        } else {
          // Añadir nuevo chat
          otherUserChats.push({
            chatId: chatId,
            with: currentUser.uid,
            withName: currentUser.displayName || "Usuario",
            withPhoto: currentUser.photoURL,
            withSpecialty: currentUser.mainSpecialty || "",
            isMatch: true,
            lastMessage: inputMessage,
            lastMessageTime: new Date()
          });
        }
        
        await updateDoc(otherUserRef, { chats: otherUserChats });
      }
      
      // Limpiar input
      setInputMessage('');
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      // Mostrar un mensaje de error al usuario si es necesario
    }
  };

  // Si hay un error, mostrar una pantalla de error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <header className="bg-white shadow-sm p-4 flex items-center">
          <Link to="/messages" className="text-gray-800">
            <FaArrowLeft size={20} />
          </Link>
          <h2 className="ml-4 font-medium text-red-500">Error</h2>
        </header>
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-md p-6 text-center max-w-md">
            <p className="text-red-500 mb-4">{error}</p>
            <p className="text-gray-600 mb-4">
              Lo sentimos, hubo un problema al cargar la conversación. Por favor, inténtalo nuevamente.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 mr-2"
            >
              Reintentar
            </button>
            <Link
              to="/messages"
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 inline-block"
            >
              Volver a mensajes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Estado de carga
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <header className="bg-white shadow-sm p-4 flex items-center">
          <Link to="/messages" className="text-gray-800">
            <FaArrowLeft size={20} />
          </Link>
          <div className="ml-4">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </header>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Renderizar la interfaz de chat normal
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm p-4 flex items-center sticky top-0 z-10">
        <Link to="/messages" className="text-gray-800">
          <FaArrowLeft size={20} />
        </Link>
        
        {otherUser && (
          <div className="flex items-center ml-4">
            <img 
              src={otherUser.photoURL || "https://via.placeholder.com/40"} 
              alt={otherUser.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="ml-3">
              <h2 className="font-medium text-gray-900">{otherUser.name}</h2>
              <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">
                {otherUser.mainSpecialty}
              </span>
            </div>
          </div>
        )}
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <FaPaperPlane className="text-blue-500" size={24} />
            </div>
            <p className="text-gray-600 mb-2">No hay mensajes aún</p>
            <p className="text-sm text-gray-400">¡Sé el primero en enviar un mensaje!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id}
              className={`flex ${message.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  message.senderId === currentUser.uid 
                    ? 'bg-blue-500 text-white rounded-br-none' 
                    : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
                }`}
              >
                <p>{message.text}</p>
                <p className="text-xs opacity-70 text-right mt-1">
                  {message.timestamp && new Date(message.timestamp.toDate()).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={sendMessage} className="bg-white p-4 flex items-center sticky bottom-0 border-t">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="ml-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <FaPaperPlane />
        </button>
      </form>
    </div>
  );
};

export default Chat;