// src/pages/Messages.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { db, auth } from '../firebase/config';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import Header from '../components/Header';
import { FaCircle } from 'react-icons/fa';

const Messages = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userRef = doc(db, 'devs', currentUser.uid);
    
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        const userChats = userData.chats || [];
        
        // Ordenar por último mensaje, más reciente primero
        const sortedChats = [...userChats].sort((a, b) => {
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return b.lastMessageTime.toDate() - a.lastMessageTime.toDate();
        });
        
        setChats(sortedChats);
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Mensajes</h1>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : chats.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 mb-2">Aún no tienes conversaciones</p>
            <p className="text-sm text-gray-400">Haz match con otros usuarios para empezar a chatear</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <div 
                key={chat.chatId}
                onClick={() => navigate(`/chat/${chat.chatId}`)}
                className="bg-white rounded-lg shadow-sm p-4 flex items-center cursor-pointer hover:bg-gray-50 transition"
              >
                <div className="relative">
                  <img 
                    src={chat.withPhoto || "https://via.placeholder.com/50"} 
                    alt={chat.withName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {chat.isMatch && (
                    <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                      <FaCircle size={10} />
                    </div>
                  )}
                </div>
                
                <div className="ml-4 flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">{chat.withName}</h3>
                    {chat.lastMessageTime && (
                      <span className="text-xs text-gray-500">
                        {new Date(chat.lastMessageTime.toDate()).toLocaleTimeString([], {
                          hour: '2-digit', 
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 mr-2">
                      {chat.withSpecialty}
                    </span>
                    {chat.lastMessage ? (
                      <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Envía el primer mensaje</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;