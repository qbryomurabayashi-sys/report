/**
 * AM Status Report System - Complete Backend v2.0
 * 
 * Features:
 * - Automatic Sheet Creation with Headers
 * - Robust Error Handling & Detailed Logging
 * - Support for Main Reports, Store Reports, HR Events, and Interviews
 * - Interviewer field support
 * 
 * 【重要：デプロイ手順】
 * 1. 初回デプロイ：
 *    「デプロイ」>「新しいデプロイ」>「種類：ウェブアプリ」
 *    「実行ユーザー：自分」「アクセスできるユーザー：全員」でデプロイし、URLをコピー。
 * 
 * 2. コード更新時（URLを変えない方法）：
 *    「デプロイ」>「デプロイを管理」を選択。
 *    既存のデプロイの「編集（鉛筆アイコン）」をクリック。
 *    バージョンを「新バージョン」にして「デプロイ」をクリック。
 *    ※これにより、GAS_URLを変更せずに最新コードを反映できます。
 */

function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const action = contents.action;
    
    if (action === "saveAMStatusReport") return handleSaveAMStatusReport(contents);
    if (action === "getAMStatusReports") return handleGetAMStatusReports(contents);
    if (action === "saveWeeklyReport") return handleSaveWeeklyReport(contents);
    if (action === "getWeeklyReports") return handleGetWeeklyReports(contents);
    if (action === "saveDecadeReport") return handleSaveDecadeReport(contents);
    if (action === "getDecadeReports") return handleGetDecadeReports(contents);
    if (action === "saveComment") return handleSaveComment(contents);
    if (action === "toggleLike") return handleToggleLike(contents);
    if (action === "getTasks") return handleGetTasks(contents);
    if (action === "saveTask") return handleSaveTask(contents);
    if (action === "deleteTask") return handleDeleteTask(contents);
    if (action === "getProjects") return handleGetProjects(contents);
    if (action === "saveProject") return handleSaveProject(contents);
    if (action === "deleteProject") return handleDeleteProject(contents);
    if (action === "getMembers") return handleGetMembers(contents);
    if (action === "getNotifications") return handleGetNotifications(contents);
    if (action === "markNotificationAsRead") return handleMarkNotificationAsRead(contents);
    if (action === "addNotification") return handleAddNotification(contents);
    if (action === "sendNotification") return handleAddNotification(contents);
    if (action === "setup") return handleSetup();
    
    return createJsonResponse({ success: false, message: "Invalid action: " + action });
  } catch (error) {
    return createJsonResponse({ success: false, message: "Critical Error: " + error.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
  }
  return sheet;
}

function handleSetup() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    getOrCreateSheet(ss, "AMStatusReports", ["ReportID", "Timestamp", "UserID", "UserName", "UserArea", "AreaVision", "AreaSummary", "ManagerCondition", "OtherTopics"]);
    getOrCreateSheet(ss, "AMStatus_StoreReports", ["ReportID", "Timestamp", "UserID", "StoreName", "LastMonthGoals", "LastMonthResults", "ThisMonthGoals", "ThisMonthFocus", "Promo", "Facility", "SalesPrevious", "SalesCurrent", "SalesBudget", "StaffStore"]);
    getOrCreateSheet(ss, "AMStatus_HREvents", ["ReportID", "Timestamp", "UserID", "EventType", "Date", "StoreName", "PersonName", "Details"]);
    getOrCreateSheet(ss, "AMStatus_InterviewEvents", ["ReportID", "Timestamp", "UserID", "Date", "Importance", "StoreName", "PersonName", "Interviewer", "InterviewType", "Status", "ContentMain", "ContentConcerns", "ContentNextAction", "ContentImpression"]);
    getOrCreateSheet(ss, "WeeklyReports", ["ReportID", "Timestamp", "UserID", "UserName", "Role", "Area", "StoreName", "Goals", "Results", "Reflections", "NextWeekGoals", "CoachingRecord", "AMComment", "BMComment"]);
    getOrCreateSheet(ss, "DecadeReports", ["ReportID", "Timestamp", "UserID", "UserName", "Role", "Area", "StoreName", "Period", "Goals", "Results", "Reflections", "NextPeriodGoals", "CoachingRecord", "AMComment", "BMComment"]);
    getOrCreateSheet(ss, "Comments", ["CommentID", "Timestamp", "ReportID", "UserID", "Role", "Text"]);
    getOrCreateSheet(ss, "Likes", ["LikeID", "Timestamp", "ReportID", "UserID", "Type"]);
    getOrCreateSheet(ss, "Tasks", ["TaskID", "Timestamp", "Assignees", "Deadline", "IsAllDay", "Time", "Content", "Status", "Source"]);
    getOrCreateSheet(ss, "Projects", ["ProjectID", "Timestamp", "Assignees", "WithWhom", "StartDate", "EndDate", "What", "Purpose", "Extent", "Status"]);
    getOrCreateSheet(ss, "Notifications", ["NotificationID", "Timestamp", "UserID", "Title", "Body", "Url", "IsRead"]);
    getOrCreateSheet(ss, "Users", ["UserID", "Name", "Role", "Area", "PIN"]);
    
    return createJsonResponse({ success: true, message: "Sheets initialized successfully" });
  } catch (e) {
    return createJsonResponse({ success: false, message: e.toString() });
  }
}

function handleSaveAMStatusReport(data) {
  let ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    return createJsonResponse({ success: false, message: "Spreadsheet Access Error", details: e.toString() });
  }

  const reportId = Utilities.getUuid();
  const timestamp = new Date();
  
  try {
    const mainSheet = getOrCreateSheet(ss, "AMStatusReports", ["ReportID", "Timestamp", "UserID", "UserName", "UserArea", "AreaVision", "AreaSummary", "ManagerCondition", "OtherTopics"]);
    mainSheet.appendRow([
      reportId, timestamp, data.UserID || "", data.UserName || "", data.UserArea || "",
      data.textAreaVision || "", data.textAreaSummary || "", data.textManagerCondition || "", data.textOtherTopics || ""
    ]);

    if (data.storeReports && data.storeReports.length > 0) {
      const storeSheet = getOrCreateSheet(ss, "AMStatus_StoreReports", ["ReportID", "Timestamp", "UserID", "StoreName", "LastMonthGoals", "LastMonthResults", "ThisMonthGoals", "ThisMonthFocus", "Promo", "Facility", "SalesPrevious", "SalesCurrent", "SalesBudget", "StaffStore"]);
      const rows = data.storeReports.map(s => [
        reportId, timestamp, data.UserID || "", s.storeName || "", s.textLastMonthGoals || "", s.textLastMonthResults || "",
        s.textThisMonthGoals || "", s.textThisMonthFocus || "", s.textPromo || "", s.textFacility || "",
        s.textSalesPrevious || "", s.textSalesCurrent || "", s.textSalesBudget || "", s.textStaffStore || ""
      ]);
      storeSheet.getRange(storeSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    if (data.hrEvents && data.hrEvents.length > 0) {
      const hrSheet = getOrCreateSheet(ss, "AMStatus_HREvents", ["ReportID", "Timestamp", "UserID", "EventType", "Date", "StoreName", "PersonName", "Details"]);
      const rows = data.hrEvents.map(e => [
        reportId, timestamp, data.UserID || "", e.type || "", e.date || "", e.store || "", e.name || "", e.details || ""
      ]);
      hrSheet.getRange(hrSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    if (data.interviewEvents && data.interviewEvents.length > 0) {
      const intSheet = getOrCreateSheet(ss, "AMStatus_InterviewEvents", ["ReportID", "Timestamp", "UserID", "Date", "Importance", "StoreName", "PersonName", "Interviewer", "InterviewType", "Status", "ContentMain", "ContentConcerns", "ContentNextAction", "ContentImpression"]);
      const rows = data.interviewEvents.map(e => [
        reportId, timestamp, data.UserID || "", e.date || "", e.importance || "", e.store || "", e.name || "", e.interviewer || "", e.interviewType || "", e.status || "", e.contentMain || "", e.contentConcerns || "", e.contentNextAction || "", e.contentImpression || ""
      ]);
      intSheet.getRange(intSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    return createJsonResponse({ success: true, reportId: reportId });
  } catch (error) {
    return createJsonResponse({ success: false, message: "Save Error", details: error.toString() });
  }
}

function handleGetAMStatusReports(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const mainSheet = ss.getSheetByName("AMStatusReports");
    if (!mainSheet) return createJsonResponse([]);
    
    const mainValues = mainSheet.getDataRange().getValues();
    const mainHeaders = mainValues[0];
    const reports = mainValues.slice(1).map(row => {
      let obj = {};
      mainHeaders.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    const storeSheet = ss.getSheetByName("AMStatus_StoreReports");
    const hrSheet = ss.getSheetByName("AMStatus_HREvents");
    const intSheet = ss.getSheetByName("AMStatus_InterviewEvents");

    const storeData = storeSheet ? storeSheet.getDataRange().getValues() : [];
    const hrData = hrSheet ? hrSheet.getDataRange().getValues() : [];
    const intData = intSheet ? intSheet.getDataRange().getValues() : [];

    const storeHeaders = storeData[0] || [];
    const hrHeaders = hrData[0] || [];
    const intHeaders = intData[0] || [];

    const storeRows = storeData.slice(1);
    const hrRows = hrData.slice(1);
    const intRows = intData.slice(1);

    const fullReports = reports.map(report => {
      const reportId = report.ReportID;
      
      report.storeReports = storeRows
        .filter(row => row[0] === reportId)
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
        .filter(row => row[0] === reportId)
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
        .filter(row => row[0] === reportId)
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

      return {
        ...report,
        textAreaVision: report.AreaVision,
        textAreaSummary: report.AreaSummary,
        textManagerCondition: report.ManagerCondition,
        textOtherTopics: report.OtherTopics
      };
    });

    return createJsonResponse(fullReports.reverse());
  } catch (e) {
    return createJsonResponse([]);
  }
}

function handleSaveWeeklyReport(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, "WeeklyReports", ["ReportID", "Timestamp", "UserID", "UserName", "Role", "Area", "StoreName", "Goals", "Results", "Reflections", "NextWeekGoals", "CoachingRecord", "AMComment", "BMComment"]);
    const reportId = data.ReportID || Utilities.getUuid();
    sheet.appendRow([
      reportId, new Date(), data.UserID, data.UserName, data.Role, data.Area, data.StoreName,
      data.Goals, data.Results, data.Reflections, data.NextWeekGoals, data.CoachingRecord, data.AMComment || "", data.BMComment || ""
    ]);
    return createJsonResponse({ success: true, reportId: reportId });
  } catch (e) {
    return createJsonResponse({ success: false, message: e.toString() });
  }
}

function handleGetWeeklyReports(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("WeeklyReports");
    if (!sheet) return createJsonResponse([]);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const reports = values.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    }).reverse();
    return createJsonResponse(reports);
  } catch (e) {
    return createJsonResponse([]);
  }
}

function handleSaveDecadeReport(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, "DecadeReports", ["ReportID", "Timestamp", "UserID", "UserName", "Role", "Area", "StoreName", "Period", "Goals", "Results", "Reflections", "NextPeriodGoals", "CoachingRecord", "AMComment", "BMComment"]);
    const reportId = data.ReportID || Utilities.getUuid();
    sheet.appendRow([
      reportId, new Date(), data.UserID, data.UserName, data.Role, data.Area, data.StoreName, data.Period,
      data.Goals, data.Results, data.Reflections, data.NextPeriodGoals, data.CoachingRecord, data.AMComment || "", data.BMComment || ""
    ]);
    return createJsonResponse({ success: true, reportId: reportId });
  } catch (e) {
    return createJsonResponse({ success: false, message: e.toString() });
  }
}

function handleGetDecadeReports(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("DecadeReports");
    if (!sheet) return createJsonResponse([]);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const reports = values.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    }).reverse();
    return createJsonResponse(reports);
  } catch (e) {
    return createJsonResponse([]);
  }
}

function handleSaveComment(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, "Comments", ["CommentID", "Timestamp", "ReportID", "UserID", "Role", "Text"]);
    sheet.appendRow([
      Utilities.getUuid(), new Date(), data.ReportID, data.UserID, data.Role, data.Text
    ]);
    return createJsonResponse({ success: true });
  } catch (e) {
    return createJsonResponse({ success: false, message: e.toString() });
  }
}

function handleToggleLike(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, "Likes", ["LikeID", "Timestamp", "ReportID", "UserID", "Type"]);
    const values = sheet.getDataRange().getValues();
    let foundIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][2] === data.ReportID && values[i][3] === data.UserID) {
        foundIndex = i + 1;
        break;
      }
    }
    if (foundIndex > -1) {
      sheet.deleteRow(foundIndex);
      return createJsonResponse({ success: true, liked: false });
    } else {
      sheet.appendRow([Utilities.getUuid(), new Date(), data.ReportID, data.UserID, data.Type || ""]);
      return createJsonResponse({ success: true, liked: true });
    }
  } catch (e) {
    return createJsonResponse({ success: false, message: e.toString() });
  }
}

function handleGetTasks(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Tasks");
    if (!sheet) return createJsonResponse([]);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const tasks = values.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      if (typeof obj.Assignees === 'string' && obj.Assignees.startsWith('[')) {
        obj.Assignees = JSON.parse(obj.Assignees);
      } else if (typeof obj.Assignees === 'string') {
        obj.Assignees = [obj.Assignees];
      }
      return obj;
    });
    return createJsonResponse(tasks);
  } catch (e) {
    return createJsonResponse([]);
  }
}

function handleSaveTask(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, "Tasks", ["TaskID", "Timestamp", "Assignees", "Deadline", "IsAllDay", "Time", "Content", "Status", "Source"]);
    const taskId = data.TaskID || data.taskId || Utilities.getUuid();
    const values = sheet.getDataRange().getValues();
    let foundIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === taskId) {
        foundIndex = i + 1;
        break;
      }
    }
    
    const assigneesStr = Array.isArray(data.Assignees) ? JSON.stringify(data.Assignees) : (data.assignees ? JSON.stringify(data.assignees) : "[]");
    const rowData = [
      taskId, new Date(), assigneesStr, data.Deadline || data.deadline || "", 
      data.IsAllDay !== undefined ? data.IsAllDay : (data.isAllDay !== undefined ? data.isAllDay : true),
      data.Time || data.time || "", data.Content || data.content || "", 
      data.Status || data.status || "pending", data.Source || data.source || "manual"
    ];

    if (foundIndex > -1) {
      sheet.getRange(foundIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    return createJsonResponse({ success: true, taskId: taskId });
  } catch (e) {
    return createJsonResponse({ success: false, message: e.toString() });
  }
}

function handleDeleteTask(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Tasks");
    if (!sheet) return createJsonResponse({ success: true });
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.taskId) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return createJsonResponse({ success: true });
  } catch (e) {
    return createJsonResponse({ success: false, message: e.toString() });
  }
}

function handleGetProjects(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Projects");
    if (!sheet) return createJsonResponse([]);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const projects = values.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      if (typeof obj.Assignees === 'string' && obj.Assignees.startsWith('[')) {
        obj.Assignees = JSON.parse(obj.Assignees);
      }
      return obj;
    });
    return createJsonResponse(projects);
  } catch (e) {
    return createJsonResponse([]);
  }
}

function handleSaveProject(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, "Projects", ["ProjectID", "Timestamp", "Assignees", "WithWhom", "StartDate", "EndDate", "What", "Purpose", "Extent", "Status"]);
    const projectId = data.ProjectID || data.projectId || Utilities.getUuid();
    const values = sheet.getDataRange().getValues();
    let foundIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === projectId) {
        foundIndex = i + 1;
        break;
      }
    }
    
    const assigneesStr = Array.isArray(data.Assignees) ? JSON.stringify(data.Assignees) : (data.assignees ? JSON.stringify(data.assignees) : "[]");
    const rowData = [
      projectId, new Date(), assigneesStr, data.WithWhom || data.withWhom || "",
      data.StartDate || data.startDate || "", data.EndDate || data.endDate || "",
      data.What || data.what || "", data.Purpose || data.purpose || "",
      data.Extent || data.extent || "", data.Status || data.status || "pending"
    ];

    if (foundIndex > -1) {
      sheet.getRange(foundIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    return createJsonResponse({ success: true, projectId: projectId });
  } catch (e) {
    return createJsonResponse({ success: false, message: e.toString() });
  }
}

function handleDeleteProject(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Projects");
    if (!sheet) return createJsonResponse({ success: true });
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.projectId) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return createJsonResponse({ success: true });
  } catch (e) {
    return createJsonResponse({ success: false, message: e.toString() });
  }
}

function handleGetMembers(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Users");
    if (!sheet) return createJsonResponse([]);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const members = values.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return {
        id: obj.UserID,
        name: obj.Name,
        role: obj.Role,
        area: obj.Area
      };
    });
    return createJsonResponse(members);
  } catch (e) {
    return createJsonResponse([]);
  }
}

function handleGetNotifications(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Notifications");
    if (!sheet) return createJsonResponse([]);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const notifications = values.slice(1)
      .filter(row => String(row[2]) === String(data.userId))
      .map(row => {
        let obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      }).reverse();
    return createJsonResponse(notifications);
  } catch (e) {
    return createJsonResponse([]);
  }
}

function handleAddNotification(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, "Notifications", ["NotificationID", "Timestamp", "UserID", "Title", "Body", "Url", "IsRead"]);
    sheet.appendRow([
      Utilities.getUuid(), new Date(), data.userId, data.title, data.body, data.url || "", false
    ]);
    return createJsonResponse({ success: true });
  } catch (e) {
    return createJsonResponse({ success: false, message: e.toString() });
  }
}

function handleMarkNotificationAsRead(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Notifications");
    if (!sheet) return createJsonResponse({ success: true });
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.notificationId) {
        sheet.getRange(i + 1, 7).setValue(true);
        break;
      }
    }
    return createJsonResponse({ success: true });
  } catch (e) {
    return createJsonResponse({ success: false, message: e.toString() });
  }
}
