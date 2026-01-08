
import React, { useMemo } from 'react';
import { RankedStudent, StudyPlan, ExamSubject } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Users, AlertCircle, CheckCircle } from 'lucide-react';

interface AnalysisProps {
  students: RankedStudent[];
  plans: StudyPlan[];
  subjects: ExamSubject[];
  level: string;
  academicYear: string;
}

const Analysis: React.FC<AnalysisProps> = ({ students, plans, subjects, level, academicYear }) => {

  // --- 1. Statistics Calculations ---
  
  // Total & Averages
  const totalStudents = students.length;
  
  const avgTotalScore = useMemo(() => {
    if (totalStudents === 0) return 0;
    const sum = students.reduce((acc, s) => acc + s.totalScore, 0);
    return Math.round(sum / totalStudents);
  }, [students, totalStudents]);

  const maxTotalScore = useMemo(() => {
      if (totalStudents === 0) return 0;
      return Math.max(...students.map(s => s.totalScore));
  }, [students, totalStudents]);

  // Plan Quota Stats (NEW)
  const planStats = useMemo(() => {
      return plans.map(p => {
          const admitted = students.filter(s => s.qualifiedStream === p.name).length;
          // Cap percent at 100 for visual bar, unless we want to show overflow
          const percent = p.quota > 0 ? Math.min(100, (admitted / p.quota) * 100) : 0;
          return {
              ...p,
              admitted,
              percent
          };
      });
  }, [students, plans]);

  // Color Helpers
  const getStreamColor = (name: string) => {
      if (name.includes('วิทย์-คณิต')) return '#3b82f6'; // Blue
      if (name.includes('ศิลป์-คำนวณ')) return '#10b981'; // Green
      if (name.includes('ศิลป์-ภาษา')) return '#f59e0b'; // Amber/Yellow
      if (name.includes('ศิลป์-สังคม')) return '#ef4444'; // Red
      if (name.includes('พิเศษ')) return '#8b5cf6'; // Purple
      return '#9ca3af'; // Gray
  };

  const getSubjectColor = (id: string) => {
      switch(id) {
          case 'math': return '#3b82f6';
          case 'science': return '#10b981';
          case 'thai': return '#f59e0b';
          case 'english': return '#ef4444';
          case 'social': return '#8b5cf6';
          default: return '#9ca3af';
      }
  };

  // Chart Data 1: Interest Distribution (Based on First Preference)
  const interestData = useMemo(() => {
      return plans.map(plan => {
          const count = students.filter(s => s.preferredStreams && s.preferredStreams[0] === plan.name).length;
          return {
              name: plan.name,
              value: count,
              fill: getStreamColor(plan.name)
          };
      }).filter(d => d.value > 0);
  }, [students, plans]);

  // Chart Data 2: Subject Averages
  const subjectAvgData = useMemo(() => {
      return subjects.map(subj => {
          const totalScore = students.reduce((acc, s) => acc + (s.scores[subj.id] || 0), 0);
          const avg = totalStudents > 0 ? Math.round(totalScore / totalStudents) : 0;
          return {
              name: subj.name,
              score: avg,
              fullMark: subj.maxScore,
              fill: getSubjectColor(subj.id)
          };
      });
  }, [students, subjects, totalStudents]);

  // Table Data: Score Extremes
  const scoreExtremes = useMemo(() => {
      return subjects.map(subj => ({
          id: subj.id,
          name: subj.name,
          fullCount: students.filter(s => s.scores[subj.id] === subj.maxScore).length,
          zeroCount: students.filter(s => s.scores[subj.id] === 0).length,
          maxScore: subj.maxScore
      }));
  }, [students, subjects]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-2 pt-6">
          <div>
               <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1.5 bg-black text-white text-xs font-black rounded-lg uppercase tracking-widest shadow-sm">
                      {level === 'M.1' ? 'มัธยมศึกษาปีที่ 1' : 'มัธยมศึกษาปีที่ 4'}
                  </span>
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">ปีการศึกษา {academicYear}</span>
               </div>
               <h2 className="text-4xl font-bold text-[#1D1D1F] tracking-tight leading-none">
                  สรุปและวิเคราะห์ผล
               </h2>
               <p className="text-xl text-gray-500 mt-4 font-medium">
                  ภาพรวมสถิติ คะแนนสอบ และความสนใจเลือกแผนการเรียน
               </p>
          </div>
      </div>

      {/* --- Row 1: Key Metrics Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Total Students */}
          <div className="bg-white p-8 rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 flex items-center justify-between relative overflow-hidden">
              <div className="relative z-10">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">ผู้สมัครทั้งหมด</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-blue-600">{totalStudents}</span>
                    <span className="text-sm font-bold text-gray-400">คน</span>
                  </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl">
                  <Users className="w-10 h-10 text-gray-300" />
              </div>
          </div>

          {/* Card 2: Average Score */}
          <div className="bg-white p-8 rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">คะแนนเฉลี่ยรวม</p>
              <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-emerald-500">{avgTotalScore}</span>
                  <span className="text-sm font-bold text-gray-300">/ 500 คะแนน</span>
              </div>
          </div>

          {/* Card 3: Max Score */}
          <div className="bg-white p-8 rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">คะแนนสูงสุด</p>
              <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-purple-600">{maxTotalScore}</span>
              </div>
          </div>
      </div>

      {/* --- Row 2: Charts --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Interest (Donut) */}
          <div className="bg-white p-8 rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col min-h-[400px]">
              <div className="mb-6">
                <h3 className="text-base font-bold text-gray-900">จำนวนนักเรียนแยกตามแผนการเรียนที่เลือก</h3>
                <p className="text-xs text-gray-400 font-medium mt-1">สัดส่วนความสนใจของผู้สมัคร (อันดับ 1)</p>
              </div>
              
              <div className="flex-grow relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={interestData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={105}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {interestData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', padding: '12px 16px' }}
                            itemStyle={{ fontSize: '14px', fontWeight: 600 }}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            height={36} 
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Chart 2: Subject Averages (Bar) */}
          <div className="bg-white p-8 rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col min-h-[400px]">
              <div className="mb-6">
                <h3 className="text-base font-bold text-gray-900">คะแนนเฉลี่ยรายวิชา</h3>
                <p className="text-xs text-gray-400 font-medium mt-1">ประสิทธิภาพการสอบแยกรายวิชา</p>
              </div>
              
              <div className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={subjectAvgData}
                        margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
                        barSize={40}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                        />
                        <Tooltip 
                            cursor={{ fill: '#f9fafb' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="score" radius={[8, 8, 8, 8]}>
                            {subjectAvgData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
              </div>
          </div>
      </div>

      {/* --- Row 3: Study Plan Quota Stats (NEW) --- */}
      <div className="bg-white p-8 rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100">
          <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-gray-400" />
                    สถานะจำนวนรับและจำนวนที่ได้ (Quota Summary)
              </h3>
              <p className="text-sm text-gray-400 mt-1">แสดงข้อมูลจำนวนที่นั่ง (Quota) และจำนวนนักเรียนที่ผ่านการคัดเลือกจริงในแต่ละแผนการเรียน</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {planStats.map(plan => (
                <div key={plan.id}>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-base font-bold text-gray-800">{plan.name}</span>
                        <div className="text-right">
                            <span className={`text-xl font-bold ${plan.admitted >= plan.quota ? 'text-emerald-600' : 'text-gray-900'}`}>
                                {plan.admitted}
                            </span>
                            <span className="text-sm text-gray-400 font-medium mx-1.5">/</span>
                            <span className="text-sm text-gray-400 font-medium">{plan.quota} ที่นั่ง</span>
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                plan.admitted >= plan.quota ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${plan.percent}%` }}
                        />
                    </div>
                </div>
            ))}
          </div>
      </div>

      {/* --- Row 4: Deep Data (Score Extremes) --- */}
      <div className="bg-white p-8 rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-gray-400" />
                ข้อมูลเจาะลึก: คะแนน เต็ม/ศูนย์
          </h3>
          <p className="text-sm text-gray-400 mb-8">จำนวนนักเรียนที่ได้คะแนนสอบเต็ม (Max) และคะแนนเป็นศูนย์ (Zero) แยกรายวิชา</p>
          
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                  <thead>
                      <tr className="bg-gray-50/50">
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider rounded-l-xl">วิชาสอบ</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">คะแนนเต็ม (Max)</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 
                                สอบได้เต็ม (คน)
                            </span>
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3 rounded-r-xl">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span> 
                                สอบได้ 0 (คน)
                            </span>
                          </th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                      {scoreExtremes.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-base font-bold text-gray-900">{item.name}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-400 font-mono">
                                  {item.maxScore}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                  {item.fullCount > 0 ? (
                                      <span className="inline-flex items-center justify-center w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full font-bold text-sm shadow-sm">
                                          {item.fullCount}
                                      </span>
                                  ) : (
                                      <span className="text-gray-300">-</span>
                                  )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                  {item.zeroCount > 0 ? (
                                      <span className="inline-flex items-center justify-center w-10 h-10 bg-red-100 text-red-700 rounded-full font-bold text-sm shadow-sm">
                                          {item.zeroCount}
                                      </span>
                                  ) : (
                                      <span className="text-gray-300">-</span>
                                  )}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

export default Analysis;
