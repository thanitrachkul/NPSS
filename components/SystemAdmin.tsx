
import React, { useState, useEffect } from 'react';
import { AdminUser, SystemConfig, ActivityLog } from '../types';
import { storage } from '../services/storage';
import api from '../services/api';
import Button from './Button';
import { Users, Save, Plus, Copy, Check, Server, Shield, Database, X, AlertCircle, Wrench, Activity, Clock, Lock, Pencil, Trash2, AlertTriangle } from 'lucide-react';

interface SystemAdminProps {
  onBack: () => void;
  currentUser: AdminUser | null;
}

const SystemAdmin: React.FC<SystemAdminProps> = ({ onBack, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'CONFIG' | 'ACTIVITIES'>('USERS');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [config, setConfig] = useState<SystemConfig>({ scriptUrl: '', sheetId: '', driveId: '' });
  
  // User Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<AdminUser>>({});
  const [isPasswordChanged, setIsPasswordChanged] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Modal State
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);

  // Copy Feedback
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setUsers(storage.getUsers());
    setConfig(storage.getConfig());
    setLogs(storage.getLogs());
    
    // Auto switch to CONFIG tab if URL is missing AND user is Super Admin
    const currentConfig = storage.getConfig();
    if (!currentConfig.scriptUrl && isSuperAdmin) {
        setActiveTab('CONFIG');
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(key);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleSaveConfig = () => {
    storage.saveConfig(config);
    storage.addLog(currentUser, 'UPDATE_CONFIG', 'Updated system configuration');
    alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
  };

  const handleSetupDatabase = async () => {
    if (!config.scriptUrl) {
        alert('กรุณาบันทึก Web App URL ก่อนดำเนินการ');
        return;
    }
    
    if (!confirm('คุณต้องการสร้าง/ซ่อมแซมตารางฐานข้อมูลใช่หรือไม่? \n(ดำเนินการสร้าง Sheet ใหม่หากยังไม่มี)')) {
        return;
    }

    setIsSettingUp(true);
    try {
        await api.setupDatabase();
        storage.addLog(currentUser, 'SETUP_DB', 'Initialized database tables');
        alert('ติดตั้งฐานข้อมูลเรียบร้อยแล้ว (Sheets Created)');
    } catch (e: any) {
        alert('เกิดข้อผิดพลาดในการติดตั้ง: ' + e.message);
    } finally {
        setIsSettingUp(false);
    }
  };

  const handleAddUserClick = () => {
    // Default to STAFF for convenience
    setEditingUser({ role: 'STAFF' });
    setIsPasswordChanged(true);
    setFormError(null);
    setShowUserModal(true);
  };

  const handleEditUserClick = (user: AdminUser) => {
    setEditingUser({ ...user }); // Clone
    setIsPasswordChanged(false); // Default to not changing password
    setFormError(null);
    setShowUserModal(true);
  };

  const handleClickDelete = (user: AdminUser) => {
    setDeletingUser(user);
  };

  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    try {
        storage.deleteUser(deletingUser.id);
        storage.addLog(currentUser, 'DELETE_USER', `Deleted user ID: ${deletingUser.id}`);
        loadData(); // Reload UI immediately
        setDeletingUser(null);
    } catch (e: any) {
        alert(e.message);
    }
  };

  const handleUserModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Basic Validation
    if (!editingUser.username || !editingUser.name) {
        setFormError('กรุณากรอกชื่อและ Username ให้ครบถ้วน');
        return;
    }

    if (!editingUser.id && !editingUser.password) {
        setFormError('กรุณากำหนดรหัสผ่าน');
        return;
    }

    try {
        if (editingUser.id) {
            // Update
            const updated = { ...editingUser } as AdminUser;
            if (!isPasswordChanged) {
                const old = users.find(u => u.id === editingUser.id);
                if (old) updated.password = old.password;
            }
            storage.updateUser(updated);
            storage.addLog(currentUser, 'UPDATE_USER', `Updated user: ${updated.username} (${updated.role})`);
        } else {
            // Create
            const newUser: AdminUser = {
                id: `admin-${Date.now()}`,
                username: editingUser.username!,
                password: editingUser.password!,
                name: editingUser.name!,
                role: editingUser.role || 'STAFF'
            };
            storage.addUser(newUser);
            storage.addLog(currentUser, 'CREATE_USER', `Created user: ${newUser.username} (${newUser.role})`);
        }
        setShowUserModal(false);
        loadData();
    } catch (e: any) {
        setFormError(e.message); // Show error in modal
    }
  };

  const isConnected = config.scriptUrl && config.scriptUrl.includes('script.google.com');

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-black rounded-lg">
                    <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-gray-900">System Admin</h1>
                    <p className="text-xs text-gray-500 font-medium">ระบบจัดการหลังบ้าน ({currentUser?.role})</p>
                </div>
            </div>
            <button onClick={onBack} className="text-sm font-bold text-gray-500 hover:text-black">
                กลับสู่หน้าหลัก
            </button>
        </div>
      </header>

      <main className="flex-grow p-6 max-w-5xl mx-auto w-full">
        
        <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 flex-shrink-0">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 sticky top-24 space-y-1">
                    <button
                        onClick={() => setActiveTab('USERS')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'USERS' ? 'bg-gray-100 text-black' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Users className="w-5 h-5" /> เจ้าหน้าที่ดูแลระบบ
                    </button>
                    
                    {/* Config Tab: HIDDEN for Non-SuperAdmin */}
                    {isSuperAdmin && (
                        <button
                            onClick={() => setActiveTab('CONFIG')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                activeTab === 'CONFIG' 
                                    ? 'bg-gray-100 text-black' 
                                    : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            <Server className="w-5 h-5" /> ตั้งค่า Backend
                            {!isConnected && <AlertCircle className="w-4 h-4 text-red-500 ml-auto" />}
                        </button>
                    )}

                    {/* Activity Logs: Only for Super Admin */}
                    {isSuperAdmin && (
                        <button
                            onClick={() => setActiveTab('ACTIVITIES')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'ACTIVITIES' ? 'bg-gray-100 text-black' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <Activity className="w-5 h-5" /> กิจกรรม (Activity)
                        </button>
                    )}
                </div>
            </aside>

            {/* Content Area */}
            <div className="flex-1">
                
                {/* --- TAB: USERS --- */}
                {activeTab === 'USERS' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">จัดการเจ้าหน้าที่</h2>
                                <p className="text-sm text-gray-500">เพิ่ม ลบ แก้ไข ผู้ที่มีสิทธิ์เข้าถึงระบบ</p>
                            </div>
                            <Button onClick={handleAddUserClick}>
                                <Plus className="w-5 h-5 mr-2" /> เพิ่มผู้ใช้งาน
                            </Button>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">ชื่อ - สกุล</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Username</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">รหัสผ่าน</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">ระดับสิทธิ์</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {users.map(user => {
                                        const isTargetSuperAdmin = user.role === 'SUPER_ADMIN';
                                        // Hide credentials if I am NOT super admin, and the target IS super admin
                                        const hideCredentials = !isSuperAdmin && isTargetSuperAdmin;
                                        
                                        // Delete permission logic
                                        const canEdit = isSuperAdmin || !isTargetSuperAdmin;
                                        const canDelete = user.id !== 'admin-001' && (isSuperAdmin || !isTargetSuperAdmin);

                                        return (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-gray-900">{user.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {hideCredentials ? (
                                                    <span className="text-gray-400 text-xs italic font-medium">(สงวนสิทธิ์)</span>
                                                ) : (
                                                    <div className="text-sm text-gray-600 font-mono">{user.username}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {hideCredentials ? (
                                                    <div className="flex items-center gap-1 text-gray-300">
                                                        <Lock className="w-3 h-3" />
                                                        <span className="text-xs tracking-widest">••••••</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-gray-600 font-mono tracking-wider">{user.password}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold 
                                                    ${user.role === 'SUPER_ADMIN' ? 'bg-black text-white' : 
                                                      user.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                                                      user.role === 'STAFF' ? 'bg-green-100 text-green-700' :
                                                      'bg-gray-200 text-gray-600'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    {canEdit && (
                                                        <button 
                                                            onClick={() => handleEditUserClick(user)} 
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="แก้ไข"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    
                                                    {canDelete && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleClickDelete(user)} 
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="ลบ"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {/* --- TAB: CONFIG --- */}
                {activeTab === 'CONFIG' && isSuperAdmin && (
                    <div className="space-y-8 animate-fade-in">
                        <div>
                             <h2 className="text-2xl font-bold text-gray-900">เชื่อมต่อ Backend</h2>
                             <p className="text-sm text-gray-500">ตั้งค่าการเชื่อมต่อกับ Google Sheets และ Google Drive</p>
                        </div>

                        {/* Connection Card */}
                        <div className={`bg-white rounded-2xl shadow-sm border ${isConnected ? 'border-gray-200' : 'border-red-200 ring-4 ring-red-50'} p-8 transition-all`}>
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-900 mb-2">Web App URL (จาก App Script)</label>
                                <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                                    1. เปิดไฟล์ <code>Code.gs</code> ใน Google Apps Script แล้ววางโค้ดล่าสุด<br/>
                                    2. กดปุ่มสีน้ำเงิน <strong>Deploy (การทำให้ใช้งานได้)</strong> &gt; <strong>New Deployment (รายการใหม่)</strong> <span className="text-red-500 font-bold">*สำคัญมาก ต้องกด New ทุกครั้งที่แก้โค้ด</span><br/>
                                    3. เลือก Web App &gt; ตั้งค่า <strong>Who has access: Anyone (ทุกคน)</strong><br/>
                                    4. คัดลอก URL มาวางในช่องด้านล่าง
                                </p>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={config.scriptUrl}
                                        onChange={(e) => setConfig({ ...config, scriptUrl: e.target.value })}
                                        className="flex-1 block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all font-mono"
                                        placeholder="https://script.google.com/macros/s/..."
                                    />
                                    <button 
                                        onClick={() => handleSaveConfig()}
                                        className="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" /> บันทึก
                                    </button>
                                </div>
                                {!isConnected && (
                                    <p className="text-xs text-red-500 font-bold mt-2 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> ยังไม่ได้เชื่อมต่อ หรือ URL ไม่ถูกต้อง
                                    </p>
                                )}
                                {isConnected && (
                                    <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> URL ถูกต้องพร้อมใช้งาน
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* ID References Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <Database className="w-6 h-6 text-gray-400" />
                                <h3 className="text-lg font-bold text-gray-900">ฐานข้อมูล (Database Reference)</h3>
                            </div>
                            
                            <div className="space-y-6">
                                {/* Google Sheet ID */}
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Google Sheet ID</label>
                                        {copyFeedback === 'sheetId' && <span className="text-xs font-bold text-green-600 flex items-center gap-1"><Check className="w-3 h-3"/> คัดลอกแล้ว</span>}
                                    </div>
                                    <div className="relative group">
                                        <input 
                                            type="text" 
                                            value={config.sheetId}
                                            onChange={(e) => setConfig({ ...config, sheetId: e.target.value })}
                                            className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-600 focus:text-black focus:bg-white focus:ring-2 focus:ring-black/5 transition-all"
                                            placeholder="ระบุ Sheet ID เพื่อระบุฐานข้อมูลที่แน่นอน (แนะนำ)"
                                        />
                                        <button 
                                            onClick={() => handleCopy(config.sheetId, 'sheetId')}
                                            className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-black bg-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-gray-100"
                                            title="คัดลอก"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        * แนะนำให้ระบุ หากไม่ระบุระบบจะใช้ Sheet ที่ Script ผูกอยู่ (Active Spreadsheet)
                                    </p>
                                </div>

                                {/* Google Drive ID */}
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Google Drive ID</label>
                                        {copyFeedback === 'driveId' && <span className="text-xs font-bold text-green-600 flex items-center gap-1"><Check className="w-3 h-3"/> คัดลอกแล้ว</span>}
                                    </div>
                                    <div className="relative group">
                                        <input 
                                            type="text" 
                                            value={config.driveId}
                                            onChange={(e) => setConfig({ ...config, driveId: e.target.value })}
                                            className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-600 focus:text-black focus:bg-white focus:ring-2 focus:ring-black/5 transition-all"
                                        />
                                        <button 
                                            onClick={() => handleCopy(config.driveId, 'driveId')}
                                            className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-black bg-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-gray-100"
                                            title="คัดลอก"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                         <Wrench className="w-4 h-4" />
                                         <span>Database Maintenance</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            onClick={handleSetupDatabase} 
                                            variant="secondary" 
                                            size="sm"
                                            disabled={isSettingUp}
                                            className="text-xs font-bold text-gray-700 hover:text-black hover:bg-gray-200"
                                        >
                                            {isSettingUp ? 'กำลังดำเนินการ...' : 'ติดตั้งฐานข้อมูล (Initialize DB)'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: ACTIVITIES (New) --- */}
                {activeTab === 'ACTIVITIES' && isSuperAdmin && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                             <h2 className="text-2xl font-bold text-gray-900">บันทึกกิจกรรม (Logs)</h2>
                             <p className="text-sm text-gray-500">ประวัติการใช้งานระบบของผู้ดูแลและเจ้าหน้าที่</p>
                        </div>
                        
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">เวลา</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">ผู้ใช้งาน</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">กิจกรรม</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">รายละเอียด</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center gap-2">
                                                <Clock className="w-3 h-3" />
                                                {new Date(log.timestamp).toLocaleString('th-TH')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900">{log.userName}</span>
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">{log.userRole}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-700">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {log.details}
                                            </td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-10 text-center text-gray-400 text-sm">
                                                ไม่มีประวัติกิจกรรม
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* User Modal */}
        {showUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowUserModal(false)}></div>
                <div className="bg-white rounded-2xl w-full max-w-md relative z-10 p-8 shadow-2xl animate-fade-in-up">
                    <button onClick={() => setShowUserModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black">
                        <X className="w-5 h-5" />
                    </button>
                    <h3 className="text-xl font-bold text-gray-900 mb-6">{editingUser.id ? 'แก้ไขข้อมูล' : 'เพิ่มผู้ใช้งานใหม่'}</h3>
                    
                    {/* Error Feedback */}
                    {formError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm font-bold animate-pulse">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {formError}
                        </div>
                    )}

                    <form onSubmit={handleUserModalSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ชื่อ - นามสกุล</label>
                            <input 
                                type="text" 
                                required
                                value={editingUser.name || ''}
                                onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-black/5"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                            <input 
                                type="text" 
                                required
                                value={editingUser.username || ''}
                                onChange={e => setEditingUser({ ...editingUser, username: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-black/5"
                            />
                        </div>
                        
                        <div>
                            <div className="flex justify-between">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                                {editingUser.id && (
                                    <button 
                                        type="button" 
                                        onClick={() => setIsPasswordChanged(!isPasswordChanged)} 
                                        className="text-[10px] text-blue-600 font-bold"
                                    >
                                        {isPasswordChanged ? 'ยกเลิกเปลี่ยนรหัส' : 'เปลี่ยนรหัสผ่าน'}
                                    </button>
                                )}
                            </div>
                            
                            {(isPasswordChanged || !editingUser.id) && (
                                <input 
                                    type="text" 
                                    required={!editingUser.id}
                                    value={editingUser.password || ''}
                                    onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-black/5"
                                    placeholder={editingUser.id ? 'ใส่รหัสผ่านใหม่' : ''}
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">สิทธิ์การใช้งาน</label>
                            <select 
                                value={editingUser.role || 'STAFF'}
                                onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}
                                className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-black/5"
                            >
                                {isSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN (ดูแลระบบหลัก)</option>}
                                <option value="ADMIN">ADMIN (จัดการเจ้าหน้าที่)</option>
                                <option value="STAFF">STAFF (จัดการข้อมูล)</option>
                                <option value="VIEWER">VIEWER (ดูข้อมูลอย่างเดียว)</option>
                            </select>
                        </div>

                        <div className="pt-4">
                            <Button type="submit" className="w-full">บันทึกข้อมูล</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
             <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-all" 
                onClick={() => setDeletingUser(null)}
             ></div>
             <div className="bg-white rounded-[24px] shadow-2xl p-8 max-w-sm w-full relative z-10 text-center animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                      <AlertTriangle className="w-8 h-8 text-red-500 ml-1" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">ยืนยันการลบผู้ใช้?</h3>
                  <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                    คุณต้องการลบผู้ใช้งาน <span className="font-bold text-gray-900">{deletingUser.username}</span> ใช่หรือไม่?
                    <br/>การกระทำนี้ไม่สามารถย้อนกลับได้
                  </p>
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setDeletingUser(null)}
                        className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button 
                        onClick={handleConfirmDelete}
                        className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-200"
                      >
                        ลบผู้ใช้
                      </button>
                  </div>
             </div>
        </div>
      )}

      </main>
    </div>
  );
};

export default SystemAdmin;
