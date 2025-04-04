// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { auth, db, storage } from '../firebase/config';
import { getDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router';
import Header from '../components/Header';
import TeamCandidates from '../components/TeamCandidates';
import { FaCamera, FaEdit, FaSave, FaTimes, FaChevronRight, FaCheck } from 'react-icons/fa';
import { arrayUnion, arrayRemove } from 'firebase/firestore';

const Profile = () => {
  // Estados para datos del perfil
  const [name, setName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [bio, setBio] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  
  // Especialidades y búsqueda de equipo
  const [mainSpecialty, setMainSpecialty] = useState('');
  const [secondarySpecialties, setSecondarySpecialties] = useState([]);
  const [lookingFor, setLookingFor] = useState([]);
  const [currentTeam, setCurrentTeam] = useState([]);
  
  // Estados para interface
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState('info');
  const [notification, setNotification] = useState(null);

  // Añade un estado para almacenar los likes pendientes
  const [pendingLikes, setPendingLikes] = useState([]);
  
  // Especialidades disponibles
  const specialties = [
    "Programador", 
    "Artista", 
    "Management", 
    "Game Design", 
    "Audio", 
    "No sé nada"
  ];
  
  const navigate = useNavigate();

  // Primer useEffect: Configura un listener en tiempo real para los datos del equipo
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    // Configurar listener para cambios en el documento del usuario
    const unsubscribe = onSnapshot(doc(db, 'devs', currentUser.uid), (userDoc) => {
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Actualizar datos de equipo en tiempo real
        setCurrentTeam(userData.currentTeam || []);
        
        // También actualizar otras propiedades relevantes
        setName(userData.name || currentUser.displayName || '');
        setPhotoURL(userData.photoURL || currentUser.photoURL || '');
        setBio(userData.bio || '');
        setPortfolioLink(userData.portfolioLink || '');
        setContactInfo(userData.contactInfo || '');
        setMainSpecialty(userData.mainSpecialty || '');
        setSecondarySpecialties(userData.secondarySpecialties || []);
        setLookingFor(userData.lookingFor || []);
        
        // Cargar likes pendientes en tiempo real
        loadPendingLikes(userData, currentUser.uid);
      }
    }, (error) => {
      console.error("Error al obtener actualizaciones en tiempo real:", error);
    });
    
    // Limpiar listener al desmontar
    return () => unsubscribe();
  }, []);

  // Función para cargar likes pendientes
  const loadPendingLikes = async (userData, currentUserId) => {
    try {
      // Obtener los IDs de usuarios a los que has dado like
      const teamInterests = userData.teamInterests || [];
      
      // Para cada usuario, verificar si es un match pendiente
      const pendingUsers = [];
      
      for (const userId of teamInterests) {
        // Verificar si este usuario ya está en tu equipo
        const isInTeam = (userData.currentTeam || []).some(
          member => member.id === userId
        );
        
        if (!isInTeam) {
          // Obtener datos del usuario
          const otherUserDoc = await getDoc(doc(db, 'devs', userId));
          if (otherUserDoc.exists()) {
            const otherUserData = otherUserDoc.data();
            
            // Verificar si el otro usuario te ha dado like (match)
            const hasLikedYou = (otherUserData.teamInterests || []).includes(currentUserId);
            
            // Si no es un match completo, es un like pendiente
            if (!hasLikedYou) {
              pendingUsers.push({
                id: userId,
                name: otherUserData.name || "Usuario",
                photoURL: otherUserData.photoURL,
                mainSpecialty: otherUserData.mainSpecialty || "Sin especialidad",
                bio: otherUserData.bio || "Sin descripción"
              });
            }
          }
        }
      }
      
      setPendingLikes(pendingUsers);
    } catch (error) {
      console.error("Error al obtener likes pendientes:", error);
    }
  };

  const handlePhotoChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification('La imagen no debe superar los 5MB', 'error');
        return;
      }
      
      setPhotoFile(file);
      // Mostrar vista previa
      setPhotoURL(URL.createObjectURL(file));
    }
  };

  const toggleSecondarySpecialty = (specialty) => {
    if (specialty === mainSpecialty) return; // No puede ser secundaria si ya es principal
    
    if (secondarySpecialties.includes(specialty)) {
      setSecondarySpecialties(secondarySpecialties.filter(s => s !== specialty));
    } else {
      setSecondarySpecialties([...secondarySpecialties, specialty]);
    }
  };

  const toggleLookingFor = (specialty) => {
    if (specialty === mainSpecialty) return; // No puede buscar su propia especialidad principal
    
    if (lookingFor.includes(specialty)) {
      setLookingFor(lookingFor.filter(s => s !== specialty));
    } else {
      setLookingFor([...lookingFor, specialty]);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const user = auth.currentUser;
      
      // Validar especialidad principal
      if (!mainSpecialty) {
        showNotification('Debes seleccionar una especialidad principal', 'error');
        setSaving(false);
        return;
      }
      
      // Actualizar foto si se cambió
      let updatedPhotoURL = photoURL;
      if (photoFile) {
        const photoRef = ref(storage, `profile_photos/${user.uid}`);
        await uploadBytes(photoRef, photoFile);
        updatedPhotoURL = await getDownloadURL(photoRef);
      }
      
      // Estructurar datos para guardar
      const profileData = {
        name,
        bio,
        photoURL: updatedPhotoURL,
        portfolioLink,
        contactInfo,
        mainSpecialty,
        secondarySpecialties,
        lookingFor,
        lastUpdated: new Date()
      };
      
      // No incluir currentTeam en la actualización para evitar sobrescribir datos del equipo
      // que podrían haber cambiado mientras se editaba el perfil
      
      // Actualizar datos en Firestore
      await updateDoc(doc(db, 'devs', user.uid), profileData);
      
      showNotification('Perfil actualizado correctamente');
      setEditMode(false);
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      showNotification('Error al actualizar el perfil', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      showNotification('Error al cerrar sesión', 'error');
    }
  };

  // Verifica si una especialidad ya está representada en el equipo
  const isSpecialtyInTeam = (specialty) => {
    return currentTeam.some(member => member.mainSpecialty === specialty);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {notification && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-md shadow-lg ${
          notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}
      
      <div className="max-w-md mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Mi Perfil</h1>
          {!editMode ? (
            <button 
              onClick={() => setEditMode(true)}
              className="flex items-center bg-blue-500 text-white px-3 py-1 rounded-full hover:bg-blue-600 transition"
            >
              <FaEdit className="mr-1" /> Editar
            </button>
          ) : (
            <button 
              onClick={() => setEditMode(false)}
              className="flex items-center bg-gray-500 text-white px-3 py-1 rounded-full hover:bg-gray-600 transition"
            >
              <FaTimes className="mr-1" /> Cancelar
            </button>
          )}
        </div>
        
        {/* Foto de perfil */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <img 
              src={photoURL || 'https://via.placeholder.com/150?text=Sin+Foto'} 
              alt="Foto de perfil"
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md"
            />
            {editMode && (
              <label className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-2 cursor-pointer shadow-md hover:bg-blue-600 transition">
                <FaCamera className="text-white" />
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handlePhotoChange} 
                  accept="image/*"
                />
              </label>
            )}
          </div>
        </div>
        
        {/* Tabs de navegación */}
        <div className="flex border-b mb-4">
          <button 
            className={`py-2 px-4 font-medium ${activeSection === 'info' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveSection('info')}
          >
            Información Personal
          </button>
          <button 
            className={`py-2 px-4 font-medium ${activeSection === 'team' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveSection('team')}
          >
            Mi Equipo {currentTeam.length > 0 && <span className="ml-1 bg-green-500 text-white text-xs px-1.5 rounded-full">{currentTeam.length}</span>}
          </button>
          <button 
            className={`py-2 px-4 font-medium ${activeSection === 'pending' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveSection('pending')}
          >
            Pendientes {pendingLikes.length > 0 && <span className="ml-1 bg-yellow-500 text-white text-xs px-1.5 rounded-full">{pendingLikes.length}</span>}
          </button>
        </div>
        
        {/* Formulario principal */}
        <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow-md">
          {activeSection === 'info' ? (
            <>
              {/* Sección de Información Personal */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                    disabled={!editMode}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biografía</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    disabled={!editMode}
                    placeholder={editMode ? "Cuéntanos sobre ti, tu experiencia y proyectos..." : ""}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enlace a portafolio (opcional)</label>
                  <input
                    type="url"
                    value={portfolioLink}
                    onChange={(e) => setPortfolioLink(e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                    disabled={!editMode}
                    placeholder={editMode ? "https://tuportafolio.com" : ""}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Información de contacto</label>
                  <input
                    type="text"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                    disabled={!editMode}
                    placeholder={editMode ? "Discord: usuario#0000, Email: tu@email.com" : ""}
                  />
                  <p className="text-xs text-gray-500 mt-1">Esta información se compartirá solo con tus matches de equipo</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Especialidad Principal</label>
                  <div className="grid grid-cols-2 gap-2">
                    {specialties.map((specialty) => (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => editMode && setMainSpecialty(specialty)}
                        className={`p-2 rounded-md text-center text-sm ${
                          mainSpecialty === specialty 
                            ? 'bg-blue-500 text-white' 
                            : editMode 
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' 
                              : 'bg-gray-100 text-gray-800'
                        }`}
                        disabled={!editMode}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Especialidades Secundarias (opcional)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {specialties.map((specialty) => (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => editMode && toggleSecondarySpecialty(specialty)}
                        className={`p-2 rounded-md text-center text-sm ${
                          secondarySpecialties.includes(specialty)
                            ? 'bg-green-500 text-white' 
                            : mainSpecialty === specialty
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : editMode 
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' 
                                : 'bg-gray-100 text-gray-800'
                        }`}
                        disabled={!editMode || mainSpecialty === specialty}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Busco para mi equipo:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {specialties.map((specialty) => (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => editMode && toggleLookingFor(specialty)}
                        className={`p-2 rounded-md text-center text-sm flex items-center justify-center ${
                          isSpecialtyInTeam(specialty)
                            ? 'bg-gray-300 text-gray-600 line-through'
                            : lookingFor.includes(specialty)
                              ? 'bg-purple-500 text-white' 
                              : mainSpecialty === specialty
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : editMode 
                                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' 
                                  : 'bg-gray-100 text-gray-800'
                        }`}
                        disabled={!editMode || mainSpecialty === specialty || isSpecialtyInTeam(specialty)}
                      >
                        {specialty}
                        {isSpecialtyInTeam(specialty) && <FaCheck className="ml-1 text-green-600" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Las especialidades tachadas ya están cubiertas en tu equipo</p>
                </div>
              </div>
            </>
          ) : activeSection === 'team' ? (
            <>
              {/* Sección de Mi Equipo */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Estado de tu equipo</h3>
                
                {currentTeam.length > 0 ? (
                  <div className="space-y-3">
                    {currentTeam.map((member, index) => (
                      <div key={index} className="flex items-center p-3 bg-gray-50 rounded-md">
                        <img 
                          src={member.photoURL || 'https://via.placeholder.com/40?text=Dev'} 
                          alt={member.name}
                          className="w-10 h-10 rounded-full mr-3 object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{member.name}</p>
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs mr-2">
                              {member.mainSpecialty}
                            </span>
                            {member.contactInfo && (
                              <span className="text-xs text-gray-500">{member.contactInfo}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="text-center mt-4">
                      <p className="font-medium">
                        {currentTeam.length < 4 
                          ? `Equipo en formación (${currentTeam.length}/5 miembros)` 
                          : `¡Equipo completo! (${currentTeam.length}/5 miembros)`}
                      </p>
                      
                      <div className="flex justify-center mt-2 space-x-1">
                        {[...Array(5)].map((_, index) => (
                          <div 
                            key={index}
                            className={`w-3 h-3 rounded-full ${
                              index < currentTeam.length ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      
                      {currentTeam.length >= 4 && (
                        <p className="mt-4 text-sm text-gray-600">
                          ¡Felicidades! Tu equipo está listo para comenzar a trabajar en su proyecto.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-lg text-gray-600 mb-2">Aún no tienes miembros en tu equipo</p>
                    <p className="text-sm text-gray-500">Comienza a hacer swipe para encontrar compañeros</p>
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      Ir a buscar equipo
                    </button>
                  </div>
                )}
                
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Especialidades que necesitas:</h4>
                  <div className="flex flex-wrap gap-2">
                    {lookingFor.length > 0 ? (
                      lookingFor.map((specialty) => (
                        <span 
                          key={specialty}
                          className={`px-3 py-1 rounded-full text-sm ${
                            isSpecialtyInTeam(specialty)
                              ? 'bg-green-100 text-green-800 line-through'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {specialty}
                          {isSpecialtyInTeam(specialty) && <FaCheck className="inline ml-1" />}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">No has especificado especialidades que necesitas</p>
                    )}
                  </div>
                </div>
                <TeamCandidates/>
              </div>
            </>
          ) : activeSection === 'pending' && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Desarrolladores a los que te interesa</h3>
              
              {pendingLikes.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No tienes matches pendientes.</p>
                  <p className="text-sm text-gray-400 mt-2">Haz swipe a la derecha para mostrar interés en más perfiles.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingLikes.map((user) => (
                    <div key={user.id} className="flex items-start p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                      <img 
                        src={user.photoURL || 'https://via.placeholder.com/50?text=Dev'} 
                        alt={user.name}
                        className="w-14 h-14 rounded-full object-cover mr-4"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{user.name}</h4>
                            <div className="flex items-center mt-1">
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                                {user.mainSpecialty}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">
                                <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
                                Pendiente
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full border border-purple-100">
                            Esperando respuesta
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{user.bio}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="text-center mt-6">
                <p className="text-sm text-gray-500">Cuando un desarrollador te corresponda, aparecerá en tu lista de matches.</p>
              </div>
            </div>
          )}
          
          {/* Botones de acción */}
          {editMode && (
            <button
              type="submit"
              disabled={saving}
              className="w-full mt-6 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <FaSave className="mr-2" /> Guardar Cambios
                </>
              )}
            </button>
          )}
        </form>
        
        {/* Opciones adicionales */}
        <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b">
            <button 
              onClick={() => navigate('/messages')} 
              className="w-full py-3 px-4 flex justify-between items-center hover:bg-gray-50"
            >
              <span className="text-gray-700">Mensajes del Equipo</span>
              <FaChevronRight className="text-gray-400" />
            </button>
          </div>
          <div>
            <button 
              onClick={handleLogout}
              className="w-full py-3 px-4 flex justify-between items-center text-red-600 hover:bg-gray-50"
            >
              <span>Cerrar Sesión</span>
              <FaChevronRight className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;