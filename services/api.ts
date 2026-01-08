
import { Classroom, Student, StudyPlan, ExamSubject } from '../types';
import { storage } from './storage';

const getApiUrl = () => {
    const config = storage.getConfig();
    return config.scriptUrl;
};

// Unified POST Request Handler
// Using POST for all requests to Google Apps Script avoids CORS issues with GET redirects
const sendPostRequest = async (action: string, data: any = {}) => {
    const config = storage.getConfig();
    const API_URL = config.scriptUrl ? config.scriptUrl.trim() : '';
    
    if (!API_URL || API_URL.includes('วาง_URL') || API_URL === '') {
        throw new Error('ไม่พบ Web App URL กรุณาตั้งค่าในเมนู System Admin');
    }

    // Safely append action query parameter
    const separator = API_URL.includes('?') ? '&' : '?';
    const url = `${API_URL}${separator}action=${action}`;

    // Include sheetId in the payload to ensure we target the correct database
    const payload = {
        ...data,
        action,
        sheetId: config.sheetId ? config.sheetId.trim() : '' // Send the configured Sheet ID
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', 
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const jsonResponse = await response.json();
        
        if (jsonResponse.status === 'error') {
            throw new Error(jsonResponse.message || 'Unknown server error');
        }

        return jsonResponse;
    } catch (error) {
        console.error(`API Error (${action}):`, error);
        throw error;
    }
};

const api = {
  async getClassrooms(): Promise<Classroom[]> {
    try {
      const result = await sendPostRequest('getClassrooms');
      return Array.isArray(result?.data) ? result.data : [];
    } catch (error) {
      console.warn('Error fetching classrooms:', error);
      throw error;
    }
  },

  async saveClassroom(classroom: Classroom): Promise<void> {
    await sendPostRequest('saveClassroom', classroom);
  },

  // NEW: Permanent Delete Classroom
  async deleteClassroom(id: string): Promise<void> {
    await sendPostRequest('deleteClassroom', { id });
  },

  async getDashboardData(classroomId: string): Promise<{ students: Student[], plans: StudyPlan[] | null, subjects: ExamSubject[] | null }> {
    try {
      const result = await sendPostRequest('getDashboardData', { classroomId });
      
      return { 
          students: Array.isArray(result?.students) ? result.students : [], 
          plans: Array.isArray(result?.plans) ? result.plans : null, 
          subjects: Array.isArray(result?.subjects) ? result.subjects : null 
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return { students: [], plans: null, subjects: null };
    }
  },

  async saveStudent(classroomId: string, student: Student): Promise<void> {
    await sendPostRequest('saveStudent', {
        classroomId,
        student
    });
  },

  // NEW: Bulk Save
  async saveStudents(classroomId: string, students: Student[]): Promise<void> {
    await sendPostRequest('saveStudents', {
        classroomId,
        students
    });
  },

  async deleteStudent(classroomId: string, studentId: string): Promise<void> {
    await sendPostRequest('deleteStudent', {
        classroomId,
        studentId
    });
  },

  async saveSettings(classroomId: string, type: 'PLANS' | 'SUBJECTS', data: any[]): Promise<void> {
    await sendPostRequest('saveSettings', {
        classroomId,
        type,
        data
    });
  },

  async setupDatabase(): Promise<void> {
    await sendPostRequest('setup');
  }
};

export default api;
