// En tu componente de Messages o donde quieras mostrar los matches

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { db, auth } from '../firebase/config';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import Header from '../components/Header';

const MyMatches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchRealMatches = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        
        // Paso 1: Obtener tu documento para ver a quién has dado like
        const userDoc = await getDoc(doc(db, 'devs', currentUser.uid));
        if (!userDoc.exists()) return;
        
        const userData = userDoc.data();
        const myLikes = userData.teamInterests || [];
        
        if (myLikes.length === 0) {
          // No has dado like a nadie todavía
          setLoading(false);
          return;
        }
        
        // Paso 2: Buscar todos los usuarios que te han dado like
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
        
        // Paso 3: Encontrar la intersección (matches reales)
        const realMatches = usersWhoLikeYou.filter(user => myLikes.includes(user.id));
        
        // Paso 4: Obtener información detallada de cada match
        const matchDetails = realMatches.map(match => ({
          id: match.id,
          name: match.name || "Usuario",
          photoURL: match.photoURL || null,
          mainSpecialty: match.mainSpecialty || "Sin especialidad",
          contactInfo: match.contactInfo || "",
          bio: match.bio || "Sin descripción"
        }));
        
        setMatches(matchDetails);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching matches:", error);
        setLoading(false);
      }
    };
    
    fetchRealMatches();
  }, []);
  
  // Generar un ID de chat consistente entre dos usuarios
  const getChatId = (userId1, userId2) => {
    return [userId1, userId2].sort().join('_');
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Mis Matches</h1>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : matches.length === 0 ? (
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
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/chat/${getChatId(auth.currentUser.uid, match.id)}`);
                      }}
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
        )}
      </div>
    </div>
  );
};

export default MyMatches;