
import React, { useState } from 'react';
import Button from './Button';
import { Lock, X, AlertCircle, User } from 'lucide-react';
import { storage } from '../services/storage';
import { AdminUser } from '../types';

interface LoginPageProps {
  onLogin: (user: AdminUser) => void;
  onBack: () => void; // Used as Close Modal
  variant?: 'ADMIN' | 'STAFF'; // New prop to distinguish login type
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onBack, variant = 'ADMIN' }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = storage.validateUser(username, password);
    
    if (user) {
        if (variant === 'ADMIN') {
            // System Admin Portal: Allow SUPER_ADMIN and ADMIN
            if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
                storage.saveSession(user); // Persist login
                onLogin(user);
            } else {
                setError('สิทธิ์ไม่เพียงพอ: เฉพาะ Admin หรือ Super Admin เท่านั้น');
            }
        } else {
            // Staff Portal: Can be ADMIN, STAFF, or VIEWER
            // Note: Super Admin can technically login here too if they want to see the staff view
            storage.saveSession(user); // Persist login
            onLogin(user); 
        }
    } else {
        setError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
        setPassword('');
    }
  };

  // Configuration based on variant
  const isStaff = variant === 'STAFF';
  const title = isStaff ? 'เข้าสู่ระบบเจ้าหน้าที่จัดการข้อมูล' : 'เข้าสู่ระบบ Admin';
  const subtitle = isStaff ? 'สำหรับครูและบุคลากรทางการศึกษา' : 'สำหรับผู้ดูแลระบบ (System Admin)';
  const Icon = isStaff ? User : Lock;

  return (
    <div className="w-full max-w-[400px] bg-white p-10 rounded-[32px] shadow-2xl border border-white/50 relative mx-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button 
            onClick={onBack}
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
        >
            <X className="w-6 h-6" />
        </button>

        {/* Header Section */}
        <div className="text-center mb-10">
            <div className="mx-auto w-16 h-16 bg-black rounded-full flex items-center justify-center mb-5 shadow-lg shadow-black/20">
                <Icon className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-[#1D1D1F] tracking-tight">
                {title}
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-1.5">
                {subtitle}
            </p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium animate-fade-in">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
            </div>
          )}
          
          <div className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">ชื่อผู้ใช้งาน</label>
                <div className="relative">
                    <input
                        type="text"
                        required
                        className="block w-full px-5 py-3.5 bg-gray-50 border-0 rounded-2xl text-gray-900 text-base font-medium focus:ring-2 focus:ring-black/5 focus:bg-white placeholder-gray-400 transition-all outline-none"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => {
                            setUsername(e.target.value);
                            setError('');
                        }}
                    />
                </div>
            </div>
            
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">รหัสผ่าน</label>
                <div className="relative">
                    <input
                        type="password"
                        required
                        className="block w-full px-5 py-3.5 bg-gray-50 border-0 rounded-2xl text-gray-900 text-base font-medium focus:ring-2 focus:ring-black/5 focus:bg-white placeholder-gray-400 transition-all outline-none"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError('');
                        }}
                    />
                </div>
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" variant="primary" className="w-full py-3.5 text-base font-bold rounded-full shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20 transform active:scale-[0.98] transition-all">
              เข้าสู่ระบบ
            </Button>
          </div>
          
          <div className="text-center mt-6">
             <button 
                type="button" 
                onClick={onBack} 
                className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-black transition-colors px-4 py-2 rounded-lg hover:bg-gray-50"
             >
                ยกเลิก
             </button>
          </div>
        </form>
    </div>
  );
};

export default LoginPage;
