// src/pages/Chat.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { auth, db } from '../firebase/config';
import { 
  collection, doc, getDoc, addDoc, query, 
  where, orderBy, onSnapshot, serverTimestamp 
} from 'firebase/firestore';
import { FaArrowLeft, FaPaperPlane } from 'react-icons/fa';

const Chat = () => {
  const { matchId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [matchInfo, setMatchInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const endOfMessagesRef = useRef(null);
  const currentUser = auth.currentUser;
  
  useEffect(() => {
    // Obtener información sobre el match
    const fetchMatchInfo = async () => {
      const matchDoc = await getDoc(doc(db, 'matches', matchId));
      if (matchDoc.exists()) {
        const matchData = matchDoc.data();
        const otherUserId = matchData.devs.find(id => id !== currentUser.uid);
        
        // Obtener información del otro usuario
        const userDoc = await getDoc(doc(db, 'devs', otherUserId));
        if (userDoc.exists()) {
          setMatchInfo({
            id: otherUserId,
            ...userDoc.data()
          });
        }
        
        setLoading(false);
      }
    };
    
    fetchMatchInfo();
    
    // Suscribirse a los mensajes
    const messagesRef = collection(db, 'matches', matchId, 'messages');
    const q = query(
      messagesRef,
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesList = [];
      querySnapshot.forEach((doc) => {
        messagesList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setMessages(messagesList);
      scrollToBottom();
    });
    
    return () => unsubscribe();
  }, [matchId, currentUser]);
  
  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (input.trim() === '') return;
    
    const messagesRef = collection(db, 'matches', matchId, 'messages');
    await addDoc(messagesRef, {
      text: input,
      senderId: currentUser.uid,
      timestamp: serverTimestamp()
    });
    
    // Actualizar el último mensaje en el documento principal del match
    await updateDoc(doc(db, 'matches', matchId), {
      lastMessage: input,
      lastMessageTime: serverTimestamp()
    });
    
    setInput('');
    scrollToBottom();
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow p-4 flex items-center">
        <Link to="/messages" className="mr-4 text-gray-600">
          <FaArrowLeft size={20} />
        </Link>
        {matchInfo && (
          <div className="flex items-center">
            <img
              src={matchInfo.photoURL || 'https://via.placeholder.com/40'}
              alt={matchInfo.name}
              className="w-10 h-10 rounded-full object-cover mr-3"
            />
            <h2 className="font-medium">{matchInfo.name}</h2>
          </div>
        )}
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs p-3 rounded-lg ${
                message.senderId === currentUser.uid
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              <p>{message.text}</p>
              <p className="text-xs opacity-70 text-right mt-1">
                {message.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>
      
      {/* Input area */}
      <form onSubmit={sendMessage} className="bg-white p-4 flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 border rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="ml-2 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <FaPaperPlane />
        </button>
      </form>
    </div>
  );
};

export default Chat;