/**
 * AM Status Report System - GAS Backend v3.0 (Final)
 * 
 * このコードをGoogle Apps Scriptのエディタ（Code.gs）に貼り付けてください。
 * 
 * 【重要：デプロイ手順】
 * 1. 「デプロイ」>「デプロイを管理」を選択。
 * 2. 既存のデプロイの「編集（鉛筆アイコン）」をクリック。
 * 3. バージョンを「新バージョン」にして「デプロイ」をクリック。
 * ※これにより、GAS_URLを変更せずに最新コードを反映できます。
 */

// スプレッドシートをIDで指定したい場合は、以下のダブルクォーテーションの中にIDを貼り付けてください。
const SPREADSHEET_ID = "1qB4l_GwFFp0LvM7J0EsE89fhABRFn_Z2hylAx7Bdr_8";

function getSS() {
  if (SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {
      console.error("Failed to open spreadsheet by ID: " + e.toString());
      return null;
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    let result;

    switch (action) {
      case 'setup':
        result = setupSheets();
        break;
      case 'getUsers':
        result = getUsers();
        break;
      case 'getMembers':
        result = getMembers();
        break;
      case 'login':
        result = login(params.userId, params.pin);
        break;
      case 'getWeeklyReports':
        result = getWeeklyReports(params.userId, params.role, params.area);
        break;
      case 'saveWeeklyReport':
        result = saveWeeklyReport(params);
        break;
      case 'saveAMStatusReport':
        result = saveAMStatusReport(params);
        break;
      case 'getAMStatusReports':
        result = getAMStatusReports(params);
        break;
      case 'saveComment':
        result = saveAMBMComment(params.reportId, params.role, params.comment, params.userId, params.type);
        break;
      case 'getDecadeReports':
        result = getDecadeReports(params.userId, params.role, params.area);
        break;
      case 'saveDecadeReport':
        result = saveDecadeReport(params);
        break;
      case 'toggleLike':
        result = toggleLike(params.reportId, params.userId, params.type);
        break;
      case 'addComment':
        result = addComment(params.reportId, params.userId, params.role, params.text);
        break;
      case 'updatePin':
        result = updatePin(params.userId, params.newPin);
        break;
      case 'getTasks':
        result = getTasks();
        break;
      case 'saveTask':
        result = saveTask(params);
        break;
      case 'deleteTask':
        result = deleteTask(params.taskId);
        break;
      case 'getProjects':
        result = getProjects();
        break;
      case 'saveProject':
        result = saveProject(params);
        break;
      case 'deleteProject':
        result = deleteProject(params.projectId);
        break;
      case 'getNotifications':
        result = getNotifications(params.userId);
        break;
      case 'markNotificationAsRead':
        result = markNotificationAsRead(params.notificationId);
        break;
      case 'addNotification':
      case 'sendNotification':
        result = addNotification(params);
        break;
      default:
        result = { error: 'Invalid action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString(), stack: error.stack }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetData(sheetName) {
  const ss = getSS();
  if (!ss) return [];
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

function getUsers() {
  const users = getSheetData('Users');
  return users.map(u => ({ UserID: u.UserID, Name: u.Name, Role: u.Role, Area: u.Area }));
}

function getMembers() {
  const users = getSheetData('Users');
  return users.map(u => ({ id: u.UserID, name: u.Name, role: u.Role, area: u.Area }));
}

function login(userId, pin) {
  const users = getSheetData('Users');
  const user = users.find(u => String(u.UserID) === String(userId) && String(u.PIN) === String(pin));
  if (user) {
    return { success: true, user: { UserID: user.UserID, Name: user.Name, Role: user.Role, Area: user.Area } };
  }
  return { success: false, message: 'PINが正しくありません' };
}

function getWeeklyReports(userId, role, area) {
  try {
    const reports = getSheetData('WeeklyReports');
    const users = getSheetData('Users');
    const likes = getSheetData('Likes');
    const comments = getSheetData('Comments');
    
    let filtered = [];
    
    if (role === '店長') {
      const allStoreManagers = users
        .filter(u => String(u.Role).trim() === '店長')
        .map(u => String(u.UserID).trim());
      filtered = reports.filter(r => allStoreManagers.includes(String(r.UserID).trim()));
    } else if (role === 'AM') {
      const allStoreManagers = users
        .filter(u => String(u.Role).trim() === '店長')
        .map(u => String(u.UserID).trim());
      filtered = reports.filter(r => allStoreManagers.includes(String(r.UserID).trim()));
    } else {
      filtered = reports;
    }

    filtered.sort((a, b) => new Date(b.SubmittedAt).getTime() - new Date(a.SubmittedAt).getTime());

    return filtered.map(r => {
      const user = users.find(u => String(u.UserID).trim() === String(r.UserID).trim());
      return { 
        ...r, 
        UserName: user ? user.Name : '不明',
        UserArea: user ? user.Area : '',
        LikeCount: likes.filter(l => String(l.ReportID).trim() === String(r.ReportID).trim()).length,
        LikerNames: likes.filter(l => String(l.ReportID).trim() === String(r.ReportID).trim()).map(l => {
          const liker = users.find(u => String(u.UserID).trim() === String(l.UserID).trim());
          return liker ? liker.Name : '不明';
        }),
        UserLiked: likes.some(l => String(l.ReportID).trim() === String(r.ReportID).trim() && String(l.UserID).trim() === String(userId).trim()),
        Comments: comments.filter(c => String(c.ReportID).trim() === String(r.ReportID).trim()).map(c => {
          const cUser = users.find(u => String(u.UserID).trim() === String(c.UserID).trim());
          return { ...c, UserName: cUser ? cUser.Name : '不明' };
        })
      };
    });
  } catch (e) {
    return { error: "getWeeklyReports error: " + e.toString(), stack: e.stack };
  }
}

function saveWeeklyReport(data) {
  const ss = getSS();
  if (!ss) return { success: false, message: 'Spreadsheet not found' };
  const sheet = ss.getSheetByName('WeeklyReports');
  if (!sheet) return { success: false, message: 'WeeklyReports sheet not found' };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => data[header] || '');
  newRow[0] = Utilities.getUuid();
  newRow[3] = new Date();
  sheet.appendRow(newRow);
  return { success: true };
}

function saveAMBMComment(reportId, role, comment, userId, type) {
  const ss = getSS();
  if (!ss) return { success: false, message: 'Spreadsheet not found' };
  
  let sheetName = 'WeeklyReports';
  if (type === 'decade') sheetName = 'DecadeReports';
  else if (type === 'am_status') sheetName = 'AMStatusReports';
  
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, message: sheetName + ' sheet not found' };
  
  const users = getSheetData('Users');
  const author = users.find(u => String(u.UserID) === String(userId));
  const authorName = author ? author.Name : '';

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const reportIdIdx = headers.indexOf('ReportID');
  const commentIdx = headers.indexOf(role === 'AM' ? 'AM_Comment' : 'BM_Comment');
  const nameIdx = headers.indexOf(role === 'AM' ? 'AM_Comment_Name' : 'BM_Comment_Name');
  
  if (commentIdx === -1) return { success: false, message: 'Comment column not found in ' + sheetName };

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][reportIdIdx]) === String(reportId)) {
      sheet.getRange(i + 1, commentIdx + 1).setValue(comment);
      if (nameIdx !== -1) {
        sheet.getRange(i + 1, nameIdx + 1).setValue(authorName);
      }
      return { success: true };
    }
  }
  return { success: false, message: 'Report not found' };
}

function getDecadeReports(userId, role, area) {
  try {
    const reports = getSheetData('DecadeReports');
    const likes = getSheetData('Likes');
    const comments = getSheetData('Comments');
    const users = getSheetData('Users');

    let filtered = [];
    if (String(role).trim() === '店長') {
      filtered = [];
    } else {
      filtered = reports;
    }

    filtered.sort((a, b) => new Date(b.SubmittedAt).getTime() - new Date(a.SubmittedAt).getTime());

    return filtered.map(r => {
      const user = users.find(u => String(u.UserID).trim() === String(r.UserID).trim());
      return {
        ...r,
        UserName: user ? user.Name : '不明',
        UserArea: user ? user.Area : '',
        LikeCount: likes.filter(l => String(l.ReportID).trim() === String(r.ReportID).trim()).length,
        UserLiked: likes.some(l => String(l.ReportID).trim() === String(r.ReportID).trim() && String(l.UserID).trim() === String(userId).trim()),
        Comments: comments.filter(c => String(c.ReportID).trim() === String(r.ReportID).trim()).map(c => {
          const cUser = users.find(u => String(u.UserID).trim() === String(c.UserID).trim());
          return { ...c, UserName: cUser ? cUser.Name : '不明' };
        })
      };
    });
  } catch (e) {
    return { error: "getDecadeReports error: " + e.toString(), stack: e.stack };
  }
}

function toggleLike(reportId, userId, type) {
  const ss = getSS();
  if (!ss) return { success: false, message: 'Spreadsheet not found' };
  const sheet = ss.getSheetByName('Likes');
  if (!sheet) return { success: false, message: 'Likes sheet not found' };
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(reportId) && String(data[i][3]) === String(userId)) {
      sheet.deleteRow(i + 1);
      return { success: true, liked: false };
    }
  }

  sheet.appendRow([Utilities.getUuid(), new Date(), reportId, userId, type || ""]);
  return { success: true, liked: true };
}

function addComment(reportId, userId, role, text) {
  const ss = getSS();
  if (!ss) return { success: false, message: 'Spreadsheet not found' };
  const sheet = ss.getSheetByName('Comments');
  if (!sheet) return { success: false, message: 'Comments sheet not found' };
  sheet.appendRow([Utilities.getUuid(), new Date(), reportId, userId, role, text]);
  return { success: true };
}

function saveDecadeReport(data) {
  const ss = getSS();
  if (!ss) return { success: false, message: 'Spreadsheet not found' };
  const sheet = ss.getSheetByName('DecadeReports');
  if (!sheet) return { success: false, message: 'DecadeReports sheet not found' };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => data[header] || '');
  newRow[0] = Utilities.getUuid();
  newRow[3] = new Date();
  sheet.appendRow(newRow);
  return { success: true };
}

function saveAMStatusReport(data) {
  const ss = getSS();
  if (!ss) return { success: false, message: 'Spreadsheet not found' };
  
  const reportId = Utilities.getUuid();
  const timestamp = new Date();
  
  try {
    const mainSheet = ss.getSheetByName("AMStatusReports");
    mainSheet.appendRow([
      reportId, timestamp, data.UserID || "", data.UserName || "", data.UserArea || "",
      data.textAreaVision || "", data.textAreaSummary || "", data.textManagerCondition || "", data.textOtherTopics || "",
      "", "", "", "" // AM_Comment, BM_Comment, AM_Comment_Name, BM_Comment_Name
    ]);

    if (data.storeReports && data.storeReports.length > 0) {
      const storeSheet = ss.getSheetByName("AMStatus_StoreReports");
      const rows = data.storeReports.map(s => [
        reportId, timestamp, data.UserID || "", s.storeName || "", s.textLastMonthGoals || "", s.textLastMonthResults || "",
        s.textThisMonthGoals || "", s.textThisMonthFocus || "", s.textPromo || "", s.textFacility || "",
        s.textSalesPrevious || "", s.textSalesCurrent || "", s.textSalesBudget || "", s.textStaffStore || ""
      ]);
      storeSheet.getRange(storeSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    if (data.hrEvents && data.hrEvents.length > 0) {
      const hrSheet = ss.getSheetByName("AMStatus_HREvents");
      const rows = data.hrEvents.map(e => [
        reportId, timestamp, data.UserID || "", e.type || "", e.date || "", e.store || "", e.name || "", e.details || ""
      ]);
      hrSheet.getRange(hrSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    if (data.interviewEvents && data.interviewEvents.length > 0) {
      const intSheet = ss.getSheetByName("AMStatus_InterviewEvents");
      const rows = data.interviewEvents.map(e => [
        reportId, timestamp, data.UserID || "", e.date || "", e.importance || "", e.store || "", e.name || "", e.interviewer || "", e.interviewType || "", e.status || "", e.contentMain || "", e.contentConcerns || "", e.contentNextAction || "", e.contentImpression || ""
      ]);
      intSheet.getRange(intSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    return { success: true, reportId: reportId };
  } catch (error) {
    return { success: false, message: "Save Error: " + error.toString() };
  }
}

function getAMStatusReports(data) {
  try {
    const ss = getSS();
    if (!ss) return { error: "Spreadsheet not found" };
    
    const mainSheet = ss.getSheetByName("AMStatusReports");
    if (!mainSheet) return { error: "AMStatusReports sheet not found" };
    
    const mainValues = mainSheet.getDataRange().getValues();
    if (mainValues.length <= 1) return [];
    
    const mainHeaders = mainValues[0];
    const reports = mainValues.slice(1).map(row => {
      let obj = {};
      mainHeaders.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    const storeSheet = ss.getSheetByName("AMStatus_StoreReports");
    const hrSheet = ss.getSheetByName("AMStatus_HREvents");
    const intSheet = ss.getSheetByName("AMStatus_InterviewEvents");
    const likes = getSheetData('Likes');
    const comments = getSheetData('Comments');
    const users = getSheetData('Users');

    const storeData = storeSheet ? storeSheet.getDataRange().getValues() : [];
    const hrData = hrSheet ? hrSheet.getDataRange().getValues() : [];
    const intData = intSheet ? intSheet.getDataRange().getValues() : [];

    const storeHeaders = storeData[0] || [];
    const hrHeaders = hrData[0] || [];
    const intHeaders = intData[0] || [];

    const storeRows = storeData.length > 1 ? storeData.slice(1) : [];
    const hrRows = hrData.length > 1 ? hrData.slice(1) : [];
    const intRows = intData.length > 1 ? intData.slice(1) : [];

    const fullReports = reports.map(report => {
      const reportId = report.ReportID;
      
      report.storeReports = storeRows
        .filter(row => String(row[0]) === String(reportId))
        .map(row => {
          let obj = {};
          storeHeaders.forEach((h, i) => obj[h] = row[i]);
          return {
            storeName: obj.StoreName,
            textLastMonthGoals: obj.LastMonthGoals,
            textLastMonthResults: obj.LastMonthResults,
            textThisMonthGoals: obj.ThisMonthGoals,
            textThisMonthFocus: obj.ThisMonthFocus,
            textPromo: obj.Promo,
            textFacility: obj.Facility,
            textSalesPrevious: obj.SalesPrevious,
            textSalesCurrent: obj.SalesCurrent,
            textSalesBudget: obj.SalesBudget,
            textStaffStore: obj.StaffStore
          };
        });

      report.hrEvents = hrRows
        .filter(row => String(row[0]) === String(reportId))
        .map(row => {
          let obj = {};
          hrHeaders.forEach((h, i) => obj[h] = row[i]);
          return {
            type: obj.EventType,
            date: obj.Date,
            store: obj.StoreName,
            name: obj.PersonName,
            details: obj.Details
          };
        });

      report.interviewEvents = intRows
        .filter(row => String(row[0]) === String(reportId))
        .map(row => {
          let obj = {};
          intHeaders.forEach((h, i) => obj[h] = row[i]);
          return {
            date: obj.Date,
            importance: obj.Importance,
            store: obj.StoreName,
            name: obj.PersonName,
            interviewer: obj.Interviewer,
            interviewType: obj.InterviewType,
            status: obj.Status,
            contentMain: obj.ContentMain,
            contentConcerns: obj.ContentConcerns,
            contentNextAction: obj.ContentNextAction,
            contentImpression: obj.ContentImpression
          };
        });

      const user = users.find(u => String(u.UserID) === String(report.UserID));

      return {
        ...report,
        UserName: user ? user.Name : report.UserName,
        UserArea: user ? user.Area : report.UserArea,
        textAreaVision: report.AreaVision,
        textAreaSummary: report.AreaSummary,
        textManagerCondition: report.ManagerCondition,
        textOtherTopics: report.OtherTopics,
        LikeCount: likes.filter(l => String(l.ReportID) === String(reportId)).length,
        UserLiked: likes.some(l => String(l.ReportID) === String(reportId) && String(l.UserID) === String(data.userId)),
        Comments: comments.filter(c => String(c.ReportID) === String(reportId)).map(c => {
          const cUser = users.find(u => String(u.UserID) === String(c.UserID));
          return { ...c, UserName: cUser ? cUser.Name : '不明' };
        })
      };
    });

    return fullReports.reverse();
  } catch (e) {
    return { error: "getAMStatusReports error: " + e.toString(), stack: e.stack };
  }
}

function getTasks() {
  return getSheetData('Tasks');
}

function saveTask(params) {
  const ss = getSS();
  if (!ss) return { success: false, message: 'Spreadsheet not found' };
  const sheet = ss.getSheetByName('Tasks');
  if (!sheet) return { success: false, message: 'Tasks sheet not found' };
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const taskId = params.TaskID || params.taskId;
  
  if (taskId) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(taskId)) {
        if (params.status !== undefined) sheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue(params.status);
        if (params.assignee !== undefined) sheet.getRange(i + 1, headers.indexOf('Assignee') + 1).setValue(params.assignee);
        if (params.deadline !== undefined) sheet.getRange(i + 1, headers.indexOf('Deadline') + 1).setValue(params.deadline);
        if (params.content !== undefined) sheet.getRange(i + 1, headers.indexOf('Content') + 1).setValue(params.content);
        return { success: true, message: 'Task updated' };
      }
    }
  }
  
  const newId = 'T' + Date.now();
  const newRow = [
    newId,
    new Date().toISOString(),
    params.assignee || '',
    params.deadline || '',
    params.isAllDay !== undefined ? params.isAllDay : true,
    params.time || '',
    params.content || '',
    params.status || 'pending',
    params.source || 'manual'
  ];
  sheet.appendRow(newRow);
  return { success: true, taskId: newId };
}

function deleteTask(taskId) {
  const ss = getSS();
  if (!ss) return { success: false, message: 'Spreadsheet not found' };
  const sheet = ss.getSheetByName('Tasks');
  if (!sheet) return { success: false, message: 'Tasks sheet not found' };
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(taskId)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Task deleted' };
    }
  }
  return { success: false, message: 'Task not found' };
}

function getNotifications(userId) {
  const notifications = getSheetData('Notifications');
  return notifications.filter(n => String(n.UserID) === String(userId)).reverse();
}

function addNotification(params) {
  const ss = getSS();
  if (!ss) return { success: false, message: 'Spreadsheet not found' };
  const sheet = ss.getSheetByName('Notifications');
  if (!sheet) return { success: false, message: 'Notifications sheet not found' };
  
  const newId = 'N' + Date.now() + Math.floor(Math.random() * 1000);
  const newRow = [
    newId,
    new Date().toISOString(),
    params.userId || '',
    params.title || '',
    params.body || params.message || '',
    params.url || '',
    false
  ];
  sheet.appendRow(newRow);
  return { success: true, notificationId: newId };
}

function markNotificationAsRead(notificationId) {
  const ss = getSS();
  if (!ss) return { success: false, message: 'Spreadsheet not found' };
  const sheet = ss.getSheetByName('Notifications');
  if (!sheet) return { success: false, message: 'Notifications sheet not found' };
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const isReadIdx = headers.indexOf('IsRead');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(notificationId)) {
      sheet.getRange(i + 1, isReadIdx + 1).setValue(true);
      return { success: true };
    }
  }
  return { success: false, message: 'Notification not found' };
}

function getProjects() {
  return getSheetData('Projects');
}

function saveProject(params) {
  const ss = getSS();
  if (!ss) return { success: false, message: 'Spreadsheet not found' };
  const sheet = ss.getSheetByName('Projects');
  if (!sheet) return { success: false, message: 'Projects sheet not found' };
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const projectId = params.ProjectID || params.projectId;
  
  if (projectId) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(projectId)) {
        if (params.status !== undefined) sheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue(params.status);
        if (params.assignee !== undefined) sheet.getRange(i + 1, headers.indexOf('Assignees') + 1).setValue(params.assignee);
        if (params.withWhom !== undefined) sheet.getRange(i + 1, headers.indexOf('WithWhom') + 1).setValue(params.withWhom);
        if (params.startDate !== undefined) sheet.getRange(i + 1, headers.indexOf('StartDate') + 1).setValue(params.startDate);
        if (params.endDate !== undefined) sheet.getRange(i + 1, headers.indexOf('EndDate') + 1).setValue(params.endDate);
        if (params.what !== undefined) sheet.getRange(i + 1, headers.indexOf('What') + 1).setValue(params.what);
        if (params.purpose !== undefined) sheet.getRange(i + 1, headers.indexOf('Purpose') + 1).setValue(params.purpose);
        if (params.extent !== undefined) sheet.getRange(i + 1, headers.indexOf('Extent') + 1).setValue(params.extent);
        return { success: true, message: 'Project updated' };
      }
    }
  }
  
  const newId = 'P' + Date.now();
  const newRow = [
    newId,
    new Date().toISOString(),
    params.assignee || '',
    params.withWhom || '',
    params.startDate || '',
    params.endDate || '',
    params.what || '',
    params.purpose || '',
    params.extent || '',
    params.status || 'pending'
  ];
  sheet.appendRow(newRow);
  return { success: true, projectId: newId };
}

function deleteProject(projectId) {
  const ss = getSS();
  if (!ss) return { success: false, message: 'Spreadsheet not found' };
  const sheet = ss.getSheetByName('Projects');
  if (!sheet) return { success: false, message: 'Projects sheet not found' };
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(projectId)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Project deleted' };
    }
  }
  return { success: false, message: 'Project not found' };
}

function updatePin(userId, newPin) {
  const ss = getSS();
  if (!ss) return { success: false, message: 'Spreadsheet not found' };
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, message: 'Users sheet not found' };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const userIdIdx = headers.indexOf('UserID');
  const pinIdx = headers.indexOf('PIN');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][userIdIdx]) === String(userId)) {
      sheet.getRange(i + 1, pinIdx + 1).setValue(newPin);
      return { success: true };
    }
  }
  return { success: false, message: 'User not found' };
}

function setupSheets() {
  const ss = getSS();
  if (!ss) {
    return { success: false, message: 'スプレッドシートが見つかりません。' };
  }
  const sheets = {
    'Users': ['UserID', 'Name', 'Role', 'Area', 'PIN'],
    'WeeklyReports': ['ReportID', 'UserID', 'TargetDate', 'SubmittedAt', 'Goal', 'Result', 'ReviewPlus', 'ReviewMinus', 'NextActionPurpose', 'NextActionDetail', 'Consultation', 'AM_Comment', 'BM_Comment', 'AM_Comment_Name', 'BM_Comment_Name'],
    'DecadeReports': ['ReportID', 'UserID', 'TargetDecade', 'SubmittedAt', 'AreaFact', 'CoachingRecord', 'SelfReflection', 'AM_Comment', 'BM_Comment', 'AM_Comment_Name', 'BM_Comment_Name'],
    'AMStatusReports': ["ReportID", "Timestamp", "UserID", "UserName", "UserArea", "AreaVision", "AreaSummary", "ManagerCondition", "OtherTopics", "AM_Comment", "BM_Comment", "AM_Comment_Name", "BM_Comment_Name"],
    'AMStatus_StoreReports': ["ReportID", "Timestamp", "UserID", "StoreName", "LastMonthGoals", "LastMonthResults", "ThisMonthGoals", "ThisMonthFocus", "Promo", "Facility", "SalesPrevious", "SalesCurrent", "SalesBudget", "StaffStore"],
    'AMStatus_HREvents': ["ReportID", "Timestamp", "UserID", "EventType", "Date", "StoreName", "PersonName", "Details"],
    'AMStatus_InterviewEvents': ["ReportID", "Timestamp", "UserID", "Date", "Importance", "StoreName", "PersonName", "Interviewer", "InterviewType", "Status", "ContentMain", "ContentConcerns", "ContentNextAction", "ContentImpression"],
    'Likes': ['LikeID', 'Timestamp', 'ReportID', 'UserID', 'Type'],
    'Comments': ['CommentID', 'Timestamp', 'ReportID', 'UserID', 'Role', 'Text'],
    'Tasks': ['TaskID', 'Timestamp', 'Assignee', 'Deadline', 'IsAllDay', 'Time', 'Content', 'Status', 'Source'],
    'Projects': ['ProjectID', 'Timestamp', 'Assignee', 'WithWhom', 'StartDate', 'EndDate', 'What', 'Purpose', 'Extent', 'Status'],
    'Notifications': ['NotificationID', 'Timestamp', 'UserID', 'Title', 'Body', 'Url', 'IsRead']
  };
  
  let messages = [];
  
  for (const [name, headers] of Object.entries(sheets)) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      messages.push(`Created sheet: ${name}`);
    }
    
    const currentHeaders = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    const headersMatch = JSON.stringify(currentHeaders) === JSON.stringify(headers);
    
    if (!headersMatch) {
      if (sheet.getLastRow() > 1) {
        const oldName = name + '_old_' + Utilities.formatDate(new Date(), "GMT+9", "yyyyMMdd_HHmmss");
        sheet.setName(oldName);
        sheet = ss.insertSheet(name);
        messages.push(`Renamed old ${name} to ${oldName} and created new one`);
      }
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3');
    }
  }
  
  return { success: true, message: messages.join('\n') || 'All sheets are up to date' };
}
