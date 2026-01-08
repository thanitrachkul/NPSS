
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Student, StudyPlan, ExamSubject } from '../types';
import Button from './Button';
import { Plus, AlertCircle, Save, RotateCcw, FileSpreadsheet, Upload, Download, CheckCircle, FileText, Loader2, Pencil } from 'lucide-react';
import ExcelJS from 'exceljs';

// --- Shared Helpers ---
const getSubjectColor = (index: number) => {
    const colors = [
        'bg-blue-50 text-blue-700',
        'bg-green-50 text-green-700',
        'bg-yellow-50 text-yellow-700',
        'bg-red-50 text-red-700',
        'bg-purple-50 text-purple-700',
        'bg-orange-50 text-orange-700'
    ];
    return colors[index % colors.length];
};

// ==========================================
// 1. ADD STUDENT FORM (With Tabs & Bulk)
// ==========================================

interface DataEntryProps {
  onAddStudents: (newStudents: Student[]) => void;
  studyPlans: StudyPlan[];
  subjects: ExamSubject[];
}

type EntryMode = 'MANUAL' | 'BULK';

const DataEntry: React.FC<DataEntryProps> = ({ onAddStudents, studyPlans, subjects }) => {
  const [mode, setMode] = useState<EntryMode>('MANUAL');
  
  // --- MANUAL FORM STATE ---
  const [id, setId] = useState('');
  const [title, setTitle] = useState('เด็กชาย');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedStreams, setSelectedStreams] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  
  // --- BULK IMPORT STATE ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<Student[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  
  // --- SHARED STATE ---
  const [isConfirming, setIsConfirming] = useState(false);

  // Calculate Total Max Score
  const totalMaxScore = useMemo(() => subjects.reduce((acc, s) => acc + s.maxScore, 0), [subjects]);

  // Initialize empty scores/streams
  useEffect(() => {
    setScores(prev => {
        const newScores: Record<string, string> = {};
        subjects.forEach(subj => {
            newScores[subj.id] = prev[subj.id] || '';
        });
        return newScores;
    });
  }, [subjects]);

  useEffect(() => {
    if (studyPlans.length > 0 && selectedStreams.length === 0) {
        setSelectedStreams(new Array(studyPlans.length).fill(''));
    }
  }, [studyPlans]);

  // --- MANUAL HANDLERS ---
  const handlePreSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirming(true);
  };

  const handleManualStreamChange = (index: number, value: string) => {
      const newStreams = [...selectedStreams];
      newStreams[index] = value;
      setSelectedStreams(newStreams);
  };

  const handleManualScoreChange = (subjId: string, value: string) => {
      setScores(prev => ({ ...prev, [subjId]: value }));
  };

  // --- BULK HANDLERS ---
  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Import');
    // ... (Template generation logic same as before)
    const headers = [
        'ID (รหัสผู้สมัคร)', 'Title (คำนำหน้า)', 'FirstName (ชื่อ)', 'LastName (นามสกุล)',
        ...studyPlans.map((_, i) => `Preference ${i+1} (อันดับ ${i+1})`),
        ...subjects.map(s => `Score: ${s.name}`)
    ];
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
        cell.font = { name: 'TH Sarabun PSK', size: 16, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    const exampleRow = ['STU001', 'เด็กชาย', 'ตัวอย่าง', 'รักเรียน', ...studyPlans.map(p => p.name), ...subjects.map(() => 80)];
    const dataRow = worksheet.addRow(exampleRow);
    dataRow.height = 24;
    dataRow.eachCell((cell) => {
        cell.font = { name: 'TH Sarabun PSK', size: 16 };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    worksheet.columns.forEach(column => { column.width = 25; });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Student_Import_Template.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingFile(true);
    setImportError(null);
    setImportData([]);
    try {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) throw new Error("ไม่พบ Worksheet ในไฟล์");
        const parsedStudents: Student[] = [];
        const planStartCol = 5;
        const scoreStartCol = planStartCol + studyPlans.length;
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const getVal = (idx: number) => {
                const val = row.getCell(idx).value;
                return val ? String(val).trim() : '';
            };
            const id = getVal(1);
            if (!id) return;
            const preferredStreams: string[] = [];
            for (let i = 0; i < studyPlans.length; i++) {
                const val = getVal(planStartCol + i);
                if (val) preferredStreams.push(val);
            }
            const extractedScores: Record<string, number> = {};
            subjects.forEach((subj, i) => {
                const val = row.getCell(scoreStartCol + i).value;
                extractedScores[subj.id] = Number(val) || 0;
            });
            parsedStudents.push({
                id, title: getVal(2), firstName: getVal(3), lastName: getVal(4), preferredStreams, scores: extractedScores as any
            });
        });
        if (parsedStudents.length === 0) setImportError("ไม่พบข้อมูลในไฟล์ หรือรูปแบบไฟล์ไม่ถูกต้อง");
        else setImportData(parsedStudents);
    } catch (err) {
        console.error(err);
        setImportError("เกิดข้อผิดพลาดในการอ่านไฟล์");
    } finally {
        setIsProcessingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- FINAL SUBMIT ---
  const handleConfirm = () => {
    if (mode === 'MANUAL') {
        const finalStreams = selectedStreams.filter(s => s !== '');
        const finalScores: Record<string, number> = {};
        subjects.forEach(subj => {
            finalScores[subj.id] = Number(scores[subj.id] || 0);
        });
        const newStudent: Student = {
          id: id, title, firstName, lastName, preferredStreams: finalStreams, scores: finalScores as any
        };
        onAddStudents([newStudent]);
    } else {
        onAddStudents(importData);
    }
  };

  // --- RENDER ADD CONFIRMATION ---
  if (isConfirming) {
    return (
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 max-w-3xl mx-auto flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-8">
                <AlertCircle className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{mode === 'MANUAL' ? 'ยืนยันการเพิ่มข้อมูล' : 'ยืนยันการนำเข้าข้อมูล'}</h3>
            <p className="text-gray-500 mb-10 max-w-md text-base">
                {mode === 'MANUAL' 
                  ? <span>คุณต้องการบันทึกข้อมูลของนักเรียน <span className="font-semibold text-gray-900">{title}{firstName} {lastName}</span> ใช่หรือไม่?</span>
                  : <span>คุณต้องการนำเข้าข้อมูลนักเรียนจำนวน <span className="font-bold text-gray-900 text-lg">{importData.length}</span> คน ใช่หรือไม่?</span>
                }
            </p>
            <div className="flex gap-5">
                 <Button variant="secondary" size="lg" onClick={() => setIsConfirming(false)}>ตรวจสอบอีกครั้ง</Button>
                 <Button variant="primary" size="lg" onClick={handleConfirm}>{mode === 'MANUAL' ? 'ยืนยันการบันทึก' : 'ยืนยันการนำเข้า'}</Button>
            </div>
       </div>
    );
  }

  // --- RENDER ADD FORM ---
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-0 w-full max-w-4xl mx-auto overflow-hidden">
      <div className="flex border-b border-gray-100">
          <button onClick={() => { setMode('MANUAL'); setImportData([]); }} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mode === 'MANUAL' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
              <FileText className="w-4 h-4" /> กรอกข้อมูลทีละคน (Manual)
          </button>
          <button onClick={() => setMode('BULK')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mode === 'BULK' ? 'bg-white text-green-600 border-b-2 border-green-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
              <FileSpreadsheet className="w-4 h-4" /> นำเข้าไฟล์ Excel (Bulk Import)
          </button>
      </div>

      <div className="p-8 md:p-10">
      {mode === 'MANUAL' && (
        <form onSubmit={handlePreSubmitManual} className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">เลขที่สมัครสอบ</label>
              <input type="text" required value={id} onChange={e => setId(e.target.value)} className="block w-full px-5 py-4 bg-gray-50 border-0 rounded-xl text-base text-gray-900 focus:ring-2 focus:ring-black/10 placeholder-gray-300 transition-all" placeholder="ระบุเลขที่สมัคร..." />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-3">
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">คำนำหน้า</label>
                     <select value={title} onChange={(e) => setTitle(e.target.value)} className="block w-full px-5 py-4 bg-gray-50 border-0 rounded-xl text-base text-gray-900 focus:ring-2 focus:ring-black/10 cursor-pointer transition-all">
                         <option value="เด็กชาย">เด็กชาย</option>
                         <option value="นาย">นาย</option>
                         <option value="เด็กหญิง">เด็กหญิง</option>
                         <option value="นางสาว">นางสาว</option>
                     </select>
                </div>
                <div className="md:col-span-5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">ชื่อจริง</label>
                  <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="block w-full px-5 py-4 bg-gray-50 border-0 rounded-xl text-base text-gray-900 focus:ring-2 focus:ring-black/10 placeholder-gray-300 transition-all" placeholder="ระบุชื่อจริง..." />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">นามสกุล</label>
                  <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="block w-full px-5 py-4 bg-gray-50 border-0 rounded-xl text-base text-gray-900 focus:ring-2 focus:ring-black/10 placeholder-gray-300 transition-all" placeholder="ระบุนามสกุล..." />
                </div>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">ลำดับแผนการเรียนที่เลือก</label>
                  <button type="button" onClick={() => setSelectedStreams(new Array(studyPlans.length).fill(''))} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1.5 font-bold transition-colors bg-red-50 px-3 py-1.5 rounded-md"><RotateCcw className="w-4 h-4" /> รีเซต</button>
              </div>
              <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                {studyPlans.map((plan, index) => {
                    const rank = index + 1;
                    return (
                        <div key={index} className="flex items-center gap-4">
                             <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{rank}</div>
                             <select value={selectedStreams[index] || ''} onChange={e => handleManualStreamChange(index, e.target.value)} className={`block w-full px-5 py-3 border rounded-lg text-base focus:ring-2 focus:ring-black/5 outline-none transition-all cursor-pointer ${selectedStreams[index] ? 'bg-white border-gray-300 text-gray-900 font-medium' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                                <option value="" className="text-gray-400">กรุณาระบุแผนการเรียน...</option>
                                {studyPlans.map(option => {
                                    const isSelectedElsewhere = selectedStreams.some((s, i) => s === option.name && i !== index);
                                    return <option key={option.id} value={option.name} disabled={isSelectedElsewhere} className={isSelectedElsewhere ? 'text-gray-300' : 'text-gray-900'}>{option.name} {isSelectedElsewhere ? '(เลือกไปแล้ว)' : ''}</option>;
                                })}
                              </select>
                        </div>
                    );
                })}
              </div>
            </div>
          </div>
          <div className="pt-6">
             <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-3">
                 <h4 className="text-base font-bold text-black">คะแนนสอบ (เต็ม {totalMaxScore} คะแนน)</h4>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {subjects.map((subj, index) => (
                  <div key={subj.id}>
                    <label className={`block text-xs font-bold text-center mb-2.5 px-1 py-1 rounded ${getSubjectColor(index)}`}>{subj.name}</label>
                    <input type="number" min="0" max={subj.maxScore} required placeholder="0" value={scores[subj.id] || ''} onChange={e => handleManualScoreChange(subj.id, e.target.value)} className="block w-full px-3 py-4 bg-white border border-gray-200 rounded-xl text-xl font-bold text-center text-gray-900 focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all shadow-sm" />
                  </div>
                ))}
             </div>
          </div>
          <div className="flex justify-end pt-8 border-t border-gray-100 mt-8">
             <Button type="submit" size="lg"><Plus className="h-5 w-5 mr-2" /> เพิ่มข้อมูล</Button>
          </div>
        </form>
      )}

      {mode === 'BULK' && (
        <div className="animate-fade-in space-y-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1 w-full bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-green-600 font-bold border border-green-100">1</div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">ดาวน์โหลดแบบฟอร์ม</h3>
                    <p className="text-sm text-gray-500 mb-6">ดาวน์โหลดไฟล์ Excel ต้นแบบที่มีหัวตารางถูกต้องเพื่อนำไปกรอกข้อมูล</p>
                    <button onClick={handleDownloadTemplate} className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 py-3 rounded-xl font-bold transition-all shadow-sm"><Download className="w-5 h-5" /> ดาวน์โหลดไฟล์ Excel</button>
                </div>
                <div className="flex-1 w-full bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-blue-600 font-bold border border-blue-100">2</div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">อัปโหลดข้อมูล</h3>
                    <p className="text-sm text-gray-500 mb-6">เลือกไฟล์ Excel ที่กรอกข้อมูลครบถ้วนแล้ว (.xlsx)</p>
                    <div className="relative">
                        <input type="file" accept=".xlsx" ref={fileInputRef} onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className="border-2 border-dashed border-blue-300 bg-blue-50/50 rounded-xl py-8 flex flex-col items-center justify-center text-center hover:bg-blue-50 transition-colors">
                            {isProcessingFile ? <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" /> : <Upload className="w-8 h-8 text-blue-500 mb-2" />}
                            <span className="text-sm font-bold text-blue-700">คลิกเพื่อเลือกไฟล์</span>
                            <span className="text-xs text-blue-400 mt-1">รองรับไฟล์ .xlsx เท่านั้น</span>
                        </div>
                    </div>
                </div>
            </div>
            {importData.length > 0 && (
                <div className="bg-white border border-green-200 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,128,0,0.1)] animate-in slide-in-from-bottom-5">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600"><CheckCircle className="w-6 h-6" /></div>
                        <div><h4 className="text-lg font-bold text-gray-900">อ่านไฟล์สำเร็จ</h4><p className="text-sm text-gray-500">พบข้อมูลนักเรียนจำนวน <span className="font-bold text-green-600">{importData.length}</span> คน พร้อมนำเข้าสู่ระบบ</p></div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 mb-6 max-h-40 overflow-y-auto border border-gray-100 text-sm">
                        <table className="w-full text-left">
                            <thead><tr className="text-xs text-gray-400 uppercase border-b border-gray-200"><th className="pb-2">ID</th><th className="pb-2">ชื่อ - สกุล</th><th className="pb-2">แผนฯ 1</th><th className="pb-2">คะแนนรวม</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">{importData.slice(0, 10).map((s, i) => (<tr key={i}><td className="py-2 font-mono text-gray-600">{s.id}</td><td className="py-2 text-gray-900">{s.title}{s.firstName} {s.lastName}</td><td className="py-2 text-gray-600">{s.preferredStreams?.[0] || '-'}</td><td className="py-2 font-bold">{(Object.values(s.scores) as number[]).reduce((a, b) => a + b, 0)}</td></tr>))}</tbody>
                        </table>
                        {importData.length > 10 && <p className="text-xs text-center text-gray-400 mt-2 italic">...และอีก {importData.length - 10} รายการ</p>}
                    </div>
                    <div className="flex justify-end gap-3">
                         <button onClick={() => { setImportData([]); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-red-500 transition-colors">ยกเลิก</button>
                         <Button onClick={() => setIsConfirming(true)} className="bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-200">ยืนยันการนำเข้า {importData.length} รายการ</Button>
                    </div>
                </div>
            )}
            {importError && <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-bottom-2"><AlertCircle className="w-5 h-5 flex-shrink-0" /><span className="text-sm font-bold">{importError}</span></div>}
        </div>
      )}
      </div>
    </div>
  );
};

export default DataEntry;

// ==========================================
// 2. EDIT STUDENT FORM (Manual Only, No Tabs)
// ==========================================

interface EditStudentFormProps {
  student: Student;
  onSave: (updatedStudent: Student) => void;
  studyPlans: StudyPlan[];
  subjects: ExamSubject[];
}

export const EditStudentForm: React.FC<EditStudentFormProps> = ({ student, onSave, studyPlans, subjects }) => {
  const [id, setId] = useState(student.id);
  const [title, setTitle] = useState(student.title);
  const [firstName, setFirstName] = useState(student.firstName);
  const [lastName, setLastName] = useState(student.lastName);
  const [selectedStreams, setSelectedStreams] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [isConfirming, setIsConfirming] = useState(false);

  // Calculate Total Max Score
  const totalMaxScore = useMemo(() => subjects.reduce((acc, s) => acc + s.maxScore, 0), [subjects]);

  useEffect(() => {
    // Initialize Scores
    const newScores: Record<string, string> = {};
    subjects.forEach(subj => {
        newScores[subj.id] = String(student.scores[subj.id] || '');
    });
    setScores(newScores);

    // Initialize Streams
    const loadedStreams = student.preferredStreams && student.preferredStreams.length > 0 
        ? [...student.preferredStreams] 
        : [];
    const fullStreams = new Array(studyPlans.length).fill('');
    loadedStreams.forEach((s, i) => {
        if (i < fullStreams.length) fullStreams[i] = s;
    });
    setSelectedStreams(fullStreams);
  }, [student, studyPlans, subjects]);

  const handleStreamChange = (index: number, value: string) => {
      const newStreams = [...selectedStreams];
      newStreams[index] = value;
      setSelectedStreams(newStreams);
  };

  const handleScoreChange = (subjId: string, value: string) => {
      setScores(prev => ({ ...prev, [subjId]: value }));
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirming(true);
  };

  const handleConfirm = () => {
        const finalStreams = selectedStreams.filter(s => s !== '');
        const finalScores: Record<string, number> = {};
        subjects.forEach(subj => {
            finalScores[subj.id] = Number(scores[subj.id] || 0);
        });
        
        const updatedStudent: Student = {
          id: id,
          title,
          firstName,
          lastName,
          preferredStreams: finalStreams,
          scores: finalScores as any
        };
        onSave(updatedStudent);
  };

  if (isConfirming) {
    return (
       <div className="bg-white rounded-2xl p-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-8">
                <AlertCircle className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">ยืนยันการแก้ไขข้อมูล</h3>
            <p className="text-gray-500 mb-10 max-w-md text-base">
                คุณต้องการบันทึกการเปลี่ยนแปลงของ <span className="font-semibold text-gray-900">{title}{firstName} {lastName}</span> ใช่หรือไม่?
            </p>
            <div className="flex gap-5">
                 <Button variant="secondary" size="lg" onClick={() => setIsConfirming(false)}>ตรวจสอบอีกครั้ง</Button>
                 <Button variant="primary" size="lg" onClick={handleConfirm}>บันทึกการแก้ไข</Button>
            </div>
       </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl w-full mx-auto">
        <form onSubmit={handlePreSubmit} className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">เลขที่สมัครสอบ</label>
              <input type="text" required value={id} onChange={e => setId(e.target.value)} className="block w-full px-5 py-4 bg-gray-50 border-0 rounded-xl text-base text-gray-900 focus:ring-2 focus:ring-black/10 placeholder-gray-300 transition-all" />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-3">
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">คำนำหน้า</label>
                     <select value={title} onChange={(e) => setTitle(e.target.value)} className="block w-full px-5 py-4 bg-gray-50 border-0 rounded-xl text-base text-gray-900 focus:ring-2 focus:ring-black/10 cursor-pointer transition-all">
                         <option value="เด็กชาย">เด็กชาย</option>
                         <option value="นาย">นาย</option>
                         <option value="เด็กหญิง">เด็กหญิง</option>
                         <option value="นางสาว">นางสาว</option>
                     </select>
                </div>
                <div className="md:col-span-5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">ชื่อจริง</label>
                  <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="block w-full px-5 py-4 bg-gray-50 border-0 rounded-xl text-base text-gray-900 focus:ring-2 focus:ring-black/10 transition-all" />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">นามสกุล</label>
                  <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="block w-full px-5 py-4 bg-gray-50 border-0 rounded-xl text-base text-gray-900 focus:ring-2 focus:ring-black/10 transition-all" />
                </div>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">ลำดับแผนการเรียนที่เลือก</label>
                  <button type="button" onClick={() => setSelectedStreams(new Array(studyPlans.length).fill(''))} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1.5 font-bold transition-colors bg-red-50 px-3 py-1.5 rounded-md"><RotateCcw className="w-4 h-4" /> รีเซต</button>
              </div>
              <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                {studyPlans.map((plan, index) => {
                    const rank = index + 1;
                    return (
                        <div key={index} className="flex items-center gap-4">
                             <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{rank}</div>
                             <select value={selectedStreams[index] || ''} onChange={e => handleStreamChange(index, e.target.value)} className={`block w-full px-5 py-3 border rounded-lg text-base focus:ring-2 focus:ring-black/5 outline-none transition-all cursor-pointer ${selectedStreams[index] ? 'bg-white border-gray-300 text-gray-900 font-medium' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                                <option value="" className="text-gray-400">กรุณาระบุแผนการเรียน...</option>
                                {studyPlans.map(option => {
                                    const isSelectedElsewhere = selectedStreams.some((s, i) => s === option.name && i !== index);
                                    return <option key={option.id} value={option.name} disabled={isSelectedElsewhere} className={isSelectedElsewhere ? 'text-gray-300' : 'text-gray-900'}>{option.name} {isSelectedElsewhere ? '(เลือกไปแล้ว)' : ''}</option>;
                                })}
                              </select>
                        </div>
                    );
                })}
              </div>
            </div>
          </div>
          <div className="pt-6">
             <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-3">
                 <h4 className="text-base font-bold text-black">คะแนนสอบ (เต็ม {totalMaxScore} คะแนน)</h4>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {subjects.map((subj, index) => (
                  <div key={subj.id}>
                    <label className={`block text-xs font-bold text-center mb-2.5 px-1 py-1 rounded ${getSubjectColor(index)}`}>{subj.name}</label>
                    <input type="number" min="0" max={subj.maxScore} required placeholder="0" value={scores[subj.id] || ''} onChange={e => handleScoreChange(subj.id, e.target.value)} className="block w-full px-3 py-4 bg-white border border-gray-200 rounded-xl text-xl font-bold text-center text-gray-900 focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all shadow-sm" />
                  </div>
                ))}
             </div>
          </div>
          <div className="flex justify-end pt-8 border-t border-gray-100 mt-8">
             <Button type="submit" size="lg"><Save className="h-5 w-5 mr-2" /> บันทึกการแก้ไข</Button>
          </div>
        </form>
    </div>
  );
};
