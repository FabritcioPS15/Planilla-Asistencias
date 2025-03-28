import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { LogOut, User as UserIcon, CalendarCheck, Home } from 'lucide-react';
import PeopleManagement from './PeopleManagement';
import AttendanceManagement from './AttendanceManagement';

interface AuthFormData {
  email: string;
  password: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authFormData, setAuthFormData] = useState<AuthFormData>({ email: '', password: '' });
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<'people' | 'attendances'>('people');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => setShowWelcome(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleAuthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAuthFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, authFormData.email, authFormData.password);
      } else {
        await signInWithEmailAndPassword(auth, authFormData.email, authFormData.password);
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-indigo-600 py-6 px-8 text-center">
              <h2 className="text-3xl font-bold text-white">Inicio de Sesión</h2>
              <p className="mt-1 text-indigo-200">Ingrese sus credenciales para continuar</p>
            </div>
            
            <form onSubmit={handleAuthSubmit} className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m0 0l-4 4m4-4l4-4" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={authFormData.email}
                    onChange={handleAuthInputChange}
                    className="block w-full pl-10 px-4 py-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    placeholder="usuario@ejemplo.com"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.1-.9-2-2-2s-2 .9-2 2m4 0c0 1.1-.9 2-2 2s-2-.9-2-2m4 0v1m-4 0v1m4-1h-4" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={authFormData.password}
                    onChange={handleAuthInputChange}
                    className="block w-full pl-10 px-4 py-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {authError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-3 px-4 rounded-md shadow-lg transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Ingresar
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300">
      {showWelcome && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl max-w-md w-full mx-4 shadow-2xl transform transition-all duration-300 animate-fade-in">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-2">¡Bienvenido al Sistema!</h2>
              <p className="text-gray-600 mb-6">Gestión integral de personal y asistencias</p>
              <button 
                onClick={() => setShowWelcome(false)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
              >
                Comenzar a usar
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <svg className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                </svg>
                <span className="ml-2 text-2xl font-bold text-gray-900">Grupo San Cristobal</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="hidden md:flex space-x-1 bg-gray-100 p-1 rounded-lg shadow-sm">
                <button
                  onClick={() => setCurrentView('people')}
                  className={`px-4 py-2 rounded-lg flex items-center text-sm font-medium transition ${
                    currentView === 'people' 
                      ? 'bg-white shadow-md text-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <UserIcon className="w-4 h-4 mr-2" />
                  Personal
                </button>
                <button
                  onClick={() => setCurrentView('attendances')}
                  className={`px-4 py-2 rounded-lg flex items-center text-sm font-medium transition ${
                    currentView === 'attendances' 
                      ? 'bg-white shadow-md text-green-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <CalendarCheck className="w-4 h-4 mr-2" />
                  Asistencias
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex items-center space-x-2 bg-gray-100 px-3 py-1.5 rounded-full shadow-sm">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700 truncate max-w-xs">
                    {user?.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1.5 text-sm font-medium text-gray-600 hover:text-red-500 transition"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="md:hidden bg-white shadow-md sticky top-0 z-10">
        <div className="flex justify-around">
          <button
            onClick={() => setCurrentView('people')}
            className={`py-3 px-4 text-center flex flex-col items-center text-xs font-medium w-full ${
              currentView === 'people' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
            }`}
          >
            <UserIcon className="w-5 h-5 mb-1" />
            Personal
          </button>
          <button
            onClick={() => setCurrentView('attendances')}
            className={`py-3 px-4 text-center flex flex-col items-center text-xs font-medium w-full ${
              currentView === 'attendances' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
            }`}
          >
            <CalendarCheck className="w-5 h-5 mb-1" />
            Asistencias
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentView === 'people' ? <PeopleManagement /> : <AttendanceManagement />}
      </main>
    </div>
  );
}

export default App;