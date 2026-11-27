// Zero-dependency Pure-JS OpenXML (.docx) Generator
// Produces authentic, 100% editable Microsoft Word .docx files matching hospital HSCT protocol layout

window.BMTDocx = (function () {
  // --- CRC-32 & Minimal ZIP Store Builder (ISO/IEC 29500 OPC compliant) ---
  const CRC_TABLE = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    CRC_TABLE[i] = c >>> 0;
  }

  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function strToBytes(str) {
    return new TextEncoder().encode(str);
  }

  function b64ToBytes(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  function buildZip(files) {
    // files: Array<{ name: string, data: Uint8Array }>
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const f of files) {
      const nameBytes = strToBytes(f.name);
      const data = f.data;
      const crc = crc32(data);
      const size = data.length;

      // Local File Header (30 bytes + name)
      const lh = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true); // signature
      lv.setUint16(4, 20, true);         // version needed 2.0
      lv.setUint16(6, 0x0800, true);     // UTF-8 flag
      lv.setUint16(8, 0, true);          // method 0 (STORE)
      lv.setUint16(10, 0, true);         // mod time
      lv.setUint16(12, 0x5421, true);    // mod date
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      lh.set(nameBytes, 30);

      localParts.push(lh, data);

      // Central Directory Header (46 bytes + name)
      const ch = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0x5421, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      ch.set(nameBytes, 46);
      centralParts.push(ch);

      offset += lh.length + data.length;
    }

    const centralSize = centralParts.reduce((s, a) => s + a.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    const totalLen = offset + centralSize + 22;
    const out = new Uint8Array(totalLen);
    let pos = 0;
    for (const p of localParts) { out.set(p, pos); pos += p.length; }
    for (const p of centralParts) { out.set(p, pos); pos += p.length; }
    out.set(eocd, pos);
    return out;
  }

  // --- XML Escaping & WordprocessingML Helpers ---
  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  const FONT_EN = 'Calibri';
  const FONT_ZH = '微軟正黑體';
  const SZ_SCHED = 20;         // 10 pt (conditioning schedule table)
  const SZ_BODY = 24;          // 12 pt
  const SZ_TITLE = 28;         // 14 pt (section headings)
  const SZ_MAIN_TITLE = 48;    // 24 pt (Page 1 main title)
  const LINE_EXACT_18PT = 360; // 18 pt exact line height (18 * 20 twips)
  const LINE_MIN_16PT = 320;   // 16 pt minimum line height for Page 3 (16 * 20 twips)
  const LINE_1_15X = 276;      // 1.15x line spacing (1.15 * 240)

  function runXml(text, opts = {}) {
    const sz = opts.sz || SZ_BODY;
    const rPr = [
      `<w:rFonts w:ascii="${FONT_EN}" w:hAnsi="${FONT_EN}" w:eastAsia="${FONT_ZH}" w:cs="${FONT_EN}"/>`,
      `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`,
      opts.bold ? '<w:b/><w:bCs/>' : '',
      opts.italic ? '<w:i/>' : '',
      opts.color ? `<w:color w:val="${opts.color}"/>` : ''
    ].join('');

    const lines = String(text ?? '').split('\n');
    const inner = lines.map((line, idx) => {
      const br = idx > 0 ? '<w:br/>' : '';
      return `${br}<w:t xml:space="preserve">${esc(line)}</w:t>`;
    }).join('');
    return `<w:r><w:rPr>${rPr}</w:rPr>${inner}</w:r>`;
  }

  function pXml(runs, opts = {}) {
    const pageBreak = opts.pageBreakBefore ? '<w:pageBreakBefore/>' : '';
    const align = opts.align ? `<w:jc w:val="${opts.align}"/>` : '';
    const before = opts.spaceBefore !== undefined ? opts.spaceBefore : 0;
    const after = opts.spaceAfter !== undefined ? opts.spaceAfter : 0;
    const line = opts.line || LINE_EXACT_18PT;
    const lineRule = opts.lineRule || 'exact';
    const indent = opts.indentLeft ? `<w:ind w:left="${opts.indentLeft}"/>` : '';
    const borderBottom = opts.borderBottom
      ? `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="1774D3"/></w:pBdr>`
      : '';
    const rContent = typeof runs === 'string' ? runXml(runs, opts) : runs.join('');
    return `<w:p><w:pPr>${pageBreak}${align}<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="${lineRule}"/>${indent}${borderBottom}</w:pPr>${rContent}</w:p>`;
  }

  function cellXml(contentXml, opts = {}) {
    const w = opts.width ? `<w:tcW w:w="${opts.width}" w:type="dxa"/>` : '<w:tcW w:w="0" w:type="auto"/>';
    const gs = opts.colspan && opts.colspan > 1 ? `<w:gridSpan w:val="${opts.colspan}"/>` : '';
    const vm = opts.vMerge === 'restart' ? '<w:vMerge w:val="restart"/>' : (opts.vMerge === 'continue' ? '<w:vMerge/>' : '');
    const shd = opts.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${opts.fill}"/>` : '';
    const vAlign = `<w:vAlign w:val="${opts.vAlign || 'center'}"/>`;
    const padV = opts.padV !== undefined ? opts.padV : 18;
    const padH = opts.padH !== undefined ? opts.padH : 75;
    const mar = `<w:tcMar><w:top w:w="${padV}" w:type="dxa"/><w:bottom w:w="${padV}" w:type="dxa"/><w:left w:w="${padH}" w:type="dxa"/><w:right w:w="${padH}" w:type="dxa"/></w:tcMar>`;
    return `<w:tc><w:tcPr>${w}${gs}${vm}${shd}${vAlign}${mar}</w:tcPr>${contentXml}</w:tc>`;
  }

  function tableXml(rowsXml, totalWidth = 10466, gridCols = null) {
    const layoutType = gridCols ? 'fixed' : 'autofit';
    const gridXml = gridCols
      ? `<w:tblGrid>${gridCols.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`
      : '';
    return `<w:tbl>
      <w:tblPr>
        <w:tblW w:w="${totalWidth}" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="666666"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="666666"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="666666"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="666666"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>
        </w:tblBorders>
        <w:tblLayout w:type="${layoutType}"/>
      </w:tblPr>
      ${gridXml}
      ${rowsXml.join('')}
    </w:tbl>`;
  }

  const ROYAL_BLUE = '0007FF';
  const PURE_RED = 'FF0000';

  function positiveBoldParagraph(text, opts = {}) {
    const tokens = window.BMTCalc.tokenizePositiveBold(text);
    const runs = [];
    for (const tk of tokens) {
      if (tk.text === '\n') {
        runs.push('<w:r><w:br/></w:r>');
      } else {
        runs.push(runXml(tk.text, { sz: SZ_BODY, ...opts, bold: Boolean(opts.bold || tk.bold) }));
      }
    }
    if (!runs.length) runs.push(runXml('', { sz: SZ_BODY }));
    return pXml(runs, { spaceBefore: 0, spaceAfter: 0, line: LINE_EXACT_18PT, ...opts });
  }

  function directionRatioParagraph(text, numColor) {
    const s = String(text || '');
    const m = s.match(/^(.*?)(\d+\s*\/\s*\d+)(.*)$/);
    if (!m) return pXml(s, { sz: SZ_BODY, align: 'center', spaceBefore: 0, spaceAfter: 0, line: LINE_EXACT_18PT });
    const runs = [];
    if (m[1]) runs.push(runXml(m[1], { sz: SZ_BODY }));
    runs.push(runXml(m[2], { sz: SZ_BODY, bold: true, color: numColor }));
    if (m[3]) runs.push(runXml(m[3], { sz: SZ_BODY }));
    return pXml(runs, { align: 'center', spaceBefore: 0, spaceAfter: 0, line: LINE_EXACT_18PT });
  }

  function richOrderP(text, opts = {}) {
    if (String(text || '').startsWith('# [提醒]')) {
      return pXml(text, { sz: SZ_BODY, bold: true, color: PURE_RED, ...opts });
    }
    const tokens = window.BMTCalc.tokenizeOrderDates(text);
    const runs = tokens.map(tk =>
      runXml(tk.text, {
        sz: opts.sz || SZ_BODY,
        bold: Boolean(opts.bold || tk.royalBlue),
        color: tk.red ? PURE_RED : (tk.royalBlue ? ROYAL_BLUE : opts.color)
      })
    );
    return pXml(runs, opts);
  }

  function buildPatientTable(state, calc) {
    const r = state.recipient;
    const d = state.donor;
    const isAuto = state.mode === 'auto';
    const rows = [];
    const cp = (txt, opts = {}) => pXml(txt, { sz: SZ_BODY, spaceBefore: 0, spaceAfter: 0, line: LINE_EXACT_18PT, ...opts });
    const cpPos = (txt, opts = {}) => positiveBoldParagraph(txt, opts);

    // Fixed column widths matching 2.5, 2.5, 3.4, 3.4, 3.4, 3.4 cm (1 cm = 1440/2.54 = 566.93 dxa)
    const W_LBL = 1417; // 2.5 cm
    const W_VAL = 1928; // 3.4 cm
    const W_LBL2 = W_LBL * 2; // 2834 dxa (5.0 cm)
    const W_VAL2 = W_VAL * 2; // 3856 dxa (6.8 cm)
    const W_VAL4 = W_VAL * 4; // 7712 dxa (13.6 cm)
    const W_TOTAL = W_LBL2 + W_VAL4; // 10546 dxa (18.6 cm)

    if (isAuto) {
      // 4-column Auto table: [2.5cm, 2.5cm, 6.8cm, 6.8cm] = 18.6cm
      const addRow2 = (label, val, opts = {}, boldPos = false) => {
        rows.push(`<w:tr>
          ${cellXml(cp(label, { bold: true }), { colspan: 2, width: W_LBL2, fill: 'EFEFEF' })}
          ${cellXml(boldPos ? cpPos(val, opts) : cp(val, opts), { colspan: 2, width: W_VAL4 })}
        </w:tr>`);
      };
      addRow2('Name', r.name, { bold: true });
      addRow2('Chart No.', r.chartNo);
      addRow2('Age', r.age);
      addRow2('Gender', r.gender);
      rows.push(`<w:tr>
        ${cellXml(cp('Height(cm) | Weight(kg)', { bold: true }), { colspan: 2, width: W_LBL2, fill: 'EFEFEF' })}
        ${cellXml(cp(r.height, { align: 'center' }), { width: W_VAL2 })}
        ${cellXml(cp(r.weight, { align: 'center' }), { width: W_VAL2 })}
      </w:tr>`);
      addRow2('Blood type', r.bloodType, { bold: true });
      addRow2('Test date', r.testDate);
      addRow2('HBV', r.hbv, {}, true);
      addRow2('HCV', r.hcv, {}, true);
      addRow2('CMV', r.cmv, {}, true);
      rows.push(`<w:tr>
        ${cellXml(cp('EBV', { bold: true }), { width: W_LBL, fill: 'EFEFEF', vMerge: 'restart' })}
        ${cellXml(cp('VCA', { bold: true }), { width: W_LBL, fill: 'EFEFEF' })}
        ${cellXml(cpPos(r.ebvVca), { colspan: 2, width: W_VAL4 })}
      </w:tr>`);
      rows.push(`<w:tr>
        ${cellXml(cp(''), { width: W_LBL, fill: 'EFEFEF', vMerge: 'continue' })}
        ${cellXml(cp('Others', { bold: true }), { width: W_LBL, fill: 'EFEFEF' })}
        ${cellXml(cpPos(r.ebvOthers), { colspan: 2, width: W_VAL4 })}
      </w:tr>`);
      addRow2('HIV', r.hiv, {}, true);
      addRow2('HTLV1+2', r.htlv, {}, true);
      addRow2('VZV', r.vzv, {}, true);
      addRow2('STS-RPR', r.rpr, {}, true);
      addRow2('Toxoplasma', r.toxo, {}, true);
      addRow2('Other comorbidities', r.otherComorb);
      return tableXml(rows, W_TOTAL, [W_LBL, W_LBL, W_VAL2, W_VAL2]);
    }

    // 6-column Allo / PTCy table: [2.5cm, 2.5cm, 3.4cm, 3.4cm, 3.4cm, 3.4cm] = 18.6cm (10546 dxa)
    const addDualRow = (label, rVal, dVal, opts = {}, boldPos = false) => {
      rows.push(`<w:tr>
        ${cellXml(cp(label, { bold: true }), { colspan: 2, width: W_LBL2, fill: 'EFEFEF' })}
        ${cellXml(boldPos ? cpPos(rVal, opts) : cp(rVal, opts), { colspan: 2, width: W_VAL2 })}
        ${cellXml(boldPos ? cpPos(dVal, opts) : cp(dVal, opts), { colspan: 2, width: W_VAL2 })}
      </w:tr>`);
    };

    rows.push(`<w:tr>
      ${cellXml(cp(''), { colspan: 2, width: W_LBL2, fill: 'D9D9D9' })}
      ${cellXml(cp('Recipient', { bold: true, align: 'center', sz: SZ_BODY }), { colspan: 2, width: W_VAL2, fill: 'D9D9D9' })}
      ${cellXml(cp(d.label || 'Donor', { bold: true, align: 'center', sz: SZ_BODY }), { colspan: 2, width: W_VAL2, fill: 'D9D9D9' })}
    </w:tr>`);

    addDualRow('Name', r.name, d.name, { bold: true, align: 'center' });
    addDualRow('Chart number', r.chartNo, d.chartNo, { align: 'center' });
    addDualRow('Age', r.age, d.age, { align: 'center' });
    addDualRow('Gender', r.gender, d.gender, { align: 'center' });
    rows.push(`<w:tr>
      ${cellXml(cp('Height(cm) | Weight(kg)', { bold: true }), { colspan: 2, width: W_LBL2, fill: 'EFEFEF' })}
      ${cellXml(cp(r.height, { align: 'center' }), { width: W_VAL })}
      ${cellXml(cp(r.weight, { align: 'center' }), { width: W_VAL })}
      ${cellXml(cp(d.height, { align: 'center' }), { width: W_VAL })}
      ${cellXml(cp(d.weight, { align: 'center' }), { width: W_VAL })}
    </w:tr>`);
    addDualRow('Blood type', r.bloodType, d.bloodType, { bold: true, align: 'center' });

    // HLA A, B, C, DR, DQ, DP with mismatch highlights (Recipient=Red FF0000/GvHD, Donor=Royal Blue 0007FF/Rejection)
    const loci = ['A', 'B', 'C', 'DR', 'DQ', 'DP'];
    loci.forEach((loc, idx) => {
      const vals = state.hla[loc] || ['', '', '', ''];
      const mm = calc.hlaCalc ? calc.hlaCalc.loci[loc] : {};
      rows.push(`<w:tr>
        ${cellXml(cp(idx === 0 ? 'HLA' : '', { bold: true, align: 'center' }), { width: W_LBL, fill: 'EFEFEF', vMerge: idx === 0 ? 'restart' : 'continue' })}
        ${cellXml(cp(loc, { bold: true, align: 'center' }), { width: W_LBL, fill: 'EFEFEF' })}
        ${cellXml(cp(vals[0], { align: 'center', bold: mm.r1Mismatch, color: mm.r1Mismatch ? PURE_RED : undefined }), { width: W_VAL })}
        ${cellXml(cp(vals[1], { align: 'center', bold: mm.r2Mismatch, color: mm.r2Mismatch ? PURE_RED : undefined }), { width: W_VAL })}
        ${cellXml(cp(vals[2], { align: 'center', bold: mm.d1Mismatch, color: mm.d1Mismatch ? ROYAL_BLUE : undefined }), { width: W_VAL })}
        ${cellXml(cp(vals[3], { align: 'center', bold: mm.d2Mismatch, color: mm.d2Mismatch ? ROYAL_BLUE : undefined }), { width: W_VAL })}
      </w:tr>`);
    });

    rows.push(`<w:tr>
      ${cellXml(cp('Rejection direction:', { bold: true }), { colspan: 2, width: W_LBL2, fill: 'EFEFEF' })}
      ${cellXml(cp(''), { colspan: 2, width: W_VAL2 })}
      ${cellXml(directionRatioParagraph(calc.hlaCalc ? calc.hlaCalc.rejectionText : '', ROYAL_BLUE), { colspan: 2, width: W_VAL2 })}
    </w:tr>`);
    rows.push(`<w:tr>
      ${cellXml(cp('GvHD direction:', { bold: true }), { colspan: 2, width: W_LBL2, fill: 'EFEFEF' })}
      ${cellXml(cp(''), { colspan: 2, width: W_VAL2 })}
      ${cellXml(directionRatioParagraph(calc.hlaCalc ? calc.hlaCalc.gvhdText : '', PURE_RED), { colspan: 2, width: W_VAL2 })}
    </w:tr>`);
    addDualRow('Test date', r.testDate, d.testDate, { align: 'center' });
    addDualRow('HBV', r.hbv, d.hbv, {}, true);
    addDualRow('HCV', r.hcv, d.hcv, {}, true);
    addDualRow('CMV', r.cmv, d.cmv, {}, true);
    rows.push(`<w:tr>
      ${cellXml(cp('EBV', { bold: true }), { width: W_LBL, fill: 'EFEFEF', vMerge: 'restart' })}
      ${cellXml(cp('VCA', { bold: true }), { width: W_LBL, fill: 'EFEFEF' })}
      ${cellXml(cpPos(r.ebvVca), { colspan: 2, width: W_VAL2 })}
      ${cellXml(cpPos(d.ebvVca), { colspan: 2, width: W_VAL2 })}
    </w:tr>`);
    rows.push(`<w:tr>
      ${cellXml(cp(''), { width: W_LBL, fill: 'EFEFEF', vMerge: 'continue' })}
      ${cellXml(cp('Others', { bold: true }), { width: W_LBL, fill: 'EFEFEF' })}
      ${cellXml(cpPos(r.ebvOthers), { colspan: 2, width: W_VAL2 })}
      ${cellXml(cpPos(d.ebvOthers), { colspan: 2, width: W_VAL2 })}
    </w:tr>`);
    addDualRow('HIV', r.hiv, d.hiv, {}, true);
    addDualRow('HTLV1+2', r.htlv, d.htlv, {}, true);
    addDualRow('VZV', r.vzv, d.vzv, {}, true);
    addDualRow('STS-RPR', r.rpr, d.rpr, {}, true);
    addDualRow('Toxoplasma', r.toxo, d.toxo, {}, true);
    addDualRow('Other comorbidities', r.otherComorb, d.otherComorb);

    return tableXml(rows, W_TOTAL, [W_LBL, W_LBL, W_VAL, W_VAL, W_VAL, W_VAL]);
  }

  function buildScheduleTable(calc) {
    const days = calc.scheduleDays;
    const labelW = 1900;
    const colW = Math.floor((10466 - labelW) / Math.max(1, days.length));
    const cp = (txt, opts = {}) => pXml(txt, { sz: SZ_SCHED, align: 'center', spaceBefore: 0, spaceAfter: 0, line: LINE_MIN_16PT, lineRule: 'atLeast', ...opts });
    const sc = (content, opts = {}) => cellXml(content, { padV: 18, padH: 30, ...opts });
    const rows = [];

    // Day row
    rows.push(`<w:tr>
      ${sc(cp('Day', { bold: true, align: 'left' }), { width: labelW, fill: 'FFF2CC' })}
      ${days.map(d => sc(cp(d.day > 0 ? `+${d.day}` : String(d.day), { bold: true, color: d.day === 0 ? PURE_RED : undefined }), { width: colW, fill: d.day === 0 ? 'FCE4D6' : 'FFF2CC' })).join('')}
    </w:tr>`);

    // Weekday row
    rows.push(`<w:tr>
      ${sc(cp('Week Days', { bold: true, align: 'left' }), { width: labelW, fill: 'EFEFEF' })}
      ${days.map(d => sc(cp(d.weekday), { width: colW, fill: d.day === 0 ? 'FCE4D6' : 'EFEFEF' })).join('')}
    </w:tr>`);

    // Date row
    rows.push(`<w:tr>
      ${sc(cp('Date', { bold: true, align: 'left' }), { width: labelW, fill: 'EFEFEF' })}
      ${days.map(d => sc(cp(d.dateStr, { bold: d.day === 0 }), { width: colW, fill: d.day === 0 ? 'FCE4D6' : 'EFEFEF' })).join('')}
    </w:tr>`);

    // Active drug rows
    for (const row of calc.scheduleRows) {
      rows.push(`<w:tr>
        ${sc(cp(row.name, { bold: true, align: 'left' }), { width: labelW })}
        ${days.map(d => {
          const hit = row.days.has(d.day);
          return sc(cp(hit ? 'V' : '', { bold: true, color: hit ? '1774D3' : undefined }), { width: colW, fill: hit ? 'E8F1FB' : undefined });
        }).join('')}
      </w:tr>`);
    }

    // Basic IVF row
    rows.push(`<w:tr>
      ${sc(cp('Basic IVF(ml)', { bold: true, align: 'left' }), { width: labelW, fill: 'F7F7F7' })}
      ${days.map(d => sc(cp(String(d.ivf)), { width: colW, fill: 'F7F7F7' })).join('')}
    </w:tr>`);

    return tableXml(rows, 10466);
  }

  function buildAboImageParagraph() {
    // 6.5 inches wide x ~3.1 inches tall (in EMUs: 1 inch = 914400)
    // Explicitly use lineRule="auto" so the inline image is NOT clipped by the 18pt exact line height!
    const cx = 5943600;
    const cy = 2850000;
    return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="80" w:after="80" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0"
        xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
        xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
        xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
        xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <wp:extent cx="${cx}" cy="${cy}"/>
        <wp:docPr id="1" name="ABO Transfusion Guideline Table"/>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic>
              <pic:nvPicPr><pic:cNvPr id="0" name="image1.jpg"/><pic:cNvPicPr/></pic:nvPicPr>
              <pic:blipFill><a:blip r:embed="rIdAboImg"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
              <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing></w:r></w:p>`;
  }

  function generateDocxBytes(state, calc) {
    const includeAboImg = state.mode !== 'auto' && typeof window.ABO_TABLE_IMAGE_B64 === 'string' && window.ABO_TABLE_IMAGE_B64.length > 0;
    const body = [];

    // Page 1: Main Title (24pt, 1.15x line spacing) + Patient / Donor Table ONLY
    body.push(pXml(calc.title, { sz: SZ_MAIN_TITLE, bold: true, align: 'center', color: '1774D3', line: LINE_1_15X, lineRule: 'auto', spaceBefore: 0, spaceAfter: 80 }));
    body.push(buildPatientTable(state, calc));

    // Page 2: Section (1) General measurement order
    body.push(pXml('(1) General measurement order', { sz: SZ_TITLE, bold: true, color: '1774D3', borderBottom: true, pageBreakBefore: true, spaceBefore: 0, spaceAfter: 80 }));
    body.push(pXml('# Diagnosis:', { bold: true }));
    if (state.diagnosis && state.diagnosis.trim()) {
      state.diagnosis.trim().split('\n').forEach(line => body.push(pXml(line, { bold: true, color: ROYAL_BLUE, spaceBefore: 10, spaceAfter: 20 })));
    }
    body.push(pXml('# Comorbidity:', { bold: true, spaceBefore: 60 }));
    if (state.comorbidity && state.comorbidity.trim()) {
      state.comorbidity.trim().split('\n').forEach(line => body.push(pXml(line, { bold: true, color: ROYAL_BLUE, spaceBefore: 10, spaceAfter: 20 })));
    } else {
      body.push(pXml('Nil', { bold: true, color: ROYAL_BLUE, spaceBefore: 10, spaceAfter: 20 }));
    }
    body.push(pXml([runXml('# Status: ', { bold: true }), runXml(state.status || '', { bold: true, color: ROYAL_BLUE })]));
    body.push(pXml([runXml('# Allergy: ', { bold: true }), runXml(state.allergy || 'Nil', { bold: true, color: ROYAL_BLUE })]));
    body.push(pXml([runXml('# Vital signs, I/O, BW, AG, Diet: ', { bold: true }), runXml('as ward routine', { bold: true, color: ROYAL_BLUE })]));
    const admDayNum = BMTCalc.fmtDayLabel(state.admissionD).slice(1);
    body.push(pXml([
      runXml(`# Admission to ${state.ward} on D`, { bold: true }),
      runXml(admDayNum, { bold: true, color: ROYAL_BLUE }),
      runXml(': ', { bold: true }),
      runXml(calc.admDateStr, { bold: true, color: ROYAL_BLUE }),
      runXml(', and D', { bold: true }),
      runXml('0', { bold: true, color: ROYAL_BLUE }),
      runXml(': ', { bold: true }),
      runXml(calc.d0DateStr, { bold: true, color: ROYAL_BLUE })
    ]));
    body.push(pXml([runXml('# Conditioning: ', { bold: true }), runXml(state.conditioningName || '', { bold: true, color: ROYAL_BLUE })]));
    if (state.mode !== 'auto' && state.gvhdProphylaxis) {
      body.push(pXml([runXml('# Acute GVHD prophylaxis: ', { bold: true }), runXml(state.gvhdProphylaxis, { bold: true, color: ROYAL_BLUE })]));
    }

    body.push(pXml('# Medication:', { bold: true, spaceBefore: 80 }));
    calc.medOrders.forEach(m => body.push(richOrderP(m, { spaceBefore: 15, spaceAfter: 25 })));

    if (state.meds.otherOrders && state.meds.otherOrders.trim()) {
      body.push(pXml('# Other order:', { bold: true, spaceBefore: 50 }));
      state.meds.otherOrders.trim().split('\n').forEach(line => {
        if (line.trim()) body.push(pXml(line, { indentLeft: 280, spaceBefore: 10, spaceAfter: 20 }));
      });
    }

    body.push(pXml('# Anti-emesis order:', { bold: true, spaceBefore: 80 }));
    calc.antiemeticOrders.forEach(a => {
      if (a.includes('\n')) {
        a.split('\n').forEach((ln, idx) => {
          body.push(richOrderP(ln, { indentLeft: idx === 0 ? 240 : 560, spaceBefore: idx === 0 ? 15 : 5, spaceAfter: 15 }));
        });
      } else {
        body.push(richOrderP(a, { indentLeft: 240, spaceBefore: 15, spaceAfter: 25 }));
      }
    });

    // Page 3: Section (2) Conditioning regimen / Acute GVHD prophylaxis (minimum line height 16pt = 320 dxa)
    const p3Line = { line: LINE_MIN_16PT, lineRule: 'atLeast' };
    const sec2Title = state.mode === 'auto' ? '(2) Conditioning regimen' : '(2) Conditioning and Acute GVHD prophylaxis order';
    body.push(pXml(sec2Title, { ...p3Line, sz: SZ_TITLE, bold: true, color: '1774D3', borderBottom: true, pageBreakBefore: true, spaceBefore: 0, spaceAfter: 80 }));
    const a = calc.anthro;
    const basisNote = state.dosingBasis === 'actual'
      ? '(2012 ASCO建議藥物劑量以Actual BW/BSA計算；以下藥物劑量以 Actual BW 及 Actual BSA 計算)'
      : '(2012 ASCO建議藥物劑量以Actual BW/BSA計算；以下藥物劑量為 Adjusted BW 及 Adjusted BSA 計算)';
    body.push(pXml([
      runXml(`# Height: ${a.height} cm, Actual BW: ${a.actualBW} kg, Actual BSA: ${a.actualBSA.toFixed(2)} m2, `),
      runXml(`Adjusted BW: ${a.adjBW.toFixed(1)} kg`, { bold: true, color: PURE_RED }),
      runXml(', '),
      runXml(`Adjusted BSA: ${a.adjBSA.toFixed(2)} m2`, { bold: true, color: PURE_RED })
    ], p3Line));
    body.push(pXml(basisNote, { ...p3Line, sz: SZ_BODY, color: '555555', spaceAfter: 80 }));

    // Schedule Table
    body.push(buildScheduleTable(calc));

    // Conditioning Drug Orders (Page 3: min 16pt; format ATG "Pre-medication:" bold + indented sub-orders)
    calc.conditioningOrders.forEach((order, oIdx) => {
      const topGap = oIdx === 0 ? 80 : 25;
      if (order.includes('\nPre-medication:\n')) {
        const lines = order.split('\n');
        let inPremed = false;
        lines.forEach(ln => {
          if (ln.trim() === 'Pre-medication:') {
            inPremed = true;
            body.push(pXml('Pre-medication:', { ...p3Line, bold: true, spaceBefore: 20, spaceAfter: 10 }));
          } else if (inPremed) {
            body.push(richOrderP(ln, { ...p3Line, indentLeft: 360, spaceBefore: 10, spaceAfter: 15 }));
          } else {
            body.push(richOrderP(ln, { ...p3Line, spaceBefore: topGap, spaceAfter: 20 }));
          }
        });
      } else {
        body.push(richOrderP(order, { ...p3Line, spaceBefore: topGap, spaceAfter: 30 }));
      }
    });

    // Page 4: Section (3), (4), (5) + Care Team Signatures
    body.push(pXml('(3) Stem cell transplantation order', { sz: SZ_TITLE, bold: true, color: '1774D3', borderBottom: true, pageBreakBefore: true, spaceBefore: 0, spaceAfter: 80 }));
    body.push(richOrderP(`# ${calc.stemCellLine}`));
    body.push(pXml('# On EKG monitor, O2 use PRN during stem cell infusion.'));
    body.push(pXml('# No leukocyte filter usage.'));
    body.push(pXml('# Diphenhydramine 30 mg or hydrocortisone 100 mg IV before stem cell transfusion.'));
    body.push(pXml([
      runXml('# Check CD34+ cell count (target 2.5 ~ 5.0 x 10^6/kg); cryopreserve stem cells & lymphocytes as '),
      runXml(`VS ${state.vs || '____'}`, { bold: true, color: ROYAL_BLUE }),
      runXml("'s order.")
    ]));
    body.push(pXml([
      runXml(`# ${state.mode === 'auto' ? 'Planned to infuse CD34+ cell dose = ' : 'Stem cell infusion: '}`),
      runXml(calc.cd34Display, { bold: true, color: calc.cd34Pending ? PURE_RED : ROYAL_BLUE }),
      runXml(' on D'),
      runXml('0', { bold: true, color: ROYAL_BLUE }),
      runXml(' ('),
      runXml(calc.d0MD, { bold: true, color: ROYAL_BLUE }),
      runXml(')')
    ]));

    // Section (4)
    body.push(pXml('(4) Blood transfusion order', { sz: SZ_TITLE, bold: true, color: '1774D3', borderBottom: true, spaceBefore: 140, spaceAfter: 80 }));
    if (state.mode === 'auto') {
      body.push(pXml(`# Blood type: ${state.recipient.bloodType || ''}`, { bold: true }));
      if (calc.blood.rhWarning) {
        body.push(pXml(`# ${calc.blood.rhGuidance}`, { bold: true, color: PURE_RED }));
      }
    } else {
      body.push(pXml(`# Blood type: Donor ${state.donor.bloodType || ''}; Recipient: ${state.recipient.bloodType || ''} (${calc.blood.mismatch}${calc.blood.rhWarning ? '；' + calc.blood.rhStatus : ''})`, { bold: true }));
      body.push(pXml(`# Choice of RBC product: ${calc.blood.rbc}`, { bold: true, color: PURE_RED }));
      body.push(pXml(`# Choice of Platelet, FFP or cryoprecipitate: ${calc.blood.plt}`, { bold: true, color: ROYAL_BLUE }));
      if (calc.blood.rhWarning) {
        body.push(pXml(`# ${calc.blood.rhGuidance}`, { bold: true, color: PURE_RED }));
      }
    }
    body.push(pXml('# With irradiation except for FFP, cryoprecipitate and stem cell'));
    body.push(pXml('# With leukocyte filter except for FFP, cryoprecipitate, "leukocyte-depleted" products, and stem cell'));
    body.push(pXml('# With premedication: diphenhydramine 1 amp IVPRN or hydrocortisone 100mg IVPRN'));
    if (includeAboImg) {
      body.push(buildAboImageParagraph());
    }

    // Section (5)
    body.push(pXml('(5) Laboratory monitoring order', { sz: SZ_TITLE, bold: true, color: '1774D3', borderBottom: true, spaceBefore: 140, spaceAfter: 80 }));
    const labText = state.mode === 'auto'
      ? '# Check one-touch, CBC/DC (omit D/C if WBC < 500) QD, BCS QW1,3,5, Aspergillus Ag QW1, others as ward routine.'
      : '# Check one-touch, CBC/DC (omit D/C if WBC < 500), BCS, CsA/Tacrolimus level (C0), CMV viral load, EBV viral load, Aspergillus Ag, BK/JC virus as ward routine.';
    body.push(pXml(labText));

    // Care Team Signatures: right-aligned, NO bold, physician names in Royal Blue (#0007FF), 12pt
    const sigItems = [
      ['Primary Care: ', state.primaryCare || ''],
      ['BMT CR: ', state.bmtCr || ''],
      state.bedCr ? ['開床CR: ', state.bedCr] : null,
      ['Attending Physician: ', state.vs || ''],
      ['BMT unit director: ', state.director || '姚明']
    ].filter(Boolean);
    sigItems.forEach(([label, name], sIdx) => {
      const runs = [runXml(label, { sz: SZ_BODY, bold: false })];
      if (name) runs.push(runXml(name, { sz: SZ_BODY, bold: false, color: ROYAL_BLUE }));
      body.push(pXml(runs, { align: 'right', spaceBefore: sIdx === 0 ? 180 : 20, spaceAfter: 25 }));
    });

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${body.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="450" w:footer="450" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  ${includeAboImg ? '<Relationship Id="rIdAboImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.jpg"/>' : ''}
</Relationships>`;

    const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:view w:val="print"/>
  <w:zoom w:percent="100"/>
  <w:doNotDisplayPageBoundaries/>
</w:settings>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${FONT_EN}" w:hAnsi="${FONT_EN}" w:eastAsia="${FONT_ZH}" w:cs="${FONT_EN}"/>
        <w:sz w:val="${SZ_BODY}"/><w:szCs w:val="${SZ_BODY}"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:before="0" w:after="0" w:line="${LINE_EXACT_18PT}" w:lineRule="exact"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`;

    const zipFiles = [
      { name: '[Content_Types].xml', data: strToBytes(contentTypesXml) },
      { name: '_rels/.rels', data: strToBytes(rootRelsXml) },
      { name: 'word/document.xml', data: strToBytes(documentXml) },
      { name: 'word/_rels/document.xml.rels', data: strToBytes(docRelsXml) },
      { name: 'word/styles.xml', data: strToBytes(stylesXml) },
      { name: 'word/settings.xml', data: strToBytes(settingsXml) }
    ];
    if (includeAboImg) {
      zipFiles.push({ name: 'word/media/image1.jpg', data: b64ToBytes(window.ABO_TABLE_IMAGE_B64) });
    }

    return buildZip(zipFiles);
  }

  function downloadDocx(state, calc) {
    const bytes = generateDocxBytes(state, calc);
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    const ptName = (state.recipient.name || 'Patient').replace(/[\\/:*?"<>|]/g, '_');
    const chart = (state.recipient.chartNo || '').replace(/[\\/:*?"<>|]/g, '_');
    const prefix = state.mode === 'auto' ? 'Auto-HSCT protocol' : (state.mode === 'ptcy' ? 'Haplo-PTCy protocol' : 'HSCT protocol');
    const filename = `${prefix} - ${ptName}${chart ? ' ' + chart : ''}.docx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
    return filename;
  }

  return {
    generateDocxBytes,
    downloadDocx
  };
})();
