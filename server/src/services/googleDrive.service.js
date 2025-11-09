// src/services/googleDrive.service.js
import fetch from "node-fetch";

/**
 * Fetch recent files from Google Drive
 */
export const fetchGoogleDriveFiles = async (accessToken) => {
  const url = "https://www.googleapis.com/drive/v3/files?pageSize=20&fields=files(id,name,mimeType,modifiedTime,webViewLink)";
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Google Drive files");

  const data = await res.json();
  return data.files || [];
};

/**
 * Upload a file to Google Drive
 */
export const uploadGoogleDriveFile = async (accessToken, fileMetadata, fileContent) => {
  const boundary = "aicoodriveboundary";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(fileMetadata) +
    delimiter +
    'Content-Type: text/plain\r\n\r\n' +
    fileContent +
    closeDelim;

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive upload failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return { id: data.id, name: data.name, link: data.webViewLink };
};
