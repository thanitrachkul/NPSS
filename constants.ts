
import { Student, StreamType } from './types';

// Mock Data for 50 students
const firstNames = [
  'สมชาย', 'สมศรี', 'มานะ', 'มานี', 'ปิติ', 'ชูใจ', 'วีระ', 'ณเดชน์', 'ญาญ่า', 'มาริโอ้',
  'ใบเฟิร์น', 'ต่อ', 'ไอซ์', 'เจเจ', 'กัปตัน', 'สกาย', 'แบงค์', 'แพรวา', 'ฟรัง', 'ต้าเหนิง',
  'โอบ', 'กันต์', 'พุฒ', 'เต๋อ', 'มิว', 'แต้ว', 'บอย', 'เกรท', 'อาเล็ก', 'เจมส์',
  'เบลล่า', 'โป๊ป', 'หมาก', 'คิม', 'มาร์กี้', 'ป๊อก', 'แจ็ค', 'นิกกี้', 'ก้อย', 'นัตตี้',
  'ดรีม', 'มายด์', 'วี', 'เฌอปราง', 'มิวสิค', 'ปัญ', 'เจนนิษฐ์', 'อร', 'ตาหวาน', 'เนย'
];

const lastNames = [
  'ใจดี', 'รักเรียน', 'มีมาก', 'สดใส', 'ชูใจ', 'กล้าหาญ', 'วงศ์', 'อุรัสยา', 'เมาเร่อ', 'พิมพ์ชนก',
  'ธนภพ', 'พาริส', 'กฤษณภูมิ', 'ชลธร', 'วงศ์รวี', 'ธิติ', 'ณิชาภัทร', 'นรีกุล', 'กัญญาวีร์', 'โอบนิธิ',
  'กันตถาวร', 'พุฒิชัย', 'ฉันทวิชช์', 'นิษฐา', 'ณฐพร', 'ปกรณ์', 'วรินทร', 'ธีรเดช', 'จิรายุ',
  'ราณี', 'ธนวรรธน์', 'ปริญ', 'เบอร์ลี่', 'ราศรี', 'ภัสสรกรณ์', 'แฟนฉัน', 'ณฉัตร', 'อรัชพร', 'นันทนัท',
  'อภิชญา', 'ลภัสลัล', 'วิโอเลต', 'อารีย์กุล', 'แพรวา', 'สิกิจ', 'โอประเสริฐ', 'พัศชนันท์', 'รัตน', 'กานต์ธีรา'
];

// Helper to guess gender/title from name index
const getMockTitle = (index: number) => {
    const maleIndices = [0, 2, 4, 6, 7, 9, 11, 13, 14, 15, 16, 20, 21, 22, 23, 26, 27, 28, 29, 31, 32, 35, 36, 37];
    if (maleIndices.includes(index)) {
        return Math.random() > 0.5 ? 'นาย' : 'เด็กชาย';
    }
    return Math.random() > 0.5 ? 'นางสาว' : 'เด็กหญิง';
};

const generateScore = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to shuffle array
const shuffleArray = (array: string[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const ALL_STREAMS = Object.values(StreamType);

export const MOCK_STUDENTS: Student[] = Array.from({ length: 50 }, (_, i) => {
  // Generate a randomized list of preferences
  // We bias the first choice slightly to create realistic clusters
  let basePreferences = shuffleArray(ALL_STREAMS);
  
  const rand = Math.random();
  // Bias logic: Ensure Sci-Math is first for ~40% of students
  if (rand < 0.4) {
      basePreferences = [StreamType.SCI_MATH, ...basePreferences.filter(s => s !== StreamType.SCI_MATH)];
  }

  // Generate scores loosely based on their first preference
  const firstChoice = basePreferences[0];
  let scores;
  if (firstChoice === StreamType.SCI_MATH) {
    scores = {
      math: generateScore(60, 100),
      science: generateScore(60, 100),
      thai: generateScore(50, 90),
      english: generateScore(50, 95),
      social: generateScore(50, 90)
    };
  } else if (firstChoice === StreamType.ARTS_LANG) {
    scores = {
      math: generateScore(40, 80),
      science: generateScore(40, 70),
      thai: generateScore(70, 100),
      english: generateScore(70, 100),
      social: generateScore(60, 90)
    };
  } else {
    scores = {
      math: generateScore(50, 90),
      science: generateScore(40, 80),
      thai: generateScore(60, 95),
      english: generateScore(50, 90),
      social: generateScore(60, 95)
    };
  }

  return {
    id: `STU${String(i + 1).padStart(3, '0')}`,
    title: getMockTitle(i),
    firstName: firstNames[i],
    lastName: lastNames[i],
    preferredStreams: basePreferences,
    scores
  };
});

export const SUBJECT_LABELS = {
  math: 'คณิตศาสตร์',
  science: 'วิทยาศาสตร์',
  thai: 'ภาษาไทย',
  english: 'ภาษาอังกฤษ',
  social: 'สังคมศึกษา',
};
