// BMT Protocol Clinical Calculation Engine
// Exact parity with Allo, Auto, and Haplo-PTCy Google Sheet formulas + 2026 clinical refinements

window.BMTCalc = (function () {
  const WEEKDAYS_SHORT = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  const WEEKDAYS_LONG = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  function mround(value, multiple) {
    if (!isFinite(value) || !isFinite(multiple) || multiple === 0) return 0;
    return Math.round(value / multiple) * multiple;
  }

  function roundTo(value, decimals) {
    if (!isFinite(value)) return 0;
    const p = Math.pow(10, decimals);
    return Math.round(value * p) / p;
  }

  function parseDateISO(str) {
    if (!str) return null;
    const m = String(str).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  function addDays(date, days) {
    if (!date) return null;
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + Number(days));
    return d;
  }

  function fmtMD(date, pad) {
    if (!date) return '__/__';
    const m = date.getMonth() + 1;
    const d = date.getDate();
    if (pad) return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
    return `${m}/${d}`;
  }

  function fmtYMD(date) {
    if (!date) return '____/__/__';
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  }

  function fmtDayLabel(d) {
    const n = Number(d);
    if (n > 0) return `D+${n}`;
    if (n === 0) return 'D0';
    return `D${n}`;
  }

  function fmtDayRange(startD, endD, d0Date) {
    const s = Number(startD);
    const e = Number(endD);
    const ds = addDays(d0Date, s);
    const de = addDays(d0Date, e);
    if (s === e || isNaN(e)) {
      return `${fmtDayLabel(s)} (${fmtMD(ds)})`;
    }
    return `${fmtDayLabel(s)} ~ ${fmtDayLabel(e)} (${fmtMD(ds)} ~ ${fmtMD(de)})`;
  }

  // Anthropometrics (exact parity with BMT_details_new & BMT_details)
  function calcAnthropometrics(heightCm, weightKg, gender, dosingBasis) {
    const h = parseFloat(heightCm) || 0;
    const w = parseFloat(weightKg) || 0;
    if (h <= 0 || w <= 0) {
      return {
        height: h, actualBW: w, actualBSA: 0,
        ibwBMI: 0, ibwCTN: 0, adjBW: 0, adjBSA: 0,
        dosingBW: 0, dosingBSA: 0
      };
    }
    const ibwBMI = Math.pow(h * 0.01, 2) * 22;
    const ibwCTN = (gender === 'M' ? 50 : 45.5) + (h >= 152.4 ? 2.3 * (h - 152.4) / 2.54 : 0);
    // Exact sheet formula: IF(ActualBW < IBW_BMI, ActualBW, IBW_BMI + 0.25*(ActualBW - IBW_BMI))
    const adjBW = w < ibwBMI ? w : ibwBMI + 0.25 * (w - ibwBMI);
    const actualBSA = Math.sqrt((h * w) / 3600);
    const adjBSA = Math.sqrt((h * adjBW) / 3600);
    const useActual = dosingBasis === 'actual';

    return {
      height: h,
      actualBW: w,
      actualBSA,
      ibwBMI,
      ibwCTN,
      adjBW,
      adjBSA,
      dosingBW: useActual ? w : adjBW,
      dosingBSA: useActual ? actualBSA : adjBSA
    };
  }

  // ABO Blood Product Compatibility Matrix (exact parity with BMT_details!B47:B48 & Table 1)
  function parseABO(str) {
    if (!str) return { abo: '', rh: '+' };
    const s = String(str).toUpperCase().replace(/\s+/g, '');
    let abo = '';
    if (s.startsWith('AB')) abo = 'AB';
    else if (s.startsWith('A')) abo = 'A';
    else if (s.startsWith('B')) abo = 'B';
    else if (s.startsWith('O')) abo = 'O';
    const rh = (s.includes('-') || s.includes('NEG')) ? '-' : '+';
    return { abo, rh };
  }

  function calcBloodProducts(recipientBT, donorBT) {
    const r = parseABO(recipientBT);
    const d = parseABO(donorBT);
    if (!r.abo || !d.abo) {
      return { rbc: '—', plt: '—', mismatch: '未知', rhWarning: false };
    }
    const key = `${r.abo}_${d.abo}`;
    const rbcMap = {
      A_O: ['O'], B_O: ['O'], AB_O: ['O'],
      AB_A: ['A', 'O'], AB_B: ['B', 'O'],
      O_A: ['O'], O_B: ['O'], O_AB: ['O'],
      A_AB: ['A', 'O'], B_AB: ['B', 'O'],
      A_B: ['O'], B_A: ['O'],
      A_A: ['A', 'O'], B_B: ['B', 'O'],
      AB_AB: ['AB', 'A', 'B', 'O'], O_O: ['O']
    };
    const pltMap = {
      A_O: ['A', 'AB'], B_O: ['B', 'AB'], AB_O: ['AB'],
      AB_A: ['AB'], AB_B: ['AB'],
      O_A: ['A', 'AB'], O_B: ['B', 'AB'], O_AB: ['AB'],
      A_AB: ['AB'], B_AB: ['AB'],
      A_B: ['AB'], B_A: ['AB'],
      A_A: ['A', 'AB'], B_B: ['B', 'AB'],
      AB_AB: ['AB'], O_O: ['O', 'A', 'B', 'AB']
    };
    const mismatchMap = {
      A_A: 'None (ABO 相容)', B_B: 'None (ABO 相容)', AB_AB: 'None (ABO 相容)', O_O: 'None (ABO 相容)',
      A_O: 'Minor mismatch', B_O: 'Minor mismatch', AB_O: 'Minor mismatch', AB_A: 'Minor mismatch', AB_B: 'Minor mismatch',
      O_A: 'Major mismatch', O_B: 'Major mismatch', O_AB: 'Major mismatch', A_AB: 'Major mismatch', B_AB: 'Major mismatch',
      A_B: 'Bidirectional (Major + Minor)', B_A: 'Bidirectional (Major + Minor)'
    };

    const rhWarning = r.rh === '-' || d.rh === '-';
    const rhSuffix = rhWarning ? '-' : '+';
    const rbcList = (rbcMap[key] || []).map(x => x + rhSuffix).join(' or ');
    const pltList = (pltMap[key] || []).map(x => x + rhSuffix).join(' or ');

    let rhStatus = 'Rh(+) 相容';
    let rhGuidance = '';
    if (rhWarning) {
      if (r.rh === '-' && d.rh === '+') rhStatus = 'Rh incompatibility (Recipient Rh- / Donor Rh+)';
      else if (r.rh === '+' && d.rh === '-') rhStatus = 'Rh incompatibility (Recipient Rh+ / Donor Rh-)';
      else rhStatus = 'Both Rh(-)';
      rhGuidance = 'Rh(-) 血型不合輸血原則：無論 Donor 或 Recipient，只要任一方為 Rh(-)，輸血血品原則上均以 Rh(-) 為主（RBC 及 Platelet 皆優先選用 Rh(-) 血品；若緊急情況使用 Rh(+) 血小板且受贈者為 Rh(-) 具生育能力女性，應評估給予 Anti-D immunoglobulin）。';
    }

    return {
      rbc: rbcList,
      plt: pltList,
      mismatch: mismatchMap[key] || '未知',
      rhWarning,
      rhStatus,
      rhGuidance
    };
  }

  // HLA Mismatch & Rejection/GvHD Match Calculator (including 8-allele A/B/C/DR mismatch for NHI Letermovir)
  function normAllele(a) {
    const s = String(a || '').trim();
    if (!s || /^[-－—–/]+$/.test(s) || /^N\/?A$/i.test(s)) return '';
    return s;
  }

  // Canonical allele string for comparison (handles leading zeros 2:02 vs 02:02, A*02:01, 3-field 02:01:01, full-width colon)
  function canonAllele(a) {
    const raw = normAllele(a);
    if (!raw) return '';
    const cleaned = raw
      .replace(/：/g, ':')
      .replace(/\s+/g, '')
      .replace(/^[A-Za-z0-9]+\*/, '')
      .toUpperCase();
    const parts = cleaned.split(':').filter(Boolean);
    if (!parts.length) return cleaned;
    const normField = (f, idx) => {
      let s = f;
      // Strip trailing G/P group notation on 2nd field (keep N/L/S/Q expression suffixes)
      if (idx === 1) s = s.replace(/[GP]$/, '');
      const m = s.match(/^(\d+)([A-Z]*)$/);
      if (m) {
        const num = m[1].length === 1 ? '0' + m[1] : m[1];
        return num + m[2];
      }
      return s;
    };
    const twoFields = parts.slice(0, 2).map((p, i) => normField(p, i));
    return twoFields.join(':');
  }

  function calcHLA(hla) {
    const loci = ['A', 'B', 'C', 'DR', 'DQ', 'DP'];
    const abcdLoci = new Set(['A', 'B', 'C', 'DR']);
    const locusResults = {};
    const testedLoci = [];
    const rejMismatches = [];
    const gvhdMismatches = [];
    let rejMatched = 0, gvhdMatched = 0, totalPossible = 0;
    let abcdRejMismatch = 0, abcdGvhdMismatch = 0, abcdTotal = 0, abcdBidirectionalMismatch = 0;

    loci.forEach(locus => {
      const arr = hla[locus] || ['', '', '', ''];
      const dispR0 = normAllele(arr[0]);
      const dispR1 = normAllele(arr[1]);
      const dispD0 = normAllele(arr[2]);
      const dispD1 = normAllele(arr[3]);

      const rawR0 = canonAllele(arr[0]);
      const rawR1 = canonAllele(arr[1]);
      const rawD0 = canonAllele(arr[2]);
      const rawD1 = canonAllele(arr[3]);

      // Homozygous: if either allele is '-' or blank, both chromosomes carry the tested allele
      const r1 = rawR0 || rawR1;
      const r2 = rawR1 || rawR0;
      const d1 = rawD0 || rawD1;
      const d2 = rawD1 || rawD0;

      const hasR = Boolean(r1);
      const hasD = Boolean(d1);

      let r1Mismatch = false, r2Mismatch = false, d1Mismatch = false, d2Mismatch = false;
      if (hasR && hasD) {
        testedLoci.push(locus);
        totalPossible += 2;
        const rSet = [r1, r2];
        const dSet = [d1, d2];

        // Rejection direction (HvG): Donor alleles NOT present in Recipient
        const d1InR = rSet.includes(d1);
        const d2InR = rSet.includes(d2);
        const locRejMatch = (d1InR ? 1 : 0) + (d2InR ? 1 : 0);
        rejMatched += locRejMatch;

        if (!d1InR && !d2InR && d1 === d2) {
          rejMismatches.push(`${locus}(${dispD0 || dispD1}×2)`);
        } else {
          if (!d1InR) rejMismatches.push(`${locus}(${dispD0 || dispD1})`);
          if (!d2InR) rejMismatches.push(`${locus}(${dispD1 || dispD0})`);
        }

        // GvHD direction (GvH): Recipient alleles NOT present in Donor
        const r1InD = dSet.includes(r1);
        const r2InD = dSet.includes(r2);
        const locGvhdMatch = (r1InD ? 1 : 0) + (r2InD ? 1 : 0);
        gvhdMatched += locGvhdMatch;

        if (!r1InD && !r2InD && r1 === r2) {
          gvhdMismatches.push(`${locus}(${dispR0 || dispR1}×2)`);
        } else {
          if (!r1InD) gvhdMismatches.push(`${locus}(${dispR0 || dispR1})`);
          if (!r2InD) gvhdMismatches.push(`${locus}(${dispR1 || dispR0})`);
        }

        if (abcdLoci.has(locus)) {
          abcdTotal += 2;
          const locRejMm = 2 - locRejMatch;
          const locGvhdMm = 2 - locGvhdMatch;
          abcdRejMismatch += locRejMm;
          abcdGvhdMismatch += locGvhdMm;
          abcdBidirectionalMismatch += Math.max(locRejMm, locGvhdMm);
        }

        // Visual highlight only on non-dash cells that are absent from the other side
        r1Mismatch = Boolean(rawR0) && !dSet.includes(rawR0);
        r2Mismatch = Boolean(rawR1) && !dSet.includes(rawR1);
        d1Mismatch = Boolean(rawD0) && !rSet.includes(rawD0);
        d2Mismatch = Boolean(rawD1) && !rSet.includes(rawD1);
      }

      locusResults[locus] = { r1Mismatch, r2Mismatch, d1Mismatch, d2Mismatch };
    });

    const rejectionText = hla.autoCalc
      ? (totalPossible > 0 ? `${rejMatched}/${totalPossible} match` : '')
      : (hla.rejectionManual || '');
    const gvhdText = hla.autoCalc
      ? (totalPossible > 0 ? `${gvhdMatched}/${totalPossible} match` : '')
      : (hla.gvhdManual || '');

    return {
      loci: locusResults,
      testedLoci,
      rejMismatches,
      gvhdMismatches,
      rejMatched,
      gvhdMatched,
      totalPossible,
      abcdTotal,
      abcdRejMismatch,
      abcdGvhdMismatch,
      mismatchABCD: abcdBidirectionalMismatch,
      rejectionText,
      gvhdText
    };
  }

  function inferDonorRelation(state) {
    if (state.donorRelation === 'related' || state.donorRelation === 'unrelated') {
      return state.donorRelation;
    }
    const dName = String(state.donor.name || '').trim();
    const dLabel = String(state.donor.label || '').trim();
    const text = `${dLabel} ${dName}`.trim();
    // Unrelated donor rule: written as MUD / MMUD / URD / 非親屬 / 慈濟
    if (/\b(MMUD|MUD|URD|BTCS)\b|非親屬|慈濟|unrelated/i.test(text)) return 'unrelated';
    // Related donor rule: kinship label OR donor has a personal name (and is not MUD/MMUD)
    if (/父|母|兒|女|兄|弟|姊|妹|子|親屬|\bMSD\b|sibling|son|daughter|brother|sister|parent|haplo/i.test(text)) {
      return 'related';
    }
    if (dName.length > 0) return 'related';
    if (state.mode === 'ptcy') return 'related';
    return '';
  }

  function evalLetermovirNHI(state, hlaCalc) {
    if (state.mode === 'auto' || !hlaCalc) return null;
    const relation = inferDonorRelation(state);
    const relationLabel = relation === 'related' ? '親屬間捐贈' : (relation === 'unrelated' ? '非親屬間捐贈' : '未判定捐贈關係');
    const mm = hlaCalc.mismatchABCD || 0;
    const hasAbcd = hlaCalc.abcdTotal > 0;
    const threshold = relation === 'related' ? 2 : 1;
    const eligible = (Boolean(relation) && hasAbcd) ? (mm >= threshold) : false;

    let reason = '';
    let noteText = '';
    if (!relation) {
      reason = '尚未填入 Donor 名稱（親屬填姓名、非親屬填 MUD/MMUD），無法判定健保資格';
      noteText = '(請輸入 Donor 名稱與 HLA-A/B/C/DR 以判讀健保條件)';
    } else if (!hasAbcd) {
      reason = `${relationLabel}，但 HLA-A/B/C/DR 尚未填寫完整，無法判定健保資格`;
      noteText = '(請輸入完整 HLA-A/B/C/DR 以判讀健保條件)';
    } else if (eligible) {
      reason = `${relationLabel}，HLA-A/B/C/DR 不相符 ${mm} 個位點（達 ≥${threshold} 位點標準）→ 符合健保給付條件`;
      noteText = `(符合健保條件：${relationLabel} HLA-A/B/C/DR 不相符 ${mm} 位點)`;
    } else {
      reason = `${relationLabel}，HLA-A/B/C/DR 不相符 ${mm} 個位點（未達 ≥${threshold} 位點標準）→ 不符合健保條件，是否考慮自費使用？`;
      noteText = `(不符合健保條件：${relationLabel} HLA-A/B/C/DR 不相符 ${mm} 位點，是否考慮自費使用？)`;
    }

    return {
      relation,
      relationLabel,
      mismatchABCD: mm,
      threshold,
      hasAbcd,
      eligible,
      reason,
      noteText
    };
  }

  // Tokenizer for Royal Blue day numbers (D-6 -> -6), parenthesized date ranges ((11/16 ~ 11/20)), and calculated drug doses
  function tokenizeOrderDates(text) {
    const str = String(text ?? '');
    const tokens = [];

    // Highlight calculated drug doses in plain (non-parenthesized) text spans
    const pushPlainWithDoses = (seg) => {
      if (!seg) return;
      // Match calculated doses only (excludes fixed doses like Micafungin 50 mg, Solu-medrol 40 mg, Leucovorin 15 mg, etc.):
      //  1. "取 <num> mg" (ATG, Busulfan Auto, Pre-Cy, PTCy, CsA PTCy, Tacrolimus, MTX, Brentuximab, Gemcitabine)
      //  2. "Fludarabine <num> mg"
      //  3. "<num> mg" immediately followed by " in " unless preceded by "Micafungin " (Busulfan, Thiotepa, Endoxan, Mesna, Melphalan, CsA, Rituximab, BCNU, Bendamustine, Etoposide, Cytarabine)
      //  4. "<num>#" before BIDAC/TIDAC PO (Myfortic)
      //  5. "run <num> ml/hour" (Gemcitabine pump rate)
      const doseRe = /(取\s+)(\d+(?:\.\d+)?\s*mg)\b|(Fludarabine\s+)(\d+(?:\.\d+)?\s*mg)\b|(?<!Micafungin\s)(\d+(?:\.\d+)?\s*mg)(?=\s+in\s+)|(\d+#)(?=\s+(?:BIDAC|TIDAC)\s+PO)|(run\s+)(\d+(?:\.\d+)?\s*ml\/hour)/g;
      let pLast = 0;
      let dm;
      while ((dm = doseRe.exec(seg)) !== null) {
        if (dm.index > pLast) tokens.push({ text: seg.slice(pLast, dm.index), royalBlue: false });
        if (dm[1] !== undefined) {
          tokens.push({ text: dm[1], royalBlue: false });
          tokens.push({ text: dm[2], royalBlue: true });
        } else if (dm[3] !== undefined) {
          tokens.push({ text: dm[3], royalBlue: false });
          tokens.push({ text: dm[4], royalBlue: true });
        } else if (dm[5] !== undefined) {
          tokens.push({ text: dm[5], royalBlue: true });
        } else if (dm[6] !== undefined) {
          tokens.push({ text: dm[6], royalBlue: true });
        } else if (dm[7] !== undefined) {
          tokens.push({ text: dm[7], royalBlue: false });
          tokens.push({ text: dm[8], royalBlue: true });
        }
        pLast = dm.index + dm[0].length;
      }
      if (pLast < seg.length) tokens.push({ text: seg.slice(pLast), royalBlue: false });
    };

    const pushParenInner = (inner) => {
      // Highlight dates (11/16 ~ 11/20, 2026/11/16) AND calculated doses inside parens (Filgrastim 375 mcg, total 1200 cGy, 總劑量 425 mg)
      const innerRe = /(\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2})(?:\s*[~～-]\s*(?:\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2}))?|(Filgrastim\s+)(\d+(?:\.\d+)?\s*mcg)\b|(total\s+)(\d+(?:\.\d+)?\s*cGy)\b|(總劑量\s+)(\d+(?:\.\d+)?\s*mg)\b/g;
      let iLast = 0;
      let dm;
      while ((dm = innerRe.exec(inner)) !== null) {
        if (dm.index > iLast) tokens.push({ text: inner.slice(iLast, dm.index), royalBlue: false });
        if (dm[1] !== undefined) {
          tokens.push({ text: dm[0], royalBlue: true });
        } else if (dm[2] !== undefined) {
          tokens.push({ text: dm[2], royalBlue: false });
          tokens.push({ text: dm[3], royalBlue: true });
        } else if (dm[4] !== undefined) {
          tokens.push({ text: dm[4], royalBlue: false });
          tokens.push({ text: dm[5], royalBlue: true });
        } else if (dm[6] !== undefined) {
          tokens.push({ text: dm[6], royalBlue: false });
          tokens.push({ text: dm[7], royalBlue: true });
        }
        iLast = dm.index + dm[0].length;
      }
      if (iLast < inner.length) tokens.push({ text: inner.slice(iLast), royalBlue: false });
    };

    // Match either:
    //  Group 1+2: Day marker D followed by (-N, +N, or 0) not preceded by alnum and not followed by digit/W
    //  Group 3..5: Parenthesized content (...)
    const re = /(?<![A-Za-z0-9])(D)([+-]\d+|0)(?![0-9A-Za-z])|(\()([^()]*?)(\))/g;
    let last = 0;
    let m;

    while ((m = re.exec(str)) !== null) {
      if (m.index > last) {
        pushPlainWithDoses(str.slice(last, m.index));
      }
      if (m[1] !== undefined) {
        tokens.push({ text: m[1], royalBlue: false });
        tokens.push({ text: m[2], royalBlue: true });
      } else {
        const inner = m[4];
        // Red clinical hints: Feburic (已達CR可考慮拿掉) and Letermovir NHI condition notes
        if (/^(?:已達CR可考慮拿掉|符合健保條件|不符合健保條件|請輸入)/.test(inner.trim())) {
          tokens.push({ text: `(${inner})`, royalBlue: false, red: true });
        } else {
          tokens.push({ text: '(', royalBlue: false });
          if (/\d{1,2}\/\d{1,2}|Filgrastim\s+\d|total\s+\d+(?:\.\d+)?\s*cGy|總劑量\s+\d+(?:\.\d+)?\s*mg/i.test(inner)) {
            pushParenInner(inner);
          } else {
            tokens.push({ text: inner, royalBlue: false });
          }
          tokens.push({ text: ')', royalBlue: false });
        }
      }
      last = m.index + m[0].length;
    }
    if (last < str.length) {
      pushPlainWithDoses(str.slice(last));
    }
    return tokens;
  }

  // Tokenizer for Candidate serology cells: bold any line or comma/slash segment containing (+)
  function tokenizePositiveBold(text) {
    const lines = String(text ?? '').split('\n');
    const out = [];
    lines.forEach((line, lineIdx) => {
      if (lineIdx > 0) out.push({ text: '\n', bold: false });
      // Split by ", " or " / " while preserving delimiters
      const parts = line.split(/(,\s*|\s*\/\s*)/);
      parts.forEach(part => {
        if (!part) return;
        const isPos = /\(\s*\+/.test(part);
        out.push({ text: part, bold: isPos });
      });
    });
    return out;
  }

  // rATG (Thymoglobuline 25 mg/vial): round total dose to nearest 25 mg,
  // split across days/doses with earlier day(s) receiving more (e.g. 70kg * 6 = 420 -> 425 -> D1: 225, D2: 200)
  function calcAtgDoses(bw, dosePerKg, days, freq) {
    const numDays = Math.max(1, (days && days.length) || 1);
    const mult = freq === 'BID' ? 2 : 1;
    const totalDoses = numDays * mult;
    const totalMgKg = roundTo((Number(dosePerKg) || 0) * totalDoses, 1);
    const totalMg = mround((Number(bw) || 0) * totalMgKg, 25);
    const totalVials = Math.round(totalMg / 25);
    const baseVials = Math.floor(totalVials / totalDoses);
    const remVials = totalVials % totalDoses;

    const perDoseMg = [];
    for (let i = 0; i < totalDoses; i++) {
      perDoseMg.push((baseVials + (i < remVials ? 1 : 0)) * 25);
    }
    const perDayMg = [];
    for (let dIdx = 0; dIdx < numDays; dIdx++) {
      let sum = 0;
      for (let m = 0; m < mult; m++) sum += perDoseMg[dIdx * mult + m];
      perDayMg.push(sum);
    }
    const allEqual = perDayMg.every(v => v === perDayMg[0]);
    return { totalMgKg, totalMg, totalVials, perDoseMg, perDayMg, allEqual };
  }

  // Auto-suggest G-CSF (Filgrastim 5 ug/kg): nearest combination of 300 mcg & 75 mcg vials; diluent = dose / 15 ml
  function suggestGcsf(actualBW) {
    const w = parseFloat(actualBW) || 60;
    const raw = w * 5;
    // Any positive multiple of 75 can be composed of 300 mcg and 75 mcg vials (since 300 = 4 x 75)
    const mcg = Math.max(75, Math.round(raw / 75) * 75);
    const fluid = Math.round(mcg / 15);
    const n300 = Math.floor(mcg / 300);
    const n75 = Math.round((mcg - n300 * 300) / 75);
    const parts = [];
    if (n300 > 0) parts.push(`300×${n300}`);
    if (n75 > 0) parts.push(`75×${n75}`);
    return { mcg, fluid, n300, n75, comboText: parts.join(' + ') };
  }

  function isCd34Pending(rawVal) {
    const s = String(rawVal || '').trim();
    if (!s) return true;
    return /^(?:待確認|尚未確認|未確認|待定|待確認回輸劑量|tbd|pending|unknown|n\/?a|\?+|_+)$/i.test(s);
  }

  function formatCd34Display(rawVal) {
    if (isCd34Pending(rawVal)) return '待確認回輸劑量';
    const s = String(rawVal || '').trim();
    if (/10\s*\^?\s*6/i.test(s)) return s;
    return `${s} x 10^6/kg`;
  }

  function deriveGvhdProphylaxis(state) {
    if (state.mode === 'auto') return '';
    const D = state.drugs || {};
    const parts = [];
    if (state.mode === 'ptcy' && D.ptcy && D.ptcy.enabled) parts.push('PTCy');
    if (D.ratg && D.ratg.enabled) parts.push('rATG');
    if (D.tacrolimus && D.tacrolimus.enabled) parts.push('Tacrolimus');
    else if (D.csa && D.csa.enabled) parts.push('CsA');
    if (D.mmf && D.mmf.enabled) parts.push('MMF');
    if (D.mtx && D.mtx.enabled) parts.push('MTX');
    return parts.join(' + ');
  }

  // Generate complete protocol model from state
  function computeProtocol(state) {
    const mode = state.mode; // 'allo' | 'auto' | 'ptcy'
    const anthro = calcAnthropometrics(
      state.recipient.height,
      state.recipient.weight,
      state.recipient.gender,
      state.dosingBasis
    );
    const bw = anthro.dosingBW;
    const bsa = anthro.dosingBSA;

    const admDate = parseDateISO(state.admissionDate);
    const admD = Number(state.admissionD);
    const d0Date = admDate ? addDays(admDate, -admD) : null;
    const dayDate = (d) => d0Date ? addDays(d0Date, d) : null;

    const autoRhNeg = mode === 'auto' && parseABO(state.recipient.bloodType).rh === '-';
    const blood = mode === 'auto'
      ? {
          rbc: state.recipient.bloodType || '—',
          plt: '',
          mismatch: 'Auto',
          rhWarning: autoRhNeg,
          rhStatus: autoRhNeg ? 'Recipient Rh(-)' : 'Rh(+)',
          rhGuidance: autoRhNeg ? 'Rh(-) 血型輸血原則：病人為 Rh(-)，輸血血品（RBC、Platelet）均以 Rh(-) 為主。' : ''
        }
      : calcBloodProducts(state.recipient.bloodType, state.donor.bloodType);

    const hlaCalc = mode === 'auto' ? null : calcHLA(state.hla);
    const letermovirNHI = evalLetermovirNHI(state, hlaCalc);

    // G-CSF calculation
    const gcsfSuggest = suggestGcsf(anthro.actualBW);
    const gcsfMcg = state.meds.gcsfAuto ? gcsfSuggest.mcg : (Number(state.meds.gcsfMcg) || 300);
    const gcsfFluid = state.meds.gcsfAuto ? gcsfSuggest.fluid : (Number(state.meds.gcsfFluid) || 20);

    // Build Conditioning Orders & Schedule Rows
    const conditioningOrders = [];
    const scheduleRows = []; // { name, days: Set<number>, group }
    const alerts = [];

    // Helper for day range array
    const rangeDays = (s, e) => {
      const out = [];
      const a = Number(s), b = Number(e);
      if (isNaN(a) || isNaN(b)) return out;
      const lo = Math.min(a, b), hi = Math.max(a, b);
      for (let i = lo; i <= hi; i++) out.push(i);
      return out;
    };

    // Determine Schedule Column Range
    let minCol = Math.min(admD, -7);
    let maxCol = mode === 'auto' ? 0 : (mode === 'ptcy' ? 7 : 4);
    const expandCols = (days) => {
      days.forEach(d => {
        if (d < minCol) minCol = d;
        if (d > maxCol && d <= 12) maxCol = d;
      });
    };

    const D = state.drugs;

    // Helper for TBI days (supports contiguous range OR 癌醫 split schedule e.g. D-8~D-4 and D-1)
    const buildTbiSchedule = (tbi) => {
      const baseDays = rangeDays(tbi.startD, tbi.endD);
      const hasExtra = tbi.extraDay !== undefined && tbi.extraDay !== '' && tbi.extraDay !== null && !isNaN(Number(tbi.extraDay));
      const extraD = hasExtra ? Number(tbi.extraDay) : null;
      const daySet = new Set(baseDays);
      if (hasExtra) daySet.add(extraD);
      const days = Array.from(daySet).sort((a, b) => a - b);
      const rangeStr = fmtDayRange(tbi.startD, tbi.endD, d0Date);
      const dStr = hasExtra && !baseDays.includes(extraD)
        ? `${rangeStr} and ${fmtDayLabel(extraD)} (${fmtMD(dayDate(extraD))})`
        : rangeStr;
      return { days, dStr, hasExtra, extraD };
    };

    if (mode === 'allo') {
      // TBI
      if (D.tbi && D.tbi.enabled) {
        const { days, dStr, hasExtra } = buildTbiSchedule(D.tbi);
        expandCols(days);
        const totalCgy = Number(D.tbi.dose) * (D.tbi.freq === 'BID' ? 2 : D.tbi.freq === 'TID' ? 3 : 1) * days.length;
        scheduleRows.push({ name: 'TBI', days: new Set(days), group: 'cond' });
        conditioningOrders.push(
          `# TBI (Total body irradiation), ${D.tbi.dose} cGy ${D.tbi.freq} on ${dStr} (total ${totalCgy} cGy)\n` +
          `  * Antiemetic prophylaxis (Kytril 1 amp IV ONCE) is necessary before and after TBI\n` +
          `  * Solu-medrol 40 mg IV before TBI ${D.tbi.freq} on ${dStr}\n` +
          `  * Keep BT < 38.5 celsius degree before send patient to TBI\n` +
          `  * Keep Hb >= 11.0 gm/dl during TBI`
        );
        if ((D.tbi.preset === 'ntucc' || hasExtra) && admDate && admDate.getDay() !== 1) {
          alerts.push({ level: 'info', text: '癌醫 MAC TBI 提醒：癌症醫院一天照 2 Gy 共 6 天，通常安排星期一 (D-8) 入院，週一至週五 (D-8~D-4) 及隔週一 (D-1) 照射。' });
        }
      }

      // Fludarabine
      if (D.fludarabine && D.fludarabine.enabled) {
        const days = rangeDays(D.fludarabine.startD, D.fludarabine.endD);
        expandCols(days);
        const dose = mround(bsa * (Number(D.fludarabine.dose) || 30), 5);
        const vials = Math.ceil((dose * days.length) / 50);
        const dil = (D.fludarabine.diluent || '').trim() || 'N/S 100 ml';
        scheduleRows.push({ name: 'Fludarabine', days: new Set(days), group: 'cond' });
        conditioningOrders.push(
          `# Fludarabine ${dose} mg (${D.fludarabine.dose} mg/m2/day) in ${dil} IF over 30 minutes on ${fmtDayRange(D.fludarabine.startD, D.fludarabine.endD, d0Date)} (自費，${days.length}天共用${vials}支)`
        );
      }

      // Busulfan + Keppra
      if (D.busulfan && D.busulfan.enabled) {
        const days = rangeDays(D.busulfan.startD, D.busulfan.endD);
        expandCols(days);
        const dose = mround(bw * (Number(D.busulfan.dose) || 3.2), 6);
        const autoFluid = mround((dose * 10) / 6, 10);
        const dil = (D.busulfan.diluent || '').trim() || `N/S ${autoFluid} ml`;
        scheduleRows.push({ name: 'Busulfex', days: new Set(days), group: 'cond' });
        conditioningOrders.push(
          `# Busulfan (${D.busulfan.dose} mg/kg/day) (60 mg/10cc/amp) ${dose} mg in ${dil} IF 3 hours QD on ${fmtDayRange(D.busulfan.startD, D.busulfan.endD, d0Date)} (Busulfan使用期間避免使用acetaminophen, metronidazole)`
        );

        const buStart = Number(D.busulfan.startD);
        const kStart = Math.max(admD, buStart - 1);
        const kEnd = Number(D.busulfan.endD) + 1;
        const kDays = rangeDays(kStart, kEnd);
        expandCols(kDays);
        scheduleRows.push({ name: 'Keppra', days: new Set(kDays), group: 'adj' });
        const statNote = buStart <= admD ? ' (入院當天早上記得STAT一劑Keppra)' : '';
        conditioningOrders.push(
          `# Levetiracetam (Keppra) 1# PO BID on ${fmtDayRange(kStart, kEnd, d0Date)}${statNote}`
        );
        alerts.push({ level: 'warn', text: 'Busulfan 交互作用提醒：使用期間避免併用 Acetaminophen、Metronidazole、Triazoles。' });
      }

      // Thiotepa (e.g. TBF3)
      if (D.thiotepa && D.thiotepa.enabled) {
        const days = rangeDays(D.thiotepa.startD, D.thiotepa.endD);
        expandCols(days);
        const dose = mround(bw * (Number(D.thiotepa.dose) || 5), 10);
        const dil = (D.thiotepa.diluent || '').trim() || 'N/S 500 ml';
        scheduleRows.push({ name: 'Thiotepa', days: new Set(days), group: 'cond' });
        conditioningOrders.push(
          `# Thiotepa (${D.thiotepa.dose} mg/kg/${D.thiotepa.freq || 'QD'}) (自費) ${dose} mg in ${dil} IF 3 hours ${D.thiotepa.freq || 'QD'} on ${fmtDayRange(D.thiotepa.startD, D.thiotepa.endD, d0Date)}`
        );
      }

      // Cyclophosphamide + Mesna (editable Mesna dose & diluents!) + U/A
      if (D.cyclophosphamide && D.cyclophosphamide.enabled) {
        const days = rangeDays(D.cyclophosphamide.startD, D.cyclophosphamide.endD);
        expandCols(days);
        const dosePerKg = Number(D.cyclophosphamide.dose) || 60;
        const dose = mround(bw * dosePerKg, 50);
        const cyDil = (D.cyclophosphamide.diluent || '').trim() || 'N/S 100cc';
        const mesnaPerKg = D.cyclophosphamide.mesnaPerKg !== undefined && D.cyclophosphamide.mesnaPerKg !== ''
          ? Number(D.cyclophosphamide.mesnaPerKg)
          : (dosePerKg / 2);
        const mesnaAuto = Math.abs(mesnaPerKg - dosePerKg / 2) < 1e-6
          ? mround(dose / 2, 100)
          : mround(bw * mesnaPerKg, 100);
        const mesna = D.cyclophosphamide.mesnaOverrideMg !== undefined && D.cyclophosphamide.mesnaOverrideMg !== ''
          ? Number(D.cyclophosphamide.mesnaOverrideMg)
          : mesnaAuto;
        const mDil1 = (D.cyclophosphamide.mesnaDiluent1 || '').trim() || 'N/S 100cc';
        const mDil2 = (D.cyclophosphamide.mesnaDiluent2 || '').trim() || 'N/S 500cc';
        scheduleRows.push({ name: 'Cyclophosphamide', days: new Set(days), group: 'cond' });
        scheduleRows.push({ name: 'Mesna', days: new Set(days), group: 'adj' });
        const buGapNote = (D.busulfan && D.busulfan.enabled) ? ' (start 24 hours after last Busulfex dosing)' : '';
        conditioningOrders.push(
          `# Endoxan (${dosePerKg} mg/kg/day) ${dose} mg in ${cyDil} IF 2.5 hours QD on ${fmtDayRange(D.cyclophosphamide.startD, D.cyclophosphamide.endD, d0Date)}${buGapNote}`
        );
        conditioningOrders.push(
          `# Mesna (${mesnaPerKg} mg/kg)\n` +
          `   > ${mesna} mg in ${mDil1} IF QD 1 hr before each Endoxan\n` +
          `   > ${mesna} mg in ${mDil2} IF QD 8 hrs after each Endoxan with titration\n` +
          `   > ${mesna} mg in ${mDil2} IF QD 14 hrs after each Endoxan and overnight 22:00 to next day 12:00 with titration.`
        );
        const uaText = Number(D.cyclophosphamide.startD) === Number(D.cyclophosphamide.endD)
          ? `Check urine analysis on ${fmtDayLabel(D.cyclophosphamide.startD)}(${fmtMD(dayDate(D.cyclophosphamide.startD))}) and D0(${fmtMD(d0Date)})`
          : `Check urine analysis on ${fmtDayRange(D.cyclophosphamide.startD, D.cyclophosphamide.endD, d0Date)} and D0(${fmtMD(d0Date)})`;
        conditioningOrders.push(`# ${uaText}`);
      }

      // Melphalan (optional in Allo, e.g., Flu/Mel)
      if (D.melphalan && D.melphalan.enabled) {
        const days = rangeDays(D.melphalan.startD, D.melphalan.endD);
        expandCols(days);
        const dose = mround(bsa * (Number(D.melphalan.dose) || 140), 10);
        const dil = (D.melphalan.diluent || '').trim() || 'N/S 250 ml';
        scheduleRows.push({ name: 'Melphalan', days: new Set(days), group: 'cond' });
        conditioningOrders.push(
          `# Melphalan (${D.melphalan.dose} mg/m2/day) ${dose} mg in ${dil} IF within 30 minutes on ${fmtDayRange(D.melphalan.startD, D.melphalan.endD, d0Date)} (必須與stem cell輸注時間相隔 > 24 hours)`
        );
      }

      conditioningOrders.push('# Hydration with 2.5% G/S, daily volume as above table');
      if (state.meds.foley) {
        conditioningOrders.push('# On Foley before endoxan, remove ASAP after D0 if no hematuria; or self-voiding q2h, to ensure urine output >= 150 cc/hr until 36 hrs after completion of last-dose cyclophosphamide (optional)');
      }

      // rATG (25mg/vial: total rounded to nearest 25mg, front-loaded so Day 1 receives more when split)
      if (D.ratg && D.ratg.enabled) {
        const days = rangeDays(D.ratg.startD, D.ratg.endD);
        expandCols(days);
        const atg = calcAtgDoses(bw, Number(D.ratg.dose) || 2.5, days, D.ratg.freq || 'QD');
        const dil = (D.ratg.diluent || '').trim() || 'N/S 500 ml';
        scheduleRows.push({ name: 'rATG', days: new Set(days), group: 'gvhd' });
        const dStr = fmtDayRange(D.ratg.startD, D.ratg.endD, d0Date);
        const atgHeader = atg.allEqual
          ? `# ATG (Thymoglobuline 25mg/vial) (${D.ratg.dose} mg/kg, total ${atg.totalMgKg} mg/kg) 取 ${atg.perDoseMg[0]} mg in ${dil} IF 12 hrs ${D.ratg.freq || 'QD'} on ${dStr}`
          : `# ATG (Thymoglobuline 25mg/vial) (${D.ratg.dose} mg/kg, total ${atg.totalMgKg} mg/kg, 總劑量 ${atg.totalMg} mg) ${days.map((d, idx) => `取 ${atg.perDayMg[idx]} mg on ${fmtDayLabel(d)} (${fmtMD(dayDate(d))})`).join('，')} in ${dil} IF 12 hrs ${D.ratg.freq || 'QD'}`;
        conditioningOrders.push(
          `${atgHeader}\n` +
          `Pre-medication:\n` +
          `# Methylprednisolone 40 mg Q12H IV 30 min before ATG on ${dStr}\n` +
          `# Diphenhydramine (30 mg) 1 amp IV 30 min before ATG on ${dStr}\n` +
          `# Acetaminophen 1# PO 30 min before each dose of ATG on ${dStr}\n` +
          `# Diphenhydramine 1 amp IV, Acetaminophen 1# PO, Meperidine 0.5 amp IV, Q4HPRN if chills/fever after ATG`
        );
      }

      // CsA
      if (D.csa && D.csa.enabled) {
        const startD = Number(D.csa.startD);
        const days = rangeDays(startD, maxCol);
        const dosePerKg = Number(D.csa.dose) || 1.5;
        const dose = mround(bw * dosePerKg, 25);
        const dil = (D.csa.diluent || '').trim() || 'N/S 250ml';
        scheduleRows.push({ name: 'CsA', days: new Set(days), group: 'gvhd' });
        conditioningOrders.push(
          `# Cyclosporine (50mg/amp) (${dosePerKg} mg/kg) ${dose} mg in ${dil} IF 3 hours ${D.csa.freq || 'Q12H'} since ${fmtDayLabel(startD)} (${fmtMD(dayDate(startD))})`
        );
        if (dosePerKg > 1.5 && (D.csa.freq === 'Q12H' || D.csa.freq === 'BID')) {
          alerts.push({ level: 'danger', text: 'CsA 劑量超出一般設定!! 請再次確認劑量（通常 3 mg/kg/day = 1.5 mg/kg Q12H，併用 Triazole 需減半）。' });
        }
      }

      // Tacrolimus (PO or IV) in Allo
      if (D.tacrolimus && D.tacrolimus.enabled) {
        const startD = Number(D.tacrolimus.startD ?? -1);
        const days = rangeDays(startD, maxCol);
        scheduleRows.push({ name: 'Tacrolimus', days: new Set(days), group: 'gvhd' });
        if (D.tacrolimus.route === 'IV') {
          const doseIv = roundTo(bw * (Number(D.tacrolimus.dose) || 0.03), 2);
          const dil = (D.tacrolimus.diluent || '').trim() || 'N/S 250ml';
          conditioningOrders.push(
            `# Tacrolimus (${D.tacrolimus.dose} mg/kg/day) 取 ${doseIv} mg in ${dil} cIF since ${fmtDayLabel(startD)} (${fmtMD(dayDate(startD))}) (避免用PVC tubing，可以用玻璃瓶，不可與acyclovir/ganciclovir混合; Target level 5 to 15 ng/ml)`
          );
        } else {
          const dosePo = mround(bw * (Number(D.tacrolimus.dose) || 0.06), 0.5);
          conditioningOrders.push(
            `# Tacrolimus (Prograf) 取 ${dosePo} mg PO ${D.tacrolimus.freq || 'Q12H'} since ${fmtDayLabel(startD)} (${fmtMD(dayDate(startD))}) (Target level 5 to 15 ng/ml)`
          );
        }
      }

      // MMF (Myfortic)
      if (D.mmf && D.mmf.enabled) {
        const startD = Number(D.mmf.startD ?? 0);
        const days = rangeDays(startD, maxCol);
        scheduleRows.push({ name: 'MMF', days: new Set(days), group: 'gvhd' });
        conditioningOrders.push(
          `# Mycophenolate (Myfortic) (180 mg/cap) ${D.mmf.doseTab || 2}# ${D.mmf.freq || 'BIDAC'} PO since ${fmtDayLabel(startD)} (${fmtMD(dayDate(startD))}), begin 4-6 hours after stem cells infusion, and start to taper after D+30, consider DC on D+61`
        );
      }

      // MTX + Leucovorin
      if (D.mtx && D.mtx.enabled) {
        const shift = D.mtx.shift1Day ? 1 : 0;
        const d1 = 1 + shift, d2 = 3 + shift, d3 = 6 + shift, d4 = 11 + shift;
        const mtxDays = [d1, d2, d3, d4].filter(x => x <= maxCol);
        const leucDays = [d1 + 1, d2 + 1, d3 + 1].filter(x => x <= maxCol);
        scheduleRows.push({ name: 'MTX', days: new Set(mtxDays), group: 'gvhd' });
        scheduleRows.push({ name: 'Leucovorin', days: new Set(leucDays), group: 'adj' });
        const dose15 = Math.round(bsa * 15);
        const dose10 = Math.round(bsa * 10);
        conditioningOrders.push(
          `# MTX (15 mg/m2/day) 取 ${dose15} mg IV push on ${fmtDayLabel(d1)} (${fmtMD(dayDate(d1))}) (the first dose should be 24 hours apart from stem cell infusion), then (10 mg/m2/day) 取 ${dose10} mg IV QD on ${fmtDayLabel(d2)} (${fmtMD(dayDate(d2))}), ${fmtDayLabel(d3)} (${fmtMD(dayDate(d3))}), ${fmtDayLabel(d4)} (${fmtMD(dayDate(d4))}) (若幹細胞輸至D+1，則MTX皆延後一天打)\n` +
          `# Leucovorin 15 mg IV Q6H x 4 doses for rescue, starting 12 hours after each MTX dose`
        );
      }
    } else if (mode === 'ptcy') {
      // TBI
      if (D.tbi && D.tbi.enabled) {
        const { days, dStr, hasExtra } = buildTbiSchedule(D.tbi);
        expandCols(days);
        const totalCgy = Number(D.tbi.dose) * (D.tbi.freq === 'BID' ? 2 : 1) * days.length;
        scheduleRows.push({ name: 'TBI', days: new Set(days), group: 'cond' });
        conditioningOrders.push(
          `# TBI (Total body irradiation), ${D.tbi.dose} cGy ${D.tbi.freq || 'QD'} on ${dStr}${days.length > 1 ? ` (total ${totalCgy} cGy)` : ''}\n` +
          `  * Antiemetic prophylaxis is necessary before and after TBI\n` +
          `  * Solu-medrol 40 mg IV before TBI ${D.tbi.freq || 'QD'} on ${dStr}\n` +
          `  * Keep BT < 38.5 celsius degree before send patient to TBI\n` +
          `  * Keep Hb >= 11.0 gm/dl during TBI`
        );
        if ((D.tbi.preset === 'ntucc' || hasExtra) && admDate && admDate.getDay() !== 1) {
          alerts.push({ level: 'info', text: '癌醫 MAC TBI 提醒：癌症醫院一天照 2 Gy 共 6 天，通常安排星期一 (D-8) 入院，週一至週五 (D-8~D-4) 及隔週一 (D-1) 照射。' });
        }
      }

      // Fludarabine
      if (D.fludarabine && D.fludarabine.enabled) {
        const days = rangeDays(D.fludarabine.startD, D.fludarabine.endD);
        expandCols(days);
        const dose = mround(bsa * (Number(D.fludarabine.dose) || 30), 5);
        const vials = Math.ceil((dose * days.length) / 50);
        const dil = (D.fludarabine.diluent || '').trim() || 'normal saline 100 ml';
        scheduleRows.push({ name: 'Fludarabine', days: new Set(days), group: 'cond' });
        conditioningOrders.push(
          `# Fludarabine ${dose} mg (${D.fludarabine.dose} mg/m2/day) in ${dil} IF over 30 minutes on ${fmtDayRange(D.fludarabine.startD, D.fludarabine.endD, d0Date)} (自費，${days.length}天共用${vials}支)`
        );
      }

      // Thiotepa (e.g. TBF2+PTCy)
      if (D.thiotepa && D.thiotepa.enabled) {
        const days = rangeDays(D.thiotepa.startD, D.thiotepa.endD);
        expandCols(days);
        const dose = mround(bw * (Number(D.thiotepa.dose) || 5), 10);
        const dil = (D.thiotepa.diluent || '').trim() || 'N/S 500 ml';
        scheduleRows.push({ name: 'Thiotepa', days: new Set(days), group: 'cond' });
        conditioningOrders.push(
          `# Thiotepa (${D.thiotepa.dose} mg/kg/${D.thiotepa.freq || 'QD'}) (自費) ${dose} mg in ${dil} IF 3 hours ${D.thiotepa.freq || 'QD'} on ${fmtDayRange(D.thiotepa.startD, D.thiotepa.endD, d0Date)}`
        );
      }

      // Busulfex + Keppra
      if (D.busulfan && D.busulfan.enabled) {
        const days = rangeDays(D.busulfan.startD, D.busulfan.endD);
        expandCols(days);
        const dose = mround(bw * (Number(D.busulfan.dose) || 3.2), 6);
        const autoFluid = mround((dose * 10) / 6, 10);
        const dil = (D.busulfan.diluent || '').trim() || `N/S ${autoFluid} ml`;
        scheduleRows.push({ name: 'Busulfex', days: new Set(days), group: 'cond' });
        conditioningOrders.push(
          `# Busulfex (${D.busulfan.dose} mg/kg/day) (60 mg/10cc/amp) ${dose} mg in ${dil} IF 3 hours QD on ${fmtDayRange(D.busulfan.startD, D.busulfan.endD, d0Date)} (should not be mixed with the other medicine during infusion; 避免使用acetaminophen, metronidazole)`
        );

        const buStart = Number(D.busulfan.startD);
        const kStart = Math.max(admD, buStart - 1);
        const kEnd = Number(D.busulfan.endD) + 1;
        const kDays = rangeDays(kStart, kEnd);
        expandCols(kDays);
        scheduleRows.push({ name: 'Keppra', days: new Set(kDays), group: 'adj' });
        const statNote = buStart <= admD ? ' (入院當天早上記得STAT一劑Keppra)' : '';
        conditioningOrders.push(
          `# Levetiracetam (Keppra) 1# PO BID on ${fmtDayRange(kStart, kEnd, d0Date)}${statNote}`
        );
        alerts.push({ level: 'warn', text: 'Busulfan 交互作用提醒：使用期間避免併用 Acetaminophen、Metronidazole、Triazoles。' });
      }

      // Cyclophosphamide (Pre-Cy + PTCy) + Mesna (editable Mesna dose & diluents!)
      const cyDays = [];
      const cyParts = [];
      if (D.preCy && D.preCy.enabled) {
        const pDays = rangeDays(D.preCy.startD, D.preCy.endD);
        cyDays.push(...pDays);
        const dose1 = mround(bw * (Number(D.preCy.dose) || 14.5), 10);
        const preDil = (D.preCy.diluent || '').trim() || 'N/S 100 ml';
        cyParts.push(`> (${D.preCy.dose} mg/kg/day) 取 ${dose1} mg in ${preDil} IF 1 hour on ${fmtDayRange(D.preCy.startD, D.preCy.endD, d0Date)}`);
      }
      if (D.ptcy && D.ptcy.enabled) {
        const ptDays = rangeDays(D.ptcy.startD, D.ptcy.endD);
        cyDays.push(...ptDays);
        expandCols(ptDays);
        const dose2 = mround(bw * (Number(D.ptcy.dose) || 40), 10);
        const ptDil = (D.ptcy.diluent || '').trim() || 'N/S 100 ml';
        const ptStr = fmtDayRange(D.ptcy.startD, D.ptcy.endD, d0Date);
        cyParts.push(`> (${D.ptcy.dose} mg/kg/day) 取 ${dose2} mg in ${ptDil} IF 2.5 hours QD on ${ptStr}, the second day of cyclophosphamide is 24 hours apart of first day cyclophosphamide.`);
        scheduleRows.push({ name: 'Endoxan', days: new Set(cyDays), group: 'cond' });
        scheduleRows.push({ name: 'Mesna', days: new Set(ptDays), group: 'adj' });
        conditioningOrders.push(`# Cyclophosphamide ${cyParts.join(', ')}`);

        const ptcyPerKg = Number(D.ptcy.dose) || 40;
        const mesnaPerKg = D.ptcy.mesnaPerKg !== undefined && D.ptcy.mesnaPerKg !== ''
          ? Number(D.ptcy.mesnaPerKg)
          : (ptcyPerKg / 2);
        const mesnaAuto = Math.abs(mesnaPerKg - ptcyPerKg / 2) < 1e-6
          ? mround(dose2 / 2, 100)
          : mround(bw * mesnaPerKg, 100);
        const mesna = D.ptcy.mesnaOverrideMg !== undefined && D.ptcy.mesnaOverrideMg !== ''
          ? Number(D.ptcy.mesnaOverrideMg)
          : mesnaAuto;
        const mDil1 = (D.ptcy.mesnaDiluent1 || '').trim() || 'N/S 100cc';
        const mDil2 = (D.ptcy.mesnaDiluent2 || '').trim() || 'N/S 500cc';
        conditioningOrders.push(
          `# Mesna (${mesnaPerKg} mg/kg)\n` +
          `   > ${mesna} mg in ${mDil1} IF QD 1 hr before Endoxan on ${ptStr}\n` +
          `   > ${mesna} mg in ${mDil2} IF QD 8 hrs after Endoxan on ${ptStr} 14:00~22:00 with titration.\n` +
          `   > ${mesna} mg in ${mDil2} IF QD 14 hrs after Endoxan on ${ptStr} 22:00 ~ next day 12:00 with titration.`
        );
        conditioningOrders.push('# No immunosuppressive agents were administered until 24 hours after the last dose of posttransplantation cyclophosphamide, including corticosteroids.');
        alerts.push({ level: 'info', text: 'PTCy 安全守則：最後一劑 PTCy 後 24 小時內不可給予任何免疫抑制劑（含類固醇）。' });

        const uaParts = [];
        if (D.preCy && D.preCy.enabled) uaParts.push(fmtDayRange(D.preCy.startD, D.preCy.endD, d0Date));
        uaParts.push(ptStr);
        conditioningOrders.push(`# Check urine analysis on ${uaParts.join(', and ')}`);
      } else if (cyParts.length > 0) {
        scheduleRows.push({ name: 'Endoxan', days: new Set(cyDays), group: 'cond' });
        conditioningOrders.push(`# Cyclophosphamide ${cyParts.join(', ')}`);
      }

      conditioningOrders.push('# Hydration with 2.5% G/S, daily volume as above table');
      if (state.meds.foley) {
        conditioningOrders.push('# On Foley before D+3 endoxan, remove ASAP after D+5 if no hematuria; or self-voiding q2h, to ensure urine output >= 150 cc/hr until 36 hrs after completion of last-dose cyclophosphamide (optional)');
      }

      // rATG (optional in PTCy; 25mg/vial total rounded to nearest 25mg, front-loaded)
      if (D.ratg && D.ratg.enabled) {
        const days = rangeDays(D.ratg.startD, D.ratg.endD);
        expandCols(days);
        const atg = calcAtgDoses(bw, Number(D.ratg.dose) || 2, days, D.ratg.freq || 'QD');
        const dil = (D.ratg.diluent || '').trim() || 'N/S 500 ml';
        const dStr = fmtDayRange(D.ratg.startD, D.ratg.endD, d0Date);
        scheduleRows.push({ name: 'rATG', days: new Set(days), group: 'gvhd' });
        const atgHeader = atg.allEqual
          ? `# ATG (Thymoglobuline 25mg/vial) (${D.ratg.dose} mg/kg, total ${atg.totalMgKg} mg/kg) 取 ${atg.perDoseMg[0]} mg in ${dil} IF 12 hrs ${D.ratg.freq || 'QD'} on ${dStr}`
          : `# ATG (Thymoglobuline 25mg/vial) (${D.ratg.dose} mg/kg, total ${atg.totalMgKg} mg/kg, 總劑量 ${atg.totalMg} mg) ${days.map((d, idx) => `取 ${atg.perDayMg[idx]} mg on ${fmtDayLabel(d)} (${fmtMD(dayDate(d))})`).join('，')} in ${dil} IF 12 hrs ${D.ratg.freq || 'QD'}`;
        conditioningOrders.push(
          `${atgHeader}\n` +
          `Pre-medication:\n` +
          `# Methylprednisolone 80 mg IV 30 min before ATG on ${dStr}\n` +
          `# Diphenhydramine (30 mg) 1 amp IV 30 min before ATG on ${dStr}\n` +
          `# Acetaminophen 1# PO 30 min before each dose of ATG on ${dStr}\n` +
          `# Diphenhydramine 1 amp IV, Acetaminophen 1# PO, Meperidine 0.5 amp IV, Q4HPRN if chills/fever after ATG`
        );
      }

      // Tacrolimus (PO or IV)
      if (D.tacrolimus && D.tacrolimus.enabled) {
        const startD = Number(D.tacrolimus.startD ?? 5);
        const days = rangeDays(startD, maxCol);
        scheduleRows.push({ name: 'Tacrolimus', days: new Set(days), group: 'gvhd' });
        if (D.tacrolimus.route === 'IV') {
          const doseIv = roundTo(bw * (Number(D.tacrolimus.dose) || 0.03), 2);
          const dil = (D.tacrolimus.diluent || '').trim() || 'N/S 250ml';
          conditioningOrders.push(
            `# Tacrolimus (${D.tacrolimus.dose} mg/kg/day) 取 ${doseIv} mg in ${dil} cIF since ${fmtDayLabel(startD)} PM (${fmtMD(dayDate(startD))}) (避免用PVC tubing，可以用玻璃瓶，不可與acyclovir/ganciclovir混合; Target level 5 to 15 ng/ml)`
          );
        } else {
          const dosePo = mround(bw * (Number(D.tacrolimus.dose) || 0.06), 0.5);
          conditioningOrders.push(
            `# Tacrolimus (Prograf) 取 ${dosePo} mg PO ${D.tacrolimus.freq || 'Q12H'} since ${fmtDayLabel(startD)} PM (${fmtMD(dayDate(startD))}) (Target level 5 to 15 ng/ml)`
          );
        }
      }

      // CsA
      if (D.csa && D.csa.enabled) {
        const startD = Number(D.csa.startD ?? 5);
        const days = rangeDays(startD, maxCol);
        const dosePerKg = Number(D.csa.dose) || 1.5;
        const dose = mround(bw * dosePerKg, 25);
        const dil = (D.csa.diluent || '').trim() || 'N/S 250ml';
        scheduleRows.push({ name: 'CsA', days: new Set(days), group: 'gvhd' });
        conditioningOrders.push(
          `# Cyclosporine (${dosePerKg} mg/kg) 取 ${dose} mg in ${dil} IF 3 hours ${D.csa.freq || 'Q12H'} since ${fmtDayLabel(startD)} PM (${fmtMD(dayDate(startD))})`
        );
        if (dosePerKg > 1.5 && (D.csa.freq === 'Q12H' || D.csa.freq === 'BID')) {
          alerts.push({ level: 'danger', text: 'CsA 劑量超出一般設定!! 請再次確認劑量。' });
        }
      }

      // MMF (Myfortic 10.8 mg/kg TID, max 4# TID = 2160 mg/day)
      if (D.mmf && D.mmf.enabled) {
        const startD = Number(D.mmf.startD ?? 6);
        const days = rangeDays(startD, maxCol);
        const tabs = Math.min(4, Math.max(1, Math.round((bw * 10.8) / 180)));
        scheduleRows.push({ name: 'MMF', days: new Set(days), group: 'gvhd' });
        conditioningOrders.push(
          `# Mycophenolate (Myfortic) (180 mg/cap) ${tabs}# TIDAC PO since ${fmtDayLabel(startD)} (${fmtMD(dayDate(startD))}), start to taper after D+30, consider DC on D+61`
        );
      }

      // MTX (optional in PTCy)
      if (D.mtx && D.mtx.enabled) {
        const dose10 = Math.round(bsa * 10);
        scheduleRows.push({ name: 'MTX', days: new Set([6]), group: 'gvhd' });
        scheduleRows.push({ name: 'Leucovorin', days: new Set([7]), group: 'adj' });
        conditioningOrders.push(
          `# MTX (10 mg/m2/day) 取 ${dose10} mg IV push on D+6 (${fmtMD(dayDate(6))}) and D+11 (${fmtMD(dayDate(11))}) (若幹細胞輸D0+D1，MTX於D+7, D+12打)\n` +
          `# Leucovorin 15 mg IV Q6H x 4 doses for rescue, starting 12 hours after each MTX dose`
        );
      }
    } else if (mode === 'auto') {
      // Rituximab
      if (D.rituximab && D.rituximab.enabled) {
        const d = Number(D.rituximab.day);
        expandCols([d]);
        scheduleRows.push({ name: 'Rituximab', days: new Set([d]), group: 'cond' });
        if (D.rituximab.route === 'SC') {
          conditioningOrders.push(
            `# Rituximab 1400 mg SC on ${fmtDayLabel(d)} (${fmtMD(dayDate(d))})\n` +
            `# Diphenhydramine 30 mg IVP + Betamethasone 4 mg IVP + Acetaminophen 1# PO before Rituximab on ${fmtDayLabel(d)} (${fmtMD(dayDate(d))})`
          );
        } else {
          const dose = mround(bsa * (Number(D.rituximab.dose) || 375), 100);
          const dil = (D.rituximab.diluent || '').trim() || 'N/S 500 ml';
          conditioningOrders.push(
            `# Rituximab (${D.rituximab.dose} mg/m2) ${dose} mg in ${dil} IF 2 hours with titration on ${fmtDayLabel(d)} (${fmtMD(dayDate(d))})\n` +
            `# Diphenhydramine 30 mg IVP + Betamethasone 4 mg IVP + Acetaminophen 1# PO before Rituximab on ${fmtDayLabel(d)} (${fmtMD(dayDate(d))})`
          );
        }
      }

      // Brentuximab (Actual BW, cap 180 mg)
      if (D.brentuximab && D.brentuximab.enabled) {
        const d = Number(D.brentuximab.day);
        expandCols([d]);
        const dose = Math.min(180, mround(anthro.actualBW * (Number(D.brentuximab.dose) || 1.8), 5));
        const dil = (D.brentuximab.diluent || '').trim() || 'N/S 100 ml';
        scheduleRows.push({ name: 'Brentuximab', days: new Set([d]), group: 'cond' });
        conditioningOrders.push(
          `# Brentuximab (50 mg/vial) (${D.brentuximab.dose} mg/kg，以實際體重計算，上限180 mg) 取 ${dose} mg in ${dil} IF 30 minutes on ${fmtDayLabel(d)} (${fmtMD(dayDate(d))})\n` +
          `  (泡法: 每瓶藥用10 ml distilled water沿瓶壁流下輕微搖晃溶解，勿劇烈搖晃起泡，最後全部打入${dil}，半小時滴完；No pre-medication is needed.)`
        );
      }

      // Gemcitabine
      if (D.gemcitabine && D.gemcitabine.enabled) {
        const d1 = Number(D.gemcitabine.day1), d2 = Number(D.gemcitabine.day2);
        const days = [d1, d2].filter(x => !isNaN(x));
        expandCols(days);
        const dosePerM2 = Number(D.gemcitabine.dose) || 1875;
        const totalDose = mround(bsa * dosePerM2, 20);
        const pumpRate = totalDose > 0 ? Math.round((10 * bsa * 60 / totalDose) * 500) : 0;
        const totalMin = bsa > 0 ? Math.round(totalDose / (10 * bsa)) : 0;
        const dil = (D.gemcitabine.diluent || '').trim() || 'N/S 500 ml';
        scheduleRows.push({ name: 'Gemcitabine', days: new Set(days), group: 'cond' });
        conditioningOrders.push(
          `# Gemcitabine (200mg/vial, 自費) (${dosePerM2} mg/m2) 取 ${totalDose} mg in ${dil} (稀釋後total volume 500 ml) run ${pumpRate} ml/hour (total ${totalMin} min) via pump (fixed infusion rate 10 mg/m2/min) on ${fmtDayLabel(d1)}(${fmtMD(dayDate(d1))}) and ${fmtDayLabel(d2)}(${fmtMD(dayDate(d2))}).`
        );
      }

      // Busulfan (Auto)
      if (D.busulfanAuto && D.busulfanAuto.enabled) {
        const days = rangeDays(D.busulfanAuto.startD, D.busulfanAuto.endD);
        expandCols(days);
        const isM2 = D.busulfanAuto.unit === 'mg/m2';
        const dose = isM2
          ? mround(bsa * (Number(D.busulfanAuto.dose) || 100), 6)
          : mround(bw * (Number(D.busulfanAuto.dose) || 3.2), 6);
        const autoFluid = mround((dose * 10) / 6, 10);
        const dil = (D.busulfanAuto.diluent || '').trim() || `N/S ${autoFluid} ml`;
        scheduleRows.push({ name: 'Busulfan', days: new Set(days), group: 'cond' });
        conditioningOrders.push(
          `# Busulfan (${D.busulfanAuto.dose} ${D.busulfanAuto.unit}) (60 mg/10cc/amp) 取 ${dose} mg in ${dil} IF 3 hours QD on ${fmtDayRange(D.busulfanAuto.startD, D.busulfanAuto.endD, d0Date)} (should not be mixed with the other medicine during infusion; 避免使用acetaminophen, metronidazole)`
        );
        const buStart = Number(D.busulfanAuto.startD);
        const kStart = Math.max(admD, buStart - 1);
        const kEnd = Number(D.busulfanAuto.endD) + 1;
        const kDays = rangeDays(kStart, kEnd);
        expandCols(kDays);
        scheduleRows.push({ name: 'Keppra', days: new Set(kDays), group: 'adj' });
        const statNote = buStart <= admD ? ' (入院當天早上記得STAT一劑Keppra)' : '';
        conditioningOrders.push(
          `# Levetiracetam (Keppra) 1# PO BID on ${fmtDayRange(kStart, kEnd, d0Date)}${statNote}`
        );
        alerts.push({ level: 'warn', text: 'Busulfan 交互作用提醒：使用期間避免併用 Acetaminophen、Metronidazole、Triazoles。' });
      }

      // Carmustine / BCNU
      if (D.bcnu && D.bcnu.enabled) {
        const d = Number(D.bcnu.day);
        expandCols([d]);
        const dose = mround(bsa * (Number(D.bcnu.dose) || 300), 10);
        const dil = (D.bcnu.diluent || '').trim() || 'D5W 250 ml';
        scheduleRows.push({ name: 'Carmustine/BCNU', days: new Set([d]), group: 'cond' });
        conditioningOrders.push(
          `# Carmustine (BCNU) (${D.bcnu.dose} mg/m2/day) ${dose} mg in ${dil} IF 3 hours with titration on ${fmtDayLabel(d)} (${fmtMD(dayDate(d))})`
        );
      }

      // Thiotepa (Auto, e.g. TT-BCNU)
      if (D.thiotepaAuto && D.thiotepaAuto.enabled) {
        const days = rangeDays(D.thiotepaAuto.startD, D.thiotepaAuto.endD);
        expandCols(days);
        const dose = mround(bw * (Number(D.thiotepaAuto.dose) || 5), 10);
        const totalPerKg = (Number(D.thiotepaAuto.dose) || 5) * days.length * (D.thiotepaAuto.freq === 'BID' ? 2 : 1);
        const dil = (D.thiotepaAuto.diluent || '').trim() || 'N/S 500 ml';
        scheduleRows.push({ name: 'Thiotepa', days: new Set(days), group: 'cond' });
        conditioningOrders.push(
          `# Thiotepa (${D.thiotepaAuto.dose} mg/kg/dose ${D.thiotepaAuto.freq || 'BID'}, total ${totalPerKg} mg/kg) (自費) ${dose} mg in ${dil} IF 3 hours ${D.thiotepaAuto.freq || 'BID'} on ${fmtDayRange(D.thiotepaAuto.startD, D.thiotepaAuto.endD, d0Date)}`
        );
      }

      // Bendamustine
      if (D.bendamustine && D.bendamustine.enabled) {
        const days = rangeDays(D.bendamustine.startD, D.bendamustine.endD);
        expandCols(days);
        const dose = mround(bsa * (Number(D.bendamustine.dose) || 200), 10);
        const dil = (D.bendamustine.diluent || '').trim() || 'N/S 500 ml';
        scheduleRows.push({ name: 'Bendamustine', days: new Set(days), group: 'cond' });
        conditioningOrders.push(
          `# Bendamustine (${D.bendamustine.dose} mg/m2/day, 自費) ${dose} mg in ${dil} IF 2 hours QD on ${fmtDayRange(D.bendamustine.startD, D.bendamustine.endD, d0Date)}`
        );
      }

      // Etoposide
      if (D.etoposide && D.etoposide.enabled) {
        const days = rangeDays(D.etoposide.startD, D.etoposide.endD);
        expandCols(days);
        const dose = mround(bsa * (Number(D.etoposide.dose) || 200), 10);
        const dil = (D.etoposide.diluent || '').trim() || 'N/S 1000 ml';
        scheduleRows.push({ name: 'Etoposide', days: new Set(days), group: 'cond' });
        conditioningOrders.push(
          `# Etoposide (${D.etoposide.dose} mg/m2/day) ${dose} mg in ${dil} IF 4-6 hours QD on ${fmtDayRange(D.etoposide.startD, D.etoposide.endD, d0Date)}`
        );
      }

      // Cytarabine + Methylprednisolone
      if (D.cytarabine && D.cytarabine.enabled) {
        const days = rangeDays(D.cytarabine.startD, D.cytarabine.endD);
        expandCols(days);
        const dose = mround(bsa * (Number(D.cytarabine.dose) || 100), 20);
        const totalDoses = days.length * 2;
        const dil = (D.cytarabine.diluent || '').trim() || 'N/S 250 ml';
        scheduleRows.push({ name: 'Cytarabine', days: new Set(days), group: 'cond' });
        const dStr = fmtDayRange(D.cytarabine.startD, D.cytarabine.endD, d0Date);
        conditioningOrders.push(
          `# Cytarabine (${D.cytarabine.dose} mg/m2/dose) ${dose} mg in ${dil} IF 2 hours BID on ${dStr}, total ${totalDoses} doses.`
        );
        conditioningOrders.push(
          `# Methylprednisolone 40 mg IV push 30 minutes before cytarabine BID on ${dStr}, total ${totalDoses} doses.`
        );
      }

      // Melphalan
      if (D.melphalan && D.melphalan.enabled) {
        const days = rangeDays(D.melphalan.startD, D.melphalan.endD);
        expandCols(days);
        const dose = mround(bsa * (Number(D.melphalan.dose) || 140), 10);
        const dil = (D.melphalan.diluent || '').trim() || `N/S ${D.melphalan.fluid || 250} ml`;
        scheduleRows.push({ name: 'Melphalan', days: new Set(days), group: 'cond' });
        conditioningOrders.push(
          `# Melphalan (${D.melphalan.dose} mg/m2/day) ${dose} mg in ${dil} IF within 30 minutes on ${fmtDayRange(D.melphalan.startD, D.melphalan.endD, d0Date)} (必須與stem cell輸注時間相隔 > 24 hours)`
        );
      }

      conditioningOrders.push(`# Hydration with 2.5% G/S, daily volume as above table. Check urine analysis QD on D0(${fmtMD(d0Date)})`);
    }

    if (state.customConditioningNotes && state.customConditioningNotes.trim()) {
      state.customConditioningNotes.trim().split('\n').forEach(line => {
        if (line.trim()) conditioningOrders.push(line.trim());
      });
    }

    // Build schedule column days (Basic IVF defaults to 1000 ml; 1500 ml on Cyclophosphamide days and the following day)
    const isCyOrNextDay = (d) => {
      const checkRange = (drug) => drug && drug.enabled && d >= Number(drug.startD) && d <= Number(drug.endD) + 1;
      if (mode === 'allo') return checkRange(D.cyclophosphamide);
      if (mode === 'ptcy') return checkRange(D.preCy) || checkRange(D.ptcy);
      return false;
    };
    const scheduleDays = [];
    for (let d = minCol; d <= maxCol; d++) {
      const dt = dayDate(d);
      const defaultIvf = isCyOrNextDay(d) ? 1500 : 1000;
      const ivf = state.ivfOverrides && state.ivfOverrides[d] !== undefined && state.ivfOverrides[d] !== ''
        ? state.ivfOverrides[d]
        : defaultIvf;
      scheduleDays.push({
        day: d,
        weekday: dt ? WEEKDAYS_SHORT[dt.getDay()] : '',
        dateStr: fmtMD(dt),
        ivf
      });
    }

    // Medications list
    const chemoStart = Number(state.chemoStartD);
    const chemoEnd = Number(state.chemoEndD);
    const medOrders = [];
    medOrders.push('# Lorazepam (Ativan) 1~2 mg IV Q6HPRN or diphenhydramine 30 mg IV Q6HPRN if insomnia');
    if (state.meds.feburic) {
      const feburicNote = (state.meds.feburicNote || '').trim() || '(已達CR可考慮拿掉)';
      medOrders.push(`# Feburic 0.5# PO QD on ${fmtDayLabel(chemoStart)} ~ D-2 (${fmtMD(dayDate(chemoStart))}~${fmtMD(dayDate(-2))})(自費) ${feburicNote}`);
    }
    if (state.meds.esomeprazole) {
      medOrders.push(`# Esomeprazole 1# PO QDAC on ${fmtDayLabel(chemoStart)} ~ D-2 (${fmtMD(dayDate(chemoStart))}~${fmtMD(dayDate(-2))})(自費)`);
    }
    if (state.meds.micafungin) {
      medOrders.push(`# Micafungin 50 mg in N/S 100 ml IF 60 minutes QD since ${fmtDayLabel(chemoStart)} (${fmtMD(dayDate(chemoStart))})`);
    }
    if (state.meds.baktar) {
      medOrders.push(`# Baktar 1# QD PO on ${fmtDayLabel(chemoStart)} ~ D-2 (${fmtMD(dayDate(chemoStart))}~${fmtMD(dayDate(-2))})`);
    }
    if (state.meds.valtrex) {
      const cashTag = mode === 'auto' ? ' (自費)' : '';
      medOrders.push(`# Valtrex 1# QD PO since ${fmtDayLabel(chemoStart)} (${fmtMD(dayDate(chemoStart))})${cashTag}`);
    }
    if (state.meds.cefepime) {
      medOrders.push(`# Cefepime 1 g IV Q12H on D0 ~ D+2 (${fmtMD(d0Date)}~${fmtMD(dayDate(2))})`);
    }
    if (state.meds.levofloxacin) {
      medOrders.push('# Levofloxacin 750 mg PO QDAC PRN if WBC < 1000 k/μL');
    }
    if (state.meds.folicAcid) {
      medOrders.push(`# Folic acid 1# PO QD since D+1 (${fmtMD(dayDate(1))})`);
    }
    if (state.meds.gcsf) {
      const gsD = Number(state.meds.gcsfStartD ?? (mode === 'auto' ? 2 : 5));
      medOrders.push(`# G-CSF 5 ug/kg (Filgrastim ${gcsfMcg} mcg) in N/S ${gcsfFluid} ml IF 30 minutes ${state.meds.gcsfFreq || 'QN'} since ${fmtDayLabel(gsD)} (${fmtMD(dayDate(gsD))})`);
    }
    // Clinical serology checks for HBV prophylaxis & CMV Letermovir
    const hbvStr = (state.recipient.hbv || '').toUpperCase();
    const hbvPositive = /HBSAG\s*\(\s*\+|ANTI-HBC[^(\n]*\(\s*\+|HBV\s*DNA[^(\n]*\(\s*\+/.test(hbvStr);
    const hasHbvDrug = /BARACLUDE|ENTECAVIR|VEMLIDY|TENOFOVIR|TAF|TDF/i.test(state.meds.otherOrders || '');
    const cmvStr = (state.recipient.cmv || '').toUpperCase();
    const cmvIgGPos = /IGG\s*\(\s*\+/.test(cmvStr);

    if (mode !== 'auto' && state.meds.letermovir) {
      const ld = state.meds.letermovirDose || '1# QD since D+1';
      const lStart = ld.includes('D+5') ? 5 : 1;
      const autoNote = (state.meds.letermovirAutoNote !== false && letermovirNHI) ? letermovirNHI.noteText : '';
      const manualNote = (state.meds.letermovirNote || '').trim();
      const combinedNote = [autoNote, manualNote].filter(Boolean).join(' ');
      medOrders.push(`# Letermovir ${ld} (${fmtMD(dayDate(lStart))})${combinedNote ? ' ' + combinedNote : ''}`);
    } else if (mode !== 'auto' && cmvIgGPos && !state.meds.letermovir) {
      const nhiTxt = letermovirNHI ? letermovirNHI.noteText : '';
      medOrders.push(`# [提醒] 病人 CMV-IgG (+)，請評估開立 Letermovir ${nhiTxt}`);
    }
    if (hbvPositive && !hasHbvDrug) {
      medOrders.push('# [提醒] 病人為 Anti-HBc(+) 或 HBsAg(+)，請記得於 Other order 開立 HBV prophylaxis 用藥（如 Baraclude / Vemlidy）');
    }

    // Azole antifungal drug-interaction check (Voriconazole / Vfend, Posaconazole / Posanol, Isavuconazole / Cresemba)
    const azoleHaystack = [
      state.diagnosis || '',
      state.comorbidity || '',
      (state.meds && state.meds.otherOrders) || '',
      state.customConditioningNotes || ''
    ].join('\n');
    const matchedAzoles = [];
    if (/\b(?:voriconazole|vfend)\b/i.test(azoleHaystack)) matchedAzoles.push('Voriconazole (Vfend)');
    if (/\b(?:posaconazole|posanol|noxafil)\b/i.test(azoleHaystack)) matchedAzoles.push('Posaconazole (Posanol)');
    if (/\b(?:isavuconazole|cresemba)\b/i.test(azoleHaystack)) matchedAzoles.push('Isavuconazole (Cresemba)');

    const csaFullDose = mode !== 'auto' && D.csa && D.csa.enabled && Number(D.csa.dose) > 0.75;
    const tacFullDose = mode !== 'auto' && D.tacrolimus && D.tacrolimus.enabled && (
      (D.tacrolimus.route === 'IV' && Number(D.tacrolimus.dose) > 0.015) ||
      (D.tacrolimus.route !== 'IV' && Number(D.tacrolimus.dose) > 0.03)
    );
    if (matchedAzoles.length > 0 && (csaFullDose || tacFullDose)) {
      medOrders.push(`# [提醒] 病人併用 Azole 類抗黴菌藥（${matchedAzoles.join(' / ')}），請務必確認 Cyclosporine (0.75 mg/kg) 或 Tacrolimus (半量：PO 0.03 / IV 0.015 mg/kg) 劑量調整與血中濃度監測！`);
    }
    if (state.meds.urso) {
      medOrders.push(`# Ursodiol (Urso) 2# PO BID since ${fmtDayLabel(admD)} (${fmtMD(admDate)})`);
    }
    if (state.meds.glutamine) {
      medOrders.push(`# Alanyl Glutamine 1 BT IF 6 hours QD since ${fmtDayLabel(admD)} (${fmtMD(admDate)}) (optional, 自費)`);
    }
    if (state.meds.bmOnAdmission) {
      medOrders.push(`# BM study on admission day (${fmtDayLabel(admD)}, ${fmtMD(admDate)})`);
    }

    // Anti-emetics (Emend split onto indented ">" lines by 健保 / 自費 / 健保)
    const antiemeticOrders = [];
    const ae = state.antiemetics;
    const hasPtcy = mode === 'ptcy' && D.ptcy && D.ptcy.enabled;
    const ptcyStartD = hasPtcy ? (Number(D.ptcy.startD) || 3) : 3;
    const day4D = chemoStart + 3;
    const hasDay4 = chemoEnd >= day4D;

    const emendLines = ['1. Aprepitant (Emend)'];
    if (ae.emendMode === 'IV') {
      // IV 150mg Q3D: chemo day 1 QD (健保), chemo day 4 QD (自費 if >=4d), plus PTCy day 1 QD (健保)
      emendLines.push(`> 150 mg IV QD (Q3D) on ${fmtDayLabel(chemoStart)} (${fmtMD(dayDate(chemoStart))}) (健保)`);
      if (hasDay4) {
        emendLines.push(`> 150 mg IV QD (Q3D) on ${fmtDayLabel(day4D)} (${fmtMD(dayDate(day4D))}) (自費)`);
      }
      if (hasPtcy) {
        emendLines.push(`> 150 mg IV QD (Q3D) on ${fmtDayLabel(ptcyStartD)} (${fmtMD(dayDate(ptcyStartD))}) (健保)`);
      }
    } else {
      // PO: first 3 days 125-80-80 (健保), followed by 125-125-125 (自費), plus 125-80-80 (健保) on PTCy
      emendLines.push(
        `> 125 mg PO QD on ${fmtDayLabel(chemoStart)} (${fmtMD(dayDate(chemoStart))}), then 80 mg PO QD on ${fmtDayLabel(chemoStart + 1)} ~ ${fmtDayLabel(chemoStart + 2)} (${fmtMD(dayDate(chemoStart + 1))} ~ ${fmtMD(dayDate(chemoStart + 2))}) (健保)`
      );
      if (hasDay4) {
        const extEnd = Math.min(chemoEnd, chemoStart + 5);
        emendLines.push(`> 125 mg PO QD on ${fmtDayRange(day4D, extEnd, d0Date)} (自費)`);
      }
      if (hasPtcy) {
        emendLines.push(
          `> 125 mg PO QD on ${fmtDayLabel(ptcyStartD)} (${fmtMD(dayDate(ptcyStartD))}), then 80 mg PO QD on ${fmtDayLabel(ptcyStartD + 1)} ~ ${fmtDayLabel(ptcyStartD + 2)} (${fmtMD(dayDate(ptcyStartD + 1))} ~ ${fmtMD(dayDate(ptcyStartD + 2))}) (健保)`
        );
      }
    }
    antiemeticOrders.push(emendLines.join('\n'));

    const s5ht3Name = ae.serotoninAgent === 'Aloxi'
      ? 'Palonosetron (Aloxi) 1 amp IV QOD before chemotherapy'
      : 'Granisetron (Kytril) 1 amp IV QD before chemotherapy';
    if (mode === 'ptcy') {
      const tbiPart = (D.tbi && D.tbi.enabled) ? ` or TBI on ${fmtDayRange(chemoStart, chemoEnd, d0Date)}, ${buildTbiSchedule(D.tbi).dStr}` : ` on ${fmtDayRange(chemoStart, chemoEnd, d0Date)}`;
      antiemeticOrders.push(`2. ${s5ht3Name}${tbiPart}, then on D+3 ~ D+4 (${fmtMD(dayDate(3))} ~ ${fmtMD(dayDate(4))})(健保)`);
    } else {
      antiemeticOrders.push(`2. ${s5ht3Name} on ${fmtDayRange(chemoStart, chemoEnd, d0Date)} (健保)`);
    }
    antiemeticOrders.push(
      mode === 'ptcy'
        ? '3. Lorazepam (Ativan) 1~2 mg IV Q4HPRN or diphenhydramine 30 mg IV Q4HPRN or metoclopramide 10 mg IV Q6HPRN if severe nausea/vomiting'
        : '3. Lorazepam (Ativan) 1~2 mg IV Q4HPRN or diphenhydramine 30 mg IV Q4HPRN or metoclopramide 10 mg IV Q6HPRN or betamethasone (Rinderon) 4 mg IV Q6HPRN if severe nausea/vomiting'
    );

    // Clinical Safety Alerts from Serology, Azole Interactions & ABO/Rh
    if (matchedAzoles.length > 0) {
      if (csaFullDose || tacFullDose) {
        alerts.push({
          level: 'danger',
          text: `Azole 藥物交互作用提醒：Protocol 提及使用 ${matchedAzoles.join('、')}，會抑制 CYP3A4 代謝，目前 Cyclosporine / Tacrolimus 仍為標準劑量，請務必減半（CsA → 0.75 mg/kg；Tacrolimus → PO 0.03 / IV 0.015 mg/kg）並密切監測血中濃度！`,
          action: 'halve_cni'
        });
      } else {
        alerts.push({
          level: 'warn',
          text: `Azole 藥物交互作用提醒：Protocol 提及使用 ${matchedAzoles.join('、')}，請留意與 Cyclosporine、Tacrolimus、Busulfan 等藥物之交互作用與劑量調整（並監測 C0 血中濃度）。`
        });
      }
    }

    if (hbvPositive && !hasHbvDrug) {
      alerts.push({ level: 'warn', text: 'HBV 提醒：病人為 Anti-HBc(+) 或 HBsAg(+)，請於 Other order 開立 HBV prophylaxis（如 Baraclude / Vemlidy）。', action: 'add_hbv' });
    }

    if (mode !== 'auto' && cmvIgGPos && letermovirNHI) {
      alerts.push({
        level: letermovirNHI.eligible ? 'info' : 'warn',
        text: `CMV IgG(+) Letermovir 健保判讀：${letermovirNHI.reason}`,
        action: !state.meds.letermovir ? 'enable_letermovir' : undefined
      });
    }

    if (mode !== 'auto' && (blood.mismatch.includes('Major') || blood.mismatch.includes('Bidirectional'))) {
      alerts.push({ level: 'warn', text: `ABO 不合提醒：${blood.mismatch}（Donor ${state.donor.bloodType} → Recipient ${state.recipient.bloodType}），請留意紅血球去除／抗體效價監測及輸血醫囑。` });
    }
    if (blood.rhWarning) {
      alerts.push({ level: 'danger', text: `Rh(-) 血型不合提醒：${blood.rhStatus}，輸血血品原則上均以 Rh(-) 為主（RBC: ${blood.rbc}${blood.plt ? '；Plt/FFP: ' + blood.plt : ''}）。` });
    }

    // Stem cell order text
    let stemCellLine = '';
    if (mode === 'auto') {
      stemCellLine = `Stem cell infusion on D0 (${fmtMD(d0Date)}) as ward routine.`;
    } else if (mode === 'ptcy') {
      stemCellLine = `Donor PB stem cell infusion on D0 (${fmtMD(d0Date)}, may extend to D+1 if inadequate CD34+ cells) as ward routine.`;
    } else if (state.stemCellSource === 'BM+PBSC') {
      stemCellLine = `Bone marrow stem cell infusion on D0 (${fmtMD(d0Date)}), then peripheral blood stem cell infusion on D+1 (${fmtMD(dayDate(1))}) as ward routine. (may extend to D+2 if inadequate CD34+ cells)`;
    } else {
      stemCellLine = `Peripheral blood stem cell infusion on D0 (${fmtMD(d0Date)}) as ward routine. (may extend to D+1 if inadequate CD34+ cells)`;
    }

    return {
      mode,
      title: mode === 'allo' ? 'Allogeneic HSCT Protocol' : (mode === 'ptcy' ? 'Haplo-PTCy conditioning HSCT Protocol' : 'Auto-HSCT Protocol'),
      anthro,
      admDate,
      admDateStr: admDate ? `${fmtYMD(admDate)}(${WEEKDAYS_LONG[admDate.getDay()]})` : '____/__/__',
      d0Date,
      d0DateStr: d0Date ? `${fmtMD(d0Date)}(${WEEKDAYS_LONG[d0Date.getDay()]})` : '__/__',
      d0MD: fmtMD(d0Date),
      blood,
      hlaCalc,
      letermovirNHI,
      hbvPositive,
      cmvIgGPos,
      gcsfMcg,
      gcsfFluid,
      gcsfSuggest,
      cd34Display: formatCd34Display(state.cd34Dose),
      cd34Pending: isCd34Pending(state.cd34Dose),
      medOrders,
      antiemeticOrders,
      scheduleDays,
      scheduleRows,
      conditioningOrders,
      stemCellLine,
      alerts
    };
  }

  // Smart Paste Parser for Hospital Candidate Table
  // Supports 3 formats:
  //   1) HTML <table> from Google Docs / MS Word / Excel clipboard (lossless cell boundaries!)
  //   2) Tab-separated TSV (Excel / Google Sheets plain text)
  //   3) Vertical line-per-cell plain text (Google Docs / Word plain text paste)
  function cleanBloodType(s) {
    const t = String(s || '').trim().toUpperCase()
      .replace('/POS', '+').replace('/POSITIVE', '+')
      .replace('/NEG', '-').replace('/NEGATIVE', '-')
      .replace(/\s+/g, '');
    const m = t.match(/^(AB|A|B|O)([+-])?/);
    return m ? (m[1] + (m[2] || '+')) : '';
  }

  function applyRowCells(labelRaw, subLabelRaw, valueCells, isAuto, recipient, donor, hla) {
    const k0 = String(labelRaw || '').trim().toLowerCase();
    const k1 = String(subLabelRaw || '').trim().toLowerCase();
    const vals = valueCells.map(v => String(v || '').trim());
    const nonEmpty = vals.filter(v => v !== '');

    if (k0.includes('recipient') || k0 === '' && vals.some(v => /donor/i.test(v))) {
      const donorHdr = vals.find(v => /donor/i.test(v));
      if (!isAuto && donorHdr) donor.label = donorHdr;
      return;
    }

    if (k0.includes('name') && !k0.includes('file')) {
      if (vals[0]) recipient.name = vals[0];
      if (!isAuto && vals[1]) donor.name = vals[1];
    } else if (k0.includes('chart')) {
      if (vals[0]) recipient.chartNo = vals[0];
      if (!isAuto && vals[1]) donor.chartNo = vals[1];
    } else if (k0 === 'age') {
      if (vals[0]) recipient.age = vals[0];
      if (!isAuto && vals[1]) donor.age = vals[1];
    } else if (k0 === 'gender' || k0 === 'sex') {
      if (vals[0]) recipient.gender = vals[0].toUpperCase().startsWith('F') ? 'F' : 'M';
      if (!isAuto && vals[1]) donor.gender = vals[1].toUpperCase().startsWith('F') ? 'F' : 'M';
    } else if (k0.includes('height') || k0.includes('weight') || k0.includes('bh')) {
      const nums = vals.join(' ').match(/\d+(?:\.\d+)?/g) || [];
      if (nums[0]) recipient.height = nums[0];
      if (nums[1]) recipient.weight = nums[1];
      if (!isAuto && nums[2]) donor.height = nums[2];
      if (!isAuto && nums[3]) donor.weight = nums[3];
    } else if (k0.includes('blood')) {
      if (vals[0]) { const bt = cleanBloodType(vals[0]); if (bt) recipient.bloodType = bt; }
      if (!isAuto && vals[1]) { const bt = cleanBloodType(vals[1]); if (bt) donor.bloodType = bt; }
    } else if (['a', 'b', 'c', 'dr', 'dq', 'dp'].includes(k0) || ['a', 'b', 'c', 'dr', 'dq', 'dp'].includes(k1)) {
      const locus = (['a', 'b', 'c', 'dr', 'dq', 'dp'].includes(k1) ? k1 : k0).toUpperCase();
      hla[locus] = [vals[0] || '', vals[1] || '', vals[2] || '', vals[3] || ''];
    } else if (k0.includes('rejection')) {
      if (nonEmpty[0]) hla.rejectionManual = nonEmpty[nonEmpty.length - 1];
    } else if (k0.includes('gvhd')) {
      if (nonEmpty[0]) hla.gvhdManual = nonEmpty[nonEmpty.length - 1];
    } else if (k0.includes('test date') || k0.includes('lab date')) {
      if (vals[0]) recipient.testDate = vals[0];
      if (!isAuto && vals[1]) donor.testDate = vals[1];
    } else if (k0 === 'hbv') {
      if (vals[0]) recipient.hbv = vals[0];
      if (!isAuto && vals[1]) donor.hbv = vals[1];
    } else if (k0 === 'hcv') {
      if (vals[0]) recipient.hcv = vals[0];
      if (!isAuto && vals[1]) donor.hcv = vals[1];
    } else if (k0 === 'cmv') {
      if (vals[0]) recipient.cmv = vals[0];
      if (!isAuto && vals[1]) donor.cmv = vals[1];
    } else if (k0 === 'ebv' || k1 === 'vca' || k0 === 'vca') {
      if (k1 === 'others' || k0 === 'others') {
        if (vals[0]) recipient.ebvOthers = vals[0];
        if (!isAuto && vals[1]) donor.ebvOthers = vals[1];
      } else {
        if (vals[0]) recipient.ebvVca = vals[0];
        if (!isAuto && vals[1]) donor.ebvVca = vals[1];
      }
    } else if (k0 === 'others' || k1 === 'others') {
      if (vals[0]) recipient.ebvOthers = vals[0];
      if (!isAuto && vals[1]) donor.ebvOthers = vals[1];
    } else if (k0 === 'hiv') {
      if (vals[0]) recipient.hiv = vals[0];
      if (!isAuto && vals[1]) donor.hiv = vals[1];
    } else if (k0.includes('htlv')) {
      if (vals[0]) recipient.htlv = vals[0];
      if (!isAuto && vals[1]) donor.htlv = vals[1];
    } else if (k0 === 'vzv') {
      if (vals[0]) recipient.vzv = vals[0];
      if (!isAuto && vals[1]) donor.vzv = vals[1];
    } else if (k0.includes('sts') || k0.includes('rpr')) {
      if (vals[0]) recipient.rpr = vals[0];
      if (!isAuto && vals[1]) donor.rpr = vals[1];
    } else if (k0.includes('toxo')) {
      if (vals[0]) recipient.toxo = vals[0];
      if (!isAuto && vals[1]) donor.toxo = vals[1];
    } else if (k0.includes('other comorbidities') || k0.includes('other comorbidity')) {
      if (vals[0]) recipient.otherComorb = vals[0];
      if (!isAuto && vals[1]) donor.otherComorb = vals[1];
    }
  }

  function extractCellText(td) {
    // Convert block/br elements inside a TD to newlines, trim each line
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

  function parseCandidateHtml(htmlStr, mode) {
    if (!htmlStr || !/<table[\s>]/i.test(htmlStr)) return null;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlStr, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return null;

    const isAuto = mode === 'auto';
    const recipient = {};
    const donor = {};
    const hla = {};

    // Expand rowspan/colspan into a clean logical row list while keeping actual cell groups
    const trs = Array.from(table.querySelectorAll('tr'));
    const activeRowspans = []; // colIdx -> { remaining, text }

    for (const tr of trs) {
      const cells = Array.from(tr.querySelectorAll('th, td'));
      const rowTexts = [];
      let colIdx = 0;

      const consumeSpans = () => {
        while (activeRowspans[colIdx] && activeRowspans[colIdx].remaining > 0) {
          rowTexts.push({ text: activeRowspans[colIdx].text, fromRowspan: true, colspan: 1 });
          activeRowspans[colIdx].remaining--;
          colIdx++;
        }
      };

      consumeSpans();
      for (const td of cells) {
        consumeSpans();
        const cs = Math.max(1, parseInt(td.getAttribute('colspan') || '1', 10));
        const rs = Math.max(1, parseInt(td.getAttribute('rowspan') || '1', 10));
        const txt = extractCellText(td);
        rowTexts.push({ text: txt, fromRowspan: false, colspan: cs });
        if (rs > 1) {
          for (let k = 0; k < cs; k++) {
            activeRowspans[colIdx + k] = { remaining: rs - 1, text: txt };
          }
        }
        colIdx += cs;
      }

      if (rowTexts.length < 2) continue;

      // Determine label, optional sublabel, and value cells
      const t0 = rowTexts[0].text;
      const t1 = rowTexts[1] ? rowTexts[1].text : '';
      const t0Low = t0.toLowerCase();
      const t1Low = t1.toLowerCase();

      const hasSubLabel =
        (t0Low === 'hla' || t0Low === '' || t0Low === 'ebv') &&
        (['a', 'b', 'c', 'dr', 'dq', 'dp', 'vca', 'others'].includes(t1Low));

      if (hasSubLabel) {
        const vals = rowTexts.slice(2).map(c => c.text);
        applyRowCells(t0, t1, vals, isAuto, recipient, donor, hla);
      } else {
        // Check if first row is header ("", "Recipient", "Donor (...)")
        const donorHdrCell = rowTexts.find(c => /donor/i.test(c.text));
        if (donorHdrCell && rowTexts.some(c => /recipient/i.test(c.text))) {
          if (!isAuto) donor.label = donorHdrCell.text;
          continue;
        }
        const vals = rowTexts.slice(1).map(c => c.text);
        applyRowCells(t0, '', vals, isAuto, recipient, donor, hla);
      }
    }

    const foundAny = Object.keys(recipient).length > 0 || Object.keys(donor).length > 0 || Object.keys(hla).length > 0;
    return foundAny ? { recipient, donor, hla, source: 'html' } : null;
  }

  function parseCandidateVertical(rawText, mode) {
    // Handles Google Docs / MS Word plain-text paste where each cell is on its own line (often blank-line separated)
    const isAuto = mode === 'auto';
    const recipient = {};
    const donor = {};
    const hla = {};

    const tokens = String(rawText || '')
      .replace(/\r\n/g, '\n')
      .replace(/\u00a0/g, ' ')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Known row headers in order/pattern
    const isKey = (tok) => {
      const l = tok.toLowerCase().replace(/[:：]+$/, '').trim();
      if ([
        'name', 'chart number', 'chart no.', 'chart no', 'age', 'gender', 'sex',
        'blood type', 'hla', 'a', 'b', 'c', 'dr', 'dq', 'dp',
        'rejection direction', 'gvhd direction', 'test date', 'lab date',
        'hbv', 'hcv', 'cmv', 'ebv', 'vca', 'others', 'hiv', 'htlv1+2', 'htlv 1+2',
        'vzv', 'sts-rpr', 'rpr', 'toxoplasma', 'other comorbidities', 'other comorbidity',
        'flow pra', 'recipient'
      ].includes(l)) return true;
      if (l.startsWith('height') && l.includes('weight')) return true;
      if (l.startsWith('donor')) return true;
      return false;
    };

    // Group tokens into sections keyed by anchor header
    const sections = [];
    let cur = null;
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      const low = tok.toLowerCase().replace(/[:：]+$/, '').trim();
      if (low === 'recipient') {
        cur = { key: 'header', items: [tok] };
        sections.push(cur);
        continue;
      }
      if (low.startsWith('donor') && (!cur || cur.key === 'header')) {
        if (!isAuto) donor.label = tok;
        continue;
      }
      // Guard: inside EBV/VCA/Others or HLA, single-letter 'A'/'B'/'C' could be a locus ONLY after HLA or previous locus
      const isHlaLocus = ['a', 'b', 'c', 'dr', 'dq', 'dp'].includes(low);
      if (isHlaLocus) {
        const prevKey = cur ? cur.key : '';
        if (['hla', 'a', 'b', 'c', 'dr', 'dq', 'dp', 'blood type'].includes(prevKey)) {
          cur = { key: low, items: [] };
          sections.push(cur);
          continue;
        }
      }
      if (isKey(tok) && !isHlaLocus) {
        cur = { key: low, items: [] };
        sections.push(cur);
      } else if (cur) {
        cur.items.push(tok);
      }
    }

    const splitSerologyPair = (items, splitRegex) => {
      if (isAuto) return [items.join('\n'), ''];
      if (items.length <= 1) return [items[0] || '', ''];
      // Find second occurrence of marker (e.g., HBsAg or CMV-IgM)
      const splitIdx = items.findIndex((line, idx) => idx > 0 && splitRegex.test(line));
      if (splitIdx > 0) {
        return [items.slice(0, splitIdx).join('\n'), items.slice(splitIdx).join('\n')];
      }
      // Otherwise if even number of items, split in half; if 2 items, 1 each
      if (items.length === 2) return [items[0], items[1]];
      return [items.join('\n'), ''];
    };

    for (const sec of sections) {
      const k = sec.key;
      const items = sec.items;
      if (k === 'name') {
        if (items[0]) recipient.name = items[0];
        if (!isAuto && items[1]) donor.name = items[1];
      } else if (k.startsWith('chart')) {
        if (items[0]) recipient.chartNo = items[0];
        if (!isAuto && items[1]) donor.chartNo = items[1];
      } else if (k === 'age') {
        if (items[0]) recipient.age = items[0];
        if (!isAuto && items[1]) donor.age = items[1];
      } else if (k === 'gender' || k === 'sex') {
        if (items[0]) recipient.gender = items[0].toUpperCase().startsWith('F') ? 'F' : 'M';
        if (!isAuto && items[1]) donor.gender = items[1].toUpperCase().startsWith('F') ? 'F' : 'M';
      } else if (k.startsWith('height')) {
        const nums = items.join(' ').match(/\d+(?:\.\d+)?/g) || [];
        if (nums[0]) recipient.height = nums[0];
        if (nums[1]) recipient.weight = nums[1];
        if (!isAuto && nums[2]) donor.height = nums[2];
        if (!isAuto && nums[3]) donor.weight = nums[3];
      } else if (k === 'blood type') {
        if (items[0]) { const bt = cleanBloodType(items[0]); if (bt) recipient.bloodType = bt; }
        if (!isAuto && items[1]) { const bt = cleanBloodType(items[1]); if (bt) donor.bloodType = bt; }
      } else if (['a', 'b', 'c', 'dr', 'dq', 'dp'].includes(k)) {
        hla[k.toUpperCase()] = [items[0] || '', items[1] || '', items[2] || '', items[3] || ''];
      } else if (k === 'rejection direction') {
        if (items[0]) hla.rejectionManual = items[items.length - 1];
      } else if (k === 'gvhd direction') {
        if (items[0]) hla.gvhdManual = items[items.length - 1];
      } else if (k === 'test date' || k === 'lab date') {
        if (items[0]) recipient.testDate = items[0];
        if (!isAuto && items[1]) donor.testDate = items[1];
      } else if (k === 'hbv') {
        const [rVal, dVal] = splitSerologyPair(items, /HBsAg/i);
        if (rVal) recipient.hbv = rVal;
        if (dVal) donor.hbv = dVal;
      } else if (k === 'hcv') {
        if (items[0]) recipient.hcv = items[0];
        if (!isAuto && items[1]) donor.hcv = items[1];
      } else if (k === 'cmv') {
        const cmvSplitRe = /^CMV[-\s]*IgM/i.test(items[0] || '') ? /CMV[-\s]*IgM/i : /^IgG\s*\(/i;
        const [rVal, dVal] = splitSerologyPair(items, cmvSplitRe);
        if (rVal) recipient.cmv = rVal;
        if (dVal) donor.cmv = dVal;
      } else if (k === 'vca') {
        if (items[0]) recipient.ebvVca = items[0];
        if (!isAuto && items[1]) donor.ebvVca = items[1];
      } else if (k === 'others') {
        const [rVal, dVal] = splitSerologyPair(items, /EBNA|EA\s*IgG/i);
        if (rVal) recipient.ebvOthers = rVal;
        if (dVal) donor.ebvOthers = dVal;
      } else if (k === 'hiv') {
        if (items[0]) recipient.hiv = items[0];
        if (!isAuto && items[1]) donor.hiv = items[1];
      } else if (k.startsWith('htlv')) {
        if (items[0]) recipient.htlv = items[0];
        if (!isAuto && items[1]) donor.htlv = items[1];
      } else if (k === 'vzv') {
        if (items[0]) recipient.vzv = items[0];
        if (!isAuto && items[1]) donor.vzv = items[1];
      } else if (k === 'sts-rpr' || k === 'rpr') {
        if (items[0]) recipient.rpr = items[0];
        if (!isAuto && items[1]) donor.rpr = items[1];
      } else if (k === 'toxoplasma') {
        if (items[0]) recipient.toxo = items[0];
        if (!isAuto && items[1]) donor.toxo = items[1];
      } else if (k.startsWith('other comorbid')) {
        if (items[0]) recipient.otherComorb = items[0];
        if (!isAuto && items[1]) donor.otherComorb = items[1];
      }
    }

    return { recipient, donor, hla, source: 'vertical' };
  }

  function parseCandidateTable(rawText, mode, rawHtml) {
    // Priority 1: HTML <table> from clipboard (Google Docs / Word / Excel)
    if (rawHtml) {
      const htmlParsed = parseCandidateHtml(rawHtml, mode);
      if (htmlParsed) return htmlParsed;
    }

    const text = String(rawText || '');
    const hasTabs = text.includes('\t');
    // Priority 2: Vertical line-per-cell paste (Google Docs / Word plain text)
    if (!hasTabs) {
      return parseCandidateVertical(text, mode);
    }

    // Priority 3: Tab-separated TSV (Excel / Google Sheets)
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const recipient = {};
    const donor = {};
    const hla = {};
    const isAuto = mode === 'auto';
    let lastSection = '';

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      if (!rawLine.trim()) continue;
      const cols = rawLine.split('\t').map(c => c.trim());
      const k0 = (cols[0] || '').toLowerCase();
      const k1 = (cols[1] || '').toLowerCase();
      const nonEmptyAfter = (idx) => cols.slice(idx).filter(x => x !== '');

      if (k0 === '' && cols.some(c => /donor/i.test(c))) {
        const dh = cols.find(c => /donor/i.test(c));
        if (!isAuto && dh) donor.label = dh;
      } else if (k0.includes('name') && !k0.includes('file')) {
        const vals = nonEmptyAfter(1);
        if (vals[0]) recipient.name = vals[0];
        if (!isAuto && vals[1]) donor.name = vals[1];
        lastSection = 'name';
      } else if (k0.includes('chart')) {
        const vals = nonEmptyAfter(1);
        if (vals[0]) recipient.chartNo = vals[0];
        if (!isAuto && vals[1]) donor.chartNo = vals[1];
        lastSection = 'chart';
      } else if (k0 === 'age') {
        const vals = nonEmptyAfter(1);
        if (vals[0]) recipient.age = vals[0];
        if (!isAuto && vals[1]) donor.age = vals[1];
        lastSection = 'age';
      } else if (k0 === 'gender' || k0 === 'sex') {
        const vals = nonEmptyAfter(1);
        if (vals[0]) recipient.gender = vals[0].toUpperCase().startsWith('F') ? 'F' : 'M';
        if (!isAuto && vals[1]) donor.gender = vals[1].toUpperCase().startsWith('F') ? 'F' : 'M';
        lastSection = 'gender';
      } else if (k0.includes('height') || k0.includes('weight') || k0.includes('bh')) {
        const nums = cols.slice(1).join(' ').match(/\d+(?:\.\d+)?/g) || [];
        if (nums[0]) recipient.height = nums[0];
        if (nums[1]) recipient.weight = nums[1];
        if (!isAuto && nums[2]) donor.height = nums[2];
        if (!isAuto && nums[3]) donor.weight = nums[3];
        lastSection = 'hw';
      } else if (k0.includes('blood')) {
        const vals = nonEmptyAfter(1);
        if (vals[0]) { const bt = cleanBloodType(vals[0]); if (bt) recipient.bloodType = bt; }
        if (!isAuto && vals[1]) { const bt = cleanBloodType(vals[1]); if (bt) donor.bloodType = bt; }
        lastSection = 'blood';
      } else if (['a', 'b', 'c', 'dr', 'dq', 'dp'].includes(k0) || ['a', 'b', 'c', 'dr', 'dq', 'dp'].includes(k1)) {
        const isCol0 = ['a', 'b', 'c', 'dr', 'dq', 'dp'].includes(k0);
        const locus = (isCol0 ? k0 : k1).toUpperCase();
        const startIdx = isCol0 ? 1 : 2;
        let trimmed = cols.slice(startIdx);
        while (trimmed.length > 4 && trimmed[0] === '') trimmed = trimmed.slice(1);
        hla[locus] = [trimmed[0] || '', trimmed[1] || '', trimmed[2] || '', trimmed[3] || ''];
        lastSection = 'hla';
      } else if (k0.includes('rejection')) {
        const vals = nonEmptyAfter(1);
        if (vals[0]) hla.rejectionManual = vals[vals.length - 1];
      } else if (k0.includes('gvhd')) {
        const vals = nonEmptyAfter(1);
        if (vals[0]) hla.gvhdManual = vals[vals.length - 1];
      } else if (k0.includes('test date') || k0.includes('lab date')) {
        const vals = nonEmptyAfter(1);
        if (vals[0]) recipient.testDate = vals[0];
        if (!isAuto && vals[1]) donor.testDate = vals[1];
        lastSection = 'testDate';
      } else if (k0 === 'hbv') {
        const vals = nonEmptyAfter(1);
        if (vals[0]) recipient.hbv = vals[0];
        if (!isAuto && vals[1]) donor.hbv = vals[1];
        lastSection = 'hbv';
      } else if (k0 === 'hcv') {
        const vals = nonEmptyAfter(1);
        if (vals[0]) recipient.hcv = vals[0];
        if (!isAuto && vals[1]) donor.hcv = vals[1];
        lastSection = 'hcv';
      } else if (k0 === 'cmv') {
        const vals = nonEmptyAfter(1);
        if (vals[0]) recipient.cmv = vals[0];
        if (!isAuto && vals[1]) donor.cmv = vals[1];
        lastSection = 'cmv';
      } else if (k0 === 'ebv' || k1 === 'vca') {
        const vals = cols.slice(k1 === 'vca' ? 2 : 1).filter(x => x !== '' && x.toLowerCase() !== 'vca');
        if (vals[0]) recipient.ebvVca = vals[0];
        if (!isAuto && vals[1]) donor.ebvVca = vals[1];
        lastSection = 'ebvVca';
      } else if (k0 === 'others' || k1 === 'others') {
        const vals = cols.slice(k1 === 'others' ? 2 : 1).filter(x => x !== '');
        if (vals[0]) recipient.ebvOthers = vals[0];
        if (!isAuto && vals[1]) donor.ebvOthers = vals[1];
        lastSection = 'ebvOthers';
      } else if (k0 === 'hiv') {
        const vals = nonEmptyAfter(1);
        if (vals[0]) recipient.hiv = vals[0];
        if (!isAuto && vals[1]) donor.hiv = vals[1];
        lastSection = 'hiv';
      } else if (k0.includes('htlv')) {
        const vals = nonEmptyAfter(1);
        if (vals[0]) recipient.htlv = vals[0];
        if (!isAuto && vals[1]) donor.htlv = vals[1];
        lastSection = 'htlv';
      } else if (k0 === 'vzv') {
        const vals = nonEmptyAfter(1);
        if (vals[0]) recipient.vzv = vals[0];
        if (!isAuto && vals[1]) donor.vzv = vals[1];
        lastSection = 'vzv';
      } else if (k0.includes('sts') || k0.includes('rpr')) {
        const vals = nonEmptyAfter(1);
        if (vals[0]) recipient.rpr = vals[0];
        if (!isAuto && vals[1]) donor.rpr = vals[1];
        lastSection = 'rpr';
      } else if (k0.includes('toxo')) {
        const vals = nonEmptyAfter(1);
        if (vals[0]) recipient.toxo = vals[0];
        if (!isAuto && vals[1]) donor.toxo = vals[1];
        lastSection = 'toxo';
      } else if (cols.length === 1 && ['hbv', 'cmv', 'ebvOthers'].includes(lastSection)) {
        recipient[lastSection] = (recipient[lastSection] ? recipient[lastSection] + '\n' : '') + cols[0];
      }
    }

    return { recipient, donor, hla, source: 'tsv' };
  }

  return {
    mround,
    roundTo,
    parseDateISO,
    addDays,
    fmtMD,
    fmtYMD,
    fmtDayLabel,
    fmtDayRange,
    calcAnthropometrics,
    calcBloodProducts,
    calcHLA,
    inferDonorRelation,
    evalLetermovirNHI,
    tokenizeOrderDates,
    tokenizePositiveBold,
    calcAtgDoses,
    suggestGcsf,
    formatCd34Display,
    deriveGvhdProphylaxis,
    computeProtocol,
    parseCandidateTable
  };
})();
