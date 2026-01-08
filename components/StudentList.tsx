
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RankedStudent, Student, StudyPlan, ExamSubject } from '../types';
import Button from './Button';
import { Plus, Filter, Pencil, Trash2, Search, User, Users, X, Trophy, FileText, Download, ArrowUpDown, ArrowDown, ArrowUp, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react';
import DataEntry, { EditStudentForm } from './DataEntry';
import ExcelJS from 'exceljs';

interface StudentListProps {
  students: RankedStudent[];
  studyPlans: StudyPlan[];
  subjects: ExamSubject[];
  onAddStudents: (newStudents: Student[]) => void;
  onEditStudent: (student: Student, originalId?: string) => void;
  onDeleteStudent: (id: string) => void;
  level: string;
  academicYear: string;
  readOnly?: boolean;
  updatedAt?: string;
}

const ITEMS_PER_PAGE = 100;

const StudentList: React.FC<StudentListProps> = ({ 
  students, 
  studyPlans, 
  subjects,
  onAddStudents, 
  onEditStudent, 
  onDeleteStudent,
  level,
  academicYear,
  readOnly = false,
  updatedAt
}) => {
  const [filterStream, setFilterStream] = useState<string | 'ALL'>('ALL'); // Qualified Stream
  const [filterPreferred, setFilterPreferred] = useState<string | 'ALL'>('ALL'); // Preferred Stream
  const [searchTerm, setSearchTerm] = useState('');
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // Sorting States
  const [sortSubject, setSortSubject] = useState<string>('TOTAL');
  const [sortDirection, setSortDirection] = useState<'DESC' | 'ASC'>('DESC');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Detail Modal
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<RankedStudent | null>(null);
  
  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Stats Logic
  const maleCount = useMemo(() => students.filter(s => ['เด็กชาย', 'นาย'].includes(s.title)).length, [students]);
  const femaleCount = useMemo(() => students.filter(s => ['เด็กหญิง', 'นางสาว'].includes(s.title)).length, [students]);

  // Calculate total max score from subjects
  const totalMaxScore = useMemo(() => subjects.reduce((acc, s) => acc + s.maxScore, 0), [subjects]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStream, filterPreferred, searchTerm, sortSubject, sortDirection]);

  const filteredStudents = useMemo(() => {
    let result = students.filter(s => {
      // 1. Filter by Qualified Stream (Actual Result)
      const matchesQualified = filterStream === 'ALL' || s.qualifiedStream === filterStream;
      
      // 2. Filter by Preferred Stream (Selection 1st Choice)
      const matchesPreferred = filterPreferred === 'ALL' || (s.preferredStreams && s.preferredStreams[0] === filterPreferred);
      
      // 3. General Search
      const searchLower = (searchTerm || '').toLowerCase();
      const fName = s.firstName || '';
      const lName = s.lastName || '';
      const sId = s.id || '';

      const matchesSearch = 
        fName.toLowerCase().includes(searchLower) || 
        lName.toLowerCase().includes(searchLower) || 
        sId.toLowerCase().includes(searchLower);
        
      return matchesQualified && matchesPreferred && matchesSearch;
    });

    // 4. Sorting
    const isDesc = sortDirection === 'DESC';

    if (sortSubject !== 'TOTAL') {
        result.sort((a, b) => {
            const scoreA = a.scores[sortSubject] || 0;
            const scoreB = b.scores[sortSubject] || 0;
            return isDesc ? scoreB - scoreA : scoreA - scoreB;
        });
    } else {
        // Default: Sort by Rank (Total Score)
        // Rank 1 is the highest score. 
        // If DESC (High to Low score): Rank 1, 2, 3...
        // If ASC (Low to High score): Rank 100, 99...
        if (isDesc) {
            result.sort((a, b) => a.rank - b.rank);
        } else {
            result.sort((a, b) => b.rank - a.rank);
        }
    }

    return result;
  }, [students, filterStream, filterPreferred, searchTerm, sortSubject, sortDirection]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredStudents, currentPage]);

  const goToPage = (page: number) => {
      if (page >= 1 && page <= totalPages) {
          setCurrentPage(page);
      }
  };

  // ... handlers remain the same ...
  const handleEditClick = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    if (readOnly) return;
    setEditingStudent(student);
    setShowEntryModal(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (readOnly) return;
      setDeletingId(id);
  };

  const handleConfirmDelete = () => {
      if (deletingId) {
          onDeleteStudent(deletingId);
          setDeletingId(null);
      }
  };

  const handleRowClick = (student: RankedStudent) => {
      setSelectedStudentDetail(student);
  };

  const handleCloseModal = () => {
    setShowEntryModal(false);
    setEditingStudent(null);
  };

  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();

    const getStreamColor = (streamName: string) => {
        if (!streamName) return 'FF000000';
        if (streamName.includes('วิทย์-คณิต')) return 'FF0000FF';
        if (streamName.includes('ศิลป์-คำนวณ')) return 'FF008000';
        if (streamName.includes('ศิลป์-ภาษา')) return 'FFC05000';
        if (streamName.includes('ศิลป์-สังคม')) return 'FF800080';
        if (streamName.includes('พิเศษ')) return 'FFFFD700';
        return 'FF000000';
    };

    const generateSheet = (sheetName: string, data: RankedStudent[]) => {
        const worksheet = workbook.addWorksheet(sheetName);

        worksheet.columns = [
            { key: 'rank', width: 12 },
            { key: 'id', width: 16 },
            { key: 'title', width: 14 },
            { key: 'firstName', width: 22 },
            { key: 'lastName', width: 22 },
            { key: 'preferred', width: 35 },
            { key: 'qualified', width: 35 },
            { key: 'totalScore', width: 18 },
            { key: 'percentage', width: 15 },
            ...subjects.map(s => ({ key: s.id, width: 12 }))
        ];

        const totalColumns = 9 + subjects.length;
        worksheet.mergeCells(1, 1, 1, totalColumns);
        const titleRow = worksheet.getRow(1);
        titleRow.getCell(1).value = `ข้อมูลการคัดเลือกนักเรียน ชั้นมัธยมศึกษาปีที่ ${level === 'M.1' ? '1' : '4'} ปีการศึกษา ${academicYear}`;
        titleRow.getCell(1).font = { name: 'TH Sarabun PSK', size: 22, bold: true };
        titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        titleRow.height = 45;

        const headerRow = worksheet.getRow(2);
        const headerValues = [
            'อันดับที่', 'เลขที่ผู้สมัคร', 'คำนำหน้า', 'ชื่อ', 'นามสกุล', 
            'แผนฯ ที่เลือก (อันดับ 1)', 'แผนฯ ที่ได้', 'คะแนนรวม', 'คิดเป็น %',
            ...subjects.map(s => s.name)
        ];
        headerRow.values = headerValues;
        headerRow.height = 35;
        
        headerRow.eachCell((cell) => {
            cell.font = { name: 'TH Sarabun PSK', size: 18, bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E8D5' } };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        data.forEach(student => {
            const percentage = totalMaxScore > 0 
                ? parseFloat(((student.totalScore / totalMaxScore) * 100).toFixed(4))
                : 0;

            const row = worksheet.addRow({
                rank: student.rank,
                id: student.id,
                title: student.title,
                firstName: student.firstName,
                lastName: student.lastName,
                preferred: student.preferredStreams ? student.preferredStreams[0] : '-',
                qualified: student.qualifiedStream || 'รอเรียก',
                totalScore: student.totalScore,
                percentage: `${percentage}%`,
                ...student.scores
            });

            row.eachCell((cell, colNumber) => {
                cell.font = { name: 'TH Sarabun PSK', size: 16 };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };

                if (colNumber === 4 || colNumber === 5) {
                    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
                }

                if (colNumber === 7) {
                    cell.font = { 
                        name: 'TH Sarabun PSK', 
                        size: 16, 
                        bold: true,
                        color: { argb: getStreamColor(cell.value?.toString() || '') }
                    };
                }

                if (colNumber === 8 || colNumber === 9) {
                    cell.font = { name: 'TH Sarabun PSK', size: 16, bold: true };
                }
            });
        });
    };

    generateSheet('รวมทั้งหมด', students);

    studyPlans.forEach(plan => {
        const planStudents = students.filter(s => s.qualifiedStream === plan.name);
        const sanitizedPlanName = plan.name
            .replace(/[*?:\\/[\]]/g, ' ')
            .trim();
        const safeSheetName = sanitizedPlanName.substring(0, 30);
        generateSheet(safeSheetName, planStudents);
    });
    
    const waitingStudents = students.filter(s => !s.qualifiedStream);
    if (waitingStudents.length > 0) {
        generateSheet('รอเรียก (Waiting)', waitingStudents);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Student_Selection_${level}_${academicYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStreamBadgeStyle = (streamName: string) => {
    // ... existing ...
    const colors = [
        'bg-blue-50 text-blue-700 border-blue-100',
        'bg-orange-50 text-orange-700 border-orange-100',
        'bg-pink-50 text-pink-700 border-pink-100',
        'bg-teal-50 text-teal-700 border-teal-100',
        'bg-purple-50 text-purple-700 border-purple-100',
        'bg-indigo-50 text-indigo-700 border-indigo-100',
    ];
    let hash = 0;
    if (streamName) {
        for (let i = 0; i < streamName.length; i++) {
            hash = streamName.charCodeAt(i) + ((hash << 5) - hash);
        }
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const formatUpdateDate = (dateStr?: string) => {
     if (!dateStr) return '-';
     try {
         return new Date(dateStr).toLocaleString('th-TH', {
             year: 'numeric',
             month: 'short',
             day: 'numeric',
             hour: '2-digit',
             minute: '2-digit'
         });
     } catch (e) {
         return dateStr;
     }
  };

  return (
    <>
      <div className="space-y-7">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 pt-6">
            <div>
                 <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1.5 bg-black text-white text-xs font-black rounded-lg uppercase tracking-widest shadow-sm">
                        {level === 'M.1' ? 'มัธยมศึกษาปีที่ 1' : 'มัธยมศึกษาปีที่ 4'}
                    </span>
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">ปีการศึกษา {academicYear}</span>
                 </div>
                 <h2 className="text-4xl font-bold text-[#1D1D1F] tracking-tight leading-none">
                    ผลการคัดเลือกนักเรียน
                 </h2>
                <p className="text-xl text-gray-500 mt-4 font-medium">
                   รายชื่อและสถานะการคัดเลือกเข้าศึกษาต่อ
                </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                 <div className="bg-white px-5 py-2.5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center justify-between sm:justify-start gap-6 h-[60px]">
                      <div className="flex items-center gap-3">
                           <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                              <Users className="w-5 h-5" />
                           </div>
                           <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ทั้งหมด</p>
                              <p className="text-base font-bold text-gray-900 leading-none">{students.length}</p>
                           </div>
                      </div>
                      <div className="w-px h-8 bg-gray-100"></div>
                      <div className="flex items-center gap-3">
                           <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                              <User className="w-5 h-5" />
                           </div>
                           <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ชาย</p>
                              <p className="text-base font-bold text-gray-900 leading-none">{maleCount}</p>
                           </div>
                      </div>
                      <div className="w-px h-8 bg-gray-100"></div>
                       <div className="flex items-center gap-3">
                           <div className="w-9 h-9 rounded-full bg-pink-50 flex items-center justify-center text-pink-500">
                              <User className="w-5 h-5" />
                           </div>
                           <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">หญิง</p>
                              <p className="text-base font-bold text-gray-900 leading-none">{femaleCount}</p>
                           </div>
                      </div>
                 </div>

                 {!readOnly && (
                    <div className="flex flex-col items-end">
                        <div className="text-[10px] font-bold text-gray-400 mb-1.5 flex items-center gap-1">
                            <span>Last update:</span>
                            <span className="text-gray-600">{formatUpdateDate(updatedAt)}</span>
                        </div>
                        <Button 
                            size="lg" 
                            onClick={() => setShowEntryModal(true)}
                            className="h-[60px] bg-black hover:bg-gray-800 shadow-lg shadow-gray-200 text-white rounded-2xl px-8 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 text-base font-bold"
                        >
                            <Plus className="h-5 w-5" /> เพิ่มข้อมูลนักเรียน
                        </Button>
                    </div>
                 )}
            </div>
        </div>

        {/* Filter Bar (Updated Single Line) */}
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200/60 flex flex-wrap gap-2 items-center">
          
          <div className="relative flex-grow min-w-[200px]">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="ค้นหาชื่อ หรือ เลขที่สมัคร..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 block w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-400 font-medium"
                />
          </div>

          <div className="relative flex-grow min-w-[150px]">
                 <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500 z-10" />
                 <select
                      value={filterPreferred}
                      onChange={(e) => setFilterPreferred(e.target.value)}
                      className="pl-10 pr-8 block w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all appearance-none font-bold"
                  >
                      <option value="ALL">แผนฯ ที่เลือก (ทั้งหมด)</option>
                      {studyPlans.map(plan => (
                          <option key={plan.id} value={plan.name}>{plan.name}</option>
                      ))}
                  </select>
          </div>

          <div className="relative flex-grow min-w-[150px]">
                 <Filter className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500 z-10" />
                 <select
                      value={filterStream}
                      onChange={(e) => setFilterStream(e.target.value)}
                      className="pl-10 pr-8 block w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all appearance-none font-bold"
                  >
                      <option value="ALL">แผนฯ ที่ได้ (ทั้งหมด)</option>
                      {studyPlans.map(plan => (
                          <option key={plan.id} value={plan.name}>{plan.name}</option>
                      ))}
                  </select>
          </div>
          
          <div className="w-px h-8 bg-gray-200 mx-1 hidden lg:block"></div>

          {/* Sort Subject (Icon + Short Text) */}
          <div className="relative flex-grow lg:flex-grow-0 min-w-[130px]">
                 <BarChart2 className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500 z-10" />
                 <select
                      value={sortSubject}
                      onChange={(e) => setSortSubject(e.target.value)}
                      className="pl-10 pr-6 block w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all appearance-none font-bold"
                  >
                      <option value="TOTAL">คะแนน: รวม</option>
                      {subjects.map(subj => (
                          <option key={subj.id} value={subj.id}>คะแนน: {subj.name}</option>
                      ))}
                  </select>
          </div>

          {/* Sort Direction (Icon + Short Text) */}
          <div className="relative flex-grow lg:flex-grow-0 min-w-[140px]">
                 <ArrowUpDown className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500 z-10" />
                 <select
                      value={sortDirection}
                      onChange={(e) => setSortDirection(e.target.value as 'DESC' | 'ASC')}
                      className="pl-10 pr-6 block w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all appearance-none font-bold"
                  >
                      <option value="DESC">จัดลำดับ: มาก → น้อย</option>
                      <option value="ASC">จัดลำดับ: น้อย → มาก</option>
                  </select>
          </div>

        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-gray-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-[#1D1D1F]">
                  <th scope="col" className="px-6 py-5 text-center text-xs font-bold text-white uppercase tracking-widest min-w-[110px]">อันดับที่</th>
                  <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-white uppercase tracking-widest">เลขที่ผู้สมัคร</th>
                  <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-white uppercase tracking-widest">ชื่อ - นามสกุล</th>
                  <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-white uppercase tracking-widest">แผนฯ ที่เลือก</th>
                  <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-white uppercase tracking-widest">แผนฯ ที่ได้</th>
                  <th scope="col" className="px-4 py-5 text-center text-xs font-bold text-white uppercase tracking-widest">
                      {sortSubject === 'TOTAL' ? 'คะแนนรวม' : `รวม`}
                  </th>
                  <th scope="col" className="px-4 py-5 text-center text-xs font-bold text-white uppercase tracking-widest">
                      คิดเป็น %
                  </th>
                  {subjects.map(subj => (
                    <th key={subj.id} scope="col" className={`px-2 py-5 text-center text-xs font-bold uppercase tracking-widest w-14 ${sortSubject === subj.id ? 'text-yellow-400 underline underline-offset-4' : 'text-white'}`}>
                        {subj.name}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-5 text-right text-xs font-bold text-white uppercase tracking-widest">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {paginatedStudents.length > 0 ? paginatedStudents.map((student) => {
                   let rankStyle = "bg-gray-100 text-gray-500 font-medium";
                   if (student.rank === 1) rankStyle = "bg-yellow-100 text-yellow-700 font-bold border border-yellow-200 scale-110 shadow-sm";
                   if (student.rank === 2) rankStyle = "bg-gray-200 text-gray-700 font-bold border border-gray-300 scale-105";
                   if (student.rank === 3) rankStyle = "bg-orange-100 text-orange-800 font-bold border border-orange-200 scale-105";

                   return (
                  <tr key={student.id} onClick={() => handleRowClick(student)} className="hover:bg-gray-50 transition-colors group cursor-pointer">
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                       <div className={`inline-flex items-center justify-center w-11 h-11 rounded-full text-lg ${rankStyle}`}>
                        {student.rank}
                       </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-base font-medium text-gray-500 font-mono tracking-wide">{student.id}</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-base font-semibold text-gray-900">
                        <span className="text-gray-400 font-normal mr-1">{student.title}</span>
                        {student.firstName} {student.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                            {student.preferredStreams && student.preferredStreams.length > 0 ? (
                                <>
                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border ${getStreamBadgeStyle(student.preferredStreams[0])}`}>
                                        1. {student.preferredStreams[0]}
                                    </span>
                                    {student.preferredStreams.length > 1 && (
                                        <span className="text-[10px] text-gray-400 ml-1">+ {student.preferredStreams.length - 1} ตัวเลือก</span>
                                    )}
                                </>
                            ) : (
                                <span className="text-gray-400 text-sm">-</span>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {student.qualifiedStream ? (
                           <div className="flex items-center">
                             <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2"></div>
                             <span className="text-base font-bold text-gray-900">{student.qualifiedStream}</span>
                           </div>
                      ) : (
                           <div className="flex items-center">
                             <div className="h-2 w-2 rounded-full bg-red-400 mr-2"></div>
                             <span className="text-sm font-medium text-red-600">รอเรียก (เต็มทุกลำดับ)</span>
                           </div>
                      )}
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap text-center">
                        <span className="text-base font-bold text-gray-900">{student.totalScore}</span>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap text-center">
                        <span className="text-base font-bold text-gray-900">
                             {totalMaxScore > 0 
                                ? parseFloat(((student.totalScore / totalMaxScore) * 100).toFixed(4))
                                : 0}%
                        </span>
                    </td>
                    
                    {subjects.map(subj => (
                        <td key={subj.id} className={`px-2 py-5 whitespace-nowrap text-center text-sm ${sortSubject === subj.id ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-gray-500'}`}>
                            {student.scores[subj.id] || 0}
                        </td>
                    ))}

                    <td className="px-4 py-5 whitespace-nowrap text-right">
                        {!readOnly ? (
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => handleEditClick(e, student)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="แก้ไขข้อมูล"
                                >
                                    <Pencil className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={(e) => handleDeleteClick(e, student.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="ลบข้อมูล"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="text-xs text-gray-300 italic">Read only</div>
                        )}
                    </td>
                  </tr>
                )}) : (
                    <tr>
                        <td colSpan={7 + subjects.length + 1} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center justify-center text-gray-400">
                                <Search className="h-10 w-10 mb-3 opacity-20" />
                                <span className="text-base font-light">ไม่พบข้อมูลนักเรียน</span>
                            </div>
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
                <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-600"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`w-10 h-10 rounded-full text-sm font-bold transition-all ${
                            currentPage === page 
                                ? 'bg-black text-white shadow-lg shadow-black/20 scale-110' 
                                : 'bg-white text-gray-500 hover:bg-gray-100'
                        }`}
                    >
                        {page}
                    </button>
                ))}

                <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-600"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        )}

        <div className="flex justify-end mt-4">
            <button 
                onClick={handleExport}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold text-base shadow-sm transition-all whitespace-nowrap active:scale-95 shadow-red-200"
                title="ส่งออกข้อมูลเป็นไฟล์ Excel (.xlsx)"
            >
                <Download className="w-5 h-5" /> ดาวน์โหลดไฟล์ Excel
            </button>
        </div>
      </div>

      {/* Entry Modal */}
      {showEntryModal && !readOnly && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
             <div 
                onClick={handleCloseModal}
                className="absolute inset-0 bg-transparent backdrop-blur-sm transition-all"
                aria-label="Close"
             ></div>
             
            <div className="relative bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                 <button 
                    onClick={handleCloseModal}
                    className="absolute top-6 right-6 p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-10"
                 >
                     <X className="w-5 h-5 text-gray-600" />
                 </button>
                 <div className="p-10">
                    <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                        {editingStudent ? <Pencil className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                        {editingStudent ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มข้อมูลนักเรียนใหม่'}
                    </h3>
                    
                    {editingStudent ? (
                        <EditStudentForm 
                            student={editingStudent}
                            onSave={(updatedStudent) => {
                                onEditStudent(updatedStudent, editingStudent.id);
                                handleCloseModal();
                            }}
                            studyPlans={studyPlans}
                            subjects={subjects}
                        />
                    ) : (
                        <DataEntry 
                            onAddStudents={(data) => {
                                onAddStudents(data);
                                handleCloseModal();
                            }} 
                            studyPlans={studyPlans}
                            subjects={subjects}
                        />
                    )}

                 </div>
            </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && !readOnly && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-all" onClick={() => setDeletingId(null)}></div>
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative z-10 text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                    <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">ยืนยันการลบ?</h3>
                <p className="text-gray-500 mb-8 text-sm">
                    คุณต้องการลบข้อมูลนักเรียนรหัส <span className="font-bold text-gray-900">{deletingId}</span> ใช่หรือไม่?
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeletingId(null)}
                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button 
                        onClick={handleConfirmDelete}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-200"
                    >
                        ลบข้อมูล
                    </button>
                </div>
            </div>
        </div>,
        document.body
      )}

      {/* Student Detail Modal */}
      {selectedStudentDetail && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-transparent backdrop-blur-sm transition-all" onClick={() => setSelectedStudentDetail(null)}></div>
             
             <div className="bg-white rounded-2xl w-full max-w-lg relative z-10 shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
                 <button 
                    onClick={() => setSelectedStudentDetail(null)}
                    className="absolute top-5 right-5 text-gray-400 hover:text-black"
                 >
                     <X className="w-6 h-6" />
                 </button>
                 
                 <div className="text-center mb-8">
                     <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-gray-700">
                        {selectedStudentDetail.rank}
                     </div>
                     <h2 className="text-xl font-bold text-gray-900">
                         {selectedStudentDetail.title}{selectedStudentDetail.firstName} {selectedStudentDetail.lastName}
                     </h2>
                     <p className="text-base text-gray-500 font-mono">{selectedStudentDetail.id}</p>
                 </div>

                 <div className="space-y-6">
                     <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 text-center">
                         <span className="block text-sm font-bold text-emerald-600 uppercase mb-2">ผลการคัดเลือก (แผนฯ ที่ได้)</span>
                         <span className="text-2xl font-bold text-emerald-800">
                            {selectedStudentDetail.qualifiedStream || "ยังไม่ผ่านเกณฑ์"}
                         </span>
                     </div>
                     
                     <div>
                         <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                             <FileText className="w-4 h-4" /> ลำดับแผนการเรียนที่เลือก
                         </h4>
                         <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                             {selectedStudentDetail.preferredStreams && selectedStudentDetail.preferredStreams.length > 0 ? (
                                 selectedStudentDetail.preferredStreams.map((plan, idx) => (
                                     <div key={idx} className={`flex items-center justify-between text-base p-2.5 rounded-lg ${plan === selectedStudentDetail.qualifiedStream ? 'bg-white shadow-sm border border-emerald-100' : 'opacity-60'}`}>
                                         <span className="font-bold text-gray-500 w-8">#{idx + 1}</span>
                                         <span className="flex-1 font-medium text-gray-900">{plan}</span>
                                         {plan === selectedStudentDetail.qualifiedStream && (
                                             <Trophy className="w-5 h-5 text-emerald-500" />
                                         )}
                                     </div>
                                 ))
                             ) : (
                                 <div className="text-center text-gray-400">ไม่มีข้อมูลแผนการเรียน</div>
                             )}
                         </div>
                     </div>

                     <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">คะแนนรวม: {selectedStudentDetail.totalScore}</h4>
                        <div className="grid grid-cols-5 gap-2">
                             {subjects.map(subj => (
                                 <div key={subj.id} className="bg-gray-50 p-3 rounded-lg text-center">
                                     <span className="block text-[10px] text-gray-400 mb-1.5">{subj.name}</span>
                                     <span className="block text-base font-bold text-gray-900">{selectedStudentDetail.scores[subj.id]}</span>
                                 </div>
                             ))}
                        </div>
                     </div>
                 </div>
                 
                 <div className="mt-8 pt-5 border-t border-gray-100 flex justify-end">
                     <Button variant="secondary" onClick={() => setSelectedStudentDetail(null)} className="text-base">ปิดหน้าต่าง</Button>
                 </div>
             </div>
          </div>,
          document.body
      )}
    </>
  );
};

export default StudentList;
