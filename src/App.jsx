// src/App.jsx
import { createBrowserRouter, RouterProvider } from 'react-router';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import ProtectedRoute from './components/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoute><Home /></ProtectedRoute>
  },
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/signup",
    element: <Signup />
  },
  {
    path: "/profile",
    element: <ProtectedRoute><Profile /></ProtectedRoute>
  },
  {
    path: "/messages",
    element: <ProtectedRoute><Messages /></ProtectedRoute>
  },
  {
    path: "/chat/:matchId",
    element: <ProtectedRoute><Chat /></ProtectedRoute>
  }
]);

function App() {
  return (
    <RouterProvider router={router} />
  );
}

export default App;