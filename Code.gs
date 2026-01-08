
const SHEETS = {
  CLASSROOMS: 'DB_Classrooms',
  STUDENTS: 'DB_Students',
  SETTINGS: 'DB_Settings'
};

// Helper to get the correct spreadsheet
function getDB(sheetId) {
  try {
    // If a specific ID is provided (and looks valid), try to open it
    if (sheetId && typeof sheetId === 'string' && sheetId.length > 10) {
      return SpreadsheetApp.openById(sheetId);
    }
    // Otherwise, fallback to the active spreadsheet (Container-bound)
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    console.error('Error opening spreadsheet by ID, falling back to active:', e);
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function setup(sheetId) {
  const ss = getDB(sheetId);
  
  // Create Classrooms Sheet: ID, Data(JSON), UpdatedAt, DeletedAt
  if (!ss.getSheetByName(SHEETS.CLASSROOMS)) {
    ss.insertSheet(SHEETS.CLASSROOMS).appendRow(['id', 'data', 'updated_at', 'deleted_at']);
  }
  
  // Create Students Sheet: ClassroomID, StudentID, Data(JSON), UpdatedAt
  if (!ss.getSheetByName(SHEETS.STUDENTS)) {
    ss.insertSheet(SHEETS.STUDENTS).appendRow(['classroom_id', 'student_id', 'data', 'updated_at']);
  }

  // Create Settings Sheet: ClassroomID, Type, Data(JSON), UpdatedAt
  if (!ss.getSheetByName(SHEETS.SETTINGS)) {
    ss.insertSheet(SHEETS.SETTINGS).appendRow(['classroom_id', 'type', 'data', 'updated_at']);
  }
}

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  // Wait up to 30 seconds for other processes to finish.
  lock.tryLock(30000);

  try {
    // 1. Determine Action (Prioritize URL param, fallback to body)
    let action = e.parameter.action;
    
    // 2. Parse Body Safely
    let body = {};
    if (e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        console.error('JSON Parse Error:', jsonErr);
      }
    }
    
    // Fallback if action wasn't in URL
    if (!action && body.action) {
      action = body.action;
    }

    const sheetId = body.sheetId || e.parameter.sheetId;

    let result = { status: 'error', message: 'Unknown action: ' + action };

    if (action === 'getClassrooms') {
      result = getClassrooms(sheetId);
    } else if (action === 'saveClassroom') {
      result = saveClassroom(body, sheetId);
    } else if (action === 'deleteClassroom') {
      result = deleteClassroom(body.id, sheetId);
    } else if (action === 'getDashboardData') {
      result = getDashboardData(body.classroomId || e.parameter.classroomId, sheetId);
    } else if (action === 'saveStudent') {
      result = saveStudent(body, sheetId);
    } else if (action === 'saveStudents') { // NEW: Bulk Save
      result = saveStudents(body, sheetId);
    } else if (action === 'deleteStudent') {
      result = deleteStudent(body.classroomId, body.studentId, sheetId);
    } else if (action === 'saveSettings') {
      result = saveSettings(body, sheetId);
    } else if (action === 'setup') {
      setup(sheetId); 
      result = { status: 'success', message: 'Setup completed successfully' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: error.toString(),
      stack: error.stack
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- Logic ---

// Helper to touch classroom timestamp
function updateClassroomTimestamp(classroomId, ss) {
  const sheet = ss.getSheetByName(SHEETS.CLASSROOMS);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const id = String(classroomId).trim();
  const now = new Date().toISOString();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() == id) {
      sheet.getRange(i + 1, 3).setValue(now);
      break;
    }
  }
}

function getClassrooms(sheetId) {
  const ss = getDB(sheetId);
  const sheet = ss.getSheetByName(SHEETS.CLASSROOMS);
  if (!sheet) return { status: 'success', data: [] }; // Return empty array if sheet missing, handled by setup

  const data = sheet.getDataRange().getValues();
  const classrooms = [];
  
  // Pre-fetch settings to count plans
  const setSheet = ss.getSheetByName(SHEETS.SETTINGS);
  const planCounts = {};

  if (setSheet) {
    const setData = setSheet.getDataRange().getValues();
    // Start from 1 to skip header
    for (let i = 1; i < setData.length; i++) {
       const cId = String(setData[i][0]).trim(); // Force string comparison
       const type = setData[i][1];
       if (type === 'PLANS') {
         try {
           const plans = JSON.parse(setData[i][2]);
           // Store count
           planCounts[cId] = Array.isArray(plans) ? plans.length : 0;
         } catch(e) {
           // ignore bad json
         }
       }
    }
  }
  
  // Skip header
  for (let i = 1; i < data.length; i++) {
    const json = data[i][1];
    const updatedAt = data[i][2]; // Get updatedAt directly from column
    const deletedAt = data[i][3];
    if (json) {
       try {
         const obj = JSON.parse(json);
         if (deletedAt) obj.deletedAt = deletedAt;
         if (updatedAt) obj.updatedAt = updatedAt; // Inject timestamp
         
         // Inject the actual plan count from settings DB
         const objId = String(obj.id).trim();
         
         if (planCounts.hasOwnProperty(objId)) {
             obj.planCount = planCounts[objId];
         } else {
             // If no setting found, fallback to existing property or 0
             obj.planCount = (obj.planCount !== undefined) ? obj.planCount : 0;
         }

         classrooms.push(obj);
       } catch (e) {
         // Skip corrupted rows
       }
    }
  }
  return { status: 'success', data: classrooms };
}

function saveClassroom(payload, sheetId) {
  const ss = getDB(sheetId);
  let sheet = ss.getSheetByName(SHEETS.CLASSROOMS);
  
  // Auto-setup if missing
  if (!sheet) {
    setup(sheetId);
    sheet = ss.getSheetByName(SHEETS.CLASSROOMS);
    if (!sheet) return { status: 'error', message: 'Failed to create DB_Classrooms sheet.' };
  }
  
  const data = sheet.getDataRange().getValues();
  const id = String(payload.id).trim();
  
  // Clean payload before saving to avoid redundancy if passing full objects
  const safePayload = { ...payload };
  delete safePayload.action;
  delete safePayload.sheetId;

  const json = JSON.stringify(safePayload);
  const now = new Date().toISOString();

  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() == id) {
      sheet.getRange(i + 1, 2).setValue(json); // Update Data
      sheet.getRange(i + 1, 3).setValue(now);  // Update Time
      // Ensure deleted_at is cleared if restoring or editing
      if (payload.deletedAt === undefined) {
         sheet.getRange(i + 1, 4).setValue('');
      } else {
         sheet.getRange(i + 1, 4).setValue(payload.deletedAt);
      }
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([id, json, now, payload.deletedAt || '']);
  }
  return { status: 'success' };
}

function deleteClassroom(id, sheetId) {
  const ss = getDB(sheetId);
  const sheet = ss.getSheetByName(SHEETS.CLASSROOMS);
  if (!sheet) return { status: 'error', message: 'Sheet DB_Classrooms not found' };

  // Ensure ID is string and trimmed for robust comparison
  const targetId = String(id).trim();

  // 1. Delete Classroom Row
  const data = sheet.getDataRange().getValues();
  let deleted = false;
  
  // Iterate backwards to safely delete
  for (let i = data.length - 1; i >= 1; i--) {
    // Column 0 is ID
    if (String(data[i][0]).trim() === targetId) {
      sheet.deleteRow(i + 1);
      deleted = true;
      break; 
    }
  }
  
  if (!deleted) return { status: 'error', message: 'Classroom ID not found: ' + targetId };

  // 2. Delete related Students
  const stuSheet = ss.getSheetByName(SHEETS.STUDENTS);
  if (stuSheet) {
    const stuData = stuSheet.getDataRange().getValues();
    // Delete backwards
    for (let i = stuData.length - 1; i >= 1; i--) {
      if (String(stuData[i][0]).trim() === targetId) {
        stuSheet.deleteRow(i + 1);
      }
    }
  }

  // 3. Delete related Settings
  const setSheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (setSheet) {
    const setData = setSheet.getDataRange().getValues();
    for (let i = setData.length - 1; i >= 1; i--) {
      if (String(setData[i][0]).trim() === targetId) {
        setSheet.deleteRow(i + 1);
      }
    }
  }

  return { status: 'success' };
}

function getDashboardData(classroomId, sheetId) {
  const ss = getDB(sheetId);
  const cid = String(classroomId).trim();
  
  // 1. Get Students
  const stuSheet = ss.getSheetByName(SHEETS.STUDENTS);
  let students = [];
  if (stuSheet) {
    const stuData = stuSheet.getDataRange().getValues();
    for (let i = 1; i < stuData.length; i++) {
      if (String(stuData[i][0]).trim() == cid) {
        try {
          students.push(JSON.parse(stuData[i][2]));
        } catch (e) {
           // Skip corrupted
        }
      }
    }
  }

  // 2. Get Settings (Plans & Subjects)
  const setSheet = ss.getSheetByName(SHEETS.SETTINGS);
  let plans = null;
  let subjects = null;

  if (setSheet) {
    const setData = setSheet.getDataRange().getValues();
    for (let i = 1; i < setData.length; i++) {
      if (String(setData[i][0]).trim() == cid) {
         try {
           if (setData[i][1] === 'PLANS') plans = JSON.parse(setData[i][2]);
           if (setData[i][1] === 'SUBJECTS') subjects = JSON.parse(setData[i][2]);
         } catch (e) {
           // Skip corrupted
         }
      }
    }
  }

  return { status: 'success', students, plans, subjects };
}

function saveStudent(payload, sheetId) {
  const ss = getDB(sheetId);
  let sheet = ss.getSheetByName(SHEETS.STUDENTS);
  
  // Auto-setup if missing
  if (!sheet) {
    setup(sheetId);
    sheet = ss.getSheetByName(SHEETS.STUDENTS);
    if (!sheet) return { status: 'error', message: 'Failed to create DB_Students sheet.' };
  }

  const data = sheet.getDataRange().getValues();
  const classroomId = String(payload.classroomId).trim();
  const student = payload.student; // The student object
  const studentId = String(student.id).trim();
  const json = JSON.stringify(student);
  const now = new Date().toISOString();

  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() == classroomId && String(data[i][1]).trim() == studentId) {
      sheet.getRange(i + 1, 3).setValue(json);
      sheet.getRange(i + 1, 4).setValue(now);
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([classroomId, studentId, json, now]);
  }
  
  // TOUCH CLASSROOM
  updateClassroomTimestamp(classroomId, ss);
  
  return { status: 'success' };
}

function saveStudents(payload, sheetId) {
  const ss = getDB(sheetId);
  let sheet = ss.getSheetByName(SHEETS.STUDENTS);
  
  // Auto-setup if missing
  if (!sheet) {
    setup(sheetId);
    sheet = ss.getSheetByName(SHEETS.STUDENTS);
  }

  const classroomId = String(payload.classroomId).trim();
  const students = payload.students; // Array of students
  const now = new Date().toISOString();
  
  // Optimizing for speed: Read all data, map existing indices
  const data = sheet.getDataRange().getValues();
  const indexMap = new Map(); // Key: studentId, Value: Row Index (0-based relative to data array)
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() == classroomId) {
      indexMap.set(String(data[i][1]).trim(), i);
    }
  }

  const newRows = [];
  
  students.forEach(student => {
     const studentId = String(student.id).trim();
     const json = JSON.stringify(student);
     
     if (indexMap.has(studentId)) {
        // Update existing row
        const rowIndex = indexMap.get(studentId);
        sheet.getRange(rowIndex + 1, 3).setValue(json);
        sheet.getRange(rowIndex + 1, 4).setValue(now);
     } else {
        // Prepare for append
        newRows.push([classroomId, studentId, json, now]);
     }
  });

  if (newRows.length > 0) {
     // Batch append
     sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 4).setValues(newRows);
  }
  
  // TOUCH CLASSROOM
  updateClassroomTimestamp(classroomId, ss);

  return { status: 'success', count: students.length };
}

function deleteStudent(classroomId, studentId, sheetId) {
   const ss = getDB(sheetId);
   const sheet = ss.getSheetByName(SHEETS.STUDENTS);
   if (!sheet) return { status: 'success', message: 'Sheet not found, nothing to delete.' };

   const data = sheet.getDataRange().getValues();
   const cid = String(classroomId).trim();
   const sid = String(studentId).trim();
   
   for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() == cid && String(data[i][1]).trim() == sid) {
      sheet.deleteRow(i + 1);
      // TOUCH CLASSROOM
      updateClassroomTimestamp(classroomId, ss);
      return { status: 'success' };
    }
  }
  return { status: 'success', message: 'Not found' };
}

function saveSettings(payload, sheetId) {
  const ss = getDB(sheetId);
  let sheet = ss.getSheetByName(SHEETS.SETTINGS);

  // Auto-setup if missing
  if (!sheet) {
    setup(sheetId);
    sheet = ss.getSheetByName(SHEETS.SETTINGS);
    if (!sheet) return { status: 'error', message: 'Failed to create DB_Settings sheet.' };
  }

  const data = sheet.getDataRange().getValues();
  const classroomId = String(payload.classroomId).trim();
  const type = payload.type; // 'PLANS' or 'SUBJECTS'
  const json = JSON.stringify(payload.data);
  const now = new Date().toISOString();

  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() == classroomId && data[i][1] == type) {
      sheet.getRange(i + 1, 3).setValue(json);
      sheet.getRange(i + 1, 4).setValue(now);
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([classroomId, type, json, now]);
  }
  
  // TOUCH CLASSROOM
  updateClassroomTimestamp(classroomId, ss);

  return { status: 'success' };
}
