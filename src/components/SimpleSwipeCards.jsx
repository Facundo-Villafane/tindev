// src/components/TeamSwipeCards.jsx
import { useState, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { db, auth } from '../firebase/config';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { FaHeart, FaTimes, FaUndo, FaCode, FaPaintBrush, FaBriefcase, FaGamepad, FaMusic, FaQuestion } from 'react-icons/fa';
import Header from './Header';

const TeamSwipeCards = () => {
  // Estados se mantienen igual...
  const [potentialTeammates, setPotentialTeammates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [swipeHistory, setSwipeHistory] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Iconos para las especialidades
  const specialtyIcons = {
    "Programador": <FaCode className="mr-1" />,
    "Artista": <FaPaintBrush className="mr-1" />,
    "Management": <FaBriefcase className="mr-1" />,
    "Game Design": <FaGamepad className="mr-1" />,
    "Audio": <FaMusic className="mr-1" />,
    "No sé nada": <FaQuestion className="mr-1" />
  };

  useEffect(() => {
    const fetchUserAndCards = async () => {
      try {
        const currentAuthUser = auth.currentUser;
        
        // Obtener información del usuario actual
        const userDoc = await getDoc(doc(db, 'devs', currentAuthUser.uid));
        if (userDoc.exists()) {
          setCurrentUser(userDoc.data());
        }
        
        // Consultar usuarios potenciales para el equipo
        const devsRef = collection(db, "devs");
        
        // Obtener todos los desarrolladores (excepto el usuario actual)
        const querySnapshot = await getDocs(devsRef);
        
        const matchableUsers = [];
        querySnapshot.forEach((doc) => {
          // No incluir al usuario actual en los resultados
          if (doc.id !== currentAuthUser.uid) {
            matchableUsers.push({
              id: doc.id,
              ...doc.data()
            });
          }
        });
        
        // Filtrar y ordenar usuarios potenciales según prioridades
        const filteredUsers = filterAndPrioritizeUsers(matchableUsers);
        setPotentialTeammates(filteredUsers);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching profiles:", error);
        setLoading(false);
      }
    };

    fetchUserAndCards();
  }, []);

  // Función para filtrar y priorizar usuarios basados en necesidades del equipo
  const filterAndPrioritizeUsers = (users) => {
    if (!currentUser || !currentUser.lookingFor || currentUser.lookingFor.length === 0) {
      return users;
    }

    // Filtrar usuarios que ya están en el equipo
    const currentTeamIds = (currentUser.currentTeam || []).map(member => member.id);
    users = users.filter(user => !currentTeamIds.includes(user.id));
    
    // Organizar por prioridad según las especialidades buscadas
    return users.sort((a, b) => {
      // Prioridad 1: Usuario tiene especialidad principal que estamos buscando
      const aMainSpecialtyMatch = currentUser.lookingFor.includes(a.mainSpecialty) ? 1 : 0;
      const bMainSpecialtyMatch = currentUser.lookingFor.includes(b.mainSpecialty) ? 1 : 0;
      
      if (aMainSpecialtyMatch !== bMainSpecialtyMatch) {
        return bMainSpecialtyMatch - aMainSpecialtyMatch;
      }
      
      // Prioridad 2: Evitar duplicar especialidades ya en el equipo
      const aSpecialtyInTeam = (currentUser.currentTeam || []).some(
        member => member.mainSpecialty === a.mainSpecialty
      ) ? 0 : 1;
      
      const bSpecialtyInTeam = (currentUser.currentTeam || []).some(
        member => member.mainSpecialty === b.mainSpecialty
      ) ? 0 : 1;
      
      return bSpecialtyInTeam - aSpecialtyInTeam;
    });
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => handleSwipe('left'),
    onSwipedRight: () => handleSwipe('right'),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
    delta: 50
  });

  const handleSwipe = async (direction) => {
    if (currentIndex >= potentialTeammates.length) return;
    
    const swipedUser = potentialTeammates[currentIndex];
    setSwipeDirection(direction);
    setSwipeHistory([...swipeHistory, { user: swipedUser, direction }]);
    
    // Guardar el swipe en Firebase
    try {
      if (direction === 'right') {
        const currentAuthUser = auth.currentUser;
        const userRef = doc(db, 'devs', currentAuthUser.uid);
        const swipedUserRef = doc(db, 'devs', swipedUser.id);
        
        // Obtener datos actualizados del usuario actual y del usuario con swipe
        const currentUserDoc = await getDoc(userRef);
        const swipedUserDoc = await getDoc(swipedUserRef);
        
        const currentUserData = currentUserDoc.data();
        const swipedUserData = swipedUserDoc.data();
        
        // Obtener los miembros actuales del equipo
        const currentTeam = currentUserData.currentTeam || [];
        const currentTeamIds = currentTeam.map(member => member.id);
        
        // Verificar si el usuario ya es candidato
        const existingCandidate = (currentUserData.teamCandidates || [])
          .find(candidate => candidate.id === swipedUser.id);
        
        // Verificar si ya eres candidato para el equipo del otro usuario
        const youAreCandidate = (swipedUserData.teamCandidates || [])
          .find(candidate => candidate.id === currentAuthUser.uid);
        
        // Caso 1: Tú haces swipe al usuario, pero él no te ha hecho swipe aún
        if (!youAreCandidate) {
          // Registrar tu interés
          await updateDoc(userRef, {
            teamInterests: arrayUnion(swipedUser.id)
          });
          
          // Si el otro usuario tiene un equipo y tú no estás en candidatos, proponte como candidato
          if (swipedUserData.currentTeam && swipedUserData.currentTeam.length > 0) {
            // Obtener IDs de los miembros del otro equipo
            const otherTeamIds = swipedUserData.currentTeam.map(member => member.id);
            
            // Verificar que no eres ya parte de ese equipo
            if (!otherTeamIds.includes(currentAuthUser.uid)) {
              // Crear entrada de candidatura para el otro equipo
              const candidateEntry = {
                teamOwner: swipedUser.id,
                teamMembers: otherTeamIds,
                approvedBy: [swipedUser.id] // El usuario que aprobaste te aprueba automáticamente
              };
              
              // Actualizar tu estado como candidato para ese equipo
              await updateDoc(userRef, {
                candidateFor: arrayUnion(candidateEntry)
              });
              
              // Añadirte como candidato al equipo del otro usuario
              const candidateData = {
                id: currentAuthUser.uid,
                name: currentUserData.name,
                photoURL: currentUserData.photoURL,
                mainSpecialty: currentUserData.mainSpecialty,
                proposedBy: swipedUser.id,
                approvals: [swipedUser.id]
              };
              
              // Actualizar todos los miembros del equipo para añadirte como candidato
              for (const memberId of otherTeamIds) {
                await updateDoc(doc(db, 'devs', memberId), {
                  teamCandidates: arrayUnion(candidateData)
                });
              }
            }
          }
        }
        // Caso 2: El usuario ya te hizo swipe y tú le haces swipe ahora (es un match)
        else if (youAreCandidate) {
          // Es un match! Verificar si ya tienes un equipo
          if (currentTeam.length > 0) {
            // Ya tienes un equipo, añadir al usuario como candidato para tu equipo
            if (!existingCandidate) {
              // Crear datos del candidato
              const candidateData = {
                id: swipedUser.id,
                name: swipedUserData.name,
                photoURL: swipedUserData.photoURL,
                mainSpecialty: swipedUserData.mainSpecialty,
                proposedBy: currentAuthUser.uid,
                approvals: [currentAuthUser.uid]
              };
              
              // Añadir candidato a todos los miembros de tu equipo
              for (const memberId of currentTeamIds) {
                await updateDoc(doc(db, 'devs', memberId), {
                  teamCandidates: arrayUnion(candidateData)
                });
              }
              
              // Actualizar el estado de candidatura del otro usuario
              const candidateEntry = {
                teamOwner: currentAuthUser.uid,
                teamMembers: currentTeamIds,
                approvedBy: [currentAuthUser.uid]
              };
              
              await updateDoc(swipedUserRef, {
                candidateFor: arrayUnion(candidateEntry)
              });
            }
            
            // Aprobar al usuario para tu equipo si ya es candidato
            else {
              // Actualizar la aprobación en tu registro de candidatos
              await updateDoc(userRef, {
                teamCandidates: currentUserData.teamCandidates.map(candidate => {
                  if (candidate.id === swipedUser.id && !candidate.approvals.includes(currentAuthUser.uid)) {
                    return {
                      ...candidate,
                      approvals: [...candidate.approvals, currentAuthUser.uid]
                    };
                  }
                  return candidate;
                })
              });
              
              // Actualizar tu aprobación en el registro de candidaturas del otro usuario
              await updateDoc(swipedUserRef, {
                candidateFor: swipedUserData.candidateFor.map(candidacy => {
                  if (candidacy.teamOwner === currentAuthUser.uid && !candidacy.approvedBy.includes(currentAuthUser.uid)) {
                    return {
                      ...candidacy,
                      approvedBy: [...candidacy.approvedBy, currentAuthUser.uid]
                    };
                  }
                  return candidacy;
                })
              });
              
              // Verificar si todos los miembros han aprobado
              const updatedCandidateData = {
                ...existingCandidate,
                approvals: [...existingCandidate.approvals, currentAuthUser.uid]
              };
              
              if (updatedCandidateData.approvals.length === currentTeamIds.length) {
                // Todos han aprobado! Añadir al equipo
                const newTeamMember = {
                  id: swipedUser.id,
                  name: swipedUserData.name,
                  photoURL: swipedUserData.photoURL,
                  mainSpecialty: swipedUserData.mainSpecialty,
                  contactInfo: swipedUserData.contactInfo || ''
                };
                
                // Añadir al equipo de todos los miembros actuales
                for (const memberId of currentTeamIds) {
                  await updateDoc(doc(db, 'devs', memberId), {
                    currentTeam: arrayUnion(newTeamMember),
                    // Eliminar de candidatos
                    teamCandidates: firestore.FieldValue.arrayRemove(existingCandidate)
                  });
                }
                
                // Actualizar el equipo del nuevo miembro
                for (const member of currentTeam) {
                  await updateDoc(swipedUserRef, {
                    currentTeam: arrayUnion(member)
                  });
                }
                
                // Añadir al usuario actual al equipo del nuevo miembro
                const currentUserTeamMember = {
                  id: currentAuthUser.uid,
                  name: currentUserData.name,
                  photoURL: currentUserData.photoURL,
                  mainSpecialty: currentUserData.mainSpecialty,
                  contactInfo: currentUserData.contactInfo || ''
                };
                
                await updateDoc(swipedUserRef, {
                  currentTeam: arrayUnion(currentUserTeamMember),
                  // Eliminar tu entrada de candidateFor
                  candidateFor: swipedUserData.candidateFor.filter(
                    candidacy => candidacy.teamOwner !== currentAuthUser.uid
                  )
                });
              }
            }
          }
          // No tienes equipo, el usuario sí tiene y te ha propuesto - únete a su equipo
          else if (swipedUserData.currentTeam && swipedUserData.currentTeam.length > 0) {
            // Encontrar la candidatura correspondiente
            const relevantCandidacy = currentUserData.candidateFor.find(
              candidacy => candidacy.teamOwner === swipedUser.id
            );
            
            if (relevantCandidacy) {
              // El usuario te aprobó, únete a su equipo
              // Añadir todos los miembros de su equipo a tu equipo
              for (const memberId of relevantCandidacy.teamMembers) {
                const memberDoc = await getDoc(doc(db, 'devs', memberId));
                const memberData = memberDoc.data();
                
                const memberInfo = {
                  id: memberId,
                  name: memberData.name,
                  photoURL: memberData.photoURL,
                  mainSpecialty: memberData.mainSpecialty,
                  contactInfo: memberData.contactInfo || ''
                };
                
                await updateDoc(userRef, {
                  currentTeam: arrayUnion(memberInfo)
                });
              }
              
              // Añadirte al equipo de todos los miembros
              const yourInfo = {
                id: currentAuthUser.uid,
                name: currentUserData.name,
                photoURL: currentUserData.photoURL,
                mainSpecialty: currentUserData.mainSpecialty,
                contactInfo: currentUserData.contactInfo || ''
              };
              
              for (const memberId of relevantCandidacy.teamMembers) {
                await updateDoc(doc(db, 'devs', memberId), {
                  currentTeam: arrayUnion(yourInfo),
                  // Eliminar tu candidatura
                  teamCandidates: firestore.FieldValue.arrayRemove({
                    id: currentAuthUser.uid,
                    // Resto de tus datos como candidato...
                  })
                });
              }
              
              // Eliminar tu candidatura
              await updateDoc(userRef, {
                candidateFor: currentUserData.candidateFor.filter(
                  candidacy => candidacy.teamOwner !== swipedUser.id
                )
              });
            }
          }
          // Ninguno tiene equipo, crear un nuevo equipo de 2 personas
          else {
            // Crear un nuevo equipo con ambos usuarios
            const newTeamMember = {
              id: swipedUser.id,
              name: swipedUserData.name,
              photoURL: swipedUserData.photoURL,
              mainSpecialty: swipedUserData.mainSpecialty,
              contactInfo: swipedUserData.contactInfo || ''
            };
            
            const currentUserTeamMember = {
              id: currentAuthUser.uid,
              name: currentUserData.name,
              photoURL: currentUserData.photoURL,
              mainSpecialty: currentUserData.mainSpecialty,
              contactInfo: currentUserData.contactInfo || ''
            };
            
            // Actualizar ambos usuarios
            await updateDoc(userRef, {
              currentTeam: arrayUnion(newTeamMember)
            });
            
            await updateDoc(swipedUserRef, {
              currentTeam: arrayUnion(currentUserTeamMember)
            });
            
            // Eliminar candidaturas si existen
            if (currentUserData.candidateFor && currentUserData.candidateFor.length > 0) {
              await updateDoc(userRef, {
                candidateFor: currentUserData.candidateFor.filter(
                  candidacy => candidacy.teamOwner !== swipedUser.id
                )
              });
            }
            
            if (swipedUserData.teamCandidates && swipedUserData.teamCandidates.length > 0) {
              await updateDoc(swipedUserRef, {
                teamCandidates: swipedUserData.teamCandidates.filter(
                  candidate => candidate.id !== currentAuthUser.uid
                )
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error registering swipe:", error);
    }
    
    // Animación de swipe
    setTimeout(() => {
      setCurrentIndex(prevIndex => prevIndex + 1);
      setSwipeDirection(null);
    }, 300);
  };

  const handleUndo = () => {
    if (swipeHistory.length === 0) return;
    
    setSwipeHistory(swipeHistory.slice(0, -1));
    setCurrentIndex(currentIndex - 1);
    
    // Idealmente también deberías eliminar el swipe de Firebase
    // TODO: Implementar deshacer swipe en Firebase
  };

  const currentProfile = potentialTeammates[currentIndex];
  const hasMoreProfiles = currentIndex < potentialTeammates.length;

  // Función para determinar si una especialidad es relevante para el equipo
  const isSpecialtyNeeded = (specialty) => {
    return currentUser && currentUser.lookingFor && 
           currentUser.lookingFor.includes(specialty) &&
           !(currentUser.currentTeam || []).some(member => member.mainSpecialty === specialty);
  };

  // El problema está en la estructura del render
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* El Header ahora está fuera del contenedor flex centrado */}
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mt-20"></div>
          <p className="mt-4 text-gray-600">Buscando desarrolladores para tu equipo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* El Header ahora está fuera del contenedor flex principal */}
      <Header />
      
      {/* El contenido principal tiene flex-1 para ocupar el espacio restante */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-md px-4 py-6">
          {hasMoreProfiles ? (
            <div 
              {...handlers}
              className={`relative w-full max-w-sm mx-auto bg-white rounded-lg shadow-xl transition-transform duration-300 ease-out
                ${swipeDirection === 'left' ? 'translate-x-[-150%] rotate-[-20deg]' : ''}
                ${swipeDirection === 'right' ? 'translate-x-[150%] rotate-[20deg]' : ''}
              `}
            >
              {/* El contenido de la tarjeta se mantiene igual */}
              {/* Imagen de perfil */}
              <div 
                style={{ 
                  backgroundImage: `url(${currentProfile.photoURL || 'https://via.placeholder.com/400?text=No+Photo'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
                className="w-full h-64 rounded-t-lg"
              />
              
              {/* Contenido del perfil */}
              <div className="p-4">
                {/* Contenido se mantiene igual... */}
                {/* Nombre y especialidad principal */}
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-xl font-bold">{currentProfile.name}</h2>
                  <div className={`px-3 py-1 rounded-full text-sm flex items-center 
                    ${isSpecialtyNeeded(currentProfile.mainSpecialty) 
                        ? 'bg-green-100 text-green-800 font-medium' 
                        : 'bg-gray-100 text-gray-800'}`}
                  >
                    {specialtyIcons[currentProfile.mainSpecialty] || null}
                    {currentProfile.mainSpecialty}
                  </div>
                </div>
                
                {/* Badge para especialidad buscada */}
  {isSpecialtyNeeded(currentProfile.mainSpecialty) && (
    <div className="mb-3 bg-green-50 text-green-700 p-2 rounded-md text-sm border border-green-200 flex items-center">
      <span className="font-medium">Especialidad que buscas para tu equipo</span>
    </div>
  )}
  
  {/* Destacar la descripción del perfil */}
  <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-100">
    <h3 className="text-sm font-medium text-gray-700 mb-1">Acerca de:</h3>
    <p className="text-gray-600">{currentProfile.bio || "El usuario no ha proporcionado una descripción."}</p>
  </div>
  
  {/* Especialidades secundarias */}
  {currentProfile.secondarySpecialties && currentProfile.secondarySpecialties.length > 0 && (
    <div className="mb-3">
      <h3 className="text-sm font-medium text-gray-700 mb-1">También conoce:</h3>
      <div className="flex flex-wrap gap-1">
        {currentProfile.secondarySpecialties.map((skill, index) => (
          <span key={index} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs flex items-center">
            {specialtyIcons[skill] || null}
            {skill}
          </span>
        ))}
      </div>
    </div>
  )}
  
  {/* Portfolio link */}
  {currentProfile.portfolioLink && (
    <div className="mb-3">
      <h3 className="text-sm font-medium text-gray-700 mb-1">Portfolio:</h3>
      <a 
        href={currentProfile.portfolioLink} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-blue-600 hover:underline text-sm break-words"
      >
        {currentProfile.portfolioLink}
      </a>
    </div>
  )}
  
  {/* Intereses de equipo */}
  {currentProfile.lookingFor && currentProfile.lookingFor.length > 0 && (
    <div className="mb-2">
      <h3 className="text-sm font-medium text-gray-700 mb-1">Está buscando:</h3>
      <div className="flex flex-wrap gap-1">
        {currentProfile.lookingFor.map((specialty, index) => (
          <span 
            key={index} 
            className={`px-2 py-0.5 rounded-full text-xs ${
              specialty === currentUser.mainSpecialty 
                ? 'bg-purple-100 text-purple-800 font-medium' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {specialtyIcons[specialty] || null}
            {specialty}
          </span>
        ))}
      </div>
    </div>
  )}
  
  {/* Compatibilidad */}
  {currentUser && currentUser.mainSpecialty && 
   currentProfile.lookingFor && 
   currentProfile.lookingFor.includes(currentUser.mainSpecialty) && (
    <div className="mt-3 bg-purple-50 text-purple-700 p-2 rounded-md text-sm border border-purple-200">
      <span className="font-medium">¡Está buscando tu especialidad!</span>
    </div>
  )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] bg-white rounded-lg shadow-md p-8 text-center mx-auto">
              <p className="text-xl text-gray-500 mb-4">No hay más perfiles disponibles</p>
              <p className="text-sm text-gray-400 mb-6">Vuelve más tarde para encontrar nuevos compañeros de equipo</p>
              {swipeHistory.length > 0 && (
                <button 
                  onClick={() => setCurrentIndex(0)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                >
                  Volver a empezar
                </button>
              )}
            </div>
          )}

          {hasMoreProfiles && (
            <div className="flex justify-center gap-16 mt-8 mb-8">
              <button 
                onClick={() => handleSwipe('left')}
                className="p-4 rounded-full bg-white text-red-500 shadow-md hover:bg-red-100"
                aria-label="Rechazar"
              >
                <FaTimes size={28} />
              </button>
              
              {swipeHistory.length > 0 && (
                <button 
                  onClick={handleUndo}
                  className="p-4 rounded-full bg-white text-blue-500 shadow-md hover:bg-blue-100"
                  aria-label="Deshacer"
                >
                  <FaUndo size={28} />
                </button>
              )}
              
              <button 
                onClick={() => handleSwipe('right')}
                className="p-4 rounded-full bg-white text-green-500 shadow-md hover:bg-green-100"
                aria-label="Aceptar para equipo"
              >
                <FaHeart size={28} />
              </button>
            </div>
          )}
          
          {/* Contador de equipo actual */}
          {currentUser && currentUser.currentTeam && (
            <div className="bg-white p-3 rounded-full shadow-md flex items-center justify-center mx-auto max-w-xs mb-4">
              <span className="font-medium mr-2">Equipo:</span>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, index) => (
                  <div 
                    key={index}
                    className={`w-3 h-3 rounded-full ${
                      index < (currentUser.currentTeam.length || 0) ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="ml-2 text-sm text-gray-600">
                {(currentUser.currentTeam.length || 0)}/5 miembros
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamSwipeCards;