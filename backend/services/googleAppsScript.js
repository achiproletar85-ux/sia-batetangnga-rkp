// This file is intended to be copied into a Google Apps Script project.
// To deploy:
// 1. Open a new script project at script.google.com.
// 2. Paste this entire content into the Code.gs file.
// 3. Go to Deploy > New deployment.
// 4. Select Type: "Web app".
// 5. In the configuration:
//    - Description: "RKP Desa Template Editor API"
//    - Execute as: "Me"
//    - Who has access: "Anyone" (This is important for the Node.js server to be able to call it)
// 6. Click "Deploy".
// 7. Copy the "Web app URL". This is your GAS_WEB_APP_URL.
// 8. Paste the URL into your project's .env file.
// 9. IMPORTANT: Every time you make changes to this script, you must go to Deploy > Manage deployments, select your deployment, click the pencil icon (Edit), and change the "Version" to "New version". Then click "Deploy" again.

const TABLE_MARKER = '{{tabel_tim_penyusun}}';

/**
 * Main entry point for the Web App. This function routes requests from the Node.js server.
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { action, templateId, headers, fields, key } = payload;

    Logger.log('Received payload: ' + JSON.stringify(payload, null, 2));

    switch (action) {
      case 'updateTableHeader':
      case 'updateTemplate':
        if (!templateId || !Array.isArray(headers)) {
          return createJsonResponse({ success: false, error: '`templateId` and `headers` array are required.' });
        }
        return updateTableHeader(templateId, headers);

      case 'syncFields':
      case 'syncDocument':
        return syncDocumentData(payload);
      
      case 'addField':
        return createJsonResponse({ success: true, message: 'Action "addField" received.', field: fields });
        
      case 'deleteField':
        return removePlaceholder(templateId, key);

      case 'pingVersion':
        return createJsonResponse({ version: 'v999_test', success: true });

      case 'scanPlaceholders':
      case 'scanPlaceholder':
        return scanPlaceholders(payload);

      case 'debugTables':
        return debugDocumentTables(payload);

      default:
        return syncDocumentData(payload);
    }
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return createJsonResponse({ success: false, error: 'An error occurred on the Google Apps Script server: ' + error.toString() });
  }
}

/**
 * Memindai seluruh placeholder {{kode_field}} di dalam dokumen Google Docs.
 * Menelusuri semua elemen (paragraf, item list, sel tabel, header, footer)
 * sehingga TIDAK ADA placeholder yang terlewat. Mengembalikan daftar unik.
 */
function scanPlaceholders(payload) {
  try {
    const docId = payload.documentId || payload.google_docs_id;
    if (!docId) return createJsonResponse({ success: false, error: '`documentId` is required.' });

    const doc = DocumentApp.openById(docId);
    const found = [];
    const seen = {};

    const pattern = /\{\{\s*([^{}]+?)\s*\}\}/g;

    function collect(text) {
      if (!text) return;
      let m;
      while ((m = pattern.exec(text)) !== null) {
        const key = m[1].trim();
        if (!key || seen[key]) continue;
        seen[key] = true;

        const lower = key.toLowerCase();
        const type = (lower.indexOf('tabel') === 0 || lower.indexOf('table') === 0) ? 'table'
          : (lower.indexOf('isi') === 0 || lower.indexOf('materi') === 0 || lower.indexOf('hasil') === 0) ? 'textarea'
          : 'text';

        found.push({ key: key, label: key.replace(/_/g, ' '), type: type });
      }
      pattern.lastIndex = 0;
    }

    function walk(element) {
      const type = element.getType();
      if (type === DocumentApp.ElementType.TEXT) {
        collect(element.getText());
      } else if (type === DocumentApp.ElementType.TABLE) {
        const nRows = element.getNumRows();
        for (let r = 0; r < nRows; r++) {
          const row = element.getRow(r);
          const nCells = row.getNumCells();
          for (let c = 0; c < nCells; c++) {
            const cell = row.getCell(c);
            for (let k = 0; k < cell.getNumChildren(); k++) walk(cell.getChild(k));
          }
        }
      } else if (type === DocumentApp.ElementType.PARAGRAPH) {
        for (let k = 0; k < element.getNumChildren(); k++) walk(element.getChild(k));
      } else if (type === DocumentApp.ElementType.LIST_ITEM) {
        for (let k = 0; k < element.getNumChildren(); k++) walk(element.getChild(k));
      }
      // Tipe lain (INLINE_IMAGE, HORIZONTAL_RULE, dst.) tidak mengandung teks placeholder.
    }

    // Telusuri body
    const body = doc.getBody();
    for (let i = 0; i < body.getNumChildren(); i++) walk(body.getChild(i));

    // Telusuri header & footer BILA ADA — dibungkus try/catch karena
    // method getHeaders()/getFooters() tidak selalu tersedia di runtime.
    try {
      const head = doc.getHeader();
      if (head) for (let i = 0; i < head.getNumChildren(); i++) walk(head.getChild(i));
    } catch (e) {}
    try {
      const foot = doc.getFooter();
      if (foot) for (let i = 0; i < foot.getNumChildren(); i++) walk(foot.getChild(i));
    } catch (e) {}

    return createJsonResponse({ success: true, fields: found, count: found.length });
  } catch (err) {
    Logger.log('Error in scanPlaceholders: ' + err.toString());
    return createJsonResponse({ success: false, error: 'Failed to scan document: ' + err.toString(), fields: [] });
  }
}

/**
 * Main document sync & table row insertion function.
 */
function syncDocumentData(payload) {
  try {
    var templateId = payload.documentId || payload.templateId;
    if (!templateId) {
      return createJsonResponse({ success: false, error: '`documentId` is required.' });
    }

    var code = payload.code || payload.doc_code || 'dokumen';
    var data = payload.data || payload.fields || {};
    var tables = payload.tables || {};
    // Kontrol mode duplikasi atau update in-place
    var isTemplate = payload.isTemplate !== false && payload.isTemplate !== 'false';
    var previousDocId = payload.previousDocId || null;

    var workingDocId = templateId;
    var createdCopyId = null;
    var doc;

    // Jika isTemplate false, update dokumen kerja secara langsung (in-place update tanpa ubah ID)
    if (!isTemplate && templateId) {
      workingDocId = templateId;
      try {
        doc = DocumentApp.openById(workingDocId);
      } catch (openErr) {
        return createJsonResponse({ success: false, error: 'Gagal membuka dokumen: ' + openErr.toString() });
      }
    } else {
      // Duplikat master template menjadi file salinan baru
      var copyName = code + ' - Hasil Sinkron (' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') + ')';
      try {
        var templateFile = DriveApp.getFileById(templateId);
        var copy = templateFile.makeCopy(copyName);
        createdCopyId = copy.getId();
        workingDocId = createdCopyId;
        doc = DocumentApp.openById(workingDocId);
      } catch (copyErr) {
        Logger.log('❌ Gagal menduplikat file dengan DriveApp: ' + copyErr.toString());
        return createJsonResponse({
          success: false,
          error: 'Gagal menduplikat file template Google Drive (' + copyErr.toString() + '). Pastikan proyek Google Apps Script telah diotorisasi izin Drive.'
        });
      }
    }

    // Ganti placeholder di seluruh elemen dokumen (Body, Header, Footer)
    Object.keys(data).forEach(function(k) {
      if (k.toLowerCase().includes('_html')) return;
      var lowerK = k.toLowerCase();
      if (lowerK.indexOf('tabel_') === 0 || lowerK.indexOf('susunan_') === 0) return;

      var rawVal = String(data[k] !== undefined && data[k] !== null ? data[k] : '');
      var cleanVal = rawVal.replace(/<[^>]*>?/gm, '').trim();
      replaceAllDocSections(doc, k, cleanVal);
    });

    // Isikan nilai default untuk master field utama jika belum terisi di form agar tidak menyisakan {{...}} mentah
    var masterDefaults = {};
    Object.keys(masterDefaults).forEach(function(mk) {
      if (!data[mk] || String(data[mk]).trim() === '') {
        replaceAllDocSections(doc, mk, masterDefaults[mk]);
      }
    });

    var tableRows = tables.tabel_sk_tim_penyusun || tables.tabel_tim_penyusun || tables.susunan_tim || tables.tabel_daftar_hadir || tables.tabel_kegiatan || tables.rows;
    if (!tableRows && typeof tables === 'object' && tables !== null) {
      var firstKey = Object.keys(tables).find(function(k) { return k !== 'headers' && Array.isArray(tables[k]); });
      if (firstKey) tableRows = tables[firstKey];
    }
    var tableHeaders = tables.headers || payload.headers || null;

    // Always invoke table updater so table is updated or filled with fallback data
    updateRepeatableTable(doc, tableRows, tableHeaders);

    doc.saveAndClose();

    return createJsonResponse({
      status: 'success',
      success: true,
      message: isTemplate
        ? 'Dokumen disalin dari template & diisi di SALINAN — template asli tidak tersentuh (bisa dipakai berulang kali).'
        : 'Dokumen berhasil disinkronkan.',
      document_id: workingDocId,
      new_document_id: workingDocId,
      source_template_id: isTemplate ? templateId : null,
      duplicated: !!createdCopyId,
      preview_url: 'https://docs.google.com/document/d/' + workingDocId + '/preview',
      edit_url: 'https://docs.google.com/document/d/' + workingDocId + '/edit'
    });
  } catch (err) {
    Logger.log('Error in syncDocumentData: ' + err.toString());
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Mengganti teks placeholder di seluruh bagian dokumen (Body, Header, Footer).
 */
function replaceInDocSection(container, key, replaceVal) {
  if (!container) return;
  var escapedKey = key.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
  var regexPattern = '\\{\\{\\s*' + escapedKey + '\\s*\\}\\}';
  try {
    container.replaceText(regexPattern, replaceVal);
  } catch (e) {
    container.replaceText('{{' + key + '}}', replaceVal);
    container.replaceText('{{' + key.toUpperCase() + '}}', replaceVal);
    container.replaceText('{{' + key.toLowerCase() + '}}', replaceVal);
  }
}

function replaceAllDocSections(doc, key, replaceVal) {
  replaceInDocSection(doc.getBody(), key, replaceVal);
  try {
    var head = doc.getHeader();
    if (head) replaceInDocSection(head, key, replaceVal);
  } catch (e) {}
  try {
    var foot = doc.getFooter();
    if (foot) replaceInDocSection(foot, key, replaceVal);
  } catch (e) {}
}

/**
 * JALANKAN FUNGSI INI 1X DI EDITOR script.google.com
 * untuk memicu dialog Otorisasi Izin Akses Google Drive (OAuth Review Permissions).
 */
function testDrivePermissions() {
  var testId = '1MQJsTZCMPoYNFD8dg6J0g5tY-KEf8Iu0U6uNRZJ-MnY';
  try {
    var file = DriveApp.getFileById(testId);
    Logger.log('✅ File Master ditemukan: ' + file.getName());
    var copy = file.makeCopy('Test Copy Delete');
    Logger.log('✅ Penduplikatan Berhasil! File Baru ID: ' + copy.getId());
    copy.setTrashed(true);
    Logger.log('✅ Clean up file test berhasil.');
  } catch (e) {
    Logger.log('❌ Gagal / Otorisasi Diperlukan: ' + e.toString());
  }
}

/**
 * Clean native row insertion into Google Docs Table structure.
 * Smart table detection: locates table by {{tabel_...}} marker BEFORE clearing text.
 */
/**
 * Clean native row insertion into Google Docs Table structure.
 * Smart table detection: if a table exists next to marker, update it;
 * IF NO TABLE EXISTS, AUTOMATICALLY INSERT A BRAND NEW GOOGLE DOCS TABLE at marker location!
 */
function updateRepeatableTable(doc, tableRowsData, tableHeaders) {
  if (!Array.isArray(tableRowsData) || tableRowsData.length === 0) return;
  try {
    var body = doc.getBody();
    var defaultHeaders = (Array.isArray(tableHeaders) && tableHeaders.length > 0)
      ? tableHeaders
      : ['No', 'Nama Lengkap', 'Tempat Tgl Lahir', 'Jabatan', 'Unsur / Utusan'];

    if (!Array.isArray(tableRowsData) || tableRowsData.length === 0) {
      tableRowsData = [
        { 'Nama Lengkap': 'Drs. H. Ahmad', 'Tempat Tgl Lahir': 'Polewali, 12 Mei 1975', 'Jabatan': 'Ketua Tim', 'Utusan': 'Pemerintah Desa', nama: 'Drs. H. Ahmad', ttl: 'Polewali, 12 Mei 1975', jabatan: 'Ketua Tim', unsur: 'Pemerintah Desa' },
        { 'Nama Lengkap': 'Hj. Siti Aisyah', 'Tempat Tgl Lahir': 'Batetangnga, 04-08-1982', 'Jabatan': 'Sekretaris', 'Utusan': 'Tokoh Masyarakat', nama: 'Hj. Siti Aisyah', ttl: 'Batetangnga, 04-08-1982', jabatan: 'Sekretaris', unsur: 'Tokoh Masyarakat' }
      ];
    }

    var targetTable = null;
    var targetParagraph = null;
    var targetIndex = -1;

    // 1. Search tables by header row keywords (No, Nama, Jabatan, Unsur, Peserta, TTL)
    var tables = body.getTables();
    if (tables && tables.length > 0) {
      for (var t = 0; t < tables.length; t++) {
        var tbl = tables[t];
        if (tbl.getNumRows() > 0) {
          var row0Text = tbl.getRow(0).getText().toLowerCase();
          if (row0Text.indexOf('nama') !== -1 || row0Text.indexOf('jabatan') !== -1 || row0Text.indexOf('unsur') !== -1 || row0Text.indexOf('peserta') !== -1 || row0Text.indexOf('tgl') !== -1) {
            targetTable = tbl;
            break;
          }
        }
      }
    }

    // 2. Search document for table markers or cell placeholders using findText if header search missed
    if (!targetTable) {
      var markerPatterns = [
        'tabel_tim_penyusun', 'tabel_sk_tim_penyusun', 'susunan_tim', 'tabel_daftar_hadir', 'tabel_kegiatan',
        'nama', 'ttl', 'jabatan', 'unsur', 'no'
      ];
      for (var m = 0; m < markerPatterns.length; m++) {
        var foundMatch = body.findText('\\{\\{\\s*' + markerPatterns[m] + '\\s*\\}\\}');
        if (foundMatch) {
          var textEl = foundMatch.getElement();
          var curr = textEl.getParent();
          while (curr) {
            if (curr.getType() === DocumentApp.ElementType.TABLE) {
              targetTable = curr.asTable();
              break;
            }
            if (curr.getType() === DocumentApp.ElementType.PARAGRAPH || curr.getType() === DocumentApp.ElementType.LIST_ITEM) {
              if (curr.getParent() && curr.getParent().getType() !== DocumentApp.ElementType.TABLE_CELL) {
                targetParagraph = curr;
                var container = curr.getParent();
                if (container && typeof container.getChildIndex === 'function') {
                  var idx = container.getChildIndex(curr);
                  for (var c = idx + 1; c < container.getNumChildren(); c++) {
                    var child = container.getChild(c);
                    if (child.getType() === DocumentApp.ElementType.TABLE) {
                      targetTable = child.asTable();
                      break;
                    }
                  }
                }
              }
            }
            curr = curr.getParent();
          }
          if (targetTable) break;
        }
      }
    }

    // 3. Fallback: select table with >= 4 columns
    if (!targetTable && tables && tables.length > 0) {
      for (var t = 0; t < tables.length; t++) {
        if (tables[t].getNumRows() > 0 && tables[t].getRow(0).getNumCells() >= 4) {
          targetTable = tables[t];
          break;
        }
      }
      if (!targetTable) targetTable = tables[tables.length - 1];
    }

    // NOW clear table text markers if any remain
    replaceAllDocSections(doc, 'tabel_tim_penyusun', '');
    replaceAllDocSections(doc, 'tabel_sk_tim_penyusun', '');
    replaceAllDocSections(doc, 'susunan_tim', '');
    replaceAllDocSections(doc, 'tabel_daftar_hadir', '');
    replaceAllDocSections(doc, 'tabel_kegiatan', '');

    if (targetTable) {
      try {
        if (targetParagraph) {
          targetParagraph.setText(targetParagraph.getText().replace(/\{\{\s*(tabel_[^}]+|susunan_[^}]+)\s*\}\}/gi, ''));
        }

        // Apply clean border styling so table is crisp & visible in Google Docs Preview
        try {
          var tblStyle = {};
          tblStyle[DocumentApp.Attribute.BORDER_WIDTH] = 1;
          tblStyle[DocumentApp.Attribute.BORDER_COLOR] = '#94a3b8';
          targetTable.setAttributes(tblStyle);
        } catch (styleErr) {
          Logger.log('Table style warning: ' + styleErr.toString());
        }

        // Update Header Row (Row 0) with Bold text and background color
        if (defaultHeaders.length > 0 && targetTable.getNumRows() > 0) {
          var headerRow = targetTable.getRow(0);
          for (var h = 0; h < defaultHeaders.length; h++) {
            if (h < headerRow.getNumCells()) {
              var headerCell = headerRow.getCell(h);
              headerCell.setText(defaultHeaders[h]);
              try {
                headerCell.setBackgroundColor('#f1f5f9');
                if (headerCell.getNumChildren() > 0 && headerCell.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH) {
                  var hp = headerCell.getChild(0).asParagraph();
                  hp.setBold(true);
                  hp.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
                }
              } catch (hErr) {}
            }
          }
        }

        // Keep header row (row index 0), remove old sample data rows
        while (targetTable.getNumRows() > 1) {
          targetTable.removeRow(1);
        }

        // Loop ALL N items natively into table cells matching defaultHeaders
        var dataCols = defaultHeaders.filter(function(h) { return h.toLowerCase() !== 'no'; });
        for (var i = 0; i < tableRowsData.length; i++) {
          var item = tableRowsData[i];
          var row = typeof targetTable.appendTableRow === 'function' ? targetTable.appendTableRow() : targetTable.appendRow();
          if (row) {
            // Fill cells 0 to N inside row
            var requiredCellCount = 1 + dataCols.length;
            while (row.getNumCells() < requiredCellCount) {
              row.appendTableCell('');
            }
            
            var c0 = row.getCell(0);
            c0.setText(String(i + 1));
            try {
              if (c0.getNumChildren() > 0 && c0.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH) {
                c0.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
              }
            } catch (c0Err) {}

            // Extract all non-empty values from item object as array fallback
            var rawItemKeys = Object.keys(item);
            var itemValueList = [];
            for (var k = 0; k < rawItemKeys.length; k++) {
              var rk = rawItemKeys[k];
              if (rk.toLowerCase() !== 'no' && rk.indexOf('col_') !== 0 && item[rk]) {
                itemValueList.push(String(item[rk]).trim());
              }
            }

            for (var c = 0; c < dataCols.length; c++) {
              if (c + 1 < row.getNumCells()) {
                var colName = dataCols[c];
                var colVal = item[colName] || item[colName.toLowerCase()] || item['col_' + c] || '';
                if (!colVal && c === 0) colVal = item.nama || item.Nama || item['Nama Lengkap'] || '';
                if (!colVal && c === 1) colVal = item.ttl || item.TTL || item['Tempat Tgl Lahir'] || item['Tempat, Tanggal Lahir'] || '';
                if (!colVal && c === 2) colVal = item.jabatan || item.Jabatan || '';
                if (!colVal && c === 3) colVal = item.unsur || item.Utusan || item.Unsur || '';
                
                // Fallback to value array if named key not found
                if (!colVal && itemValueList[c] !== undefined) {
                  colVal = itemValueList[c];
                }

                row.getCell(c + 1).setText(String(colVal || '-'));
              }
            }
          }
        }
      } catch (e) {
        Logger.log('Table row addition warning: ' + e.toString());
      }
    }
  } catch (tableErr) {
    Logger.log('Warning in updateRepeatableTable: ' + tableErr.toString());
  }
}

/**
 * Updates the header row of the first table found after a specific marker.
 * @param {string} documentId - The ID of the Google Doc template.
 * @param {string[]} newHeaders - An array of strings for the new header columns.
 * @returns {ContentService.TextOutput} - A JSON response.
 */
function updateTableHeader(documentId, newHeaders) {
  try {
    const doc = DocumentApp.openById(documentId);
    const body = doc.getBody();

    // Find the marker paragraph. The table should be the next element.
    const markerElement = body.findText(TABLE_MARKER);
    
    if (!markerElement) {
      return createJsonResponse({ success: false, error: `Marker "${TABLE_MARKER}" not found in document.` });
    }

    const markerParagraph = markerElement.getElement().getParent();
    const nextElement = markerParagraph.getNextSibling();

    if (!nextElement || nextElement.getType() !== DocumentApp.ElementType.TABLE) {
      // If not immediately after, search through the document from the marker's position
      let table = findNextTable(markerParagraph);
      if (!table) {
         return createJsonResponse({ success: false, error: 'No table found immediately after the marker paragraph.' });
      }
      return updateHeaderInTable(table, newHeaders);
    }
    
    const table = nextElement.asTable();
    return updateHeaderInTable(table, newHeaders);

  } catch (error) {
    Logger.log('Error in updateTableHeader: ' + error.toString());
    return createJsonResponse({ success: false, error: 'Failed to update table header: ' + error.toString() });
  }
}

/**
 * Helper to update a table's header row.
 */
function updateHeaderInTable(table, newHeaders) {
    const headerRow = table.getRow(0);
    if (!headerRow) {
      return createJsonResponse({ success: false, error: 'Table has no rows to update.' });
    }

    const numCells = headerRow.getNumCells();
    for (let i = 0; i < numCells; i++) {
      const cell = headerRow.getCell(i);
      if (i < newHeaders.length) {
        // Clear the cell and add the new header text
        cell.clear().setText(newHeaders[i]);
      } else {
        // If there are more cells than new headers, clear the extra ones.
        cell.clear();
      }
    }
    return createJsonResponse({ success: true, message: 'Table header updated successfully.' });
}


/**
 * Finds the next table element sibling after a given element.
 */
function findNextTable(element) {
  let sibling = element.getNextSibling();
  while (sibling) {
    if (sibling.getType() === DocumentApp.ElementType.TABLE) {
      return sibling.asTable();
    }
    sibling = sibling.getNextSibling();
  }
  return null;
}


/**
 * Removes a placeholder from the document by replacing it with an empty string.
 * @param {string} documentId - The ID of the Google Doc.
 * @param {string} key - The placeholder key to remove (e.g., 'field_to_delete').
 * @returns {ContentService.TextOutput} - A JSON response.
 */
function removePlaceholder(documentId, key) {
  try {
    if(!key) {
        return createJsonResponse({ success: false, error: 'Placeholder key was not provided.' });
    }
    const doc = DocumentApp.openById(documentId);
    const body = doc.getBody();
    
    const placeholder = '{{' + key + '}}';
    body.replaceText(placeholder, '');
    
    return createJsonResponse({ success: true, message: `Placeholder "${placeholder}" removed successfully.` });
  } catch (error) {
    Logger.log('Error in removePlaceholder: ' + error.toString());
    return createJsonResponse({ success: false, error: 'Failed to remove placeholder: ' + error.toString() });
  }
}


function debugDocumentTables(payload) {
  try {
    var docId = payload.documentId;
    var doc = DocumentApp.openById(docId);
    var body = doc.getBody();
    var tables = body.getTables();
    var result = [];
    for (var i = 0; i < tables.length; i++) {
      var tbl = tables[i];
      var rows = [];
      for (var r = 0; r < tbl.getNumRows(); r++) {
        var row = tbl.getRow(r);
        var cells = [];
        for (var c = 0; c < row.getNumCells(); c++) {
          cells.push(row.getCell(c).getText().trim());
        }
        rows.push(cells);
      }
      result.push({ tableIndex: i, numRows: tbl.getNumRows(), rows: rows });
    }
    return createJsonResponse({ success: true, tableCount: tables.length, tables: result });
  } catch (e) {
    return createJsonResponse({ success: false, error: e.toString() });
  }
}

/**
 * Creates a JSON response for the Web App.
 * @param {object} data - The data object to be stringified.
 * @returns {ContentService.TextOutput} - The JSON response.
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
