// Google Apps Script Example for handling AM Status Reports
// Copy and paste this into your Google Apps Script project

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === "saveAMStatusReport") {
      return handleSaveAMStatusReport(data);
    } else if (action === "getAMStatusReports") {
      return handleGetAMStatusReports(data);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sheet;
}

function handleSaveAMStatusReport(data) {
  let ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      // Fallback: Try to open the first spreadsheet the user has access to, 
      // or throw a clear error if this is a standalone script not bound to a sheet.
      throw new Error("スプレッドシートが見つかりません。スクリプトがスプレッドシートに紐付いているか確認してください。");
    }
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: "Spreadsheet Access Error: " + e.toString(),
      details: "Google Apps Scriptをスプレッドシートの『拡張機能 > Apps Script』から作成したか確認してください。"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const reportId = Utilities.getUuid();
  const timestamp = new Date();
  
  try {
    // 1. Save Main Report Data
    const mainHeaders = ["ReportID", "Timestamp", "UserID", "UserName", "UserArea", "AreaVision", "AreaSummary", "ManagerCondition", "OtherTopics"];
    const mainSheet = getOrCreateSheet(ss, "AMStatusReports", mainHeaders);
    
    mainSheet.appendRow([
      reportId,
      timestamp,
      data.UserID || "",
      data.UserName || "",
      data.UserArea || "",
      data.textAreaVision || "",
      data.textAreaSummary || "",
      data.textManagerCondition || "",
      data.textOtherTopics || ""
    ]);

    // 2. Save Store Reports
    if (data.storeReports && data.storeReports.length > 0) {
      const storeHeaders = ["ReportID", "Timestamp", "UserID", "StoreName", "LastMonthGoals", "LastMonthResults", "ThisMonthGoals", "ThisMonthFocus", "Promo", "Facility", "SalesPrevious", "SalesCurrent", "SalesBudget", "StaffStore"];
      const storeSheet = getOrCreateSheet(ss, "AMStatus_StoreReports", storeHeaders);
      
      const storeRows = data.storeReports.map(store => [
        reportId,
        timestamp,
        data.UserID || "",
        store.storeName || "",
        store.textLastMonthGoals || "",
        store.textLastMonthResults || "",
        store.textThisMonthGoals || "",
        store.textThisMonthFocus || "",
        store.textPromo || "",
        store.textFacility || "",
        store.textSalesPrevious || "",
        store.textSalesCurrent || "",
        store.textSalesBudget || "",
        store.textStaffStore || ""
      ]);
      
      storeSheet.getRange(storeSheet.getLastRow() + 1, 1, storeRows.length, storeHeaders.length).setValues(storeRows);
    }

    // 3. Save HR Events
    if (data.hrEvents && data.hrEvents.length > 0) {
      const hrHeaders = ["ReportID", "Timestamp", "UserID", "EventType", "Date", "StoreName", "PersonName", "Details"];
      const hrSheet = getOrCreateSheet(ss, "AMStatus_HREvents", hrHeaders);
      
      const hrRows = data.hrEvents.map(event => [
        reportId,
        timestamp,
        data.UserID || "",
        event.type || "",
        event.date || "",
        event.store || "",
        event.name || "",
        event.details || ""
      ]);
      
      hrSheet.getRange(hrSheet.getLastRow() + 1, 1, hrRows.length, hrHeaders.length).setValues(hrRows);
    }

    // 4. Save Interview Events
    if (data.interviewEvents && data.interviewEvents.length > 0) {
      const interviewHeaders = ["ReportID", "Timestamp", "UserID", "Date", "Importance", "StoreName", "PersonName", "Interviewer", "InterviewType", "Status", "ContentMain", "ContentConcerns", "ContentNextAction", "ContentImpression"];
      const interviewSheet = getOrCreateSheet(ss, "AMStatus_InterviewEvents", interviewHeaders);
      
      const interviewRows = data.interviewEvents.map(event => [
        reportId,
        timestamp,
        data.UserID || "",
        event.date || "",
        event.importance || "",
        event.store || "",
        event.name || "",
        event.interviewer || "",
        event.interviewType || "",
        event.status || "",
        event.contentMain || "",
        event.contentConcerns || "",
        event.contentNextAction || "",
        event.contentImpression || ""
      ]);
      
      interviewSheet.getRange(interviewSheet.getLastRow() + 1, 1, interviewRows.length, interviewHeaders.length).setValues(interviewRows);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, reportId: reportId }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: "Data Save Error: " + error.toString(),
      details: "スプレッドシートの権限や、シート名の重複などを確認してください。"
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGetAMStatusReports(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mainSheet = ss.getSheetByName("AMStatusReports");
  
  if (!mainSheet) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sheetData = mainSheet.getDataRange().getValues();
  const headers = sheetData[0];
  const reports = [];

  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i];
    const report = {};
    for (let j = 0; j < headers.length; j++) {
      report[headers[j]] = row[j];
    }
    
    if (report.Timestamp instanceof Date) {
      report.Timestamp = report.Timestamp.toISOString();
    }
    
    reports.push({
      ReportID: report.ReportID,
      UserID: report.UserID,
      UserName: report.UserName,
      UserArea: report.UserArea,
      Timestamp: report.Timestamp,
      textAreaVision: report.AreaVision,
      textAreaSummary: report.AreaSummary,
      textManagerCondition: report.ManagerCondition,
      textOtherTopics: report.OtherTopics,
      storeReports: [] // Placeholder for feed
    });
  }

  reports.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

  return ContentService.createTextOutput(JSON.stringify(reports))
    .setMimeType(ContentService.MimeType.JSON);
}
