// Code.gs
// スプレッドシートをIDで指定したい場合は、以下のダブルクォーテーションの中にIDを貼り付けてください。
// 例: const SPREADSHEET_ID = "1abc123...xyz";
// 空のまま（""）にすると、スクリプトが紐付いているスプレッドシートを自動的に使用します。
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
      case 'login':
        result = login(params.userId, params.pin);
        break;
      case 'getWeeklyReports':
        result = getWeeklyReports(params.userId, params.role, params.area);
        break;
      case 'saveWeeklyReport':
        result = saveWeeklyReport(params);
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
        result = toggleLike(params.reportId, params.userId);
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

function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('BTTF Management App')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
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

function login(userId, pin) {
  const users = getSheetData('Users');
  const user = users.find(u => String(u.UserID) === String(userId) && String(u.PIN) === String(pin));
  if (user) {
    return { success: true, user: { UserID: user.UserID, Name: user.Name, Role: user.Role, Area: user.Area } };
  }
  return { success: false, message: 'PINが正しくありません' };
}

function getWeeklyReports(userId, role, area) {
  const reports = getSheetData('WeeklyReports');
  const users = getSheetData('Users');
  const likes = getSheetData('Likes');
  const comments = getSheetData('Comments');
  
  let filtered = [];
  
  if (role === '店長') {
    // 店長は全エリアの店長の週報と自分の週報が見れる（横のつながり）
    const allStoreManagers = users
      .filter(u => u.Role === '店長')
      .map(u => String(u.UserID));
    filtered = reports.filter(r => allStoreManagers.includes(String(r.UserID)));
  } else if (role === 'AM') {
    // AMは店長の週報のみ見れる（自分の週報や他のAMの週報は不要）
    const allStoreManagers = users
      .filter(u => u.Role === '店長')
      .map(u => String(u.UserID));
    filtered = reports.filter(r => allStoreManagers.includes(String(r.UserID)));
  } else {
    // BMは全ユーザーの週報が見れる
    filtered = reports;
  }

  // 新しい順にソート
  filtered.sort((a, b) => new Date(b.SubmittedAt).getTime() - new Date(a.SubmittedAt).getTime());

  return filtered.map(r => {
    const user = users.find(u => String(u.UserID) === String(r.UserID));
    return { 
      ...r, 
      UserName: user ? user.Name : '不明',
      UserArea: user ? user.Area : '',
      LikeCount: likes.filter(l => String(l.ReportID) === String(r.ReportID)).length,
      LikerNames: likes.filter(l => String(l.ReportID) === String(r.ReportID)).map(l => {
        const liker = users.find(u => String(u.UserID) === String(l.UserID));
        return liker ? liker.Name : '不明';
      }),
      UserLiked: likes.some(l => String(l.ReportID) === String(r.ReportID) && String(l.UserID) === String(userId)),
      Comments: comments.filter(c => String(c.ReportID) === String(r.ReportID)).map(c => {
        const cUser = users.find(u => String(u.UserID) === String(c.UserID));
        return { ...c, UserName: cUser ? cUser.Name : '不明' };
      })
    };
  });
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
  
  const sheetName = type === 'decade' ? 'DecadeReports' : 'WeeklyReports';
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
  const reports = getSheetData('DecadeReports');
  const likes = getSheetData('Likes');
  const comments = getSheetData('Comments');
  const users = getSheetData('Users');

  let filtered = [];

  if (role === '店長') {
    // 店長には旬報を表示しない（AM/BM用のため）
    filtered = [];
  } else {
    // AM/BMは全AMの旬報が見れる
    filtered = reports;
  }

  // 新しい順にソート
  filtered.sort((a, b) => new Date(b.SubmittedAt).getTime() - new Date(a.SubmittedAt).getTime());

  return filtered.map(r => {
    const user = users.find(u => String(u.UserID) === String(r.UserID));
    return {
      ...r,
      UserName: user ? user.Name : '不明',
      UserArea: user ? user.Area : '',
      BM_Comment_Name: r.BM_Comment_Name || '',
      LikeCount: likes.filter(l => String(l.ReportID) === String(r.ReportID)).length,
      UserLiked: likes.some(l => String(l.ReportID) === String(r.ReportID) && String(l.UserID) === String(userId)),
      Comments: comments.filter(c => String(c.ReportID) === String(r.ReportID)).map(c => {
        const cUser = users.find(u => String(u.UserID) === String(c.UserID));
        return { ...c, UserName: cUser ? cUser.Name : '不明' };
      })
    };
  });
}

function toggleLike(reportId, userId) {
  const ss = getSS();
  if (!ss) return { success: false, message: 'Spreadsheet not found' };
  const sheet = ss.getSheetByName('Likes');
  if (!sheet) return { success: false, message: 'Likes sheet not found' };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const reportIdIdx = headers.indexOf('ReportID');
  const userIdIdx = headers.indexOf('UserID');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][reportIdIdx]) === String(reportId) && String(data[i][userIdIdx]) === String(userId)) {
      sheet.deleteRow(i + 1);
      return { success: true, liked: false };
    }
  }

  sheet.appendRow([Utilities.getUuid(), reportId, userId, new Date()]);
  return { success: true, liked: true };
}

function addComment(reportId, userId, role, text) {
  const ss = getSS();
  if (!ss) return { success: false, message: 'Spreadsheet not found' };
  const sheet = ss.getSheetByName('Comments');
  if (!sheet) return { success: false, message: 'Comments sheet not found' };
  sheet.appendRow([Utilities.getUuid(), reportId, userId, role, text, new Date()]);
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
  
  if (params.taskId) {
    // Update existing
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(params.taskId)) {
        if (params.status !== undefined) sheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue(params.status);
        if (params.assignee !== undefined) sheet.getRange(i + 1, headers.indexOf('Assignee') + 1).setValue(params.assignee);
        if (params.deadline !== undefined) sheet.getRange(i + 1, headers.indexOf('Deadline') + 1).setValue(params.deadline);
        if (params.content !== undefined) sheet.getRange(i + 1, headers.indexOf('Content') + 1).setValue(params.content);
        return { success: true, message: 'Task updated' };
      }
    }
  }
  
  // Create new
  const newId = 'T' + Date.now();
  const newRow = [
    newId,
    params.assignee || '',
    params.deadline || '',
    params.content || '',
    params.status || 'pending',
    new Date().toISOString(),
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
  
  if (params.projectId) {
    // Update existing
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(params.projectId)) {
        if (params.status !== undefined) sheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue(params.status);
        if (params.assignee !== undefined) sheet.getRange(i + 1, headers.indexOf('Assignee') + 1).setValue(params.assignee);
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
  
  // Create new
  const newId = 'P' + Date.now();
  const newRow = [
    newId,
    params.assignee || '',
    params.withWhom || '',
    params.startDate || '',
    params.endDate || '',
    params.what || '',
    params.purpose || '',
    params.extent || '',
    params.status || 'pending',
    new Date().toISOString()
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

function setupSheets() {
  const ss = getSS();
  if (!ss) {
    return { success: false, message: 'スプレッドシートが見つかりません。SPREADSHEET_IDを設定するか、スクリプトをスプレッドシートから作成してください。' };
  }
  const sheets = {
    'Users': ['UserID', 'Name', 'Role', 'Area', 'PIN'],
    'WeeklyReports': ['ReportID', 'UserID', 'TargetDate', 'SubmittedAt', 'Goal', 'Result', 'ReviewPlus', 'ReviewMinus', 'NextActionPurpose', 'NextActionDetail', 'Consultation', 'AM_Comment', 'BM_Comment', 'AM_Comment_Name', 'BM_Comment_Name'],
    'DecadeReports': ['ReportID', 'UserID', 'TargetDecade', 'SubmittedAt', 'AreaFact', 'CoachingRecord', 'SelfReflection', 'BM_Comment', 'BM_Comment_Name'],
    'Likes': ['LikeID', 'ReportID', 'UserID', 'CreatedAt'],
    'Comments': ['CommentID', 'ReportID', 'UserID', 'Role', 'Text', 'CreatedAt'],
    'Tasks': ['TaskID', 'Assignee', 'Deadline', 'Content', 'Status', 'CreatedAt', 'Source'],
    'Projects': ['ProjectID', 'Assignee', 'WithWhom', 'StartDate', 'EndDate', 'What', 'Purpose', 'Extent', 'Status', 'CreatedAt']
  };
  
  let messages = [];
  
  for (const [name, headers] of Object.entries(sheets)) {
    let sheet = ss.getSheetByName(name);
    let isNew = false;
    
    if (!sheet) {
      sheet = ss.insertSheet(name);
      isNew = true;
      messages.push(`Created sheet: ${name}`);
    }
    
    // ヘッダーが正しいか確認
    const currentHeaders = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    const headersMatch = JSON.stringify(currentHeaders) === JSON.stringify(headers);
    
    if (!headersMatch) {
      if (sheet.getLastRow() > 1) {
        // データがある場合はリネームしてバックアップ
        const oldName = name + '_old_' + Utilities.formatDate(new Date(), "GMT+9", "yyyyMMdd_HHmmss");
        sheet.setName(oldName);
        sheet = ss.insertSheet(name);
        messages.push(`Renamed old ${name} to ${oldName} and created new one due to header mismatch`);
      }
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3');
      isNew = true;
    }

    // デモデータの追加
    if (sheet.getLastRow() <= 1) {
      if (name === 'Users') {
        const demoUsers = [
          ['101', '店長A', '店長', '東京', '12345678'],
          ['102', '店長B', '店長', '大阪', '12345678'],
          ['103', '店長C', '店長', '東京', '12345678'],
          ['104', '店長D', '店長', '福岡', '12345678'],
          ['201', 'AM太郎', 'AM', '東京', '12345678'],
          ['202', 'AM次郎', 'AM', '大阪', '12345678'],
          ['301', 'BMボス', 'BM', '本部', '12345678']
        ];
        sheet.getRange(2, 1, demoUsers.length, demoUsers[0].length).setValues(demoUsers);
        messages.push(`Added initial users to ${name}`);
      }
    }
  }
  
  return { success: true, message: messages.join('\n') || 'All sheets are up to date' };
}
