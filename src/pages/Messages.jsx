// src/pages/Messages.jsx
import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import Header from '../components/Header';
import { Link } from 'react-router';

const Messages = () => {
  const [matches, setMatches] = useState([]);
  
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    
    // Obtener las coincidencias del usuario
    const matchesRef = collection(db, 'matches');
    const q = query(
      matchesRef,
      where('devs', 'array-contains', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const matchesList = [];
      querySnapshot.forEach((doc) => {
        matchesList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setMatches(matchesList);
    });
    
    return () => unsubscribe();
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold text-center my-6">Tus Matches</h1>
        
        {matches.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <p className="text-gray-500">Aún no tienes matches.</p>
            <p className="mt-2">¡Sigue haciendo swipe para encontrar coincidencias!</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md divide-y">
            {matches.map((match) => (
              <Link
                key={match.id}
                to={`/chat/${match.id}`}
                className="flex items-center p-4 hover:bg-gray-50"
              >
                <img
                  src={match.profilePicture || 'https://via.placeholder.com/50'}
                  alt={match.name}
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h3 className="font-medium">{match.name}</h3>
                  <p className="text-sm text-gray-500">
                    {match.lastMessage || 'Nuevo match! Di hola!'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;