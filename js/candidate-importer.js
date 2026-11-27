// Zero-dependency Client-side HSCT Candidate File Importer
// Supports .docx (Word / Google Docs export), .html/.htm, and .txt/.md
// 100% offline in browser — patient data never leaves the local device.

window.BMTCandidateImporter = (function () {
  const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

  // --- 1. Pure-JS ZIP Reader for .docx (extracts word/document.xml) ---
  async function inflateRaw(compressedBytes) {
    if (typeof DecompressionStream !== 'function') {
      throw new Error('您的瀏覽器不支援原生 DecompressionStream，請更新至新版 Chrome / Edge / Safari / Firefox。');
    }
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(compressedBytes);
    writer.close();
    const outBuf = await new Response(ds.readable).arrayBuffer();
    return new Uint8Array(outBuf);
  }

  async function extractDocxDocumentXml(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const len = bytes.length;

    // Locate End of Central Directory (EOCD: 0x06054b50)
    const minPos = Math.max(0, len - 65557);
    let eocdPos = -1;
    for (let i = len - 22; i >= minPos; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdPos = i;
        break;
      }
    }
    if (eocdPos < 0) {
      throw new Error('無法辨識為有效的 .docx 檔案（找不到 ZIP 目錄結構）。');
    }

    const totalEntries = view.getUint16(eocdPos + 10, true);
    const cdOffset = view.getUint32(eocdPos + 16, true);
    const decoder = new TextDecoder('utf-8');

    let pos = cdOffset;
    for (let idx = 0; idx < totalEntries; idx++) {
      if (pos + 46 > len || view.getUint32(pos, true) !== 0x02014b50) break;
      const compressionMethod = view.getUint16(pos + 10, true);
      const compressedSize = view.getUint32(pos + 20, true);
      const nameLen = view.getUint16(pos + 28, true);
      const extraLen = view.getUint16(pos + 30, true);
      const commentLen = view.getUint16(pos + 32, true);
      const localHeaderOffset = view.getUint32(pos + 42, true);
      const entryName = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLen));

      if (entryName.toLowerCase() === 'word/document.xml') {
        if (localHeaderOffset + 30 > len || view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
          throw new Error('.docx 內部檔案標頭損毀。');
        }
        const lNameLen = view.getUint16(localHeaderOffset + 26, true);
        const lExtraLen = view.getUint16(localHeaderOffset + 28, true);
        const dataStart = localHeaderOffset + 30 + lNameLen + lExtraLen;
        const compSlice = bytes.subarray(dataStart, dataStart + compressedSize);

        let xmlBytes;
        if (compressionMethod === 0) {
          xmlBytes = compSlice;
        } else if (compressionMethod === 8) {
          xmlBytes = await inflateRaw(compSlice);
        } else {
          throw new Error(`不支援的 ZIP 壓縮格式 (${compressionMethod})。`);
        }
        return decoder.decode(xmlBytes);
      }

      pos += 46 + nameLen + extraLen + commentLen;
    }

    throw new Error('此 .docx 檔案中找不到 word/document.xml。');
  }

  // --- 2. Block Extractors (DOCX XML / HTML / Plain Text) ---
  function getDirectChildrenByLocalName(node, localName) {
    const out = [];
    for (let c = node.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 1 && c.localName === localName) out.push(c);
    }
    return out;
  }

  function extractWParagraphText(pNode) {
    let out = '';
    const walk = (el) => {
      for (let c = el.firstChild; c; c = c.nextSibling) {
        if (c.nodeType !== 1) continue;
        const ln = c.localName;
        if (ln === 't') {
          out += c.textContent || '';
        } else if (ln === 'tab') {
          out += '\t';
        } else if (ln === 'br' || ln === 'cr') {
          out += '\n';
        } else if (ln === 'r' || ln === 'hyperlink' || ln === 'ins' || ln === 'smartTag' || ln === 'sdt' || ln === 'sdtContent') {
          walk(c);
        }
      }
    };
    walk(pNode);
    return out.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  }

  function extractWCellText(tcNode) {
    const lines = [];
    const ps = getDirectChildrenByLocalName(tcNode, 'p');
    for (const p of ps) {
      const txt = extractWParagraphText(p);
      if (txt) lines.push(txt);
    }
    return lines.join('\n').trim();
  }

  function parseWTable(tblNode) {
    const trNodes = getDirectChildrenByLocalName(tblNode, 'tr');
    const logicalRows = [];
    const activeVmerge = []; // colIdx -> text

    for (const tr of trNodes) {
      const tcNodes = getDirectChildrenByLocalName(tr, 'tc');
      const rowCells = [];
      let colIdx = 0;

      for (const tc of tcNodes) {
        const tcPr = getDirectChildrenByLocalName(tc, 'tcPr')[0];
        let colspan = 1;
        let vMergeVal = null; // null | 'restart' | 'continue'

        if (tcPr) {
          const gs = getDirectChildrenByLocalName(tcPr, 'gridSpan')[0];
          if (gs) {
            const v = parseInt(gs.getAttributeNS(W_NS, 'val') || gs.getAttribute('w:val') || gs.getAttribute('val') || '1', 10);
            if (v > 1) colspan = v;
          }
          const vm = getDirectChildrenByLocalName(tcPr, 'vMerge')[0];
          if (vm) {
            const v = vm.getAttributeNS(W_NS, 'val') || vm.getAttribute('w:val') || vm.getAttribute('val') || '';
            vMergeVal = v.toLowerCase() === 'restart' ? 'restart' : 'continue';
          }
        }

        let txt = extractWCellText(tc);
        let fromRowspan = false;

        if (vMergeVal === 'restart') {
          for (let k = 0; k < colspan; k++) activeVmerge[colIdx + k] = txt;
        } else if (vMergeVal === 'continue') {
          txt = activeVmerge[colIdx] || '';
          fromRowspan = true;
        } else {
          for (let k = 0; k < colspan; k++) activeVmerge[colIdx + k] = '';
        }

        rowCells.push({ text: txt, colspan, fromRowspan });
        colIdx += colspan;
      }

      if (rowCells.length > 0) logicalRows.push(rowCells);
    }
    return logicalRows;
  }

  function parseDocxXmlToBlocks(xmlStr) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlStr, 'application/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('解析 word/document.xml 失敗，檔案格式可能損毀。');
    }
    const body = doc.getElementsByTagNameNS(W_NS, 'body')[0] || doc.getElementsByTagName('w:body')[0];
    if (!body) throw new Error('找不到 Word 文件主體 (<w:body>)。');

    const blocks = [];
    for (let c = body.firstChild; c; c = c.nextSibling) {
      if (c.nodeType !== 1) continue;
      if (c.localName === 'p') {
        const txt = extractWParagraphText(c);
        if (txt) blocks.push({ type: 'paragraph', text: txt });
      } else if (c.localName === 'tbl') {
        const rows = parseWTable(c);
        if (rows.length > 0) blocks.push({ type: 'table', rows });
      }
    }
    return blocks;
  }

  function extractHtmlCellText(td) {
    const clone = td.cloneNode(true);
    clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    clone.querySelectorAll('p, div, li').forEach((el, idx) => {
      if (idx > 0 || el.previousSibling) el.insertAdjacentText('beforebegin', '\n');
    });
    return (clone.textContent || '')
      .replace(/\u00a0/g, ' ')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .join('\n');
  }

  function parseHtmlTableNode(table) {
    const trs = Array.from(table.querySelectorAll('tr'));
    const activeRowspans = [];
    const logicalRows = [];

    for (const tr of trs) {
      const cells = Array.from(tr.children).filter(el => el.tagName === 'TD' || el.tagName === 'TH');
      const rowCells = [];
      let colIdx = 0;

      const consumeSpans = () => {
        while (activeRowspans[colIdx] && activeRowspans[colIdx].remaining > 0) {
          rowCells.push({ text: activeRowspans[colIdx].text, colspan: 1, fromRowspan: true });
          activeRowspans[colIdx].remaining--;
          colIdx++;
        }
      };

      consumeSpans();
      for (const td of cells) {
        consumeSpans();
        const cs = Math.max(1, parseInt(td.getAttribute('colspan') || '1', 10));
        const rs = Math.max(1, parseInt(td.getAttribute('rowspan') || '1', 10));
        const txt = extractHtmlCellText(td);
        rowCells.push({ text: txt, colspan: cs, fromRowspan: false });
        if (rs > 1) {
          for (let k = 0; k < cs; k++) {
            activeRowspans[colIdx + k] = { remaining: rs - 1, text: txt };
          }
        }
        colIdx += cs;
      }

      if (rowCells.length > 0) logicalRows.push(rowCells);
    }
    return logicalRows;
  }

  function parseHtmlToBlocks(htmlStr) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlStr, 'text/html');
    const blocks = [];

    const walk = (node) => {
      for (let c = node.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) {
          const t = (c.textContent || '').replace(/\u00a0/g, ' ').trim();
          if (t) blocks.push({ type: 'paragraph', text: t });
          continue;
        }
        if (c.nodeType !== 1) continue;
        const tag = c.tagName;
        if (tag === 'STYLE' || tag === 'SCRIPT' || tag === 'HEAD') continue;
        if (tag === 'TABLE') {
          const rows = parseHtmlTableNode(c);
          if (rows.length > 0) blocks.push({ type: 'table', rows });
        } else if (tag === 'P' || /^H[1-6]$/.test(tag) || tag === 'LI') {
          if (c.querySelector('table')) {
            walk(c);
          } else {
            const txt = extractHtmlCellText(c);
            if (txt) {
              txt.split('\n').forEach(ln => {
                if (ln.trim()) blocks.push({ type: 'paragraph', text: ln.trim() });
              });
            }
          }
        } else {
          walk(c);
        }
      }
    };
    walk(doc.body || doc);
    return blocks;
  }

  function parsePlainTextToBlocks(rawText) {
    const lines = String(rawText || '').replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ').split('\n');
    const blocks = [];
    let curTableRows = null;

    const flushTable = () => {
      if (curTableRows && curTableRows.length > 0) {
        blocks.push({ type: 'table', rows: curTableRows });
      }
      curTableRows = null;
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        flushTable();
        continue;
      }
      // Pipe-delimited table row (e.g., "| Name | 涂盛雄 | Birthday | 1963/06/07 |")
      if (line.startsWith('|') && line.endsWith('|') && line.length > 2) {
        // Ignore markdown separator rows like |---|---|
        if (/^\|[\s:-]+(\|[\s:-]+)+\|$/.test(line)) continue;
        const parts = line.slice(1, -1).split('|');
        const cells = parts.map(rawCell => {
          let cs = 1;
          const m = rawCell.match(/<td\s+colspan\s*=\s*(\d+)\s*\/?>/i);
          if (m) cs = Math.max(1, parseInt(m[1], 10));
          const cleaned = rawCell
            .replace(/<td\s+colspan\s*=\s*\d+\s*\/?>/gi, '')
            .replace(/<img[^>]*>/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
          return { text: cleaned, colspan: cs, fromRowspan: false };
        });
        if (!curTableRows) curTableRows = [];
        curTableRows.push(cells);
      } else {
        flushTable();
        const cleanedLine = line.replace(/<img[^>]*>/gi, '').trim();
        if (cleanedLine) blocks.push({ type: 'paragraph', text: cleanedLine });
      }
    }
    flushTable();
    return blocks;
  }

  // --- 3. Semantic Extraction Helpers ---
  function cleanBloodType(s) {
    const raw = String(s || '').trim().toUpperCase();
    if (!raw) return '';
    const hasNeg = /(?:-|NEG(?:ATIVE)?|陰)/.test(raw);
    const hasPos = /(?:\+|POS(?:ITIVE)?|陽)/.test(raw);
    const compact = raw.replace(/\s+/g, '');
    const m = compact.match(/^(AB|A|B|O)([+-])?/);
    if (!m) return '';
    const rh = m[2] || (hasNeg ? '-' : (hasPos ? '+' : '+'));
    return m[1] + rh;
  }

  function cleanGender(s) {
    const t = String(s || '').trim().toUpperCase();
    if (!t) return '';
    if (t.startsWith('F') || t.includes('女')) return 'F';
    if (t.startsWith('M') || t.includes('男')) return 'M';
    return '';
  }

  function extractNumber(s) {
    const m = String(s || '').match(/\d+(?:\.\d+)?/);
    return m ? m[0] : '';
  }

  function formatSerologyMultiline(val) {
    // Normalize inline serology strings where Word/text flattened newlines (e.g. "HBsAg (-)Anti-HBs Ab (-)")
    return String(val || '')
      .replace(/\s*(Anti-HBs|Anti-HBc|HBV\s*(?:DNA|viral)|CMV\s*(?:viral|VL)|EBV\s*(?:Viral|VL))/gi, (m, p1, offset, full) => {
        if (offset === 0 || full[offset - 1] === '\n') return m.trimStart();
        return '\n' + p1;
      })
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .join('\n');
  }

  function isHeaderInfoTable(rows) {
    // Matches 4-column top header table: Name | ... | Birthday | ... / Chart No. | ... | Age | ... / VS | ... | Sex | ...
    let hits = 0;
    for (const row of rows) {
      if (row.length === 4) {
        const k0 = row[0].text.toLowerCase();
        const k2 = row[2].text.toLowerCase();
        if (k0.includes('name') && (k2.includes('birth') || k2.includes('age'))) hits++;
        if (k0.includes('chart') && (k2.includes('age') || k2.includes('sex') || k2.includes('gender'))) hits++;
        if ((k0 === 'vs' || k0.includes('attending')) && (k2 === 'sex' || k2 === 'gender')) hits++;
      }
    }
    return hits >= 2;
  }

  function isEvalOrDonorTable(rows) {
    let score = 0;
    for (const row of rows) {
      const k0 = (row[0] ? row[0].text : '').toLowerCase();
      if (k0 === 'hbv' || k0 === 'hcv' || k0 === 'cmv' || k0 === 'hiv' || k0 === 'vzv') score += 2;
      if (k0.includes('blood type') || k0.includes('toxoplasma') || k0.includes('htlv')) score += 2;
      if (k0 === 'hla' || k0.includes('rejection') || k0.includes('gvhd')) score += 2;
      if (k0.includes('height') && k0.includes('weight')) score += 1;
    }
    return score >= 4;
  }

  function parseHeaderInfoTable(rows, result) {
    for (const row of rows) {
      for (let i = 0; i + 1 < row.length; i += 2) {
        const k = row[i].text.toLowerCase().replace(/[:：]+$/, '').trim();
        const v = row[i + 1].text.trim();
        if (!v) continue;
        if (k === 'name') result.recipient.name = v;
        else if (k.includes('chart')) result.recipient.chartNo = v;
        else if (k === 'age') result.recipient.age = extractNumber(v) || v;
        else if (k === 'sex' || k === 'gender') {
          const g = cleanGender(v);
          if (g) result.recipient.gender = g;
        } else if (k === 'vs' || k.includes('attending')) {
          result.vs = v;
        }
      }
    }
  }

  function parseEvalOrDonorTable(rows, result) {
    // Detect whether table has Donor column (Allo/Haplo) or single patient column (Auto)
    let hasDonor = false;
    for (const row of rows) {
      const joined = row.map(c => c.text).join(' ');
      if (/recipient/i.test(joined) && /donor/i.test(joined)) {
        hasDonor = true;
        break;
      }
      const k0 = (row[0] ? row[0].text : '').toLowerCase();
      const k1 = (row[1] ? row[1].text : '').toLowerCase();
      if (k0 === 'hla' || (['a', 'b', 'c', 'dr', 'dq', 'dp'].includes(k1) && row.length >= 6)) {
        hasDonor = true;
        break;
      }
      if ((k0 === 'hbv' || k0 === 'hcv' || k0 === 'cmv' || k0 === 'hiv') && row.length >= 3) {
        hasDonor = true;
        break;
      }
    }
    if (hasDonor) result.hasDonorTable = true;

    let inHla = false;
    let inEbv = false;

    for (const row of rows) {
      if (row.length < 2) continue;

      // Header row ("", "Recipient", "Donor...")
      if (row.some(c => /^recipient$/i.test(c.text)) && row.some(c => /donor/i.test(c.text))) {
        const donorCell = row.find(c => /donor/i.test(c.text));
        if (donorCell && donorCell.text) result.donor.label = donorCell.text;
        continue;
      }

      const t0 = (row[0] ? row[0].text : '').trim();
      const t1 = (row[1] ? row[1].text : '').trim();
      const k0 = t0.toLowerCase().replace(/[:：]+$/, '').trim();
      const k1 = t1.toLowerCase().replace(/[:：]+$/, '').trim();

      if (k0 === 'hla') inHla = true;
      else if (k0 && k0 !== '') inHla = false;

      if (k0 === 'ebv') inEbv = true;
      else if (k0 && k0 !== '') inEbv = false;

      // Sub-labeled rows: HLA (A/B/C/DR/DQ/DP) or EBV (VCA/Others)
      const isHlaSub = (k0 === 'hla' || (k0 === '' && inHla)) && ['a', 'b', 'c', 'dr', 'dq', 'dp'].includes(k1);
      const isEbvSub = (k0 === 'ebv' || (k0 === '' && inEbv)) && (k1 === 'vca' || k1 === 'others');

      if (isHlaSub) {
        const locus = k1.toUpperCase();
        const vals = row.slice(2).map(c => c.text.trim());
        result.hla[locus] = [vals[0] || '', vals[1] || '', vals[2] || '', vals[3] || ''];
        continue;
      }

      if (isEbvSub) {
        const vals = row.slice(2).map(c => c.text.trim());
        if (k1 === 'vca') {
          if (vals[0]) result.recipient.ebvVca = vals[0];
          if (hasDonor && vals[1]) result.donor.ebvVca = vals[1];
        } else {
          if (vals[0]) result.recipient.ebvOthers = formatSerologyMultiline(vals[0]);
          if (hasDonor && vals[1]) result.donor.ebvOthers = formatSerologyMultiline(vals[1]);
        }
        continue;
      }

      // Standard rows
      const vals = row.slice(1).map(c => c.text.trim());

      if (k0 === 'name') {
        if (vals[0]) result.recipient.name = vals[0];
        if (hasDonor && vals[1]) result.donor.name = vals[1];
      } else if (k0.includes('chart')) {
        if (vals[0]) result.recipient.chartNo = vals[0];
        if (hasDonor && vals[1]) result.donor.chartNo = vals[1];
      } else if (k0 === 'age') {
        if (vals[0]) result.recipient.age = extractNumber(vals[0]) || vals[0];
        if (hasDonor && vals[1]) result.donor.age = extractNumber(vals[1]) || vals[1];
      } else if (k0 === 'gender' || k0 === 'sex') {
        const rg = cleanGender(vals[0]);
        if (rg) result.recipient.gender = rg;
        if (hasDonor && vals[1]) {
          const dg = cleanGender(vals[1]);
          if (dg) result.donor.gender = dg;
        }
      } else if (k0.includes('height') || k0.includes('weight') || k0.includes('bh')) {
        // Per-cell parsing so "?" in donor cells does not shift recipient values
        if (vals.length >= 2) {
          const rH = extractNumber(vals[0]);
          const rW = extractNumber(vals[1]);
          if (rH) result.recipient.height = rH;
          if (rW) result.recipient.weight = rW;
          if (hasDonor && vals.length >= 4) {
            const dH = extractNumber(vals[2]);
            const dW = extractNumber(vals[3]);
            if (dH) result.donor.height = dH;
            if (dW) result.donor.weight = dW;
          }
        } else {
          const nums = vals.join(' ').match(/\d+(?:\.\d+)?/g) || [];
          if (nums[0]) result.recipient.height = nums[0];
          if (nums[1]) result.recipient.weight = nums[1];
          if (hasDonor && nums[2]) result.donor.height = nums[2];
          if (hasDonor && nums[3]) result.donor.weight = nums[3];
        }
      } else if (k0.includes('blood')) {
        const rBt = cleanBloodType(vals[0]);
        if (rBt) result.recipient.bloodType = rBt;
        if (hasDonor && vals[1]) {
          const dBt = cleanBloodType(vals[1]);
          if (dBt) result.donor.bloodType = dBt;
        }
      } else if (k0.includes('rejection')) {
        const nonEmpty = vals.filter(Boolean);
        if (nonEmpty.length) result.hla.rejectionManual = nonEmpty[nonEmpty.length - 1];
      } else if (k0.includes('gvhd')) {
        const nonEmpty = vals.filter(Boolean);
        if (nonEmpty.length) result.hla.gvhdManual = nonEmpty[nonEmpty.length - 1];
      } else if (k0.includes('test date') || k0.includes('lab date')) {
        if (vals[0]) result.recipient.testDate = vals[0];
        if (hasDonor && vals[1]) result.donor.testDate = vals[1];
      } else if (k0 === 'hbv') {
        if (vals[0]) result.recipient.hbv = formatSerologyMultiline(vals[0]);
        if (hasDonor && vals[1]) result.donor.hbv = formatSerologyMultiline(vals[1]);
      } else if (k0 === 'hcv') {
        if (vals[0]) result.recipient.hcv = vals[0];
        if (hasDonor && vals[1]) result.donor.hcv = vals[1];
      } else if (k0 === 'cmv') {
        if (vals[0]) result.recipient.cmv = formatSerologyMultiline(vals[0]);
        if (hasDonor && vals[1]) result.donor.cmv = formatSerologyMultiline(vals[1]);
      } else if (k0 === 'hiv') {
        if (vals[0]) result.recipient.hiv = vals[0];
        if (hasDonor && vals[1]) result.donor.hiv = vals[1];
      } else if (k0.includes('htlv')) {
        if (vals[0]) result.recipient.htlv = vals[0];
        if (hasDonor && vals[1]) result.donor.htlv = vals[1];
      } else if (k0 === 'vzv') {
        if (vals[0]) result.recipient.vzv = vals[0];
        if (hasDonor && vals[1]) result.donor.vzv = vals[1];
      } else if (k0.includes('sts') || k0.includes('rpr')) {
        if (vals[0]) result.recipient.rpr = vals[0];
        if (hasDonor && vals[1]) result.donor.rpr = vals[1];
      } else if (k0.includes('toxo')) {
        if (vals[0]) result.recipient.toxo = vals[0];
        if (hasDonor && vals[1]) result.donor.toxo = vals[1];
      } else if (k0.includes('other comorbid')) {
        if (vals[0]) result.recipient.otherComorb = vals[0];
        if (hasDonor && vals[1]) result.donor.otherComorb = vals[1];
      }
    }
  }

  function detectHeadingSection(text) {
    const t = text.replace(/[:：]+$/, '').trim().toLowerCase();
    if (/^(?:definite\s+)?diagnosis$/.test(t)) return 'diagnosis';
    if (/^brief\s+history/.test(t)) return 'history';
    if (/^(?:current|disease)\s+status$/.test(t)) return 'status';
    if (/^following\s+treatment/.test(t)) return 'following';
    if (/^(?:other\s+)?comorbidit(?:y|ies)$/.test(t)) return 'comorbidity';
    if (/^pre-?hsct\s+evaluation/.test(t)) return 'eval';
    if (/^donor\s+data/.test(t)) return 'donor';
    if (/^hsct\s+plan$/.test(t)) return 'plan';
    if (/^suggestion/.test(t)) return 'suggestion';
    return null;
  }

  function matchPresetId(mode, condText) {
    const s = String(condText || '').toLowerCase().replace(/\s+/g, '');
    if (!s || !mode) return null;
    if (mode === 'auto') {
      if (s.includes('beeam') || s.includes('be-eam')) return 'auto_beeam';
      if (s.includes('r-beam') || s.includes('rbeam')) return 'auto_rbeam';
      if (s.includes('beam')) return 'auto_beam';
      if (s.includes('mel200') || s.includes('melphalan200') || s === 'hdmel' || s === 'mel') return 'auto_mel200';
      if (s.includes('tt-bcnu') || s.includes('ttbcnu') || (s.includes('thiotepa') && s.includes('bcnu'))) return 'auto_tt_bcnu';
      if (s.includes('gembumel')) return 'auto_gembumel';
      if (s.includes('bucy')) return 'auto_bucy';
    } else if (mode === 'allo') {
      if (s.includes('flu5bu2cy1') || s.includes('flubucy')) return 'allo_ric_flu5bu2cy1';
      if (s.includes('bu4cy2') || s.includes('bucy')) return 'allo_mac_bu4cy2';
      if (s.includes('tbf3') || s.includes('thiotepa')) return 'allo_tbf3';
      if (s.includes('tbi-cy') || s.includes('tbicy')) return 'allo_mac_tbicy';
      if (s.includes('giac')) return 'allo_giac_mac';
      if (s.includes('flumel') || s.includes('flu/mel')) return 'allo_ric_flumel';
    } else if (mode === 'ptcy') {
      if (s.includes('tbf')) return 'ptcy_tbf2';
      if (s.includes('bu3') || s.includes('mac')) return 'ptcy_mac_flubu3';
      if (s.includes('flu/bu2') || s.includes('flubu2')) return 'ptcy_ric_flubu2';
      if (s.includes('flu/cy/tbi') || s.includes('flucytbi')) return 'ptcy_ric_flucytbi';
    }
    return null;
  }

  function parseCandidateBlocks(blocks) {
    const result = {
      recipient: {},
      donor: {},
      hla: {},
      vs: '',
      diagnosis: '',
      status: '',
      comorbidity: '',
      plan: {
        transplantType: '',
        conditioningRegimen: '',
        gvhdProphylaxis: '',
        wantedDay0: ''
      },
      hasDonorTable: false,
      detectedMode: null,
      suggestedPresetId: null,
      summary: []
    };

    const diagLines = [];
    const statusLines = [];
    const comorbLines = [];
    let section = '';

    for (const blk of blocks) {
      if (blk.type === 'table') {
        if (isHeaderInfoTable(blk.rows)) {
          parseHeaderInfoTable(blk.rows, result);
        } else if (isEvalOrDonorTable(blk.rows)) {
          parseEvalOrDonorTable(blk.rows, result);
        }
        // Any table ends an open text section (e.g., Diagnosis / Status / Comorbidity)
        section = '';
        continue;
      }

      const txt = blk.text.trim();
      if (!txt) continue;

      // Check standalone heading
      const heading = detectHeadingSection(txt);
      if (heading) {
        section = heading;
        continue;
      }

      // Check inline "Heading: content" (e.g., "Definite Diagnosis: AML..." or "Current Status: CR")
      const inlineMatch = txt.match(/^(Definite\s+Diagnosis|Diagnosis|Current\s+Status|Disease\s+Status|Other\s+Comorbidit(?:y|ies)|Comorbidity)\s*[:：]\s*(.+)$/i);
      if (inlineMatch) {
        const sec = detectHeadingSection(inlineMatch[1]);
        const val = inlineMatch[2].trim();
        section = sec || '';
        if (sec === 'diagnosis' && val) diagLines.push(val);
        else if (sec === 'status' && val) statusLines.push(val);
        else if (sec === 'comorbidity' && val) comorbLines.push(val);
        continue;
      }

      // Check HSCT plan key-value lines (even if "HSCT plan" heading was omitted)
      const planTx = txt.match(/^Transplant\s*type\s*[:：]\s*(.+)$/i);
      if (planTx) { result.plan.transplantType = planTx[1].trim(); section = 'plan'; continue; }
      const planCond = txt.match(/^Conditioning(?:\s+regimen)?\s*[:：]\s*(.+)$/i);
      if (planCond) { result.plan.conditioningRegimen = planCond[1].trim(); section = 'plan'; continue; }
      const planGvhd = txt.match(/^(?:Acute\s+)?GVHD\s+prophylaxis\s*[:：]\s*(.+)$/i);
      if (planGvhd) { result.plan.gvhdProphylaxis = planGvhd[1].trim(); section = 'plan'; continue; }
      const planD0 = txt.match(/^Wanted\s+Day\s*0\s*[:：]\s*(.+)$/i);
      if (planD0) { result.plan.wantedDay0 = planD0[1].trim(); section = 'plan'; continue; }

      if (section === 'diagnosis') {
        diagLines.push(txt);
      } else if (section === 'status') {
        statusLines.push(txt);
      } else if (section === 'comorbidity') {
        comorbLines.push(txt);
      }
    }

    result.diagnosis = diagLines.join('\n').trim();
    result.status = statusLines.join(' ').trim();
    result.comorbidity = comorbLines.join('\n').trim();

    // Determine transplant mode: auto / ptcy / allo
    const txLower = result.plan.transplantType.toLowerCase();
    const gvhdLower = result.plan.gvhdProphylaxis.toLowerCase();
    if (/\bauto\b|auto-?pbsct|autologous/i.test(txLower)) {
      result.detectedMode = 'auto';
    } else if (/\bptcy\b|post-?transplant\s+cy/i.test(gvhdLower) || /\bhaplo/i.test(txLower)) {
      result.detectedMode = /\bptcy\b/i.test(gvhdLower) ? 'ptcy' : (/\bgiac\b/i.test(result.plan.conditioningRegimen) ? 'allo' : 'ptcy');
    } else if (/\ballo\b|mud|mmud|msd|matched/i.test(txLower) || result.hasDonorTable) {
      result.detectedMode = 'allo';
    } else if (Object.keys(result.recipient).length > 0 && !result.hasDonorTable) {
      result.detectedMode = 'auto';
    }

    // Match specific conditioning preset if unambiguous
    if (result.detectedMode && result.plan.conditioningRegimen) {
      result.suggestedPresetId = matchPresetId(result.detectedMode, result.plan.conditioningRegimen);
    }

    // Build human-readable summary of extracted sections
    if (result.recipient.name || result.recipient.chartNo) result.summary.push('病人基本資料');
    if (result.vs) result.summary.push(`VS(${result.vs})`);
    if (result.diagnosis) result.summary.push('Diagnosis');
    if (result.status) result.summary.push('Status');
    if (result.comorbidity) result.summary.push('Comorbidity');
    if (result.recipient.hbv || result.recipient.cmv || result.recipient.bloodType) result.summary.push('Candidate 檢驗表');
    if (Object.keys(result.hla).some(k => ['A', 'B', 'C', 'DR', 'DQ', 'DP'].includes(k))) result.summary.push('HLA');
    if (result.plan.transplantType || result.plan.conditioningRegimen) result.summary.push('HSCT Plan');

    return result;
  }

  // --- 4. Public Entry Points ---
  async function parseFile(file) {
    if (!file) throw new Error('未選擇檔案');
    const name = (file.name || '').toLowerCase();

    if (name.endsWith('.docx')) {
      const buf = await file.arrayBuffer();
      const xmlStr = await extractDocxDocumentXml(buf);
      const blocks = parseDocxXmlToBlocks(xmlStr);
      return parseCandidateBlocks(blocks);
    }
    if (name.endsWith('.html') || name.endsWith('.htm')) {
      const htmlStr = await file.text();
      const blocks = parseHtmlToBlocks(htmlStr);
      return parseCandidateBlocks(blocks);
    }
    if (name.endsWith('.txt') || name.endsWith('.md')) {
      const text = await file.text();
      const blocks = parsePlainTextToBlocks(text);
      return parseCandidateBlocks(blocks);
    }
    if (name.endsWith('.doc')) {
      throw new Error('不支援舊版二進位 .doc 格式，請先於 Word 或 Google Docs「另存新檔為 .docx」後再上傳！');
    }
    throw new Error('不支援的檔案格式，請上傳 .docx（Word / Google Docs）、.html 或 .txt/.md 檔案。');
  }

  function parseRichContent(rawText, rawHtml) {
    if (rawHtml && /<table[\s>]/i.test(rawHtml)) {
      const blocks = parseHtmlToBlocks(rawHtml);
      return parseCandidateBlocks(blocks);
    }
    const blocks = parsePlainTextToBlocks(rawText);
    return parseCandidateBlocks(blocks);
  }

  return {
    parseFile,
    parseRichContent,
    parseDocxXmlToBlocks,
    parseHtmlToBlocks,
    parsePlainTextToBlocks,
    parseCandidateBlocks,
    extractDocxDocumentXml
  };
})();
