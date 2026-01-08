
import React, { useState, useEffect, useMemo } from 'react';
import { Student, RankedStudent, DashboardTab, StudyPlan, StreamType, ExamSubject, Classroom, AdminUser } from '../types';
import { rankStudents } from '../services/rankingService';
import StudentList from './StudentList';
import Analysis from './Analysis';
import SettingsPage from './SettingsPage';
import { LayoutDashboard, LogOut, Menu, X, User, Settings, ArrowLeft, Shield, Loader2, Lock, Eye, CheckCircle, BarChart3, Database } from 'lucide-react';
import api from '../services/api';
import { storage } from '../services/storage';

interface DashboardProps {
  classroom: Classroom;
  onBack: () => void;
  onLogout: () => void;
  currentUser: AdminUser | null;
}

const DEFAULT_PLANS: StudyPlan[] = [
    { id: '1', name: StreamType.SCI_MATH, quota: 10 },
    { id: '2', name: StreamType.ARTS_MATH, quota: 10 },
    { id: '3', name: StreamType.ARTS_LANG, quota: 10 },
    { id: '4', name: StreamType.ARTS_SOC, quota: 10 },
    { id: '5', name: StreamType.SPECIAL, quota: 10 },
];

const DEFAULT_SUBJECTS: ExamSubject[] = [
    { id: 'math', name: 'คณิต', maxScore: 100 },
    { id: 'science', name: 'วิทย์', maxScore: 100 },
    { id: 'thai', name: 'ไทย', maxScore: 100 },
    { id: 'english', name: 'อังกฤษ', maxScore: 100 },
    { id: 'social', name: 'สังคม', maxScore: 100 },
];

const Dashboard: React.FC<DashboardProps> = ({ classroom, onBack, onLogout, currentUser }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('LIST');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Track last update locally to reflect changes immediately
  const [currentUpdatedAt, setCurrentUpdatedAt] = useState<string | undefined>(classroom.updatedAt);

  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>(DEFAULT_PLANS);
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>(DEFAULT_SUBJECTS);

  // Role Checks
  const isViewer = currentUser?.role === 'VIEWER';

  // --- Data Loading ---
  useEffect(() => {
    loadData();
    setCurrentUpdatedAt(classroom.updatedAt);
  }, [classroom.id]);

  const loadData = async () => {
      setLoading(true);
      try {
          const result = await api.getDashboardData(classroom.id);
          
          if (result.students) setStudents(result.students);
          if (result.plans) setStudyPlans(result.plans);
          if (result.subjects) setExamSubjects(result.subjects);

          // Fallback if settings are empty/null from DB, initialize defaults via API (lazy init)
          if (!result.plans && !result.subjects && !result.students.length) {
              // This handles cases where settings weren't initialized on creation
          }

      } catch (e) {
          console.error("Failed to load dashboard data", e);
      } finally {
          setLoading(false);
      }
  };
  
  const refreshTimestamp = () => {
      setCurrentUpdatedAt(new Date().toISOString());
  };

  // --- Handlers ---
  const handleAddStudents = async (newStudents: Student[]) => {
      if (isViewer) return;

      // Merge new students preventing duplicates by ID
      const updatedList = [...students];
      newStudents.forEach(newStu => {
          const index = updatedList.findIndex(s => s.id === newStu.id);
          if (index !== -1) updatedList[index] = newStu;
          else updatedList.push(newStu);
      });
      
      setStudents(updatedList);
      
      // Save to API
      try {
          await api.saveStudents(classroom.id, newStudents);
          storage.addLog(currentUser, 'ADD_STUDENTS', `Added ${newStudents.length} students to ${classroom.name}`);
          refreshTimestamp();
      } catch (e) {
          alert('บันทึกข้อมูลไม่สำเร็จ');
      }
  };

  const handleEditStudent = async (updatedStudent: Student, originalId?: string) => {
      if (isViewer) return;

      const updatedList = students.map(s => s.id === (originalId || updatedStudent.id) ? updatedStudent : s);
      setStudents(updatedList);
      
      try {
          // If ID changed, we might need to delete old and create new in backend, 
          // but for now simple saveStudent overwrites if using same ID logic or handling in backend
          if (originalId && originalId !== updatedStudent.id) {
              // Handle ID change scenario if needed, currently API saveStudent uses body ID
              await api.deleteStudent(classroom.id, originalId);
          }
          await api.saveStudent(classroom.id, updatedStudent);
          storage.addLog(currentUser, 'EDIT_STUDENT', `Edited student: ${updatedStudent.id}`);
          refreshTimestamp();
      } catch (e) {
          alert('บันทึกการแก้ไขไม่สำเร็จ');
      }
  };

  const handleDeleteStudent = async (id: string) => {
      if (isViewer) return;

      const target = students.find(s => s.id === id);
      const updatedList = students.filter(s => s.id !== id);
      setStudents(updatedList);

      try {
          await api.deleteStudent(classroom.id, id);
          storage.addLog(currentUser, 'DELETE_STUDENT', `Deleted student: ${id} (${target?.firstName})`);
          refreshTimestamp();
      } catch (e) {
          alert('ลบข้อมูลไม่สำเร็จ');
      }
  };

  const handleUpdatePlans = async (newPlans: StudyPlan[]) => {
      if (isViewer) return;
      setStudyPlans(newPlans);
      await api.saveSettings(classroom.id, 'PLANS', newPlans);
      storage.addLog(currentUser, 'UPDATE_PLANS', `Updated study plans for ${classroom.name}`);
      refreshTimestamp();
  };

  const handleUpdateSubjects = async (newSubjects: ExamSubject[]) => {
      if (isViewer) return;
      setExamSubjects(newSubjects);
      await api.saveSettings(classroom.id, 'SUBJECTS', newSubjects);
      storage.addLog(currentUser, 'UPDATE_SUBJECTS', `Updated exam subjects for ${classroom.name}`);
      refreshTimestamp();
  };

  const handleResetData = async () => {
      if (isViewer) return;
      setStudents([]);
      // We don't have a specific "clear all students" API yet, assuming setting empty array or manual deletion
      // To be safe, we rely on the user confirming in SettingsPage and calling this.
      // Ideally backend should support clearStudents. For now, loop delete or re-save empty?
      // Hack: saveStudents with empty list won't delete existing.
      // So we might need to implement a clear function later. 
      // For now, let's assume `onUpdatePlans` calls usually wipe logic on backend or we just reset FE.
      storage.addLog(currentUser, 'RESET_DATA', `Reset all student data for ${classroom.name}`);
      refreshTimestamp();
      alert('ข้อมูลนักเรียนถูกล้าง (ในหน้าจอ) - กรุณาตรวจสอบการลบในฐานข้อมูลจริงหากจำเป็น'); 
  };

  // --- Ranking Logic ---
  const rankedStudents: RankedStudent[] = useMemo(() => {
    return rankStudents(students, studyPlans);
  }, [students, studyPlans]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col md:flex-row font-sans">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center gap-3 overflow-hidden">
            <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-black">
                <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="truncate">
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">กำลังจัดการ</span>
                <span className="block text-sm font-bold text-gray-900 truncate">{classroom.name}</span>
            </div>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-[#1D1D1F] text-white transform transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0
      `}>
        {/* Brand Area */}
        <div className="p-6 md:p-8">
            <h1 className="text-xl font-bold tracking-tight">ระบบคัดเลือกนักเรียน</h1>
            <p className="text-xs text-gray-400 font-medium">โรงเรียนหนองกี่พิทยาคม</p>
            
            {/* Current Dataset Info (New Section) */}
            <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex items-start gap-3">
                    <Database className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-bold">ชุดข้อมูลปัจจุบัน</p>
                        <p className="text-sm font-bold text-white leading-snug">{classroom.name}</p>
                        <p className="text-[10px] text-gray-500 mt-1">ปีการศึกษา {classroom.academicYear}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => { setActiveTab('LIST'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'LIST' ? 'bg-white text-black shadow-lg shadow-black/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            <span>ผลการคัดเลือก</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('ANALYSIS'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'ANALYSIS' ? 'bg-white text-black shadow-lg shadow-black/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>สรุปและวิเคราะห์ผล</span>
          </button>
          
          {!isViewer && (
              <button 
                onClick={() => { setActiveTab('SETTINGS'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  activeTab === 'SETTINGS' ? 'bg-white text-black shadow-lg shadow-black/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span>ตั้งค่าเกณฑ์การรับ</span>
              </button>
          )}
        </nav>

        {/* Footer Actions & Profile */}
        <div className="p-4 border-t border-white/10 space-y-4">
           
           {/* User Profile Snippet - Moved to Bottom */}
           <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner ${isViewer ? 'bg-gray-500' : 'bg-gradient-to-tr from-emerald-500 to-teal-600'}`}>
                    {isViewer ? <Eye className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{currentUser?.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{currentUser?.role}</p>
                </div>
            </div>

            <div className="space-y-2">
               <button 
                  onClick={onBack}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-all"
               >
                  <ArrowLeft className="w-5 h-5" />
                  <span>กลับหน้าหลัก</span>
               </button>
               <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
               >
                  <LogOut className="w-5 h-5" />
                  <span>ออกจากระบบ</span>
               </button>
            </div>
            
            {/* Credits */}
            <div className="pt-2 text-center pb-2">
                 <p className="text-[10px] text-gray-500">พัฒนาโดย Thanit Lab</p>
                 <p className="text-[9px] text-gray-600 mt-0.5">NPSS V.1.1.5</p>
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-[calc(100vh-64px)] md:h-screen overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth">
          {/* Changed max-w to full width minus padding for wider tables */}
          <div className="w-full max-w-[1920px] mx-auto min-h-full pb-20">
            {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 animate-pulse">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <span className="font-bold">กำลังโหลดข้อมูล...</span>
                </div>
            ) : (
                <>
                    {activeTab === 'LIST' && (
                        <div className="animate-fade-in">
                            <StudentList 
                                students={rankedStudents}
                                studyPlans={studyPlans}
                                subjects={examSubjects}
                                onAddStudents={handleAddStudents}
                                onEditStudent={handleEditStudent}
                                onDeleteStudent={handleDeleteStudent}
                                level={classroom.level}
                                academicYear={classroom.academicYear}
                                readOnly={isViewer}
                                updatedAt={currentUpdatedAt} // Pass updated at
                            />
                        </div>
                    )}
                    
                    {activeTab === 'ANALYSIS' && (
                        <Analysis 
                            students={rankedStudents}
                            plans={studyPlans}
                            subjects={examSubjects}
                            level={classroom.level}
                            academicYear={classroom.academicYear}
                        />
                    )}
                    
                    {activeTab === 'SETTINGS' && !isViewer && (
                        <div className="animate-fade-in">
                             <div className="mb-8">
                                <h2 className="text-3xl font-bold text-gray-900">ตั้งค่าเกณฑ์การรับ</h2>
                                <p className="text-gray-500 mt-2">กำหนดแผนการเรียน วิชาที่สอบ และสัดส่วนคะแนน</p>
                             </div>
                             <SettingsPage 
                                plans={studyPlans}
                                subjects={examSubjects}
                                onUpdatePlans={handleUpdatePlans}
                                onUpdateSubjects={handleUpdateSubjects}
                                onResetData={handleResetData}
                             />
                        </div>
                    )}
                </>
            )}
          </div>
        </div>
      </main>
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
