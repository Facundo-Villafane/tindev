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

  // useEffect, funciones y lógica se mantienen igual...

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
                
                {/* El resto del contenido de la tarjeta se mantiene igual */}
                {/* ... */}
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