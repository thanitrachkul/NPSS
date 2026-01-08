
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Classroom, WorkStatus, AdminUser } from '../types';
import Button from './Button';
import { Plus, Users, BookOpen, MoreVertical, X, Pencil, Trash2, Clock, ShieldCheck, LayoutGrid, List, Filter, ChevronDown, Loader2, Settings, AlertTriangle, Link, RotateCcw, AlertOctagon, User, Eye } from 'lucide-react';
import api from '../services/api';
import { storage } from '../services/storage';

interface ClassroomSelectionProps {
  onSelect: (classroom: Classroom) => void;
  onLogout: () => void;
  onOpenSystemAdmin: () => void;
  currentUser: AdminUser | null;
}

const ClassroomSelection: React.FC<ClassroomSelectionProps> = ({ onSelect, onLogout, onOpenSystemAdmin, currentUser }) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);
  
  // View State
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('TABLE');
  
  // Filter State
  const [filterYear, setFilterYear] = useState<string>('ALL');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  
  // Modals State
  const [showModal, setShowModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- DELETE & RESTORE STATE ---
  const [confirmAction, setConfirmAction] = useState<{
      type: 'SOFT_DELETE' | 'PERMANENT_DELETE';
      id: string;
      title: string;
  } | null>(null);
  
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null); // For loading state during delete

  // Form State
  const [year, setYear] = useState('2571');
  const [level, setLevel] = useState<'M.1' | 'M.4'>('M.4');

  // Popover State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin = currentUser?.role === 'ADMIN';
  const isViewer = currentUser?.role === 'VIEWER';

  useEffect(() => {
    checkConfiguration();
    loadClassrooms();
  }, []);

  const checkConfiguration = () => {
    const config = storage.getConfig();
    const hasUrl = config.scriptUrl && config.scriptUrl.startsWith('https://script.google.com');
    setIsConfigured(!!hasUrl);
  };

  const loadClassrooms = async () => {
    setLoading(true);
    const config = storage.getConfig();
    if (!config.scriptUrl || !config.scriptUrl.startsWith('https://script.google.com')) {
        setLoading(false);
        return;
    }
    try {
        const data = await api.getClassrooms();
        setClassrooms(data);
    } catch (error) {
        console.error("Failed to load classrooms", error);
    } finally {
        setLoading(false);
    }
  };

  // Derived State
  const activeClassrooms = useMemo(() => classrooms.filter(c => !c.deletedAt), [classrooms]);
  const trashedClassrooms = useMemo(() => classrooms.filter(c => c.deletedAt), [classrooms]);
  
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(activeClassrooms.map(c => c.academicYear)));
    return years.sort((a, b) => Number(b) - Number(a));
  }, [activeClassrooms]);

  const processedClassrooms = useMemo(() => {
      let result = [...activeClassrooms];
      if (filterYear !== 'ALL') {
          result = result.filter(c => c.academicYear === filterYear);
      }
      if (filterLevel !== 'ALL') {
          result = result.filter(c => c.level === filterLevel);
      }
      result.sort((a, b) => Number(b.academicYear) - Number(a.academicYear));
      return result;
  }, [activeClassrooms, filterYear, filterLevel]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleOpenCreate = () => {
    if (isViewer) return;
    setEditingClassroom(null);
    const maxYear = activeClassrooms.length > 0 
        ? Math.max(...activeClassrooms.map(c => Number(c.academicYear))) 
        : new Date().getFullYear() + 543;
    setYear(String(maxYear + 1));
    setLevel('M.4');
    setShowModal(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, room: Classroom) => {
    if (isViewer) return;
    e.stopPropagation();
    setActiveMenuId(null);
    setEditingClassroom(room);
    setYear(room.academicYear);
    setLevel(room.level);
    setShowModal(true);
  };

  const handleSaveClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) {
        alert('กรุณาตั้งค่า Web App URL ในเมนู Admin ก่อนสร้างข้อมูล');
        return;
    }
    setIsSaving(true);
    const levelLabel = level === 'M.1' ? 'ม.1' : 'ม.4';
    const generatedName = `คัดเลือกนักเรียน ${levelLabel} ปี ${year}`;
    
    // Default Data Definition
    const defaultPlans = [
        { id: '1', name: 'วิทย์-คณิต', quota: 10 },
        { id: '2', name: 'ศิลป์-คำนวณ', quota: 10 },
        { id: '3', name: 'ศิลป์-ภาษา', quota: 10 },
        { id: '4', name: 'ศิลป์-สังคม', quota: 10 },
        { id: '5', name: 'ห้องเรียนพิเศษ (คอม/กีฬา)', quota: 10 },
    ];
    const defaultSubjects = [
        { id: 'math', name: 'คณิต', maxScore: 100 },
        { id: 'science', name: 'วิทย์', maxScore: 100 },
        { id: 'thai', name: 'ไทย', maxScore: 100 },
        { id: 'english', name: 'อังกฤษ', maxScore: 100 },
        { id: 'social', name: 'สังคม', maxScore: 100 },
    ];

    let updatedRoom: Classroom;
    let action = '';
    
    if (editingClassroom) {
        updatedRoom = { ...editingClassroom, academicYear: year, level: level, name: generatedName };
        action = 'UPDATE_CLASSROOM';
    } else {
        updatedRoom = {
            id: `c-${Date.now()}`, 
            academicYear: year, 
            level: level, 
            name: generatedName, 
            studentCount: 0, 
            planCount: defaultPlans.length, // Initialize with default count (5)
            code: Math.random().toString(36).substring(2, 8).toUpperCase(), 
            theme: 'bg-black', 
            status: 'NOT_STARTED'
        };
        action = 'CREATE_CLASSROOM';
    }
    try {
        await api.saveClassroom(updatedRoom);
        storage.addLog(currentUser, action, `Saved classroom: ${updatedRoom.name} (${updatedRoom.id})`);
        
        // NEW: If creating new, initialize default settings in DB immediately
        if (!editingClassroom) {
            await Promise.all([
                api.saveSettings(updatedRoom.id, 'PLANS', defaultPlans),
                api.saveSettings(updatedRoom.id, 'SUBJECTS', defaultSubjects)
            ]);
        }

        if (editingClassroom) {
            setClassrooms(prev => prev.map(c => c.id === updatedRoom.id ? updatedRoom : c));
        } else {
            setClassrooms(prev => [updatedRoom, ...prev]);
        }
        setShowModal(false);
    } catch (err) {
        alert('เกิดข้อผิดพลาดในการบันทึก (ตรวจสอบการตั้งค่า API หรือกด Initialize Database)');
    } finally {
        setIsSaving(false);
    }
  };

  // --- ACTIONS ---

  const initiateSoftDelete = (e: React.MouseEvent, room: Classroom) => {
    if (isViewer) return;
    e.stopPropagation();
    setActiveMenuId(null);
    setConfirmAction({
        type: 'SOFT_DELETE',
        id: room.id,
        title: room.name
    });
  };

  const initiatePermanentDelete = (e: React.MouseEvent, room: Classroom) => {
    if (isViewer) return;
    e.stopPropagation();
    setConfirmAction({
        type: 'PERMANENT_DELETE',
        id: room.id,
        title: room.name
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    setProcessingId(confirmAction.id);
    const { type, id } = confirmAction;

    try {
        if (type === 'SOFT_DELETE') {
            const target = classrooms.find(c => c.id === id);
            if (target) {
                const updated = { ...target, deletedAt: new Date().toISOString() };
                await api.saveClassroom(updated);
                storage.addLog(currentUser, 'SOFT_DELETE_CLASSROOM', `Moved classroom to trash: ${target.name}`);
                setClassrooms(prev => prev.map(c => c.id === id ? updated : c));
            }
        } else if (type === 'PERMANENT_DELETE') {
             // Force delay for UX
             const minLoadTime = new Promise(resolve => setTimeout(resolve, 800));
             const deleteRequest = api.deleteClassroom(id);
             await Promise.all([deleteRequest, minLoadTime]);
             storage.addLog(currentUser, 'DELETE_CLASSROOM', `Permanently deleted classroom ID: ${id}`);
             setClassrooms(prev => prev.filter(c => c.id !== id));
        }
        
        // Success
        setConfirmAction(null);

    } catch (error: any) {
        console.error("Action failed", error);
        let errorMsg = error.message || 'Unknown error';
        if (errorMsg.includes('Unknown action')) {
            alert(`⚠️ ตรวจพบเวอร์ชั่น Backend ไม่ตรงกัน\n\nระบบ Apps Script อาจยังไม่อัปเดตฟังก์ชันลบ\n\nวิธีแก้ไข:\n1. ไปที่ Apps Script กด Deploy > New Deployment\n2. คัดลอก URL ใหม่มาใส่ในหน้าตั้งค่า`);
        } else {
            alert(`ทำรายการไม่สำเร็จ: ${errorMsg}`);
        }
    } finally {
        setProcessingId(null);
    }
  };

  const handleRestore = async (id: string) => {
      const target = classrooms.find(c => c.id === id);
      if (target) {
          setRestoringId(id);
          const updated = { ...target };
          delete updated.deletedAt; 
          
          try {
             const minDelay = new Promise(resolve => setTimeout(resolve, 500));
             await Promise.all([api.saveClassroom(updated), minDelay]);
             storage.addLog(currentUser, 'RESTORE_CLASSROOM', `Restored classroom: ${updated.name}`);
             setClassrooms(prev => prev.map(c => c.id === id ? updated : c));
          } catch (err) {
             alert('กู้คืนไม่สำเร็จ');
          } finally {
             setRestoringId(null);
          }
      }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, id: string) => {
    e.stopPropagation();
    if (isViewer) return;
    
    const newStatus = e.target.value as WorkStatus;
    const target = classrooms.find(c => c.id === id);
    if (target) {
        const updated = { ...target, status: newStatus };
        setClassrooms(prev => prev.map(c => c.id === id ? updated : c));
        api.saveClassroom(updated);
        storage.addLog(currentUser, 'UPDATE_STATUS', `Changed status to ${newStatus} for ${updated.name}`);
    }
  };

  const getStatusStyles = (status: WorkStatus) => {
    switch(status) {
        case 'COMPLETED': return 'bg-emerald-500 text-white border-emerald-700 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
        case 'IN_PROGRESS': return 'bg-amber-400 text-white border-amber-600 shadow-[0_0_15px_rgba(251,191,36,0.5)]';
        default: return 'bg-gray-100 text-gray-400 border-gray-300';
    }
  };

  const getDaysRemaining = (dateStr?: string) => {
    if (!dateStr) return 30;
    const deletedDate = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - deletedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    const remaining = 30 - diffDays;
    return remaining > 0 ? remaining : 0;
  };

  const formatName = (name: string) => name.replace('M.', 'ม.');

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans flex flex-col relative">
      {/* Configuration Warning Banner */}
      {!isConfigured && isSuperAdmin && (
        <div className="bg-yellow-50 border-b border-yellow-100 px-6 py-3 relative z-40 animate-fade-in">
            <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-yellow-100 p-2 rounded-lg">
                         <AlertTriangle className="w-5 h-5 text-yellow-700" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-yellow-800">ยังไม่ได้เชื่อมต่อระบบฐานข้อมูล</p>
                        <p className="text-xs text-yellow-700">กรุณานำ Web App URL จาก Google Apps Script มาใส่ในหน้าตั้งค่า</p>
                    </div>
                </div>
                <button 
                    onClick={onOpenSystemAdmin}
                    className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                >
                    <Link className="w-4 h-4" /> เชื่อมต่อฐานข้อมูล
                </button>
            </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
             <img 
                src="https://drive.google.com/thumbnail?id=1LAeHd6QVmR9w5rtrQUHBEZqToPc2WD0b&sz=1000" 
                alt="ตราโรงเรียนหนองกี่พิทยาคม" 
                className="w-10 h-10 md:w-12 md:h-12 object-contain"
                referrerPolicy="no-referrer"
             />
             <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">ระบบคัดเลือกนักเรียน</h1>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5 font-medium uppercase tracking-wider">โรงเรียนหนองกี่พิทยาคม</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex flex-col items-end mr-1">
                <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg">
                    {isViewer ? <Eye className="w-4 h-4 text-gray-500" /> : <ShieldCheck className={`w-4 h-4 ${isSuperAdmin ? 'text-black' : 'text-emerald-600'}`} />}
                    <span>{currentUser?.name || 'Staff Access'}</span>
                </div>
                <div className="flex gap-2 mt-1">
                    {(isSuperAdmin || isAdmin) && (
                        <>
                            <button 
                                onClick={onOpenSystemAdmin}
                                className="text-xs text-gray-500 hover:text-black font-bold transition-colors flex items-center gap-1"
                            >
                                <Settings className="w-3 h-3" /> ตั้งค่าระบบ
                            </button>
                            <span className="text-gray-300 text-xs">|</span>
                        </>
                    )}
                    <button 
                        onClick={onLogout} 
                        className="text-xs text-gray-400 hover:text-red-600 font-bold transition-colors"
                    >
                        ออกจากระบบ
                    </button>
                </div>
             </div>
             {/* Updated User Icon: Now shows a styled Person Icon instead of Initials */}
             <div className={`w-11 h-11 rounded-full text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 border-2 border-white ring-2 ring-gray-100 cursor-default ${isSuperAdmin ? 'bg-black' : isViewer ? 'bg-gray-400' : 'bg-gradient-to-tr from-emerald-500 to-teal-600'}`}>
                {isViewer ? <Eye className="w-5 h-5" /> : <User className="w-5 h-5" />}
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-grow w-full">
        
        {/* Filters and Actions Bar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900">เลือกปีการศึกษา</h2>
                <p className="text-base text-gray-500 mt-1">จัดการข้อมูลการคัดเลือกนักเรียนตามปีที่เปิดรับ</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                 <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                    <div className="relative group">
                        <Filter className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <select 
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            className="pl-9 pr-8 py-2 bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer hover:bg-gray-50 rounded-lg appearance-none"
                        >
                            <option value="ALL">ทุกปีการศึกษา</option>
                            {availableYears.map(y => <option key={y} value={y}>ปี {y}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-3 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="w-px h-6 bg-gray-200"></div>
                    <div className="relative group">
                        <select 
                            value={filterLevel}
                            onChange={(e) => setFilterLevel(e.target.value)}
                            className="pl-3 pr-8 py-2 bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer hover:bg-gray-50 rounded-lg appearance-none"
                        >
                            <option value="ALL">ทุกระดับชั้น</option>
                            <option value="M.1">ม.1</option>
                            <option value="M.4">ม.4</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-3 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                 </div>

                 <div className="w-px h-10 bg-gray-300 hidden sm:block mx-1"></div>

                 {!isViewer && (
                     <button 
                        onClick={handleOpenCreate}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white hover:bg-gray-800 rounded-xl text-base font-bold shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5"
                     >
                        <Plus className="w-5 h-5" /> <span className="hidden sm:inline">สร้างชุดข้อมูล</span> <span className="sm:hidden">สร้าง</span>
                     </button>
                 )}

                 <div className="flex bg-gray-200/50 p-1 rounded-xl">
                    <button 
                        onClick={() => setViewMode('TABLE')}
                        className={`p-2.5 rounded-lg transition-all ${viewMode === 'TABLE' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                        title="มุมมองตาราง"
                    >
                        <List className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setViewMode('GRID')}
                        className={`p-2.5 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                        title="มุมมองการ์ด"
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                 </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="animate-fade-in pb-20">
          
          {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 text-gray-400 animate-spin mb-4" />
                  <p className="text-gray-500 font-medium">กำลังโหลดข้อมูล...</p>
              </div>
          ) : (
          <>
          {/* --- TABLE VIEW --- */}
          {viewMode === 'TABLE' && (
             <div className="bg-white rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-200/60 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead>
                        <tr className="bg-black">
                            <th className="px-6 py-5 text-left text-xs font-bold text-white uppercase tracking-widest">ปีการศึกษา</th>
                            <th className="px-6 py-5 text-left text-xs font-bold text-white uppercase tracking-widest">ระดับชั้น</th>
                            <th className="px-6 py-5 text-left text-xs font-bold text-white uppercase tracking-widest">ชื่อชุดข้อมูล</th>
                            <th className="px-6 py-5 text-center text-xs font-bold text-white uppercase tracking-widest">จำนวนนักเรียน</th>
                            <th className="px-6 py-5 text-center text-xs font-bold text-white uppercase tracking-widest">แผนการเรียน</th>
                            <th className="px-6 py-5 text-center text-xs font-bold text-white uppercase tracking-widest">สถานะ</th>
                            <th className="px-6 py-5 text-right text-xs font-bold text-white uppercase tracking-widest">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {processedClassrooms.map((room) => (
                            <tr key={room.id} onClick={() => onSelect(room)} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                                <td className="px-6 py-5 whitespace-nowrap">
                                    <span className="text-lg font-bold text-gray-900">{room.academicYear}</span>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap">
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-gray-100 text-gray-700">
                                        {room.level === 'M.1' ? 'มัธยมศึกษาปีที่ 1' : 'มัธยมศึกษาปีที่ 4'}
                                    </span>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap">
                                    <div className="text-base font-medium text-gray-900">{formatName(room.name)}</div>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap text-center">
                                    <span className="text-base font-bold text-gray-600">{room.studentCount || 0}</span>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap text-center">
                                    <span className="text-base font-bold text-gray-600">{room.planCount || 0}</span>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap">
                                    {/* 3D Status Button */}
                                    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                                        <div className={`relative group/btn transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-0 border-b-4 rounded-xl px-2 py-2 min-w-[150px] flex items-center justify-center gap-2 ${getStatusStyles(room.status)}`}>
                                            <div className={`w-2 h-2 rounded-full ${room.status === 'NOT_STARTED' ? 'bg-gray-300' : 'bg-white animate-pulse'}`}></div>
                                            <div className="relative flex-1">
                                                <select 
                                                    value={room.status}
                                                    onChange={(e) => handleStatusChange(e, room.id)}
                                                    disabled={isViewer}
                                                    className={`appearance-none bg-transparent w-full text-xs font-bold text-center outline-none uppercase tracking-wider ${isViewer ? 'cursor-default' : 'cursor-pointer'}`}
                                                >
                                                    <option value="COMPLETED" className="text-black">เสร็จสิ้น</option>
                                                    <option value="IN_PROGRESS" className="text-black">อยู่ระหว่างดำเนินการ</option>
                                                    <option value="NOT_STARTED" className="text-black">ยังไม่เริ่ม</option>
                                                </select>
                                            </div>
                                            {!isViewer && <ChevronDown className={`w-3 h-3 ${room.status === 'NOT_STARTED' ? 'text-gray-400' : 'text-white/70'}`} />}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap text-right">
                                    {!isViewer && (
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => handleOpenEdit(e, room)}
                                                className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Pencil className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={(e) => initiateSoftDelete(e, room)}
                                                className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                    {isViewer && (
                                        <div className="text-xs text-gray-400 italic pr-2">Read Only</div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {processedClassrooms.length === 0 && (
                             <tr>
                                <td colSpan={7} className="px-6 py-16 text-center text-gray-400 text-base">
                                    {isConfigured ? 'ไม่พบข้อมูลตามที่ระบุ' : 'ไม่พบข้อมูล (กรุณาเชื่อมต่อฐานข้อมูล)'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
          )}

          {/* --- GRID VIEW --- */}
          {viewMode === 'GRID' && (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {processedClassrooms.map((room) => (
                    <div 
                        key={room.id}
                        onClick={() => onSelect(room)}
                        className="group relative bg-white rounded-[32px] overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-500 cursor-pointer border border-gray-100 flex flex-col h-[320px]"
                    >
                        {/* Card Header */}
                        <div className="relative h-48 bg-[#1D1D1F] text-white overflow-hidden flex flex-col items-center justify-center p-6 text-center">
                            <div className="absolute inset-0 opacity-10" 
                                style={{
                                    backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                                    backgroundSize: '20px 20px' 
                                }} 
                            />
                            
                            {/* Menu Button - Hide for Viewer */}
                            {!isViewer && (
                                <div className="absolute top-5 right-5 z-20">
                                    <button 
                                        className="p-2.5 rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === room.id ? null : room.id);
                                        }}
                                    >
                                        <MoreVertical className="w-6 h-6" />
                                    </button>
                                    
                                    {/* Dropdown Menu */}
                                    {activeMenuId === room.id && (
                                        <div className="absolute right-0 top-10 bg-white rounded-2xl shadow-2xl border border-gray-100 w-40 py-2 overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                            <button 
                                                onClick={(e) => handleOpenEdit(e, room)}
                                                className="w-full text-left px-5 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                            >
                                                <Pencil className="w-5 h-5 text-gray-400" /> แก้ไขชื่อ
                                            </button>
                                            <div className="h-px bg-gray-100 my-1 mx-2" />
                                            <button 
                                                onClick={(e) => initiateSoftDelete(e, room)}
                                                className="w-full text-left px-5 py-3 text-base font-bold text-red-500 hover:bg-red-50 flex items-center gap-2"
                                            >
                                                <Trash2 className="w-5 h-5" /> ลบข้อมูล
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="relative z-10 flex flex-col items-center gap-1">
                                <span className="text-3xl font-bold text-gray-400 tracking-[0.2em] uppercase mb-1">ปีการศึกษา {room.academicYear}</span>
                                <h2 className="text-4xl font-bold tracking-tight text-white mt-1 leading-none">
                                    {room.level === 'M.1' ? 'มัธยมศึกษาปีที่ 1' : 'มัธยมศึกษาปีที่ 4'}
                                </h2>
                            </div>
                        </div>

                        {/* Card Body */}
                        <div className="flex-1 p-6 flex items-center justify-between bg-white group-hover:bg-gray-50/50 transition-colors">
                            <div className="flex flex-col items-center gap-1 w-1/3 border-r border-gray-100">
                                <Users className="w-6 h-6 text-gray-300 group-hover:text-black transition-colors" />
                                <span className="text-2xl font-bold text-gray-900">{room.studentCount || 0}</span>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">นักเรียน</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 w-1/3 border-r border-gray-100">
                                <BookOpen className="w-6 h-6 text-gray-300 group-hover:text-black transition-colors" />
                                <span className="text-2xl font-bold text-gray-900">{room.planCount || 0}</span>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">แผน</span>
                            </div>
                            
                            <div className="flex flex-col items-center gap-1 w-1/3 relative z-10" onClick={(e) => e.stopPropagation()}>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">สถานะ</span>
                                <div className={`relative w-full max-w-[90px] rounded-lg border-b-2 py-1 px-1 flex items-center justify-center text-[10px] font-bold ${
                                    room.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-700 text-white shadow-md' :
                                    room.status === 'IN_PROGRESS' ? 'bg-amber-400 border-amber-600 text-white shadow-md' :
                                    'bg-gray-100 border-gray-300 text-gray-400'
                                }`}>
                                    <select 
                                        value={room.status}
                                        onChange={(e) => handleStatusChange(e, room.id)}
                                        disabled={isViewer}
                                        className={`w-full appearance-none bg-transparent outline-none text-center ${isViewer ? 'cursor-default' : 'cursor-pointer'}`}
                                    >
                                        <option value="COMPLETED" className="text-black">เสร็จ</option>
                                        <option value="IN_PROGRESS" className="text-black">ทำอยู่</option>
                                        <option value="NOT_STARTED" className="text-black">รอ</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* Add New Card (Grid Only) - Hide for Viewer */}
                {!isViewer && (
                    <button 
                        onClick={handleOpenCreate}
                        className="group border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center gap-5 h-[320px] hover:border-black/20 hover:bg-white transition-all duration-500 shadow-sm hover:shadow-lg"
                    >
                        <div className="w-20 h-20 rounded-full bg-gray-50 border border-gray-100 group-hover:scale-110 flex items-center justify-center transition-all duration-500">
                            <Plus className="w-8 h-8 text-gray-300 group-hover:text-black" />
                        </div>
                        <div className="text-center">
                            <span className="block text-base font-bold text-gray-400 group-hover:text-black transition-colors">สร้างข้อมูลการรับใหม่</span>
                        </div>
                    </button>
                )}
                </div>
            </>
          )}
          </>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="py-8 text-center relative z-10 flex flex-col items-center justify-center mt-auto">
        <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity group">
            <span className="text-xs text-gray-400 font-medium">พัฒนาโดย</span>
            <a 
                href="https://thanitlab.framer.website/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-gray-700 font-bold hover:text-black transition-colors"
            >
                Thanit Lab
            </a>
            <img 
                src="https://drive.google.com/thumbnail?id=1C3Tfeq-p3IPzGIapncHjL4vuljkfNTzn" 
                alt="Thanit Lab Logo" 
                className="w-6 h-6 object-contain"
                referrerPolicy="no-referrer"
            />
        </div>
        <p className="text-[10px] text-gray-300 font-medium mt-1">NPSS V.1.1.5</p>
      </footer>
      
      {/* Floating Trash Button - Hide for Viewer */}
      {!isViewer && (
          <button 
            onClick={() => setShowTrashModal(true)}
            className="fixed bottom-10 right-10 w-20 h-20 bg-white border border-gray-200 shadow-2xl rounded-full flex items-center justify-center z-40 hover:scale-110 hover:bg-gray-50 transition-all group overflow-hidden"
            title="ถังขยะ"
          >
            <div className="relative">
                <Trash2 className="w-8 h-8 text-gray-400 group-hover:text-red-500 transition-colors" />
                {trashedClassrooms.length > 0 && (
                    <span className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                        {trashedClassrooms.length}
                    </span>
                )}
            </div>
          </button>
      )}

      {/* Create/Edit Modal - USING PORTAL */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all" onClick={() => setShowModal(false)} />
            
            <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden transform scale-100 animate-in fade-in zoom-in duration-300">
                <div className="bg-gray-50/50 px-10 py-8 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-900">
                        {editingClassroom ? 'แก้ไขข้อมูล' : 'สร้างข้อมูลรับนักเรียนใหม่'}
                    </h3>
                    <button onClick={() => setShowModal(false)} className="p-2.5 text-gray-400 hover:text-black rounded-full hover:bg-gray-100">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSaveClassroom} className="p-10 space-y-8">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.1em] mb-3">
                            ปีการศึกษา (Academic Year)
                        </label>
                        <input 
                            type="number" 
                            required
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="block w-full px-6 py-5 bg-gray-50 border-0 rounded-2xl text-lg font-bold text-gray-900 focus:ring-2 focus:ring-black/5 outline-none transition-all placeholder-gray-300"
                            placeholder="เช่น 2570"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.1em] mb-3">
                            ระดับชั้นที่เปิดรับ (Grade Level)
                        </label>
                        <div className="grid grid-cols-2 gap-5">
                            <button
                                type="button"
                                onClick={() => setLevel('M.1')}
                                className={`py-5 px-4 rounded-2xl border-2 text-base font-bold transition-all duration-300 ${level === 'M.1' ? 'border-black bg-black text-white shadow-lg' : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                            >
                                มัธยมศึกษาปีที่ 1
                            </button>
                            <button
                                type="button"
                                onClick={() => setLevel('M.4')}
                                className={`py-5 px-4 rounded-2xl border-2 text-base font-bold transition-all duration-300 ${level === 'M.4' ? 'border-black bg-black text-white shadow-lg' : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                            >
                                มัธยมศึกษาปีที่ 4
                            </button>
                        </div>
                    </div>

                    <div className="pt-6">
                        <Button type="submit" className="w-full py-6 rounded-2xl text-lg font-bold" disabled={isSaving}>
                            {isSaving ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> กำลังบันทึก...</> : (editingClassroom ? 'บันทึกการแก้ไข' : 'ยืนยันการสร้างข้อมูล')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal (Generic for Soft & Permanent Delete) - USING PORTAL */}
      {confirmAction && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-white/80 backdrop-blur-md transition-all" onClick={() => setConfirmAction(null)} />
            <div className="bg-white border border-gray-100 shadow-2xl rounded-[32px] p-12 max-w-md text-center transform scale-100 animate-in fade-in zoom-in duration-300 relative z-10">
                 <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
                    {confirmAction.type === 'PERMANENT_DELETE' ? <AlertOctagon className="w-10 h-10 text-red-500" /> : <Trash2 className="w-10 h-10 text-red-500" />}
                 </div>
                 
                 <h4 className="text-2xl font-bold text-gray-900 mb-2">
                     {confirmAction.type === 'PERMANENT_DELETE' ? 'ลบข้อมูลถาวร?' : 'ย้ายไปถังขยะ?'}
                 </h4>
                 
                 <p className="text-base text-gray-500 mb-10 leading-relaxed">
                    {confirmAction.type === 'PERMANENT_DELETE' 
                       ? <span>การกระทำนี้ <strong className="text-red-500">ไม่สามารถกู้คืนได้</strong><br/>ข้อมูลจะถูกลบออกจากฐานข้อมูลทันที</span>
                       : 'ข้อมูลนี้จะถูกเก็บไว้ในถังขยะและสามารถกู้คืนได้ภายใน 30 วัน'
                    }
                 </p>
                 
                 <div className="flex flex-col gap-4">
                    <Button 
                        size="lg" 
                        onClick={handleConfirmAction} 
                        className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200 border-0 rounded-2xl text-lg" 
                        disabled={!!processingId}
                    >
                        {processingId ? (
                            <><Loader2 className="w-5 h-5 animate-spin mr-2" /> กำลังประมวลผล...</>
                        ) : (
                            confirmAction.type === 'PERMANENT_DELETE' ? 'ยืนยันการลบถาวร' : 'ยืนยันการลบ'
                        )}
                    </Button>
                    <button 
                        onClick={() => setConfirmAction(null)} 
                        disabled={!!processingId}
                        className="py-4 text-base font-bold text-gray-400 hover:text-black transition-colors"
                    >
                        ยกเลิก
                    </button>
                 </div>
            </div>
        </div>,
        document.body
      )}

      {/* TRASH MODAL - USING PORTAL */}
      {showTrashModal && createPortal(
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all" onClick={() => setShowTrashModal(false)} />
             
             <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col transform scale-100 animate-in fade-in zoom-in duration-300 overflow-hidden">
                {/* Modal Header */}
                <div className="px-12 py-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                            <Trash2 className="w-7 h-7 text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">ถังขยะ</h3>
                            <p className="text-sm text-gray-500 font-medium">รายการที่ลบล่าสุด ({trashedClassrooms.length})</p>
                        </div>
                    </div>
                    <button onClick={() => setShowTrashModal(false)} className="p-3 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors">
                        <X className="w-7 h-7" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-8 sm:p-10 bg-white">
                    {trashedClassrooms.length > 0 ? (
                        <div className="space-y-4">
                            {trashedClassrooms.map(item => {
                                const isThisItemRestoring = restoringId === item.id;
                                const isThisItemDeleting = processingId === item.id; // Check global processing ID
                                const isDisabled = isThisItemRestoring || !!processingId;

                                return (
                                <div key={item.id} className="bg-white rounded-3xl p-5 border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between group hover:border-gray-200 hover:shadow-lg hover:shadow-gray-50 transition-all gap-4">
                                    <div className="flex items-center gap-5 w-full sm:w-auto">
                                        <div className="hidden sm:flex px-4 h-14 bg-gray-50 rounded-2xl border border-gray-100 items-center justify-center font-bold text-sm text-gray-700 shadow-sm whitespace-nowrap min-w-[100px]">
                                            {item.level === 'M.1' ? 'ม.1' : 'ม.4'}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900 leading-tight">{formatName(item.name)}</h4>
                                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">ปี {item.academicYear}</span>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5 text-orange-400" />
                                                    <span className="text-xs text-orange-600 font-bold">เหลือ {getDaysRemaining(item.deletedAt)} วัน</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0 border-gray-50">
                                        {/* Restore Button */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleRestore(item.id); }}
                                            disabled={isDisabled}
                                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                                                isThisItemRestoring 
                                                ? 'bg-blue-50 text-blue-600 w-[100px]' 
                                                : 'text-blue-600 hover:bg-blue-50 bg-white'
                                            }`}
                                        >
                                            {isThisItemRestoring ? <Loader2 className="w-5 h-5 animate-spin" /> : <><RotateCcw className="w-4 h-4" /> กู้คืน</>}
                                        </button>
                                        
                                        {/* Delete Forever Button */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); initiatePermanentDelete(e, item); }}
                                            disabled={isDisabled}
                                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all border border-transparent ${
                                                isThisItemDeleting 
                                                ? 'bg-red-50 text-red-500 w-[110px]' 
                                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100'
                                            }`}
                                        >
                                            {isThisItemDeleting ? (
                                                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                                            ) : (
                                                <>
                                                    <Trash2 className="w-4 h-4" /> 
                                                    <span className="hidden sm:inline">ลบถาวร</span>
                                                    <span className="sm:hidden">ลบ</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <Trash2 className="w-10 h-10 text-gray-200" />
                            </div>
                            <h4 className="text-xl font-bold text-gray-300">ถังขยะว่างเปล่า</h4>
                            <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
                                รายการที่คุณลบจะมาปรากฏที่นี่ และจะถูกลบถาวรโดยอัตโนมัติเมื่อครบ 30 วัน
                            </p>
                        </div>
                    )}
                </div>
             </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default ClassroomSelection;
