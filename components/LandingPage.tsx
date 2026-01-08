
import React, { useState } from 'react';
import Button from './Button';
import LoginPage from './LoginPage';
import { Lock } from 'lucide-react';
import { AdminUser } from '../types';

interface LandingPageProps {
  onLoginSuccess: (user: AdminUser) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
  // Change state from boolean to specific type ('ADMIN' | 'STAFF' | null)
  const [loginType, setLoginType] = useState<'ADMIN' | 'STAFF' | null>(null);

  const handleOpenLogin = (type: 'ADMIN' | 'STAFF') => {
      setLoginType(type);
  };

  const handleCloseLogin = () => {
      setLoginType(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col relative overflow-hidden">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(#D1D5DB 1px, transparent 1px), linear-gradient(90deg, #D1D5DB 1px, transparent 1px)`,
            backgroundSize: '45px 45px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#F5F5F7]/30 to-[#F5F5F7]" />
      </div>

      {/* Header / Nav - Updated Position */}
      <nav className="relative z-20 px-6 py-4 flex justify-end">
          <button 
                onClick={() => handleOpenLogin('ADMIN')}
                className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black transition-colors px-4 py-2 rounded-full hover:bg-white/50 backdrop-blur-sm"
            >
                <Lock className="w-4 h-4" /> เข้าสู่ระบบ Admin
            </button>
      </nav>

      {/* Hero Section - Centered */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 relative z-10 -mt-10">
        <div className="max-w-4xl mx-auto text-center fade-in-up">
          
          {/* Logo Section */}
          <div className="flex justify-center mb-8">
            <div className="relative p-2">
                <img 
                  src="https://drive.google.com/thumbnail?id=1LAeHd6QVmR9w5rtrQUHBEZqToPc2WD0b&sz=1000" 
                  alt="ตราโรงเรียนหนองกี่พิทยาคม" 
                  className="w-[120px] h-[120px] md:w-[140px] md:h-[140px] object-contain drop-shadow-md hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
            </div>
          </div>

          {/* Main Titles */}
          <h1 className="text-3xl md:text-5xl lg:text-[54px] font-bold text-[#1D1D1F] tracking-tight leading-tight mb-4 px-4">
            ระบบคัดเลือกนักเรียน
          </h1>
          
          <h2 className="text-2xl md:text-3xl lg:text-4xl text-gray-700 font-semibold tracking-tight mb-4">
            โรงเรียนหนองกี่พิทยาคม
          </h2>

          <div className="mb-12">
              <p className="text-lg md:text-xl text-gray-500 font-normal max-w-4xl mx-auto leading-relaxed">
                ระบบบริหารจัดการสำหรับรับวิเคราะห์และประเมินผลในการคัดเลือกนักเรียนเข้าศึกษาในสถานศึกษา
                <br className="block mt-1" />
                ระดับชั้นมัธยมศึกษาปีที่ 1 และ ชั้นมัธยมศึกษาปีที่ 4
              </p>
          </div>
          
          {/* Main CTA Button - Login */}
          <div className="flex flex-col items-center gap-6">
            <Button 
                size="lg" 
                onClick={() => handleOpenLogin('STAFF')} 
                className="shadow-xl shadow-black/10 px-12 py-4 text-lg font-bold rounded-full transform transition hover:scale-105 active:scale-95"
            >
              เข้าสู่ระบบจัดการข้อมูล
            </Button>
          </div>

        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-8 bg-transparent text-center relative z-10 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 group">
            <span className="text-[11px] text-gray-400 font-medium">พัฒนาโดย</span>
            <a 
                href="https://thanitlab.framer.website/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[11px] text-gray-600 font-bold hover:text-black transition-colors tracking-wide"
            >
                Thanit Lab
            </a>
            <div className="group-hover:scale-110 transition-transform">
                <img 
                    src="https://drive.google.com/thumbnail?id=1C3Tfeq-p3IPzGIapncHjL4vuljkfNTzn" 
                    alt="Thanit Lab Logo" 
                    className="w-[20px] h-[20px] object-contain mix-blend-multiply"
                    referrerPolicy="no-referrer"
                />
            </div>
        </div>
        <p className="text-[10px] text-gray-300 font-medium mt-1">NPSS V.1.1.5</p>
      </footer>

      {/* Login Modal Overlay */}
      {loginType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-md transition-all duration-300"
            onClick={handleCloseLogin}
          ></div>
          
          <div className="relative z-10 w-full flex justify-center animate-fade-in-up">
            <LoginPage 
                onLogin={onLoginSuccess} 
                onBack={handleCloseLogin}
                variant={loginType}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
