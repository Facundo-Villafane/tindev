// src/components/TinderCards.jsx
import { useState, useEffect, useMemo } from 'react';
import TinderCard from 'react-tinder-card';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { FaHeart, FaTimes, FaStar } from 'react-icons/fa';

const TinderCards = () => {
  const [people, setPeople] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastDirection, setLastDirection] = useState();

  useEffect(() => {
    const fetchCards = async () => {
      const cardsCollection = collection(db, "cards");
      const cardsSnapshot = await getDocs(cardsCollection);
      const cardsData = cardsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPeople(cardsData);
    };

    fetchCards();
  }, []);

  const childRefs = useMemo(
    () =>
      Array(people.length)
        .fill(0)
        .map(() => React.createRef()),
    [people.length]
  );

  const updateCurrentIndex = (val) => {
    setCurrentIndex(val);
  };

  const canGoBack = currentIndex < people.length - 1;
  const canSwipe = currentIndex >= 0;

  const swiped = (direction, nameToDelete, index) => {
    setLastDirection(direction);
    updateCurrentIndex(index - 1);
    // Aquí podrías guardar el swipe en Firebase
  };

  const outOfFrame = (name, idx) => {
    console.log(`${name} (${idx}) left the screen!`);
  };

  const swipe = async (dir) => {
    if (canSwipe && currentIndex < people.length) {
      await childRefs[currentIndex].current.swipe(dir);
    }
  };

  const goBack = async () => {
    if (!canGoBack) return;
    const newIndex = currentIndex + 1;
    updateCurrentIndex(newIndex);
    await childRefs[newIndex].current.restoreCard();
  };

  return (
    <div className="flex flex-col justify-center items-center h-[70vh]">
      <div className="w-full max-w-sm relative">
        <div className="card-container">
          {people.map((person, index) => (
            <TinderCard
              ref={childRefs[index]}
              className="swipe absolute"
              key={person.id}
              onSwipe={(dir) => swiped(dir, person.name, index)}
              onCardLeftScreen={() => outOfFrame(person.name, index)}
            >
              <div 
                style={{ backgroundImage: `url(${person.url})` }}
                className="relative w-80 h-[400px] rounded-lg bg-cover bg-center shadow-lg"
              >
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-4 text-white rounded-b-lg">
                  <h3 className="text-xl font-bold">{person.name}, {person.age}</h3>
                  <p className="text-sm">{person.bio}</p>
                </div>
              </div>
            </TinderCard>
          ))}
        </div>
      </div>
      
      {people.length > 0 ? (
        <div className="flex gap-16 mt-6 pb-4">
          <button 
            onClick={() => swipe('left')}
            className="p-4 rounded-full bg-white text-red-500 shadow-md hover:bg-red-100"
          >
            <FaTimes size={28} />
          </button>
          
          <button 
            onClick={goBack}
            className="p-4 rounded-full bg-white text-blue-500 shadow-md hover:bg-blue-100"
            disabled={!canGoBack}
          >
            <FaStar size={28} />
          </button>
          
          <button 
            onClick={() => swipe('right')}
            className="p-4 rounded-full bg-white text-green-500 shadow-md hover:bg-green-100"
          >
            <FaHeart size={28} />
          </button>
        </div>
      ) : (
        <p className="text-center text-gray-600 mt-8">No más perfiles por mostrar</p>
      )}
    </div>
  );
};

export default TinderCards;