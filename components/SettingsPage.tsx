
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { StudyPlan, ExamSubject } from '../types';
import Button from './Button';
import { Plus, Trash2, Save, AlertCircle, Info, Pencil, X, AlertTriangle, Loader2 } from 'lucide-react';

interface SettingsPageProps {
  plans: StudyPlan[];
  subjects: ExamSubject[];
  onUpdatePlans: (plans: StudyPlan[]) => void;
  onUpdateSubjects: (subjects: ExamSubject[]) => void;
  onResetData: () => void;
}

type EditMode = 'NONE' | 'PLANS' | 'SUBJECTS' | 'RULES';

const SettingsPage: React.FC<SettingsPageProps> = ({ plans, subjects, onUpdatePlans, onUpdateSubjects, onResetData }) => {
  const [editMode, setEditMode] = useState<EditMode>('NONE');
  
  // Temporary state for editing
  const [tempPlans, setTempPlans] = useState<StudyPlan[]>([]);
  const [tempSubjects, setTempSubjects] = useState<ExamSubject[]>([]);
  const [tempRules, setTempRules] = useState<string[]>([]);
  
  // Rules State (Persisted in LocalStorage for display purposes)
  const [rules, setRules] = useState<string[]>([]);

  // Confirmation state
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Calculations
  const viewTotalMaxScore = useMemo(() => subjects.reduce((sum, s) => sum + s.maxScore, 0), [subjects]);
  const tempTotalMaxScore = useMemo(() => tempSubjects.reduce((sum, s) => sum + s.maxScore, 0), [tempSubjects]);

  // Initialize Rules
  useEffect(() => {
    const savedRules = localStorage.getItem('APP_SELECTION_RULES');
    if (savedRules) {
        setRules(JSON.parse(savedRules));
    } else {
        // Default Rules if nothing saved
        setRules([
            `สอบ ${subjects.length} วิชา: ${subjects.map(s => s.name).join(', ')} (รวม ${viewTotalMaxScore} คะแนน)`,
            "จัดอันดับตามคะแนนรวม (มาก → น้อย)",
            "ถ้าคะแนนรวมเท่ากัน → ใช้คะแนนรายวิชาตาม “สายอันดับ 1”",
            "ถ้ายังเท่ากันมาก ๆ → ใช้เวลาเพิ่มข้อมูล/รหัส (เพื่อให้เรียงได้เสถียร)",
            "ระบบไล่จากอันดับ 1 ลงมา → ลองลงสายตัวเลือก 1 → ถ้าเต็ม ลองตัวเลือก 2 (ถ้ามี) → ถ้าเต็ม ลองตัวเลือก 3 ถ้าเต็มอีก ก็ ก็ไล่ไปตัวเลือกถัดไป ไปจนตัวเลือกสุดท้าย"
        ]);
    }
  }, [subjects.length, viewTotalMaxScore]); // Dependency ensures default updates if subjects change (only if not customized)

  // Initialize temp state when opening modal
  const handleOpenEditPlans = () => {
    setTempPlans(JSON.parse(JSON.stringify(plans)));
    setEditMode('PLANS');
  };

  const handleOpenEditSubjects = () => {
    setTempSubjects(JSON.parse(JSON.stringify(subjects)));
    setEditMode('SUBJECTS');
  };

  const handleOpenEditRules = () => {
    setTempRules([...rules]);
    setEditMode('RULES');
  };

  const handleClose = () => {
    setEditMode('NONE');
    setShowConfirm(false);
    setDeleteConfirmation('');
  };

  const handleRequestSave = () => {
    if (editMode === 'RULES') {
        // Rules don't require destructive confirmation
        handleSaveRules();
    } else {
        // Plans/Subjects require confirmation
        setShowConfirm(true);
    }
  };

  const handleSaveRules = () => {
      setRules(tempRules);
      localStorage.setItem('APP_SELECTION_RULES', JSON.stringify(tempRules));
      handleClose();
  };

  const handleConfirmSave = async () => {
    // Check for strict delete confirmation
    if (deleteConfirmation !== 'delete') {
        return;
    }

    setIsSaving(true);
    try {
        if (editMode === 'PLANS') {
            await onUpdatePlans(tempPlans);
        } else if (editMode === 'SUBJECTS') {
            await onUpdateSubjects(tempSubjects);
        }

        // Clear all student data
        onResetData();
        handleClose();
    } catch (err) {
        alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
        setIsSaving(false);
    }
  };

  // --- Handlers for Temp Plans ---
  const handleAddTempPlan = () => {
    const newId = `PLAN-${Date.now()}`;
    setTempPlans([...tempPlans, { id: newId, name: 'แผนการเรียนใหม่', quota: 10 }]);
  };

  const handleChangeTempPlan = (id: string, field: keyof StudyPlan, value: string | number) => {
    setTempPlans(tempPlans.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleDeleteTempPlan = (id: string) => {
    setTempPlans(tempPlans.filter(p => p.id !== id));
  };

  // --- Handlers for Temp Subjects ---
  const handleAddTempSubject = () => {
    const newId = `SUBJ-${Date.now()}`;
    setTempSubjects([...tempSubjects, { id: newId, name: 'วิชาใหม่', maxScore: 100 }]);
  };

  const handleChangeTempSubject = (id: string, field: keyof ExamSubject, value: string | number) => {
    setTempSubjects(tempSubjects.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleDeleteTempSubject = (id: string) => {
    setTempSubjects(tempSubjects.filter(s => s.id !== id));
  };

  // --- Handlers for Temp Rules ---
  const handleAddTempRule = () => {
      setTempRules([...tempRules, "ข้อกำหนดใหม่..."]);
  };

  const handleChangeTempRule = (index: number, value: string) => {
      const updated = [...tempRules];
      updated[index] = value;
      setTempRules(updated);
  };

  const handleDeleteTempRule = (index: number) => {
      const updated = [...tempRules];
      updated.splice(index, 1);
      setTempRules(updated);
  };

  return (
    <div className="space-y-10 animate-fade-in relative">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-6">
        
        {/* Part 1: Study Plans (View Mode) */}
        <div className="space-y-5">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
                    ข้อมูลแผนการเรียน
                </h3>
                <Button size="sm" variant="outline" onClick={handleOpenEditPlans} className="text-sm">
                    <Pencil className="w-4 h-4 mr-2" /> แก้ไขแผนการเรียน
                </Button>
             </div>
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-5 py-4 text-left text-xs font-bold text-gray-500 uppercase">ลำดับ</th>
                            <th className="px-5 py-4 text-left text-xs font-bold text-gray-500 uppercase">ชื่อแผนการเรียน</th>
                            <th className="px-5 py-4 text-center text-xs font-bold text-gray-500 uppercase w-28">จำนวนรับ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {plans.map((plan, index) => (
                            <tr key={plan.id} className="hover:bg-gray-50/50">
                                <td className="px-5 py-4 text-base text-gray-400 font-medium">{index + 1}</td>
                                <td className="px-5 py-4 text-base font-medium text-gray-900">{plan.name}</td>
                                <td className="px-5 py-4 text-center">
                                     <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                        {plan.quota}
                                     </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
             <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700 flex gap-3">
                <Info className="w-5 h-5 flex-shrink-0" />
                <p>จำนวนรับรวมทั้งหมด: <span className="font-bold">{plans.reduce((acc, p) => acc + p.quota, 0)}</span> ที่นั่ง</p>
             </div>
        </div>

        {/* Part 2: Subjects (View Mode) */}
        <div className="space-y-5">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">2</span>
                    วิชาที่สอบ
                </h3>
                 <Button size="sm" variant="outline" onClick={handleOpenEditSubjects} className="text-sm">
                    <Pencil className="w-4 h-4 mr-2" /> แก้ไขรายวิชา
                 </Button>
             </div>
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-5 py-4 text-left text-xs font-bold text-gray-500 uppercase">วิชา</th>
                            <th className="px-5 py-4 text-center text-xs font-bold text-gray-500 uppercase w-36">คะแนนเต็ม</th>
                            <th className="px-5 py-4 text-right text-xs font-bold text-gray-500 uppercase w-28">สัดส่วน %</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {subjects.map((subj) => (
                            <tr key={subj.id} className="hover:bg-gray-50/50">
                                <td className="px-5 py-4 text-base font-medium text-gray-900">{subj.name}</td>
                                <td className="px-5 py-4 text-center text-base text-gray-600">{subj.maxScore}</td>
                                <td className="px-5 py-4 text-right text-base text-gray-500">
                                    {viewTotalMaxScore > 0 ? ((subj.maxScore / viewTotalMaxScore) * 100).toFixed(0) : 0}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                        <tr>
                            <td className="px-5 py-4 text-base font-bold text-gray-900 text-right">คะแนนรวมเต็ม</td>
                            <td className="px-5 py-4 text-base font-bold text-gray-900 text-center bg-green-50 text-green-700 rounded-lg mx-2">{viewTotalMaxScore}</td>
                            <td className="px-5 py-4 text-right text-base font-bold text-gray-900">100%</td>
                        </tr>
                    </tfoot>
                </table>
             </div>
        </div>

      </div>

      {/* Part 3: Rules */}
      <div className="mt-10">
           <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-bold">3</span>
                        ข้อกำหนดการคัดเลือก
                </h3>
                <Button size="sm" variant="outline" onClick={handleOpenEditRules} className="text-sm">
                    <Pencil className="w-4 h-4 mr-2" /> แก้ไขข้อกำหนด
                </Button>
           </div>
           
           <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 relative">
              <div className="absolute top-8 right-8 text-gray-300">
                  <AlertCircle className="w-14 h-14 opacity-20" />
              </div>
              <ul className="space-y-4 text-base text-gray-600 leading-relaxed font-medium">
                  {rules.length > 0 ? rules.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="w-2 h-2 rounded-full bg-black mt-2.5 flex-shrink-0"></span>
                        <span>{rule}</span>
                      </li>
                  )) : (
                      <li className="text-gray-400 italic">ไม่มีข้อมูลข้อกำหนด</li>
                  )}
              </ul>
           </div>
      </div>

      {/* --- EDIT MODALS --- */}
      {editMode !== 'NONE' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-all" onClick={handleClose}></div>
            
            <div className="bg-white rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.15)] border border-gray-100 w-full max-w-4xl relative z-10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        {editMode === 'PLANS' && 'แก้ไขข้อมูลแผนการเรียน'}
                        {editMode === 'SUBJECTS' && 'แก้ไขรายวิชาสอบ'}
                        {editMode === 'RULES' && 'แก้ไขข้อกำหนดการคัดเลือก'}
                    </h3>
                    <button onClick={handleClose} className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-8 overflow-y-auto">
                    {editMode === 'PLANS' && (
                        <div className="space-y-5">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-5 py-4 text-left text-xs font-bold text-gray-500 uppercase">ชื่อแผนการเรียน</th>
                                        <th className="px-5 py-4 text-center text-xs font-bold text-gray-500 uppercase w-36">จำนวนรับ</th>
                                        <th className="px-5 py-4 text-right text-xs font-bold text-gray-500 uppercase w-20">ลบ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {tempPlans.map((plan) => (
                                        <tr key={plan.id}>
                                            <td className="px-5 py-3">
                                                <input 
                                                    type="text" 
                                                    value={plan.name}
                                                    onChange={(e) => handleChangeTempPlan(plan.id, 'name', e.target.value)}
                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-base text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                />
                                            </td>
                                            <td className="px-5 py-3">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    value={plan.quota}
                                                    onChange={(e) => handleChangeTempPlan(plan.id, 'quota', Number(e.target.value))}
                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-center text-base font-bold text-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                />
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button onClick={() => handleDeleteTempPlan(plan.id)} className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <Button variant="outline" size="md" onClick={handleAddTempPlan} className="w-full border-dashed border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 py-3 text-sm">
                                <Plus className="w-5 h-5 mr-2" /> เพิ่มแผนการเรียนใหม่
                            </Button>
                        </div>
                    )}

                    {editMode === 'SUBJECTS' && (
                        <div className="space-y-5">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-5 py-4 text-left text-xs font-bold text-gray-500 uppercase">ชื่อวิชา</th>
                                        <th className="px-5 py-4 text-center text-xs font-bold text-gray-500 uppercase w-36">คะแนนเต็ม</th>
                                        <th className="px-5 py-4 text-right text-xs font-bold text-gray-500 uppercase w-20">ลบ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {tempSubjects.map((subj) => (
                                        <tr key={subj.id}>
                                            <td className="px-5 py-3">
                                                <input 
                                                    type="text" 
                                                    value={subj.name}
                                                    onChange={(e) => handleChangeTempSubject(subj.id, 'name', e.target.value)}
                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-base text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                                />
                                            </td>
                                            <td className="px-5 py-3">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    value={subj.maxScore}
                                                    onChange={(e) => handleChangeTempSubject(subj.id, 'maxScore', Number(e.target.value))}
                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-center text-base font-bold text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                                />
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button onClick={() => handleDeleteTempSubject(subj.id)} className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50">
                                     <tr>
                                        <td className="px-5 py-4 text-base font-bold text-gray-900 text-right">คะแนนรวมใหม่</td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="inline-block px-4 py-1.5 bg-green-100 text-green-700 rounded-lg text-base font-bold">{tempTotalMaxScore}</span>
                                        </td>
                                        <td></td>
                                     </tr>
                                </tfoot>
                            </table>
                            <Button variant="outline" size="md" onClick={handleAddTempSubject} className="w-full border-dashed border-gray-300 text-gray-500 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 py-3 text-sm">
                                <Plus className="w-5 h-5 mr-2" /> เพิ่มวิชาสอบใหม่
                            </Button>
                        </div>
                    )}

                    {editMode === 'RULES' && (
                        <div className="space-y-4">
                             {tempRules.map((rule, idx) => (
                                 <div key={idx} className="flex gap-3">
                                     <div className="w-8 h-12 flex items-center justify-center font-bold text-gray-300 text-sm flex-shrink-0">
                                         {idx + 1}.
                                     </div>
                                     <textarea 
                                        value={rule}
                                        onChange={(e) => handleChangeTempRule(idx, e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-base text-gray-900 focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 outline-none transition-all resize-none"
                                        rows={2}
                                     />
                                     <button 
                                        onClick={() => handleDeleteTempRule(idx)} 
                                        className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0 mt-1"
                                     >
                                         <Trash2 className="w-5 h-5" />
                                     </button>
                                 </div>
                             ))}
                             <div className="pl-11">
                                <Button variant="outline" size="md" onClick={handleAddTempRule} className="w-full border-dashed border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 py-3 text-sm">
                                    <Plus className="w-5 h-5 mr-2" /> เพิ่มข้อกำหนดใหม่
                                </Button>
                             </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-8 py-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50 rounded-b-2xl">
                    <Button variant="secondary" onClick={handleClose} size="lg" className="text-base">ยกเลิก</Button>
                    <Button onClick={handleRequestSave} size="lg" className="text-base">
                        <Save className="w-5 h-5 mr-2" /> บันทึกข้อมูล
                    </Button>
                </div>
                
                {/* Confirmation Overlay (Destructive) */}
                {showConfirm && (
                     <div className="absolute inset-0 bg-white/95 backdrop-blur-none z-20 flex items-center justify-center rounded-2xl p-6">
                        <div className="bg-white border border-gray-100 shadow-2xl rounded-2xl p-8 max-w-sm text-center transform scale-100 animate-in fade-in zoom-in duration-200">
                             <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                {isSaving ? <Loader2 className="w-8 h-8 text-red-600 animate-spin" /> : <AlertTriangle className="w-8 h-8 text-red-600" />}
                             </div>
                             <h4 className="text-xl font-bold text-gray-900 mb-3">คำเตือน: การแก้ไขนี้จะล้างข้อมูลทั้งหมด</h4>
                             <p className="text-base text-gray-500 mb-6 leading-relaxed">
                                หากคุณแก้ไข{editMode === 'PLANS' ? 'แผนการเรียน' : 'รายวิชา'} ระบบจำเป็นต้อง <span className="text-red-600 font-bold">ลบข้อมูลนักเรียนทั้งหมดในหน้า 'ผลการคัดเลือก'</span> เพื่อป้องกันความผิดพลาดของข้อมูล
                             </p>
                             
                             <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">พิมพ์คำว่า 'delete' เพื่อยืนยัน</label>
                                <input 
                                    type="text" 
                                    value={deleteConfirmation}
                                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                                    placeholder="delete"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center font-mono text-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                                />
                             </div>

                             <div className="flex gap-4 justify-center">
                                <Button variant="secondary" size="md" onClick={() => setShowConfirm(false)} className="text-sm">ยกเลิก</Button>
                                <Button 
                                    size="md" 
                                    onClick={handleConfirmSave} 
                                    className={`text-sm text-white transition-all ${deleteConfirmation === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-300 cursor-not-allowed'}`}
                                    disabled={deleteConfirmation !== 'delete' || isSaving}
                                >
                                    {isSaving ? 'กำลังบันทึก...' : 'ลบข้อมูลและบันทึก'}
                                </Button>
                             </div>
                        </div>
                     </div>
                )}
            </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default SettingsPage;
