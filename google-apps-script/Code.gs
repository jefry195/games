/**
 * =========================================================================
 * BACKEND PAPAN PERINGKAT (LEADERBOARD) - ARCADE MAHAKAM SAMARINDA
 * =========================================================================
 * Script ini digunakan sebagai Web App serverless gratis di Google Apps Script
 * untuk menyimpan dan menampilkan skor seluruh game arcade secara real-time.
 * 
 * Credit by Jefri (https://jefri-orcin.vercel.app/)
 * =========================================================================
 */

const SHEET_NAME = "Skor_Masuk";
const HEADERS = ["Waktu", "ID Game", "Nama Game", "Nama Pemain", "Skor", "Daerah / Kota"];

/**
 * Inisialisasi sheet dan header jika belum ada
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    // Format header
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setBackground("#0f172a")
      .setFontColor("#38bdf8")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Handle HTTP GET Requests:
 * Digunakan oleh web browser untuk mengambil daftar peringkat (Top 10)
 * 
 * Parameter URL yang didukung:
 * - ?gameId=tetris         -> Mengambil Top 10 skor game tersebut
 * - ?limit=20              -> Mengambil Top N (default: 10)
 * - ?action=all_games      -> Mengambil daftar ID game yang ada skornya
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const gameId = params.gameId || "";
    const limit = parseInt(params.limit || "10", 10);
    const action = params.action || "leaderboard";

    const sheet = getOrCreateSheet();
    const data = sheet.getDataRange().getValues();

    // Jika belum ada data skor selain header
    if (data.length <= 1) {
      return jsonResponse({
        success: true,
        gameId: gameId,
        leaderboard: [],
        totalRecords: 0
      });
    }

    const rows = data.slice(1); // Lewati header

    if (action === "all_games") {
      const gameIds = [...new Set(rows.map(r => r[1]).filter(Boolean))];
      return jsonResponse({
        success: true,
        games: gameIds
      });
    }

    // Filter berdasarkan gameId jika diberikan
    let filtered = rows;
    if (gameId) {
      filtered = rows.filter(r => String(r[1]).toLowerCase() === gameId.toLowerCase());
    }

    // Pengurutan skor tertinggi di atas (descending)
    filtered.sort((a, b) => {
      const scoreA = Number(a[4]) || 0;
      const scoreB = Number(b[4]) || 0;
      return scoreB - scoreA;
    });

    // Ambil Top N
    const topScores = filtered.slice(0, limit).map((r, index) => {
      return {
        rank: index + 1,
        timestamp: r[0],
        gameId: r[1],
        gameName: r[2],
        playerName: r[3],
        score: Number(r[4]) || 0,
        city: r[5] || "Samarinda"
      };
    });

    return jsonResponse({
      success: true,
      gameId: gameId,
      totalEntries: filtered.length,
      leaderboard: topScores
    });

  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

/**
 * Handle HTTP POST Requests:
 * Digunakan oleh web game saat Game Over untuk mengirimkan skor pemain.
 */
function doPost(e) {
  try {
    let payload = {};

    // Cek apakah data dikirim via JSON raw atau URL-encoded
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (ex) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const gameId = String(payload.gameId || "game-arcade").trim();
    const gameName = String(payload.gameName || gameId).trim();
    const playerName = String(payload.playerName || "Pemain Anonim").trim().substring(0, 30);
    const score = Number(payload.score) || 0;
    const city = String(payload.city || "Samarinda").trim().substring(0, 30);

    const now = new Date();
    const formattedDate = Utilities.formatDate(now, "Asia/Makassar", "yyyy-MM-dd HH:mm:ss"); // Waktu WITA Samarinda

    const sheet = getOrCreateSheet();
    sheet.appendRow([
      formattedDate,
      gameId,
      gameName,
      playerName,
      score,
      city
    ]);

    // Hitung peringkat pemain saat ini
    const data = sheet.getDataRange().getValues().slice(1);
    const gameScores = data
      .filter(r => String(r[1]).toLowerCase() === gameId.toLowerCase())
      .map(r => Number(r[4]) || 0);

    gameScores.sort((a, b) => b - a);
    const rank = gameScores.indexOf(score) + 1;

    return jsonResponse({
      success: true,
      message: "Skor berhasil disimpan di Papan Peringkat!",
      rank: rank > 0 ? rank : 1,
      playerName: playerName,
      score: score,
      city: city,
      timestamp: formattedDate
    });

  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

/**
 * Helper untuk mengembalikan response JSON
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
