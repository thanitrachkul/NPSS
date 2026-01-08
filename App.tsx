
import React, { useState } from 'react';
import { ViewState, Classroom, AdminUser } from './types';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import ClassroomSelection from './components/ClassroomSelection';
import SystemAdmin from './components/SystemAdmin';
import { LogOut } from 'lucide-react';
import { storage } from './services/storage';

const App: React.FC = () => {
  // Initialize state based on persistent session (lazy initialization)
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => storage.getSession());
  const [view, setView] = useState<ViewState>(() => storage.getSession() ? 'CLASSROOMS' : 'LANDING');
  
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLoginSuccess = (user: AdminUser) => {
    setCurrentUser(user);
    setView('CLASSROOMS');
  };

  const handleSelectClassroom = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
    setView('DASHBOARD');
  };

  const handleBackToClassrooms = () => {
    setView('CLASSROOMS');
    setSelectedClassroom(null);
  };

  // Trigger modal instead of immediate logout
  const handleLogoutRequest = () => {
    setShowLogoutConfirm(true);
  };

  // Actual logout logic
  const handleConfirmLogout = () => {
    storage.clearSession(); // Clear persistent storage
    setView('LANDING');
    setSelectedClassroom(null);
    setCurrentUser(null);
    setShowLogoutConfirm(false);
  };

  return (
    <>
      {view === 'LANDING' && (
        <LandingPage onLoginSuccess={handleLoginSuccess} />
      )}

      {view === 'CLASSROOMS' && (
        <ClassroomSelection 
          currentUser={currentUser}
          onSelect={handleSelectClassroom} 
          onLogout={handleLogoutRequest} 
          onOpenSystemAdmin={() => setView('SYSTEM_ADMIN')}
        />
      )}

      {view === 'SYSTEM_ADMIN' && (
        <SystemAdmin 
            onBack={() => setView('CLASSROOMS')} 
            currentUser={currentUser}
        />
      )}

      {view === 'DASHBOARD' && selectedClassroom && (
        <Dashboard 
            classroom={selectedClassroom}
            onLogout={handleLogoutRequest} 
            onBack={handleBackToClassrooms}
            currentUser={currentUser}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
             <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-all" 
                onClick={() => setShowLogoutConfirm(false)}
             ></div>
             <div className="bg-white rounded-[24px] shadow-2xl p-8 max-w-sm w-full relative z-10 text-center animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                      <LogOut className="w-8 h-8 text-red-500 ml-1" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">ยืนยันการออกจากระบบ?</h3>
                  <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                    คุณต้องการออกจากระบบใช่หรือไม่ <br/>
                    หากยืนยัน คุณจะต้องเข้าสู่ระบบใหม่อีกครั้ง
                  </p>
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setShowLogoutConfirm(false)}
                        className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button 
                        onClick={handleConfirmLogout}
                        className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-200"
                      >
                        ออกจากระบบ
                      </button>
                  </div>
             </div>
        </div>
      )}
    </>
  );
};

export default App;
