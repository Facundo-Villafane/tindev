// src/pages/Login.jsx
import { useState } from 'react';
import { auth } from '../firebase/config';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router';
import { FaGoogle } from 'react-icons/fa';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const Login = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Verificar si el usuario ya existe en Firestore
      const userDoc = await getDoc(doc(db, 'devs', user.uid));
      
      if (!userDoc.exists()) {
        // Es un usuario nuevo, guardar datos básicos en Firestore
        await setDoc(doc(db, 'devs', user.uid), {
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            createdAt: new Date(),
            // Campos adicionales
            age: 0,
            bio: '',
            interests: []
          });
      }

      // Redireccionar al usuario a la página principal
      navigate('/');
    } catch (error) {
      console.error("Error al iniciar sesión con Google:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">{`</>`} tindev</h2>
          <p className="mt-2 text-sm text-gray-600">
            Inicia sesión para encontrar tu grupo perfecto
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
        >
          <FaGoogle className="mr-2" />
          {loading ? 'Iniciando sesión...' : 'Iniciar sesión con Google'}
        </button>
        
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                Al iniciar sesión, aceptas nuestros términos y condiciones
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;