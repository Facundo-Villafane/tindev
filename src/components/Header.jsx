// src/components/Header.jsx
import { Link } from 'react-router';
import { FaUser, FaFire, FaComments } from 'react-icons/fa';

const Header = () => {
  return (
    <header className="flex justify-between items-center p-4 border-b">
      <Link to="/profile" className="text-gray-700 hover:text-gray-900">
        <FaUser size={24} />
      </Link>
      
      <Link to="/" className="text-red-500 hover:text-red-600">
        <FaFire size={32} />
      </Link>
      
      <Link to="/messages" className="text-gray-700 hover:text-gray-900">
        <FaComments size={24} />
      </Link>
    </header>
  );
};

export default Header;