// src/pages/Messages.jsx (modificado)
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { db, auth } from '../firebase/config';
import { doc, getDoc, onSnapshot, collection, getDocs, query, where, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import Header from '../components/Header';
import { FaCircle } from 'react-icons/fa';

const Messages = () => {
  const [chats, setChats] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' o 'matches'
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Función para cargar chats (tu código existente)
  useEffect(() => {
    const loadChats = () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userRef = doc(db, 'devs', currentUser.uid);
      
      const unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          const userChats = userData.chats || [];
          
          // Ordenar por último mensaje
          const sortedChats = [...userChats].sort((a, b) => {
            if (!a.lastMessageTime) return 1;
            if (!b.lastMessageTime) return -1;
            return b.lastMessageTime.toDate() - a.lastMessageTime.toDate();
          });
          
          setChats(sortedChats);
          setLoading(false);
        }
      });
      
      return unsubscribe;
    };

    const chatUnsubscribe = loadChats();
    
    return () => {
      if (chatUnsubscribe) chatUnsubscribe();
    };
  }, []);

  // Función para cargar matches reales
  useEffect(() => {
    const fetchRealMatches = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        
        // Obtener tus likes
        const userDoc = await getDoc(doc(db, 'devs', currentUser.uid));
        if (!userDoc.exists()) return;
        
        const userData = userDoc.data();
        const myLikes = userData.teamInterests || [];
        
        if (myLikes.length === 0) return;
        
        // Buscar usuarios que te han dado like
        const devsRef = collection(db, 'devs');
        const likesYouQuery = query(
          devsRef, 
          where('teamInterests', 'array-contains', currentUser.uid)
        );
        
        const likesYouSnapshot = await getDocs(likesYouQuery);
        const usersWhoLikeYou = likesYouSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Encontrar matches reales (intersección)
        const realMatches = usersWhoLikeYou.filter(user => myLikes.includes(user.id));
        
        const matchDetails = realMatches.map(match => ({
          id: match.id,
          name: match.name || "Usuario",
          photoURL: match.photoURL || null,
          mainSpecialty: match.mainSpecialty || "Sin especialidad",
          contactInfo: match.contactInfo || "",
          bio: match.bio || "Sin descripción"
        }));
        
        setMatches(matchDetails);
      } catch (error) {
        console.error("Error fetching matches:", error);
      }
    };
    
    fetchRealMatches();
  }, []);

  // Dentro de tu componente Messages.jsx
const handleChatClick = async (matchId, e) => {
  e.stopPropagation(); // Prevenir que el evento afecte al elemento padre
  
  const currentUser = auth.currentUser;
  const chatId = getChatId(currentUser.uid, matchId);
  
  try {
    // Verificar si el chat ya existe
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      // El chat no existe, crearlo
      const matchUserRef = doc(db, 'devs', matchId);
      const matchUserDoc = await getDoc(matchUserRef);
      const matchUserData = matchUserDoc.data();
      
      const currentUserRef = doc(db, 'devs', currentUser.uid);
      const currentUserDoc = await getDoc(currentUserRef);
      const currentUserData = currentUserDoc.data();
      
      // Crear el documento de chat
      await setDoc(chatRef, {
        participants: [currentUser.uid, matchId],
        createdAt: new Date(),
        lastMessage: null,
        lastMessageTime: null
      });
      
      // Añadir referencia del chat al usuario actual
      const userChats = currentUserData.chats || [];
      const chatExists = userChats.some(chat => chat.chatId === chatId);
      
      if (!chatExists) {
        await updateDoc(currentUserRef, {
          chats: arrayUnion({
            chatId: chatId,
            with: matchId,
            withName: matchUserData.name || "Usuario",
            withPhoto: matchUserData.photoURL,
            withSpecialty: matchUserData.mainSpecialty || "",
            isMatch: true,
            lastMessage: null,
            lastMessageTime: new Date()
          })
        });
      }
      
      // Añadir referencia del chat al otro usuario
      const matchChats = matchUserData.chats || [];
      const matchChatExists = matchChats.some(chat => chat.chatId === chatId);
      
      if (!matchChatExists) {
        await updateDoc(matchUserRef, {
          chats: arrayUnion({
            chatId: chatId,
            with: currentUser.uid,
            withName: currentUserData.name || "Usuario",
            withPhoto: currentUserData.photoURL,
            withSpecialty: currentUserData.mainSpecialty || "",
            isMatch: true,
            lastMessage: null,
            lastMessageTime: new Date()
          })
        });
      }
    }
    
    // Navegar al chat
    navigate(`/chat/${chatId}`);
  } catch (error) {
    console.error("Error al preparar el chat:", error);
    // Mostrar un mensaje de error al usuario
    alert("Hubo un problema al iniciar el chat. Inténtalo nuevamente.");
  }
};

  // Generar ID de chat
  const getChatId = (userId1, userId2) => {
    return [userId1, userId2].sort().join('_');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Mensajes</h1>
        
        {/* Tabs de navegación */}
        <div className="flex border-b mb-4">
          <button 
            className={`py-2 px-4 font-medium ${activeTab === 'chats' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('chats')}
          >
            Conversaciones
          </button>
          <button 
            className={`py-2 px-4 font-medium ${activeTab === 'matches' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('matches')}
          >
            Mis Matches
          </button>
        </div>
        
        {/* Contenido según la pestaña activa */}
        {activeTab === 'chats' ? (
          // Pestaña de chats (tu código existente)
          loading ? (
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
          )
        ) : (
          // Pestaña de matches (nuevo componente)
          matches.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500 mb-2">Aún no tienes matches</p>
              <p className="text-sm text-gray-400">Cuando tú y otro usuario se den like mutuamente, aparecerán aquí.</p>
              <button
                onClick={() => navigate('/')}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Seguir explorando
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <div 
                  key={match.id}
                  onClick={() => navigate(`/chat/${getChatId(auth.currentUser.uid, match.id)}`)}
                  className="bg-white rounded-lg shadow-sm p-4 flex items-center cursor-pointer hover:bg-gray-50 transition border border-gray-200"
                >
                  <img 
                    src={match.photoURL || "https://via.placeholder.com/60?text=Usuario"} 
                    alt={match.name}
                    className="w-16 h-16 rounded-full object-cover mr-4"
                  />
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-lg">{match.name}</h3>
                        <div className="flex items-center mt-1">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                            {match.mainSpecialty}
                          </span>
                          <span className="ml-2 text-xs text-green-600">
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                            Match
                          </span>
                        </div>
                      </div>
                      <button
                          className="text-purple-600 bg-purple-50 text-xs px-3 py-1 rounded-full border border-purple-100 hover:bg-purple-100"
                          onClick={(e) => handleChatClick(match.id, e)}
                        >
                          Chatear
                        </button>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{match.bio}</p>
                    
                    {match.contactInfo && (
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="font-medium">Contacto:</span> {match.contactInfo}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Messages;