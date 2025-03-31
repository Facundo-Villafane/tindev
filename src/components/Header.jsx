// src/components/Header.jsx
import { Link } from 'react-router';
import { FaUser, FaFire, FaComments } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { db, auth } from '../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';


const Header = () => {
    const [pendingCandidates, setPendingCandidates] = useState(0);
  
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const unsubscribe = onSnapshot(doc(db, 'devs', currentUser.uid), (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        const candidates = userData.teamCandidates || [];
        
        // Contar candidatos que no has aprobado aún
        const pending = candidates.filter(
          candidate => !candidate.approvals.includes(currentUser.uid)
        ).length;
        
        setPendingCandidates(pending);
      }
    });
    
    return () => unsubscribe();
  }, []);

  return (
    <header className="flex justify-between items-center p-4 border-b">
      <Link to="/profile" className="text-gray-700 hover:text-gray-900">
        <FaUser size={24} />
      </Link>
      
      <Link to="/" className="text-red-500 hover:text-red-600">
        <FaFire size={32} />
      </Link>
      
      <div className="relative">
        <Link to="/messages" className="text-gray-700 hover:text-gray-900">
          <FaComments size={24} />
        </Link>
        
        {pendingCandidates > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {pendingCandidates}
          </span>
        )}
      </div>
    </header>
  );
};

export default Header;