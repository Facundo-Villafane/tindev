// src/utils/seedData.js
import { db, auth } from '../firebase/config';
import { collection, addDoc } from 'firebase/firestore';

// Datos de ejemplo para las cards
const sampleCards = [
  {
    name: "Ana",
    age: 28,
    bio: "Me encanta viajar y la fotografía",
    url: "https://randomuser.me/api/portraits/women/47.jpg",
    userId: "user1" // Este es un ID ficticio, en producción sería un UID real
  },
  {
    name: "Carlos",
    age: 32,
    bio: "Fanático del fitness y la cocina saludable",
    url: "https://randomuser.me/api/portraits/men/32.jpg",
    userId: "user2"
  },
  {
    name: "Laura",
    age: 26,
    bio: "Amante de los libros y el café",
    url: "https://randomuser.me/api/portraits/women/35.jpg",
    userId: "user3"
  },
  {
    name: "Miguel",
    age: 30,
    bio: "Músico y aventurero",
    url: "https://randomuser.me/api/portraits/men/45.jpg",
    userId: "user4"
  },
  {
    name: "Sofía",
    age: 25,
    bio: "Yoga instructor y viajera",
    url: "https://randomuser.me/api/portraits/women/63.jpg",
    userId: "user5"
  }
];

export const seedCards = async () => {
  try {
    const cardsCollection = collection(db, "cards");
    
    for (const card of sampleCards) {
      await addDoc(cardsCollection, card);
    }
    
    console.log("Datos de ejemplo añadidos correctamente");
    return true;
  } catch (error) {
    console.error("Error al añadir datos de ejemplo:", error);
    return false;
  }
};

// Puedes llamar a esta función desde la consola: import { seedCards } from './utils/seedData'; seedCards();