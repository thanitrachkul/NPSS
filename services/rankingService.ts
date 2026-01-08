
import { Student, RankedStudent, StudyPlan } from '../types';

export const calculateTotal = (student: Student, subjects?: string[]): number => {
  const { math, science, thai, english, social } = student.scores;
  return math + science + thai + english + social;
};

// Returns a negative value if a should come before b (a is better)
const tieBreaker = (a: Student, b: Student): number => {
  if (a.scores.science !== b.scores.science) return b.scores.science - a.scores.science;
  if (a.scores.math !== b.scores.math) return b.scores.math - a.scores.math;
  if (a.scores.english !== b.scores.english) return b.scores.english - a.scores.english;
  if (a.scores.thai !== b.scores.thai) return b.scores.thai - a.scores.thai;
  return b.scores.social - a.scores.social;
};

export const rankStudents = (students: Student[], plans: StudyPlan[]): RankedStudent[] => {
  // 1. Calculate totals
  let processed = students.map(s => ({
    ...s,
    totalScore: calculateTotal(s),
    rank: 0,
    qualifiedStream: null as string | null
  }));

  // 2. Global Sort
  processed.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return tieBreaker(a, b);
  });

  // 3. Assign Global Rank
  processed = processed.map((s, index) => ({
    ...s,
    rank: index + 1
  }));

  // 4. Allocation Logic (Waterfall / Priority)
  
  // Initialize quota usage
  const quotaUsage: Record<string, number> = {};
  plans.forEach(p => {
    quotaUsage[p.name] = 0;
  });

  // Find max quota map for O(1) lookup
  const planQuotas: Record<string, number> = {};
  plans.forEach(p => planQuotas[p.name] = p.quota);

  // Iterate through ranked students
  return processed.map(student => {
    let assignedPlan: string | null = null;

    // Check preferences in order: 1st -> 2nd -> 3rd ...
    for (const planName of student.preferredStreams) {
        // If plan exists in our settings AND has space
        if (planQuotas[planName] !== undefined) {
             const currentUsage = quotaUsage[planName];
             if (currentUsage < planQuotas[planName]) {
                 // Allocate
                 assignedPlan = planName;
                 quotaUsage[planName]++;
                 break; // Stop checking next choices
             }
        }
    }

    return { 
        ...student, 
        qualifiedStream: assignedPlan 
    };
  });
};
