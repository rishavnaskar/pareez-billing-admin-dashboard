// "Connect Google Spreadsheet" — pragmatic, no-OAuth integration.
//
// The owner deploys a tiny Google Apps Script Web App (instructions in the UI &
// README) bound to their spreadsheet, then pastes its /exec URL here. We POST
// rows to it and the script appends them to a sheet. The URL is stored locally
// so no secrets ever touch our database.

const STORAGE_KEY = "pareez_admin_gsheet_webhook";

export function getSheetWebhook(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setSheetWebhook(url: string): void {
  if (typeof window === "undefined") return;
  if (url) localStorage.setItem(STORAGE_KEY, url.trim());
  else localStorage.removeItem(STORAGE_KEY);
}

export interface SheetPushPayload {
  sheet: string; // tab name to append to
  headers: string[];
  rows: (string | number)[][];
  mode?: "append" | "replace";
}

export async function pushToSheet(payload: SheetPushPayload): Promise<{ ok: boolean; message: string }> {
  const url = getSheetWebhook();
  if (!url) return { ok: false, message: "No Google Sheet connected. Add a webhook URL in Settings." };
  try {
    // Apps Script web apps don't return CORS headers for cross-origin fetch,
    // so we use no-cors. The request still reaches the script; we just can't
    // read the response. Treat a thrown error as the only failure signal.
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    return { ok: true, message: `Sent ${payload.rows.length} row(s) to "${payload.sheet}".` };
  } catch (err) {
    return { ok: false, message: `Failed to reach Google Sheet: ${(err as Error).message}` };
  }
}

/** The Apps Script source we show the user to paste into their sheet. */
export const APPS_SCRIPT_SNIPPET = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(data.sheet) || ss.insertSheet(data.sheet);
  if (data.mode === 'replace') sheet.clear();
  if (sheet.getLastRow() === 0 && data.headers) {
    sheet.appendRow(data.headers);
  }
  (data.rows || []).forEach(function (row) { sheet.appendRow(row); });
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}`;
