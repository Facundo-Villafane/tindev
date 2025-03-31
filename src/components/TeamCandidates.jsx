// src/components/TeamCandidates.jsx
import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { FaCheck, FaTimes, FaUserPlus } from 'react-icons/fa';

const TeamCandidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const currentAuthUser = auth.currentUser;
        const userDoc = await getDoc(doc(db, 'devs', currentAuthUser.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser(userData);
          setCandidates(userData.teamCandidates || []);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching candidates:", error);
        setLoading(false);
      }
    };

    fetchCandidates();
  }, []);

  const handleApprove = async (candidate) => {
    try {
      const currentAuthUser = auth.currentUser;
      const userRef = doc(db, 'devs', currentAuthUser.uid);
      const candidateRef = doc(db, 'devs', candidate.id);
      
      // Obtener datos actualizados
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      // Verificar si ya has aprobado a este candidato
      const existingCandidate = userData.teamCandidates.find(c => c.id === candidate.id);
      
      if (existingCandidate && !existingCandidate.approvals.includes(currentAuthUser.uid)) {
        // Actualizar la lista de aprobaciones para este candidato
        const updatedCandidates = userData.teamCandidates.map(c => {
          if (c.id === candidate.id) {
            return {
              ...c,
              approvals: [...c.approvals, currentAuthUser.uid]
            };
          }
          return c;
        });
        
        await updateDoc(userRef, {
          teamCandidates: updatedCandidates
        });
        
        // También actualizar el registro del candidato
        const candidateDoc = await getDoc(candidateRef);
        if (candidateDoc.exists()) {
          const candidateData = candidateDoc.data();
          
          const relevantCandidacy = candidateData.candidateFor.find(
            c => c.teamMembers.includes(currentAuthUser.uid)
          );
          
          if (relevantCandidacy) {
            const updatedCandidacies = candidateData.candidateFor.map(c => {
              if (c.teamMembers.includes(currentAuthUser.uid)) {
                return {
                  ...c,
                  approvedBy: [...c.approvedBy, currentAuthUser.uid]
                };
              }
              return c;
            });
            
            await updateDoc(candidateRef, {
              candidateFor: updatedCandidacies
            });
          }
        }
        
        // Actualizar el estado local
        setCandidates(updatedCandidates);
        
        // Verificar si todos los miembros han aprobado
        const updatedCandidate = updatedCandidates.find(c => c.id === candidate.id);
        const currentTeam = userData.currentTeam || [];
        const currentTeamIds = currentTeam.map(member => member.id);
        
        if (updatedCandidate.approvals.length === currentTeamIds.length) {
          // ¡Todos aprobaron! Añadir al equipo
          await addCandidateToTeam(candidate, currentTeam, currentTeamIds);
        }
      }
    } catch (error) {
      console.error("Error approving candidate:", error);
    }
  };

  const addCandidateToTeam = async (candidate, currentTeam, currentTeamIds) => {
    try {
      const candidateRef = doc(db, 'devs', candidate.id);
      const candidateDoc = await getDoc(candidateRef);
      const candidateData = candidateDoc.data();
      
      // Crear objeto para añadir al equipo
      const newTeamMember = {
        id: candidate.id,
        name: candidateData.name,
        photoURL: candidateData.photoURL,
        mainSpecialty: candidateData.mainSpecialty,
        contactInfo: candidateData.contactInfo || ''
      };
      
      // Añadir a todos los miembros del equipo
      for (const memberId of currentTeamIds) {
        const memberRef = doc(db, 'devs', memberId);
        
        // Añadir al equipo
        await updateDoc(memberRef, {
          currentTeam: arrayUnion(newTeamMember)
        });
        
        // Eliminar de candidatos
        const memberDoc = await getDoc(memberRef);
        const memberData = memberDoc.data();
        
        const updatedCandidates = memberData.teamCandidates.filter(
          c => c.id !== candidate.id
        );
        
        await updateDoc(memberRef, {
          teamCandidates: updatedCandidates
        });
      }
      
      // Actualizar el equipo del candidato
      for (const member of currentTeam) {
        await updateDoc(candidateRef, {
          currentTeam: arrayUnion(member)
        });
      }
      
      // Eliminar la candidatura
      const updatedCandidacies = candidateData.candidateFor.filter(
        c => !currentTeamIds.includes(c.teamOwner)
      );
      
      await updateDoc(candidateRef, {
        candidateFor: updatedCandidacies
      });
      
      // Actualizar estado local
      setCandidates(prev => prev.filter(c => c.id !== candidate.id));
      
    } catch (error) {
      console.error("Error adding candidate to team:", error);
    }
  };

  const handleReject = async (candidate) => {
    try {
      const currentAuthUser = auth.currentUser;
      const userRef = doc(db, 'devs', currentAuthUser.uid);
      const candidateRef = doc(db, 'devs', candidate.id);
      
      // Obtener datos actualizados
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      // Filtrar este candidato de tu lista
      const updatedCandidates = userData.teamCandidates.filter(
        c => c.id !== candidate.id
      );
      
      await updateDoc(userRef, {
        teamCandidates: updatedCandidates
      });
      
      // Actualizar también el registro del candidato
      const candidateDoc = await getDoc(candidateRef);
      if (candidateDoc.exists()) {
        const candidateData = candidateDoc.data();
        
        const updatedCandidacies = candidateData.candidateFor.filter(
          c => !c.teamMembers.includes(currentAuthUser.uid)
        );
        
        await updateDoc(candidateRef, {
          candidateFor: updatedCandidacies
        });
      }
      
      // Actualizar estado local
      setCandidates(updatedCandidates);
      
    } catch (error) {
      console.error("Error rejecting candidate:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold mb-4">Candidatos para tu equipo</h2>
      
      {candidates.length === 0 ? (
        <p className="text-gray-500 text-center py-6">No hay candidatos pendientes</p>
      ) : (
        <div className="space-y-4">
          {candidates.map((candidate) => {
            const userHasApproved = candidate.approvals.includes(auth.currentUser.uid);
            const approvalCount = candidate.approvals.length;
            const teamSize = currentUser?.currentTeam?.length || 0;
            
            return (
              <div key={candidate.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center">
                  <img 
                    src={candidate.photoURL || 'https://via.placeholder.com/40'} 
                    alt={candidate.name}
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium">{candidate.name}</h3>
                    <div className="flex items-center mt-1">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs mr-2">
                        {candidate.mainSpecialty}
                      </span>
                      <span className="text-xs text-gray-500">
                        Propuesto por: {candidate.proposedBy === auth.currentUser.uid ? 'Ti' : 'otro miembro'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-sm mr-2">Aprobaciones:</span>
                    <div className="flex space-x-1">
                      {[...Array(teamSize)].map((_, index) => (
                        <div 
                          key={index}
                          className={`w-2 h-2 rounded-full ${
                            index < approvalCount ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="ml-2 text-xs text-gray-600">
                      {approvalCount}/{teamSize}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    {!userHasApproved && (
                      <button
                        onClick={() => handleApprove(candidate)}
                        className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600"
                        title="Aprobar"
                      >
                        <FaCheck size={16} />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleReject(candidate)}
                      className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600"
                      title="Rechazar"
                    >
                      <FaTimes size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeamCandidates;