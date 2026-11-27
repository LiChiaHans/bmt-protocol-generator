// BMT Protocol Generator UI Controller
(function () {
  const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

  let state = deepClone(window.BMT_EMPTY_STATES.allo);
  let activeView = 'editor'; // 'editor' | 'reference'
  let refFilter = 'all';
  let refSearch = '';

  const $ = (id) => document.getElementById(id);

  function showToast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function escHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderPositiveBoldHtml(text) {
    const tokens = window.BMTCalc.tokenizePositiveBold(text);
    return tokens.map(tk => {
      if (tk.text === '\n') return '\n';
      const safe = escHtml(tk.text);
      return tk.bold ? `<strong>${safe}</strong>` : safe;
    }).join('');
  }

  function renderDirectionRatioHtml(text, colorHex) {
    const s = String(text || '');
    const m = s.match(/^(.*?)(\d+\s*\/\s*\d+)(.*)$/);
    if (!m) return escHtml(s);
    return `${escHtml(m[1])}<strong style="color:${colorHex};">${escHtml(m[2])}</strong>${escHtml(m[3])}`;
  }

  function renderRichOrderHtml(text) {
    if (String(text || '').startsWith('# [提醒]')) {
      return `<span class="adj-red">${escHtml(text)}</span>`;
    }
    const tokens = window.BMTCalc.tokenizeOrderDates(text);
    return tokens.map(tk => {
      const safe = escHtml(tk.text);
      if (tk.red) return `<span style="color:#ff0000;">${safe}</span>`;
      return tk.royalBlue ? `<span class="royal-blue-date">${safe}</span>` : safe;
    }).join('');
  }

  function dayOptions(min, max, selected) {
    let html = '';
    for (let d = min; d <= max; d++) {
      const label = d > 0 ? `D+${d}` : (d === 0 ? 'D0' : `D${d}`);
      html += `<option value="${d}" ${Number(selected) === d ? 'selected' : ''}>${label}</option>`;
    }
    return html;
  }

  // --- Full Re-render (when switching mode, applying preset, loading demo/JSON, or pasting) ---
  function renderAll() {
    // Ensure backwards-compatible nested drug objects (e.g., tacrolimus in Allo loaded from older drafts)
    if (state.mode === 'allo' && state.drugs && !state.drugs.tacrolimus) {
      state.drugs.tacrolimus = { enabled: false, route: 'PO', dose: 0.06, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' };
    }

    document.querySelectorAll('.mode-tab').forEach(btn => {
      const isActive = activeView === 'reference'
        ? btn.dataset.mode === 'reference'
        : btn.dataset.mode === state.mode;
      btn.classList.toggle('active', isActive);
    });

    const ed = $('editorWorkspace');
    const rf = $('referencePage');
    if (activeView === 'reference') {
      if (ed) ed.style.display = 'none';
      if (rf) rf.style.display = 'block';
      renderReferencePage();
      return;
    }
    if (ed) ed.style.display = '';
    if (rf) rf.style.display = 'none';

    $('dosingBasisSelect').value = state.dosingBasis || 'adjusted';
    $('customConditioningNotes').value = state.customConditioningNotes || '';

    renderCandidateTable();
    renderClinicalInfo();
    renderPresets();
    renderDrugList();
    renderMeds();
    updateDynamicViews();
  }

  // --- Dynamic-only Refresh (preserves active input focus while typing!) ---
  function updateDynamicViews() {
    const calc = window.BMTCalc.computeProtocol(state);
    renderAlerts(calc);
    renderAnthroStrip(calc);
    updateHlaHighlights(calc);
    renderScheduleEditor(calc);
    renderLivePreview(calc);
    updateDrugPills(calc);
    updateAboBadge(calc);
    const gcsfHint = $('gcsfComboHint');
    if (gcsfHint && calc.gcsfSuggest) {
      gcsfHint.textContent = state.meds.gcsfAuto
        ? `自動：${calc.gcsfSuggest.mcg} mcg (${calc.gcsfSuggest.comboText}) → N/S ${calc.gcsfSuggest.fluid} ml`
        : `手動：${calc.gcsfMcg} mcg → N/S ${calc.gcsfFluid} ml (劑量÷15=${Math.round(calc.gcsfMcg / 15)} ml)`;
    }
    const gMcgInp = $('gcsfMcgInput');
    const gFlInp = $('gcsfFluidInput');
    if (state.meds.gcsfAuto) {
      if (gMcgInp) gMcgInp.value = calc.gcsfMcg;
      if (gFlInp) gFlInp.value = calc.gcsfFluid;
    }
  }

  function updateAboBadge(calc) {
    const badge = $('aboSummaryBadge');
    if (state.mode === 'auto') {
      badge.style.display = 'none';
      return;
    }
    badge.style.display = 'inline-block';
    badge.textContent = calc.blood.mismatch === '未知'
      ? 'ABO: 待填入血型'
      : `ABO: ${calc.blood.mismatch} | RBC: ${calc.blood.rbc} | Plt/FFP: ${calc.blood.plt}`;
  }

  function renderAlerts(calc) {
    const box = $('alertsBox');
    if (!calc.alerts.length) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = calc.alerts.map(a => {
      const cls = a.level === 'danger' ? 'alert-danger' : (a.level === 'warn' ? 'alert-warn' : 'alert-info');
      const icon = a.level === 'danger' ? '🚨' : (a.level === 'warn' ? '⚠️' : 'ℹ️');
      let actionBtn = '';
      if (a.action === 'add_hbv') {
        actionBtn = `<div style="display:flex; gap:6px; flex-shrink:0;">
            <button class="btn btn-outline btn-sm" data-quick-hbv="baraclude">+ 加 Baraclude</button>
            <button class="btn btn-outline btn-sm" data-quick-hbv="vemlidy">+ 加 Vemlidy</button>
           </div>`;
      } else if (a.action === 'enable_letermovir') {
        actionBtn = `<button class="btn btn-outline btn-sm" data-quick-letermovir="1" style="flex-shrink:0;">+ 啟用 Letermovir</button>`;
      } else if (a.action === 'halve_cni') {
        actionBtn = `<button class="btn btn-outline btn-sm" data-quick-halve-cni="1" style="flex-shrink:0;">⚡ 減半 CsA / Tacrolimus</button>`;
      }
      return `<div class="alert-item ${cls}"><span>${icon} ${escHtml(a.text)}</span>${actionBtn}</div>`;
    }).join('');

    box.querySelectorAll('[data-quick-hbv]').forEach(btn => {
      btn.addEventListener('click', () => {
        const line = btn.dataset.quickHbv === 'baraclude'
          ? '0.5 Baraclude 0.5 mg/tab for CDC Approval 1 tab QDAC PO'
          : 'Vemlidy for CDC Approval 25 mg/tab 1 tab QDPC PO';
        state.meds.otherOrders = state.meds.otherOrders
          ? `${state.meds.otherOrders.trim()}\n${line}`
          : line;
        const ta = $('otherOrdersInput');
        if (ta) ta.value = state.meds.otherOrders;
        updateDynamicViews();
        showToast('已加入 B 肝抗病毒預防用藥至 Other order');
      });
    });

    box.querySelectorAll('[data-quick-letermovir]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.meds.letermovir = true;
        state.meds.letermovirAutoNote = true;
        renderMeds();
        updateDynamicViews();
        showToast('已啟用 Letermovir 並自動帶入健保條件判讀');
      });
    });

    box.querySelectorAll('[data-quick-halve-cni]').forEach(btn => {
      btn.addEventListener('click', () => {
        const D = state.drugs || {};
        const adjusted = [];
        if (D.csa && D.csa.enabled && Number(D.csa.dose) > 0.75) {
          D.csa.dose = 0.75;
          adjusted.push('CsA → 0.75 mg/kg');
        }
        if (D.tacrolimus && D.tacrolimus.enabled) {
          if (D.tacrolimus.route === 'IV' && Number(D.tacrolimus.dose) > 0.015) {
            D.tacrolimus.dose = 0.015;
            adjusted.push('Tacrolimus IV → 0.015 mg/kg/day');
          } else if (D.tacrolimus.route !== 'IV' && Number(D.tacrolimus.dose) > 0.03) {
            D.tacrolimus.dose = 0.03;
            adjusted.push('Tacrolimus PO → 0.03 mg/kg');
          }
        }
        renderDrugList();
        updateDynamicViews();
        showToast(adjusted.length ? `已自動減半：${adjusted.join('、')}` : '目前劑量已為減半劑量');
      });
    });
  }

  function renderAnthroStrip(calc) {
    const a = calc.anthro;
    const hasHW = a.actualBW > 0 && a.height > 0;
    const isAdj = state.dosingBasis !== 'actual';
    $('anthroStrip').innerHTML = `
      <div class="metric-box">
        <div class="label">Actual BW / BSA</div>
        <div class="val">${hasHW ? `${a.actualBW} kg <span style="font-size:12px;font-weight:600;color:#64748b;">(${a.actualBSA.toFixed(2)} m²)</span>` : '—'}</div>
      </div>
      <div class="metric-box">
        <div class="label">Ideal BW (BMI 22)</div>
        <div class="val">${hasHW ? `${a.ibwBMI.toFixed(1)} kg` : '—'}</div>
      </div>
      <div class="metric-box">
        <div class="label">Ideal BW (BMT CTN)</div>
        <div class="val">${hasHW ? `${a.ibwCTN.toFixed(1)} kg` : '—'}</div>
      </div>
      <div class="metric-box adj-metric">
        <div class="label">Adjusted BW${isAdj ? '<br><span style="color:#ff0000;">★使用中</span>' : ''}</div>
        <div class="val">${hasHW ? `${a.adjBW.toFixed(1)} kg` : '—'}</div>
      </div>
      <div class="metric-box adj-metric">
        <div class="label">Adjusted BSA${isAdj ? '<br><span style="color:#ff0000;">★使用中</span>' : ''}</div>
        <div class="val">${hasHW ? `${a.adjBSA.toFixed(2)} m²` : '—'}</div>
      </div>
      <div class="metric-box highlight">
        <div class="label">預計 D0 移植日</div>
        <div class="val" style="font-size:14px;">${state.admissionDate ? escHtml(calc.d0DateStr) : '待填入院日'}</div>
      </div>
    `;
    let formulaEl = $('anthroFormulaNote');
    if (!formulaEl) {
      formulaEl = document.createElement('div');
      formulaEl.id = 'anthroFormulaNote';
      formulaEl.className = 'formula-note';
      $('anthroStrip').insertAdjacentElement('afterend', formulaEl);
    }
    formulaEl.innerHTML = `<strong>計算公式：</strong>Ideal BW (BMI 22) = (身高 m)² × 22；<strong>Adjusted BW</strong> = IBW + 0.25 × (Actual BW − IBW)（若 Actual BW &lt; IBW 則直接取 Actual BW）；<strong>BSA (Mosteller)</strong> = √(身高 cm × 體重 kg / 3600)`;
  }

  // --- Step 1: Candidate Editable Table ---
  function renderCandidateTable() {
    const isAuto = state.mode === 'auto';
    const r = state.recipient;
    const d = state.donor;
    const btOpts = (val) => `<option value="" ${!val ? 'selected' : ''}>--</option>` + ['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-']
      .map(bt => `<option value="${bt}" ${val === bt ? 'selected' : ''}>${bt}</option>`).join('');
    const genderOpts = (val, showLabel) => `<option value="" ${!val ? 'selected' : ''}>--</option>` +
      `<option value="M" ${val === 'M' ? 'selected' : ''}>${showLabel ? 'M (男)' : 'M'}</option>` +
      `<option value="F" ${val === 'F' ? 'selected' : ''}>${showLabel ? 'F (女)' : 'F'}</option>`;

    if (isAuto) {
      $('candidateTableContainer').innerHTML = `
        <table class="cand-table">
          <tbody>
            <tr><td class="lbl" colspan="2">Name</td><td colspan="2"><input data-path="recipient.name" value="${escHtml(r.name)}"></td></tr>
            <tr><td class="lbl" colspan="2">Chart No.</td><td colspan="2"><input data-path="recipient.chartNo" value="${escHtml(r.chartNo)}"></td></tr>
            <tr><td class="lbl" colspan="2">Age</td><td colspan="2"><input type="number" data-path="recipient.age" value="${escHtml(r.age)}" placeholder="Age"></td></tr>
            <tr><td class="lbl" colspan="2">Gender</td><td colspan="2"><select data-path="recipient.gender">${genderOpts(r.gender, true)}</select></td></tr>
            <tr><td class="lbl" colspan="2">Height(cm) | Weight(kg)</td>
              <td><input type="number" step="0.1" data-path="recipient.height" value="${escHtml(r.height)}" placeholder="身高 cm"></td>
              <td><input type="number" step="0.1" data-path="recipient.weight" value="${escHtml(r.weight)}" placeholder="體重 kg"></td>
            </tr>
            <tr><td class="lbl" colspan="2">Blood type</td><td colspan="2"><select data-path="recipient.bloodType">${btOpts(r.bloodType)}</select></td></tr>
            <tr><td class="lbl" colspan="2">Test date</td><td colspan="2"><input data-path="recipient.testDate" value="${escHtml(r.testDate)}" placeholder="YYYY/MM/DD"></td></tr>
            <tr><td class="lbl" colspan="2">HBV</td><td colspan="2"><textarea rows="4" data-path="recipient.hbv">${escHtml(r.hbv)}</textarea></td></tr>
            <tr><td class="lbl" colspan="2">HCV</td><td colspan="2"><input data-path="recipient.hcv" value="${escHtml(r.hcv)}"></td></tr>
            <tr><td class="lbl" colspan="2">CMV</td><td colspan="2"><textarea rows="3" data-path="recipient.cmv">${escHtml(r.cmv)}</textarea></td></tr>
            <tr><td class="lbl" rowspan="2">EBV</td><td class="sublbl">VCA</td><td colspan="2"><input data-path="recipient.ebvVca" value="${escHtml(r.ebvVca)}"></td></tr>
            <tr><td class="sublbl">Others</td><td colspan="2"><textarea rows="2" data-path="recipient.ebvOthers">${escHtml(r.ebvOthers)}</textarea></td></tr>
            <tr><td class="lbl" colspan="2">HIV</td><td colspan="2"><input data-path="recipient.hiv" value="${escHtml(r.hiv)}"></td></tr>
            <tr><td class="lbl" colspan="2">HTLV1+2</td><td colspan="2"><input data-path="recipient.htlv" value="${escHtml(r.htlv)}"></td></tr>
            <tr><td class="lbl" colspan="2">VZV</td><td colspan="2"><input data-path="recipient.vzv" value="${escHtml(r.vzv)}"></td></tr>
            <tr><td class="lbl" colspan="2">STS-RPR</td><td colspan="2"><input data-path="recipient.rpr" value="${escHtml(r.rpr)}"></td></tr>
            <tr><td class="lbl" colspan="2">Toxoplasma</td><td colspan="2"><input data-path="recipient.toxo" value="${escHtml(r.toxo)}"></td></tr>
            <tr><td class="lbl" colspan="2">Other comorbidities</td><td colspan="2"><input data-path="recipient.otherComorb" value="${escHtml(r.otherComorb)}"></td></tr>
          </tbody>
        </table>
      `;
    } else {
      const loci = ['A', 'B', 'C', 'DR', 'DQ', 'DP'];
      const hlaRows = loci.map((loc, idx) => {
        const vals = state.hla[loc] || ['', '', '', ''];
        return `<tr>
          ${idx === 0 ? `<td class="lbl" rowspan="6" style="text-align:center;width:78px;"><strong>HLA</strong></td>` : ''}
          <td class="sublbl">${loc}</td>
          <td><input data-hla="${loc}.0" value="${escHtml(vals[0])}" style="text-align:center;"></td>
          <td><input data-hla="${loc}.1" value="${escHtml(vals[1])}" style="text-align:center;"></td>
          <td><input data-hla="${loc}.2" value="${escHtml(vals[2])}" style="text-align:center;"></td>
          <td><input data-hla="${loc}.3" value="${escHtml(vals[3])}" style="text-align:center;"></td>
        </tr>`;
      }).join('');

      $('candidateTableContainer').innerHTML = `
        <table class="cand-table">
          <thead>
            <tr>
              <th colspan="2">項目</th>
              <th colspan="2">Recipient（受贈者）</th>
              <th colspan="2"><input data-path="donor.label" value="${escHtml(d.label || 'Donor')}" style="text-align:center;font-weight:700;background:#e2e8f0;"></th>
            </tr>
          </thead>
          <tbody>
            <tr><td class="lbl" colspan="2">Name</td>
              <td colspan="2"><input data-path="recipient.name" value="${escHtml(r.name)}"></td>
              <td colspan="2"><input data-path="donor.name" value="${escHtml(d.name)}"></td>
            </tr>
            <tr><td class="lbl" colspan="2">Chart number</td>
              <td colspan="2"><input data-path="recipient.chartNo" value="${escHtml(r.chartNo)}"></td>
              <td colspan="2"><input data-path="donor.chartNo" value="${escHtml(d.chartNo)}"></td>
            </tr>
            <tr><td class="lbl" colspan="2">Age</td>
              <td colspan="2"><input type="number" data-path="recipient.age" value="${escHtml(r.age)}"></td>
              <td colspan="2"><input type="number" data-path="donor.age" value="${escHtml(d.age)}"></td>
            </tr>
            <tr><td class="lbl" colspan="2">Gender</td>
              <td colspan="2"><select data-path="recipient.gender">${genderOpts(r.gender, false)}</select></td>
              <td colspan="2"><select data-path="donor.gender">${genderOpts(d.gender, false)}</select></td>
            </tr>
            <tr><td class="lbl" colspan="2">Height(cm) | Weight(kg)</td>
              <td><input type="number" step="0.1" data-path="recipient.height" value="${escHtml(r.height)}" placeholder="cm"></td>
              <td><input type="number" step="0.1" data-path="recipient.weight" value="${escHtml(r.weight)}" placeholder="kg"></td>
              <td><input type="number" step="0.1" data-path="donor.height" value="${escHtml(d.height)}" placeholder="cm"></td>
              <td><input type="number" step="0.1" data-path="donor.weight" value="${escHtml(d.weight)}" placeholder="kg"></td>
            </tr>
            <tr><td class="lbl" colspan="2">Blood type</td>
              <td colspan="2"><select data-path="recipient.bloodType">${btOpts(r.bloodType)}</select></td>
              <td colspan="2"><select data-path="donor.bloodType">${btOpts(d.bloodType)}</select></td>
            </tr>
            ${hlaRows}
            <tr><td class="lbl" colspan="2">Rejection direction</td>
              <td colspan="2" id="hlaRejDetail" style="color:#64748b;font-size:11px;text-align:center;line-height:1.35;">(Host-vs-Graft)</td>
              <td colspan="2"><input id="hlaRejInput" data-path="hla.rejectionManual" value="${escHtml(state.hla.rejectionManual)}" placeholder="填入 HLA 自動計算" style="text-align:center;font-weight:700;"></td>
            </tr>
            <tr><td class="lbl" colspan="2">GvHD direction</td>
              <td colspan="2" id="hlaGvhdDetail" style="color:#64748b;font-size:11px;text-align:center;line-height:1.35;">(Graft-vs-Host)</td>
              <td colspan="2"><input id="hlaGvhdInput" data-path="hla.gvhdManual" value="${escHtml(state.hla.gvhdManual)}" placeholder="填入 HLA 自動計算" style="text-align:center;font-weight:700;"></td>
            </tr>
            <tr><td class="lbl" colspan="2">Test date</td>
              <td colspan="2"><input data-path="recipient.testDate" value="${escHtml(r.testDate)}"></td>
              <td colspan="2"><input data-path="donor.testDate" value="${escHtml(d.testDate)}"></td>
            </tr>
            <tr><td class="lbl" colspan="2">HBV</td>
              <td colspan="2"><textarea rows="4" data-path="recipient.hbv">${escHtml(r.hbv)}</textarea></td>
              <td colspan="2"><textarea rows="4" data-path="donor.hbv">${escHtml(d.hbv)}</textarea></td>
            </tr>
            <tr><td class="lbl" colspan="2">HCV</td>
              <td colspan="2"><input data-path="recipient.hcv" value="${escHtml(r.hcv)}"></td>
              <td colspan="2"><input data-path="donor.hcv" value="${escHtml(d.hcv)}"></td>
            </tr>
            <tr><td class="lbl" colspan="2">CMV</td>
              <td colspan="2"><textarea rows="3" data-path="recipient.cmv">${escHtml(r.cmv)}</textarea></td>
              <td colspan="2"><textarea rows="3" data-path="donor.cmv">${escHtml(d.cmv)}</textarea></td>
            </tr>
            <tr><td class="lbl" rowspan="2">EBV</td><td class="sublbl">VCA</td>
              <td colspan="2"><input data-path="recipient.ebvVca" value="${escHtml(r.ebvVca)}"></td>
              <td colspan="2"><input data-path="donor.ebvVca" value="${escHtml(d.ebvVca)}"></td>
            </tr>
            <tr><td class="sublbl">Others</td>
              <td colspan="2"><textarea rows="2" data-path="recipient.ebvOthers">${escHtml(r.ebvOthers)}</textarea></td>
              <td colspan="2"><textarea rows="2" data-path="donor.ebvOthers">${escHtml(d.ebvOthers)}</textarea></td>
            </tr>
            <tr><td class="lbl" colspan="2">HIV</td>
              <td colspan="2"><input data-path="recipient.hiv" value="${escHtml(r.hiv)}"></td>
              <td colspan="2"><input data-path="donor.hiv" value="${escHtml(d.hiv)}"></td>
            </tr>
            <tr><td class="lbl" colspan="2">HTLV1+2</td>
              <td colspan="2"><input data-path="recipient.htlv" value="${escHtml(r.htlv)}"></td>
              <td colspan="2"><input data-path="donor.htlv" value="${escHtml(d.htlv)}"></td>
            </tr>
            <tr><td class="lbl" colspan="2">VZV</td>
              <td colspan="2"><input data-path="recipient.vzv" value="${escHtml(r.vzv)}"></td>
              <td colspan="2"><input data-path="donor.vzv" value="${escHtml(d.vzv)}"></td>
            </tr>
            <tr><td class="lbl" colspan="2">STS-RPR</td>
              <td colspan="2"><input data-path="recipient.rpr" value="${escHtml(r.rpr)}"></td>
              <td colspan="2"><input data-path="donor.rpr" value="${escHtml(d.rpr)}"></td>
            </tr>
            <tr><td class="lbl" colspan="2">Toxoplasma</td>
              <td colspan="2"><input data-path="recipient.toxo" value="${escHtml(r.toxo)}"></td>
              <td colspan="2"><input data-path="donor.toxo" value="${escHtml(d.toxo)}"></td>
            </tr>
            <tr><td class="lbl" colspan="2">Other comorbidities</td>
              <td colspan="2"><input data-path="recipient.otherComorb" value="${escHtml(r.otherComorb)}"></td>
              <td colspan="2"><input data-path="donor.otherComorb" value="${escHtml(d.otherComorb)}"></td>
            </tr>
          </tbody>
        </table>
      `;

      const autoChk = $('hlaAutoCalcChk');
      if (autoChk) {
        autoChk.addEventListener('change', () => {
          if (!autoChk.checked) {
            const cur = window.BMTCalc.calcHLA(state.hla);
            if (!state.hla.rejectionManual && cur.rejectionText) state.hla.rejectionManual = cur.rejectionText;
            if (!state.hla.gvhdManual && cur.gvhdText) state.hla.gvhdManual = cur.gvhdText;
          }
          state.hla.autoCalc = autoChk.checked;
          updateDynamicViews();
        });
      }
    }

    // Bind candidate table inputs
    const container = $('candidateTableContainer');
    container.querySelectorAll('[data-path]').forEach(el => {
      el.addEventListener('input', () => {
        const [sec, key] = el.dataset.path.split('.');
        state[sec][key] = el.value;
        updateDynamicViews();
      });
    });
    container.querySelectorAll('[data-hla]').forEach(el => {
      el.addEventListener('input', () => {
        const [loc, idx] = el.dataset.hla.split('.');
        if (!state.hla[loc]) state.hla[loc] = ['', '', '', ''];
        state.hla[loc][Number(idx)] = el.value;
        updateDynamicViews();
      });
    });
  }

  function updateHlaHighlights(calc) {
    if (!calc.hlaCalc) return;
    const h = calc.hlaCalc;
    const container = $('candidateTableContainer');
    ['A', 'B', 'C', 'DR', 'DQ', 'DP'].forEach(loc => {
      const mm = h.loci[loc];
      const flags = [mm.r1Mismatch, mm.r2Mismatch, mm.d1Mismatch, mm.d2Mismatch];
      flags.forEach((isMm, idx) => {
        const inp = container.querySelector(`[data-hla="${loc}.${idx}"]`);
        if (inp) {
          inp.classList.toggle('hla-mismatch', idx < 2 && Boolean(isMm));
          inp.classList.toggle('hla-mismatch-donor', idx >= 2 && Boolean(isMm));
        }
      });
    });
    const rej = $('hlaRejInput');
    const gvhd = $('hlaGvhdInput');
    const rejDetail = $('hlaRejDetail');
    const gvhdDetail = $('hlaGvhdDetail');
    if (rej) {
      rej.style.color = '#0007ff';
      if (state.hla.autoCalc) {
        rej.value = h.rejectionText;
        rej.readOnly = true;
      } else {
        rej.readOnly = false;
      }
    }
    if (gvhd) {
      gvhd.style.color = '#ff0000';
      if (state.hla.autoCalc) {
        gvhd.value = h.gvhdText;
        gvhd.readOnly = true;
      } else {
        gvhd.readOnly = false;
      }
    }
    if (rejDetail) {
      if (h.totalPossible > 0) {
        const lociLbl = (h.testedLoci || []).join('/');
        rejDetail.textContent = h.rejMismatches && h.rejMismatches.length
          ? `HvG (${lociLbl}) · R缺: ${h.rejMismatches.join(', ')}`
          : `HvG (${lociLbl}) · 全相符`;
      } else {
        rejDetail.textContent = '(Host-vs-Graft · 填入 HLA 自動計算)';
      }
    }
    if (gvhdDetail) {
      if (h.totalPossible > 0) {
        const lociLbl = (h.testedLoci || []).join('/');
        gvhdDetail.textContent = h.gvhdMismatches && h.gvhdMismatches.length
          ? `GvH (${lociLbl}) · D缺: ${h.gvhdMismatches.join(', ')}`
          : `GvH (${lociLbl}) · 全相符`;
      } else {
        gvhdDetail.textContent = '(Graft-vs-Host · 填入 HLA 自動計算)';
      }
    }
    const relHint = $('donorRelationAutoHint');
    if (relHint && calc.letermovirNHI) {
      const rel = calc.letermovirNHI.relation;
      if (state.donorRelation && state.donorRelation !== 'auto') {
        relHint.textContent = `手動指定：${calc.letermovirNHI.relationLabel}`;
      } else if (rel === 'unrelated') {
        relHint.textContent = '自動判讀：非親屬間捐贈 (MUD/MMUD)';
      } else if (rel === 'related') {
        relHint.textContent = '自動判讀：親屬間捐贈 (Donor 有姓名)';
      } else {
        relHint.textContent = '自動判讀：待填入 Donor 名稱（親屬填姓名、非親屬填 MUD/MMUD）';
      }
    }
  }

  const GVHD_PROPHYLAXIS_OPTIONS = [
    'rATG + CsA + MMF',
    'rATG + Tacrolimus + MMF',
    'rATG + CsA + MTX',
    'rATG + Tacrolimus + MTX',
    'PTCy + CsA + MMF',
    'PTCy + Tacrolimus + MMF',
    'CsA + MMF',
    'Tacrolimus + MMF',
    'CsA + MTX',
    'Tacrolimus + MTX'
  ];

  function normalizeGvhdName(s) {
    return String(s || '').replace(/\s*\+\s*/g, ' + ').trim();
  }

  function applyGvhdProphylaxisSelection(rawVal) {
    const val = normalizeGvhdName(rawVal);
    state.gvhdProphylaxis = val;
    const wantPtcy = /\bPTCy\b/i.test(val);
    const wantRatg = /\brATG\b/i.test(val);
    const wantTac = /\bTacrolimus\b/i.test(val);
    const wantCsa = /\bCsA\b/i.test(val);
    const wantMmf = /\bMMF\b/i.test(val);
    const wantMtx = /\bMTX\b/i.test(val);

    // Seamless mode switch if user selects PTCy combo in Allo or rATG+MTX combo in PTCy
    let modeSwitched = false;
    if (wantPtcy && state.mode === 'allo') {
      switchProtocolMode('ptcy');
      modeSwitched = true;
    } else if (!wantPtcy && wantRatg && state.mode === 'ptcy') {
      switchProtocolMode('allo');
      modeSwitched = true;
    }

    if (state.mode === 'allo' && !state.drugs.tacrolimus) {
      state.drugs.tacrolimus = { enabled: false, route: 'PO', dose: 0.06, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' };
    }

    const D = state.drugs;
    if (D.ptcy) D.ptcy.enabled = wantPtcy;
    if (D.ratg) D.ratg.enabled = wantRatg;
    if (D.tacrolimus) D.tacrolimus.enabled = wantTac;
    if (D.csa) D.csa.enabled = wantCsa && !wantTac;
    if (D.mmf) D.mmf.enabled = wantMmf && !wantMtx;
    if (D.mtx) D.mtx.enabled = wantMtx && !wantMmf;
    state.gvhdProphylaxis = val;

    if (modeSwitched) {
      renderAll();
      showToast(`已切換至 ${state.mode === 'ptcy' ? 'Haplo-PTCy' : 'Allo-HSCT'} 並套用 ${val}`);
    } else {
      renderDrugList();
      updateDynamicViews();
      showToast(`已自動套用 GVHD 預防組合：${val}`);
    }
  }

  // --- Step 2: Clinical Info ---
  function renderClinicalInfo() {
    const isAuto = state.mode === 'auto';
    const curGvhd = normalizeGvhdName(state.gvhdProphylaxis);
    const gvhdOpts = GVHD_PROPHYLAXIS_OPTIONS.includes(curGvhd) || !curGvhd
      ? GVHD_PROPHYLAXIS_OPTIONS
      : [curGvhd, ...GVHD_PROPHYLAXIS_OPTIONS];

    $('clinicalInfoContainer').innerHTML = `
      <div class="form-grid" style="margin-bottom:12px;">
        <div class="field">
          <label><span class="lbl-main">BMT 病房</span></label>
          <select data-field="ward">
            <option value="5PW" ${state.ward === '5PW' ? 'selected' : ''}>5PW</option>
            <option value="3D1" ${state.ward === '3D1' ? 'selected' : ''}>3D1</option>
            <option value="12C" ${state.ward === '12C' ? 'selected' : ''}>12C</option>
          </select>
        </div>
        <div class="field">
          <label><span class="lbl-main">入院日</span><span class="lbl-sub">(Admission D)</span></label>
          <select data-field="admissionD" data-num="1">${dayOptions(-8, -3, state.admissionD)}</select>
        </div>
        <div class="field">
          <label><span class="lbl-main">入院日期</span><span class="lbl-sub">(Admission Date)</span></label>
          <input type="date" data-field="admissionDate" value="${escHtml(state.admissionDate)}">
        </div>
        <div class="field">
          <label><span class="lbl-main">Disease Status</span></label>
          <input data-field="status" value="${escHtml(state.status)}" list="statusSuggestions">
          <datalist id="statusSuggestions">
            <option value="CR"><option value="CR1"><option value="CR2"><option value="PR"><option value="SD"><option value="Relapsed"><option value="Refractory">
          </datalist>
        </div>
        <div class="field">
          <label><span class="lbl-main">Allergy</span></label>
          <input data-field="allergy" value="${escHtml(state.allergy)}">
        </div>
        <div class="field">
          <label><span class="lbl-main">Conditioning 名稱</span></label>
          <input data-field="conditioningName" value="${escHtml(state.conditioningName)}">
        </div>
        ${!isAuto ? `
          <div class="field">
            <label><span class="lbl-main">Acute GVHD Prophylaxis</span></label>
            <select id="gvhdProphylaxisSelect">
              ${gvhdOpts.map(opt => `<option value="${escHtml(opt)}" ${curGvhd === opt ? 'selected' : ''}>${escHtml(opt)}</option>`).join('')}
            </select>
          </div>
          ${state.mode === 'allo' ? `
          <div class="field">
            <label><span class="lbl-main">Stem Cell Source</span></label>
            <select data-field="stemCellSource">
              <option value="PBSC" ${state.stemCellSource === 'PBSC' ? 'selected' : ''}>純 PBSC</option>
              <option value="BM+PBSC" ${state.stemCellSource === 'BM+PBSC' ? 'selected' : ''}>BM (D0) + PBSC (D+1)</option>
            </select>
          </div>` : ''}
        ` : ''}
        <div class="field">
          <label><span class="lbl-main">預計輸注 CD34+ 劑量</span></label>
          <div class="input-suffix-wrap">
            <input data-field="cd34Dose" value="${escHtml(state.cd34Dose)}" placeholder="留白顯示「待確認回輸劑量」">
            <span class="input-suffix">× 10⁶ / kg</span>
          </div>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:12px;">
        <div class="field full">
          <label><span>Diagnosis</span><span class="lbl-sub">(診斷與治療史，支援多行)</span></label>
          <textarea data-field="diagnosis" style="min-height:96px;">${escHtml(state.diagnosis)}</textarea>
        </div>
        <div class="field full">
          <label><span>Comorbidity</span><span class="lbl-sub">(共病，支援多行)</span></label>
          <textarea data-field="comorbidity" style="min-height:76px;">${escHtml(state.comorbidity)}</textarea>
        </div>
      </div>

      <div class="form-grid-sig">
        <div class="field"><label><span class="lbl-main">主治醫師</span></label><input data-field="vs" value="${escHtml(state.vs)}"></div>
        <div class="field"><label><span class="lbl-main">Primary Care</span></label><input data-field="primaryCare" value="${escHtml(state.primaryCare)}"></div>
        <div class="field"><label><span class="lbl-main">BMT CR</span></label><input data-field="bmtCr" value="${escHtml(state.bmtCr)}"></div>
        <div class="field"><label><span class="lbl-main">開床 CR</span></label><input data-field="bedCr" value="${escHtml(state.bedCr)}"></div>
        <div class="field"><label><span class="lbl-main">BMT Unit Director</span></label><input data-field="director" value="${escHtml(state.director)}"></div>
      </div>
    `;

    $('clinicalInfoContainer').querySelectorAll('[data-field]').forEach(el => {
      el.addEventListener('input', () => {
        state[el.dataset.field] = el.dataset.num ? Number(el.value) : el.value;
        updateDynamicViews();
      });
    });

    const gvhdSel = $('gvhdProphylaxisSelect');
    if (gvhdSel) {
      gvhdSel.addEventListener('change', () => {
        applyGvhdProphylaxisSelection(gvhdSel.value);
      });
    }
  }

  // --- Step 3: Presets & Drug List ---
  function renderPresets() {
    const presets = window.BMT_PRESETS[state.mode] || [];
    $('presetBar').innerHTML = presets.map(p =>
      `<button class="preset-btn" data-preset="${p.id}" title="${escHtml(p.desc)}">⚡ ${escHtml(p.name)}</button>`
    ).join('');

    $('presetBar').querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = presets.find(x => x.id === btn.dataset.preset);
        if (!p) return;
        const patch = deepClone(p.patch);
        Object.keys(patch).forEach(k => {
          if (k === 'drugs') state.drugs = patch.drugs;
          else state[k] = patch[k];
        });
        state.ivfOverrides = {};
        renderClinicalInfo();
        renderDrugList();
        renderMeds();
        updateDynamicViews();
        showToast(`已套用處方：${p.name}`);
      });
    });
  }

  function renderDrugList() {
    const D = state.drugs;
    const rows = [];

    const formatDrugTitle = (t) => {
      const m = String(t).match(/^(.+?)\s*([（(][^）)]+[）)])\s*$/);
      if (m && t.length > 18) {
        return `<span class="drug-title-stack"><span>${escHtml(m[1])}</span><span class="drug-title-sub">${escHtml(m[2])}</span></span>`;
      }
      return `<span>${escHtml(t)}</span>`;
    };

    const mkDrug = (key, title, stdDose, pillId, controlsHtml) => {
      const enabled = Boolean(D[key] && D[key].enabled);
      rows.push(`
        <div class="drug-row ${enabled ? 'enabled' : ''}" data-drug-box="${key}">
          <div class="drug-row-top">
            <label class="drug-toggle">
              <input type="checkbox" data-drug-enable="${key}" ${enabled ? 'checked' : ''}>
              ${formatDrugTitle(title)}
            </label>
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              ${stdDose ? `<span class="std-dose-badge">標準：${escHtml(stdDose)}</span>` : ''}
              <span class="calc-pill" id="${pillId}" style="${enabled ? '' : 'display:none;'}"></span>
            </div>
          </div>
          <div class="drug-controls" style="${enabled ? '' : 'display:none;'}">${controlsHtml}</div>
        </div>
      `);
    };

    const dilInput = (path, val, placeholder) =>
      `稀釋液 <input class="diluent-input" type="text" data-drug="${path}" value="${escHtml(val || '')}" placeholder="${escHtml(placeholder)}">`;

    const csaDoseSelect = (dose) => {
      const cur = Number(dose) <= 0.75 ? 0.75 : 1.5;
      return `<select data-drug="csa.dose" data-num="1">
        <option value="1.5" ${cur === 1.5 ? 'selected' : ''}>1.5 mg/kg（標準劑量）</option>
        <option value="0.75" ${cur === 0.75 ? 'selected' : ''}>0.75 mg/kg（併用 Azole 類抗黴菌藥減半）</option>
      </select>`;
    };

    const tacDoseSelect = (route, dose) => {
      if (route === 'IV') {
        const cur = Number(dose) <= 0.015 ? 0.015 : 0.03;
        return `<select data-drug="tacrolimus.dose" data-num="1">
          <option value="0.03" ${cur === 0.03 ? 'selected' : ''}>0.03 mg/kg/day（標準劑量）</option>
          <option value="0.015" ${cur === 0.015 ? 'selected' : ''}>0.015 mg/kg/day（併用 Azole 減半）</option>
        </select>`;
      }
      const cur = Number(dose) <= 0.03 ? 0.03 : 0.06;
      return `<select data-drug="tacrolimus.dose" data-num="1">
        <option value="0.06" ${cur === 0.06 ? 'selected' : ''}>0.06 mg/kg（標準劑量）</option>
        <option value="0.03" ${cur === 0.03 ? 'selected' : ''}>0.03 mg/kg（併用 Azole 減半）</option>
      </select>`;
    };

    const tbiControlsHtml = (tbi, isPtcy) => {
      const isNtucc = tbi.preset === 'ntucc' || (tbi.extraDay !== undefined && tbi.extraDay !== '' && tbi.extraDay !== null);
      const extraVal = (tbi.extraDay !== undefined && tbi.extraDay !== null) ? String(tbi.extraDay) : '';
      return `
        方案 <select data-drug="tbi.preset">
          <option value="standard" ${!isNtucc ? 'selected' : ''}>${isPtcy ? '台大總院 / 自訂 (RIC 2Gy 或 MAC 1.5Gy BID×4d)' : '台大總院 / 自訂 (1.5 Gy BID×4天)'}</option>
          <option value="ntucc" ${isNtucc ? 'selected' : ''}>癌醫 MAC TBI (2 Gy QD: D-8~D-4 及 D-1，共6天 12Gy)</option>
        </select>
        劑量 <input type="number" step="50" data-drug="tbi.dose" value="${tbi.dose}"> cGy
        <select data-drug="tbi.freq"><option value="QD" ${tbi.freq==='QD'?'selected':''}>QD</option><option value="BID" ${tbi.freq==='BID'?'selected':''}>BID</option>${isPtcy ? '' : `<option value="TID" ${tbi.freq==='TID'?'selected':''}>TID</option>`}</select>
        自 <select data-drug="tbi.startD" data-num="1">${dayOptions(-8,-1,tbi.startD)}</select>
        至 <select data-drug="tbi.endD" data-num="1">${dayOptions(-8,-1,tbi.endD)}</select>
        加照日 <select data-drug="tbi.extraDay">
          <option value="" ${extraVal===''?'selected':''}>無</option>
          ${dayOptions(-7,-1, extraVal === '' ? 999 : Number(extraVal))}
        </select>
        ${isNtucc ? '<div class="mesna-subrow"><strong>癌醫排程提醒：</strong>癌症醫院每日限照 2 Gy 共 6 天（12 Gy），通常安排<strong>星期一 (D-8) 入院</strong>，週一至週五 (D-8~D-4) 及隔週一 (D-1) 照射。</div>' : ''}
      `;
    };

    if (state.mode === 'allo') {
      if (!D.tacrolimus) D.tacrolimus = { enabled: false, route: 'PO', dose: 0.06, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' };
      mkDrug('tbi', 'TBI (Total Body Irradiation)', '台大 1.5Gy BID×4d；癌醫 2Gy QD (D-8~-4, D-1)', 'pill-tbi', tbiControlsHtml(D.tbi, false));
      mkDrug('fludarabine', 'Fludarabine', '30 mg/m²/d (MROUND 5mg, 50mg/vial)', 'pill-flu', `
        <input type="number" step="5" data-drug="fludarabine.dose" value="${D.fludarabine.dose}"> mg/m²/day
        自 <select data-drug="fludarabine.startD" data-num="1">${dayOptions(-9,-1,D.fludarabine.startD)}</select>
        至 <select data-drug="fludarabine.endD" data-num="1">${dayOptions(-9,-1,D.fludarabine.endD)}</select>
        ${dilInput('fludarabine.diluent', D.fludarabine.diluent, 'N/S 100 ml')}
      `);
      mkDrug('busulfan', 'Busulfan (Busulfex) + 自動帶入 Keppra', '3.2 mg/kg/d (MROUND 6mg, 稀釋約10倍)', 'pill-bu', `
        <input type="number" step="0.1" data-drug="busulfan.dose" value="${D.busulfan.dose}"> mg/kg/day
        自 <select data-drug="busulfan.startD" data-num="1">${dayOptions(-9,-1,D.busulfan.startD)}</select>
        至 <select data-drug="busulfan.endD" data-num="1">${dayOptions(-9,-1,D.busulfan.endD)}</select>
        ${dilInput('busulfan.diluent', D.busulfan.diluent, '留白自動算10倍 N/S')}
      `);
      mkDrug('thiotepa', 'Thiotepa（如 TBF3）', '5 mg/kg/d QD (MROUND 10mg)', 'pill-tt', `
        <input type="number" step="0.5" data-drug="thiotepa.dose" value="${D.thiotepa.dose}"> mg/kg
        <select data-drug="thiotepa.freq"><option value="QD" ${D.thiotepa.freq==='QD'?'selected':''}>QD</option><option value="BID" ${D.thiotepa.freq==='BID'?'selected':''}>BID</option></select>
        自 <select data-drug="thiotepa.startD" data-num="1">${dayOptions(-9,-1,D.thiotepa.startD)}</select>
        至 <select data-drug="thiotepa.endD" data-num="1">${dayOptions(-9,-1,D.thiotepa.endD)}</select>
        ${dilInput('thiotepa.diluent', D.thiotepa.diluent, 'N/S 500 ml')}
      `);
      const alloMesnaPerKg = D.cyclophosphamide.mesnaPerKg !== undefined && D.cyclophosphamide.mesnaPerKg !== '' ? D.cyclophosphamide.mesnaPerKg : (Number(D.cyclophosphamide.dose || 60) / 2);
      mkDrug('cyclophosphamide', 'Cyclophosphamide (Endoxan) + Mesna', 'Cy 60 mg/kg (VSAA 50)；Mesna 30 mg/kg ×3', 'pill-cy', `
        Cy <input type="number" step="5" data-drug="cyclophosphamide.dose" value="${D.cyclophosphamide.dose}"> mg/kg/day
        自 <select data-drug="cyclophosphamide.startD" data-num="1">${dayOptions(-8,-1,D.cyclophosphamide.startD)}</select>
        至 <select data-drug="cyclophosphamide.endD" data-num="1">${dayOptions(-8,-1,D.cyclophosphamide.endD)}</select>
        ${dilInput('cyclophosphamide.diluent', D.cyclophosphamide.diluent, 'N/S 100cc')}
        <div class="mesna-subrow">
          <strong>Mesna（自動帶入，可手調）：</strong>
          <input type="number" step="5" data-drug="cyclophosphamide.mesnaPerKg" value="${alloMesnaPerKg}" style="width:58px;"> mg/kg
          或指定單劑 <input type="number" step="100" data-drug="cyclophosphamide.mesnaOverrideMg" value="${escHtml(D.cyclophosphamide.mesnaOverrideMg ?? '')}" placeholder="自動" style="width:68px;"> mg
          ｜ 1h前 ${dilInput('cyclophosphamide.mesnaDiluent1', D.cyclophosphamide.mesnaDiluent1, 'N/S 100cc')}
          ｜ 8h/14h後 ${dilInput('cyclophosphamide.mesnaDiluent2', D.cyclophosphamide.mesnaDiluent2, 'N/S 500cc')}
        </div>
      `);
      mkDrug('melphalan', 'Melphalan（心臟不佳替代 Cy）', '140 mg/m²/d (MROUND 10mg)', 'pill-mel-allo', `
        <input type="number" step="10" data-drug="melphalan.dose" value="${D.melphalan.dose}"> mg/m²/day
        自 <select data-drug="melphalan.startD" data-num="1">${dayOptions(-5,-1,D.melphalan.startD)}</select>
        至 <select data-drug="melphalan.endD" data-num="1">${dayOptions(-5,-1,D.melphalan.endD)}</select>
        ${dilInput('melphalan.diluent', D.melphalan.diluent, 'N/S 250 ml')}
      `);
      mkDrug('ratg', 'rATG (Thymoglobuline) + Pre-medication', 'MUD 總5 / Haplo 總6 mg/kg (25mg/vial)', 'pill-atg', `
        <input type="number" step="0.5" data-drug="ratg.dose" value="${D.ratg.dose}"> mg/kg
        <select data-drug="ratg.freq"><option value="QD" ${D.ratg.freq==='QD'?'selected':''}>QD</option><option value="BID" ${D.ratg.freq==='BID'?'selected':''}>BID</option></select>
        自 <select data-drug="ratg.startD" data-num="1">${dayOptions(-6,0,D.ratg.startD)}</select>
        至 <select data-drug="ratg.endD" data-num="1">${dayOptions(-6,0,D.ratg.endD)}</select>
        ${dilInput('ratg.diluent', D.ratg.diluent, 'N/S 500 ml')}
      `);
      mkDrug('csa', 'Cyclosporine (CsA)（與 Tacrolimus 互斥）', '1.5 mg/kg Q12H；併用 Azole 減半 0.75', 'pill-csa', `
        ${csaDoseSelect(D.csa.dose)}
        <select data-drug="csa.freq"><option value="Q12H" ${D.csa.freq==='Q12H'?'selected':''}>Q12H</option><option value="QD" ${D.csa.freq==='QD'?'selected':''}>QD</option></select>
        起日 <select data-drug="csa.startD" data-num="1">${dayOptions(-2,5,D.csa.startD)}</select>
        ${dilInput('csa.diluent', D.csa.diluent, 'N/S 250ml')}
        <div class="mesna-subrow"><strong>Azole 劑量提醒：</strong>併用 Voriconazole (Vfend)、Posaconazole (Posanol)、Isavuconazole (Cresemba) 等 Azole 類抗黴菌藥時，需選用 <strong>0.75 mg/kg</strong> 並密切追蹤 C0 血中濃度。</div>
      `);
      mkDrug('tacrolimus', 'Tacrolimus (Prograf，口服 PO / 靜脈 IV，與 CsA 互斥)', 'PO 0.06 / 半量 0.03；IV 0.03 / 半量 0.015', 'pill-tac', `
        途徑 <select data-drug="tacrolimus.route"><option value="PO" ${D.tacrolimus.route==='PO'?'selected':''}>口服 PO</option><option value="IV" ${D.tacrolimus.route==='IV'?'selected':''}>靜脈 IV cIF</option></select>
        劑量 ${tacDoseSelect(D.tacrolimus.route, D.tacrolimus.dose)}
        ${D.tacrolimus.route === 'PO' ? `<select data-drug="tacrolimus.freq"><option value="Q12H" ${D.tacrolimus.freq==='Q12H'?'selected':''}>Q12H</option><option value="BID" ${D.tacrolimus.freq==='BID'?'selected':''}>BID</option></select>` : dilInput('tacrolimus.diluent', D.tacrolimus.diluent, 'N/S 250ml')}
        起日 <select data-drug="tacrolimus.startD" data-num="1">${dayOptions(-2,5,D.tacrolimus.startD)}</select>
        <div class="mesna-subrow"><strong>Azole 劑量提醒：</strong>併用 Voriconazole (Vfend)、Posaconazole (Posanol)、Isavuconazole (Cresemba) 時，需改用半量（<strong>PO 0.03</strong> 或 <strong>IV 0.015 mg/kg</strong>）並密切追蹤血中濃度。</div>
      `);
      mkDrug('mmf', 'Mycophenolate (Myfortic 180mg，與 MTX 互斥)', 'RIC 2# BIDAC；TID 公式 10.8 mg/kg TID（最高不超過 4# TID）', 'pill-mmf', `
        <input type="number" step="1" data-drug="mmf.doseTab" value="${D.mmf.doseTab}"> #
        <select data-drug="mmf.freq"><option value="BIDAC" ${D.mmf.freq==='BIDAC'?'selected':''}>BIDAC</option><option value="TIDAC" ${D.mmf.freq==='TIDAC'?'selected':''}>TIDAC</option></select>
        起日 <select data-drug="mmf.startD" data-num="1">${dayOptions(0,6,D.mmf.startD)}</select>
        <div class="mesna-subrow">計算公式：原 Cellcept 15 mg/kg TID 換算為 Myfortic 180 mg/cap = <strong>10.8 mg/kg TID</strong>（上限 2160 mg/day，<strong>最高不超過 4# TID</strong>）</div>
      `);
      mkDrug('mtx', 'MTX (15→10 mg/m²) + Leucovorin Rescue（與 MMF 互斥）', 'D+1 15 → D+3/6/11 10 mg/m²', 'pill-mtx', `
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
          <input type="checkbox" data-drug-bool="mtx.shift1Day" ${D.mtx.shift1Day?'checked':''}>
          幹細胞輸至 D+1（MTX 順延為 D+2, D+4, D+7, D+12）
        </label>
      `);
    } else if (state.mode === 'ptcy') {
      mkDrug('tbi', 'TBI (Total Body Irradiation)', 'RIC 2Gy D-1；台大 1.5Gy BID×4d；癌醫 2Gy QD (D-8~-4, D-1)', 'pill-tbi', tbiControlsHtml(D.tbi, true));
      mkDrug('fludarabine', 'Fludarabine', '30 mg/m²/d (MROUND 5mg, 50mg/vial)', 'pill-flu', `
        <input type="number" step="5" data-drug="fludarabine.dose" value="${D.fludarabine.dose}"> mg/m²/day
        自 <select data-drug="fludarabine.startD" data-num="1">${dayOptions(-9,-1,D.fludarabine.startD)}</select>
        至 <select data-drug="fludarabine.endD" data-num="1">${dayOptions(-9,-1,D.fludarabine.endD)}</select>
        ${dilInput('fludarabine.diluent', D.fludarabine.diluent, 'normal saline 100 ml')}
      `);
      mkDrug('thiotepa', 'Thiotepa（如 TBF2+PTCy）', '5 mg/kg/d QD ×2d (MROUND 10mg)', 'pill-tt', `
        <input type="number" step="0.5" data-drug="thiotepa.dose" value="${D.thiotepa.dose}"> mg/kg
        <select data-drug="thiotepa.freq"><option value="QD" ${D.thiotepa.freq==='QD'?'selected':''}>QD</option><option value="BID" ${D.thiotepa.freq==='BID'?'selected':''}>BID</option></select>
        自 <select data-drug="thiotepa.startD" data-num="1">${dayOptions(-8,-1,D.thiotepa.startD)}</select>
        至 <select data-drug="thiotepa.endD" data-num="1">${dayOptions(-8,-1,D.thiotepa.endD)}</select>
        ${dilInput('thiotepa.diluent', D.thiotepa.diluent, 'N/S 500 ml')}
      `);
      mkDrug('busulfan', 'Busulfex + 自動帶入 Keppra', '3.2 mg/kg/d (MROUND 6mg, 稀釋約10倍)', 'pill-bu', `
        <input type="number" step="0.1" data-drug="busulfan.dose" value="${D.busulfan.dose}"> mg/kg/day
        自 <select data-drug="busulfan.startD" data-num="1">${dayOptions(-8,-1,D.busulfan.startD)}</select>
        至 <select data-drug="busulfan.endD" data-num="1">${dayOptions(-8,-1,D.busulfan.endD)}</select>
        ${dilInput('busulfan.diluent', D.busulfan.diluent, '留白自動算10倍 N/S')}
      `);
      mkDrug('preCy', 'Pre-transplant Cyclophosphamide', '14.5 mg/kg/d D-7~-6 (MROUND 10mg)', 'pill-precy', `
        <input type="number" step="0.5" data-drug="preCy.dose" value="${D.preCy.dose}"> mg/kg/day
        自 <select data-drug="preCy.startD" data-num="1">${dayOptions(-8,-2,D.preCy.startD)}</select>
        至 <select data-drug="preCy.endD" data-num="1">${dayOptions(-8,-2,D.preCy.endD)}</select>
        ${dilInput('preCy.diluent', D.preCy.diluent, 'N/S 100 ml')}
      `);
      mkDrug('ptcy', 'Post-transplant Cyclophosphamide (PTCy) + Mesna', 'PTCy 40–50 mg/kg；Mesna 20–25 mg/kg ×3', 'pill-ptcy', `
        PTCy <input type="number" step="5" data-drug="ptcy.dose" value="${D.ptcy.dose}"> mg/kg/day
        自 <select data-drug="ptcy.startD" data-num="1">${dayOptions(3,5,D.ptcy.startD)}</select>
        至 <select data-drug="ptcy.endD" data-num="1">${dayOptions(3,6,D.ptcy.endD)}</select>
        ${dilInput('ptcy.diluent', D.ptcy.diluent, 'N/S 100 ml')}
        <div class="mesna-subrow">
          <strong>Mesna（自動帶入，可手調）：</strong>
          <input type="number" step="5" data-drug="ptcy.mesnaPerKg" value="${D.ptcy.mesnaPerKg}" style="width:58px;"> mg/kg
          或指定單劑 <input type="number" step="100" data-drug="ptcy.mesnaOverrideMg" value="${escHtml(D.ptcy.mesnaOverrideMg ?? '')}" placeholder="自動" style="width:68px;"> mg
          ｜ 1h前 ${dilInput('ptcy.mesnaDiluent1', D.ptcy.mesnaDiluent1, 'N/S 100cc')}
          ｜ 8h/14h後 ${dilInput('ptcy.mesnaDiluent2', D.ptcy.mesnaDiluent2, 'N/S 500cc')}
        </div>
      `);
      mkDrug('ratg', 'rATG (Thymoglobuline，選用)', 'NTUH PTCy 2 mg/kg ×2d (總 4 mg/kg)', 'pill-atg', `
        <input type="number" step="0.5" data-drug="ratg.dose" value="${D.ratg.dose}"> mg/kg
        <select data-drug="ratg.freq"><option value="QD" ${D.ratg.freq==='QD'?'selected':''}>QD</option><option value="BID" ${D.ratg.freq==='BID'?'selected':''}>BID</option></select>
        自 <select data-drug="ratg.startD" data-num="1">${dayOptions(-5,-1,D.ratg.startD)}</select>
        至 <select data-drug="ratg.endD" data-num="1">${dayOptions(-5,-1,D.ratg.endD)}</select>
        ${dilInput('ratg.diluent', D.ratg.diluent, 'N/S 500 ml')}
      `);
      mkDrug('tacrolimus', 'Tacrolimus (Prograf，口服 PO / 靜脈 IV，與 CsA 互斥)', 'PO 0.06 / 半量 0.03；IV 0.03 / 半量 0.015', 'pill-tac', `
        途徑 <select data-drug="tacrolimus.route"><option value="PO" ${D.tacrolimus.route==='PO'?'selected':''}>口服 PO</option><option value="IV" ${D.tacrolimus.route==='IV'?'selected':''}>靜脈 IV cIF</option></select>
        劑量 ${tacDoseSelect(D.tacrolimus.route, D.tacrolimus.dose)}
        ${D.tacrolimus.route === 'PO' ? `<select data-drug="tacrolimus.freq"><option value="Q12H" ${D.tacrolimus.freq==='Q12H'?'selected':''}>Q12H</option><option value="BID" ${D.tacrolimus.freq==='BID'?'selected':''}>BID</option></select>` : dilInput('tacrolimus.diluent', D.tacrolimus.diluent, 'N/S 250ml')}
        起日 <select data-drug="tacrolimus.startD" data-num="1">${dayOptions(5,7,D.tacrolimus.startD)}</select> PM
        <div class="mesna-subrow"><strong>Azole 劑量提醒：</strong>併用 Voriconazole (Vfend)、Posaconazole (Posanol)、Isavuconazole (Cresemba) 時，需改用半量（<strong>PO 0.03</strong> 或 <strong>IV 0.015 mg/kg</strong>）並密切追蹤血中濃度。</div>
      `);
      mkDrug('csa', 'Cyclosporine (CsA)（與 Tacrolimus 互斥）', '1.5 mg/kg Q12H；併用 Azole 減半 0.75', 'pill-csa', `
        ${csaDoseSelect(D.csa.dose)}
        <select data-drug="csa.freq"><option value="Q12H" ${D.csa.freq==='Q12H'?'selected':''}>Q12H</option><option value="QD" ${D.csa.freq==='QD'?'selected':''}>QD</option></select>
        起日 <select data-drug="csa.startD" data-num="1">${dayOptions(5,7,D.csa.startD)}</select> PM
        ${dilInput('csa.diluent', D.csa.diluent, 'N/S 250ml')}
        <div class="mesna-subrow"><strong>Azole 劑量提醒：</strong>併用 Voriconazole (Vfend)、Posaconazole (Posanol)、Isavuconazole (Cresemba) 等 Azole 類抗黴菌藥時，需選用 <strong>0.75 mg/kg</strong> 並密切追蹤 C0 血中濃度。</div>
      `);
      mkDrug('mmf', 'Mycophenolate (Myfortic，與 MTX 互斥)', '10.8 mg/kg TIDAC (180mg/cap，最高不超過 4# TID)', 'pill-mmf', `
        起日 <select data-drug="mmf.startD" data-num="1">${dayOptions(5,7,D.mmf.startD)}</select>
        <div class="mesna-subrow">計算公式：Adjusted BW × 10.8 mg/kg ÷ 180 mg（原 Cellcept 15 mg/kg TID 換算），上限 2160 mg/day（<strong>最高不超過 4# TID</strong>）</div>
      `);
      mkDrug('mtx', 'MTX + Leucovorin（與 MMF 互斥）', '10 mg/m² on D+6, D+11', 'pill-mtx', `
        <span style="color:#64748b;">固定 D+6, D+11 給予（若輸 D0+D1 則 D+7, D+12）</span>
      `);
    } else if (state.mode === 'auto') {
      mkDrug('rituximab', 'Rituximab + Pre-medication', 'IV 375 mg/m² (MROUND 100) 或 SC 1400 mg', 'pill-ritux', `
        途徑 <select data-drug="rituximab.route"><option value="IV" ${D.rituximab.route==='IV'?'selected':''}>IV (375 mg/m²)</option><option value="SC" ${D.rituximab.route==='SC'?'selected':''}>SC (1400 mg)</option></select>
        劑量 <input type="number" step="25" data-drug="rituximab.dose" value="${D.rituximab.dose}">
        施打日 <select data-drug="rituximab.day" data-num="1">${dayOptions(-9,-4,D.rituximab.day)}</select>
        ${D.rituximab.route !== 'SC' ? dilInput('rituximab.diluent', D.rituximab.diluent, 'N/S 500 ml') : ''}
      `);
      mkDrug('brentuximab', 'Brentuximab Vedotin', '1.8 mg/kg Actual BW (上限 180mg, 50mg/vial)', 'pill-bv', `
        <input type="number" step="0.1" data-drug="brentuximab.dose" value="${D.brentuximab.dose}"> mg/kg
        施打日 <select data-drug="brentuximab.day" data-num="1">${dayOptions(-9,-4,D.brentuximab.day)}</select>
        ${dilInput('brentuximab.diluent', D.brentuximab.diluent, 'N/S 100 ml')}
      `);
      mkDrug('bcnu', 'Carmustine (BCNU)', 'BEAM 300 / TT-BCNU 400 mg/m² (MROUND 10)', 'pill-bcnu', `
        <input type="number" step="50" data-drug="bcnu.dose" value="${D.bcnu.dose}"> mg/m²
        施打日 <select data-drug="bcnu.day" data-num="1">${dayOptions(-8,-3,D.bcnu.day)}</select>
        ${dilInput('bcnu.diluent', D.bcnu.diluent, 'D5W 250 ml')}
      `);
      mkDrug('bendamustine', 'Bendamustine', '200 mg/m²/d QD ×2d (MROUND 10)', 'pill-benda', `
        <input type="number" step="10" data-drug="bendamustine.dose" value="${D.bendamustine.dose}"> mg/m²/day
        自 <select data-drug="bendamustine.startD" data-num="1">${dayOptions(-8,-3,D.bendamustine.startD)}</select>
        至 <select data-drug="bendamustine.endD" data-num="1">${dayOptions(-8,-3,D.bendamustine.endD)}</select>
        ${dilInput('bendamustine.diluent', D.bendamustine.diluent, 'N/S 500 ml')}
      `);
      mkDrug('etoposide', 'Etoposide', '200 mg/m²/d QD ×4d (MROUND 10)', 'pill-eto', `
        <input type="number" step="20" data-drug="etoposide.dose" value="${D.etoposide.dose}"> mg/m²/day
        自 <select data-drug="etoposide.startD" data-num="1">${dayOptions(-7,-2,D.etoposide.startD)}</select>
        至 <select data-drug="etoposide.endD" data-num="1">${dayOptions(-7,-2,D.etoposide.endD)}</select>
        ${dilInput('etoposide.diluent', D.etoposide.diluent, 'N/S 1000 ml')}
      `);
      mkDrug('cytarabine', 'Cytarabine (BID) + Methylprednisolone 40mg', '100–200 mg/m²/dose BID ×4d (MROUND 20)', 'pill-arac', `
        <input type="number" step="50" data-drug="cytarabine.dose" value="${D.cytarabine.dose}"> mg/m²/dose BID
        自 <select data-drug="cytarabine.startD" data-num="1">${dayOptions(-7,-2,D.cytarabine.startD)}</select>
        至 <select data-drug="cytarabine.endD" data-num="1">${dayOptions(-7,-2,D.cytarabine.endD)}</select>
        ${dilInput('cytarabine.diluent', D.cytarabine.diluent, 'N/S 250 ml')}
      `);
      mkDrug('melphalan', 'Melphalan', 'BEAM 140 / MM 200 / GemBuMel 60 mg/m²', 'pill-mel', `
        <input type="number" step="10" data-drug="melphalan.dose" value="${D.melphalan.dose}"> mg/m²/day
        自 <select data-drug="melphalan.startD" data-num="1">${dayOptions(-4,-1,D.melphalan.startD)}</select>
        至 <select data-drug="melphalan.endD" data-num="1">${dayOptions(-4,-1,D.melphalan.endD)}</select>
        ${dilInput('melphalan.diluent', D.melphalan.diluent, `N/S ${D.melphalan.fluid || 250} ml`)}
      `);
      mkDrug('gemcitabine', 'Gemcitabine (Fixed 10 mg/m²/min Pump)', '1875 mg/m² (MROUND 20, 200mg/vial)', 'pill-gem', `
        <input type="number" step="25" data-drug="gemcitabine.dose" value="${D.gemcitabine.dose}"> mg/m²
        Day 1 <select data-drug="gemcitabine.day1" data-num="1">${dayOptions(-9,-3,D.gemcitabine.day1)}</select>
        Day 2 <select data-drug="gemcitabine.day2" data-num="1">${dayOptions(-6,-1,D.gemcitabine.day2)}</select>
        ${dilInput('gemcitabine.diluent', D.gemcitabine.diluent, 'N/S 500 ml')}
      `);
      mkDrug('busulfanAuto', 'Busulfan + 自動帶入 Keppra', '3.2 mg/kg 或 100 mg/m² (MROUND 6mg)', 'pill-bu-auto', `
        <input type="number" step="0.1" data-drug="busulfanAuto.dose" value="${D.busulfanAuto.dose}">
        <select data-drug="busulfanAuto.unit"><option value="mg/kg" ${D.busulfanAuto.unit==='mg/kg'?'selected':''}>mg/kg</option><option value="mg/m2" ${D.busulfanAuto.unit==='mg/m2'?'selected':''}>mg/m²</option></select>
        自 <select data-drug="busulfanAuto.startD" data-num="1">${dayOptions(-9,-3,D.busulfanAuto.startD)}</select>
        至 <select data-drug="busulfanAuto.endD" data-num="1">${dayOptions(-9,-2,D.busulfanAuto.endD)}</select>
        ${dilInput('busulfanAuto.diluent', D.busulfanAuto.diluent, '留白自動算10倍 N/S')}
      `);
      mkDrug('thiotepaAuto', 'Thiotepa (如 TT-BCNU)', '5 mg/kg/dose BID ×2d (總 10 mg/kg)', 'pill-tt-auto', `
        <input type="number" step="0.5" data-drug="thiotepaAuto.dose" value="${D.thiotepaAuto.dose}"> mg/kg/dose
        <select data-drug="thiotepaAuto.freq"><option value="BID" ${D.thiotepaAuto.freq==='BID'?'selected':''}>BID</option><option value="QD" ${D.thiotepaAuto.freq==='QD'?'selected':''}>QD</option></select>
        自 <select data-drug="thiotepaAuto.startD" data-num="1">${dayOptions(-7,-2,D.thiotepaAuto.startD)}</select>
        至 <select data-drug="thiotepaAuto.endD" data-num="1">${dayOptions(-7,-2,D.thiotepaAuto.endD)}</select>
        ${dilInput('thiotepaAuto.diluent', D.thiotepaAuto.diluent, 'N/S 500 ml')}
      `);
    }

    const container = $('drugListContainer');
    container.innerHTML = rows.join('');

    // Bind toggles (with CsA <-> Tacrolimus mutual exclusion + reverse sync to Acute GVHD Prophylaxis dropdown)
    container.querySelectorAll('[data-drug-enable]').forEach(chk => {
      chk.addEventListener('change', () => {
        const key = chk.dataset.drugEnable;
        state.drugs[key].enabled = chk.checked;

        // Helper to disable a mutually exclusive companion drug
        const uncheckCompanion = (otherKey, toastMsg) => {
          if (state.drugs[otherKey] && state.drugs[otherKey].enabled) {
            state.drugs[otherKey].enabled = false;
            const otherChk = container.querySelector(`[data-drug-enable="${otherKey}"]`);
            const otherBox = container.querySelector(`[data-drug-box="${otherKey}"]`);
            if (otherChk) otherChk.checked = false;
            if (otherBox) {
              otherBox.classList.remove('enabled');
              otherBox.querySelector('.drug-controls').style.display = 'none';
              otherBox.querySelector('.calc-pill').style.display = 'none';
            }
            showToast(toastMsg);
          }
        };

        // Enforce CsA <-> Tacrolimus and MMF <-> MTX mutual exclusion
        if (chk.checked && key === 'tacrolimus') {
          uncheckCompanion('csa', 'Tacrolimus 與 Cyclosporine (CsA) 不可併用，已自動取消勾選 CsA');
        } else if (chk.checked && key === 'csa') {
          uncheckCompanion('tacrolimus', 'Cyclosporine (CsA) 與 Tacrolimus 不可併用，已自動取消勾選 Tacrolimus');
        } else if (chk.checked && key === 'mtx') {
          uncheckCompanion('mmf', 'MTX 與 MMF (Myfortic) 不可併用，已自動取消勾選 MMF');
        } else if (chk.checked && key === 'mmf') {
          uncheckCompanion('mtx', 'MMF (Myfortic) 與 MTX 不可併用，已自動取消勾選 MTX');
        }

        const box = container.querySelector(`[data-drug-box="${key}"]`);
        box.classList.toggle('enabled', chk.checked);
        box.querySelector('.drug-controls').style.display = chk.checked ? 'flex' : 'none';
        box.querySelector('.calc-pill').style.display = chk.checked ? 'inline-block' : 'none';

        // Reverse sync GVHD prophylaxis dropdown whenever GVHD drugs change
        if (['ratg', 'ptcy', 'csa', 'tacrolimus', 'mmf', 'mtx'].includes(key) && state.mode !== 'auto') {
          const derived = window.BMTCalc.deriveGvhdProphylaxis(state);
          if (derived) {
            state.gvhdProphylaxis = derived;
            renderClinicalInfo();
          }
        }
        updateDynamicViews();
      });
    });

    // Bind numeric/select/text inputs
    container.querySelectorAll('[data-drug]').forEach(el => {
      el.addEventListener('input', () => {
        const [k, sub] = el.dataset.drug.split('.');
        state.drugs[k][sub] = el.dataset.num ? Number(el.value) : el.value;
        // Handle TBI scheme switching (台大總院 vs 癌醫 MAC 2Gy×6d: D-8~D-4, D-1)
        if (k === 'tbi' && sub === 'preset') {
          if (el.value === 'ntucc') {
            state.drugs.tbi.dose = 200;
            state.drugs.tbi.freq = 'QD';
            state.drugs.tbi.startD = -8;
            state.drugs.tbi.endD = -4;
            state.drugs.tbi.extraDay = -1;
            if (Number(state.admissionD) > -8) state.admissionD = -8;
            renderClinicalInfo();
            renderDrugList();
            updateDynamicViews();
            showToast('已套用癌醫 MAC TBI 排程：2 Gy QD on D-8~D-4 及 D-1（入院日設為 D-8）');
            return;
          } else {
            state.drugs.tbi.extraDay = '';
            renderDrugList();
            updateDynamicViews();
            return;
          }
        }
        // Re-render drug list if route toggles PO/IV or SC/IV so diluent input shows/hides cleanly
        if (k === 'tacrolimus' && sub === 'route') {
          const wasHalf = (el.value === 'IV' && Number(state.drugs.tacrolimus.dose) <= 0.03) ||
                          (el.value === 'PO' && Number(state.drugs.tacrolimus.dose) <= 0.015);
          state.drugs.tacrolimus.dose = el.value === 'IV' ? (wasHalf ? 0.015 : 0.03) : (wasHalf ? 0.03 : 0.06);
          renderDrugList();
          updateDynamicViews();
          return;
        }
        if (k === 'rituximab' && sub === 'route') {
          state.drugs.rituximab.dose = el.value === 'SC' ? 1400 : 375;
          renderDrugList();
          updateDynamicViews();
          return;
        }
        updateDynamicViews();
      });
    });

    container.querySelectorAll('[data-drug-bool]').forEach(el => {
      el.addEventListener('change', () => {
        const [k, sub] = el.dataset.drugBool.split('.');
        state.drugs[k][sub] = el.checked;
        updateDynamicViews();
      });
    });
  }

  function updateDrugPills(calc) {
    const bw = calc.anthro.dosingBW;
    const bsa = calc.anthro.dosingBSA;
    const mround = window.BMTCalc.mround;
    const D = state.drugs;
    const setPill = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };

    if (state.mode === 'allo' || state.mode === 'ptcy') {
      if (D.tbi) {
        const sD = Number(D.tbi.startD), eD = Number(D.tbi.endD);
        const daySet = new Set();
        for (let x = Math.min(sD, eD); x <= Math.max(sD, eD); x++) daySet.add(x);
        if (D.tbi.extraDay !== undefined && D.tbi.extraDay !== '' && D.tbi.extraDay !== null) daySet.add(Number(D.tbi.extraDay));
        const mult = D.tbi.freq === 'BID' ? 2 : (D.tbi.freq === 'TID' ? 3 : 1);
        const tot = (Number(D.tbi.dose) || 0) * mult * daySet.size;
        setPill('pill-tbi', `${D.tbi.dose} cGy ${D.tbi.freq} ×${daySet.size}天 (總 ${tot} cGy)`);
      }
      if (D.fludarabine) {
        const d = mround(bsa * (Number(D.fludarabine.dose) || 30), 5);
        const days = Math.abs(Number(D.fludarabine.endD) - Number(D.fludarabine.startD)) + 1;
        const totMg = d * days;
        setPill('pill-flu', `${d} mg/day（${days}天共 ${totMg} mg → ${Math.ceil(totMg / 50)} 支）`);
      }
      if (D.busulfan) {
        const d = mround(bw * (Number(D.busulfan.dose) || 3.2), 6);
        setPill('pill-bu', `${d} mg in N/S ${mround(d * 10 / 6, 10)} ml`);
      }
      if (D.thiotepa) setPill('pill-tt', `${mround(bw * (Number(D.thiotepa.dose) || 5), 10)} mg/${D.thiotepa.freq}`);
      if (D.cyclophosphamide) {
        const cyKg = Number(D.cyclophosphamide.dose) || 60;
        const d = mround(bw * cyKg, 50);
        const mKg = D.cyclophosphamide.mesnaPerKg !== undefined && D.cyclophosphamide.mesnaPerKg !== '' ? Number(D.cyclophosphamide.mesnaPerKg) : (cyKg / 2);
        const mAuto = Math.abs(mKg - cyKg / 2) < 1e-6 ? mround(d / 2, 100) : mround(bw * mKg, 100);
        const m = D.cyclophosphamide.mesnaOverrideMg !== undefined && D.cyclophosphamide.mesnaOverrideMg !== '' ? Number(D.cyclophosphamide.mesnaOverrideMg) : mAuto;
        setPill('pill-cy', `Cy ${d} mg / Mesna ${m} mg x3`);
      }
      if (D.melphalan) setPill('pill-mel-allo', `${mround(bsa * (Number(D.melphalan.dose) || 140), 10)} mg`);
      if (D.preCy) setPill('pill-precy', `${mround(bw * (Number(D.preCy.dose) || 14.5), 10)} mg/day`);
      if (D.ptcy) {
        const ptKg = Number(D.ptcy.dose) || 40;
        const d = mround(bw * ptKg, 10);
        const mKg = D.ptcy.mesnaPerKg !== undefined && D.ptcy.mesnaPerKg !== '' ? Number(D.ptcy.mesnaPerKg) : (ptKg / 2);
        const mAuto = Math.abs(mKg - ptKg / 2) < 1e-6 ? mround(d / 2, 100) : mround(bw * mKg, 100);
        const m = D.ptcy.mesnaOverrideMg !== undefined && D.ptcy.mesnaOverrideMg !== '' ? Number(D.ptcy.mesnaOverrideMg) : mAuto;
        setPill('pill-ptcy', `PTCy ${d} mg / Mesna ${m} mg x3`);
      }
      if (D.ratg) {
        const sD = Number(D.ratg.startD), eD = Number(D.ratg.endD);
        const days = [];
        for (let d = Math.min(sD, eD); d <= Math.max(sD, eD); d++) days.push(d);
        const atg = window.BMTCalc.calcAtgDoses(bw, Number(D.ratg.dose) || 2.5, days, D.ratg.freq || 'QD');
        setPill('pill-atg', atg.allEqual
          ? `${atg.perDoseMg[0]} mg/${D.ratg.freq || 'QD'}（總 ${atg.totalMg} mg，共 ${atg.totalVials} 支）`
          : `${atg.perDayMg.join(' / ')} mg（總 ${atg.totalMg} mg，共 ${atg.totalVials} 支）`);
      }
      if (D.csa) setPill('pill-csa', `${mround(bw * (Number(D.csa.dose) || 1.5), 25)} mg ${D.csa.freq}`);
      if (D.tacrolimus) {
        const txt = D.tacrolimus.route === 'IV'
          ? `${(bw * (Number(D.tacrolimus.dose) || 0.03)).toFixed(2)} mg cIF`
          : `${mround(bw * (Number(D.tacrolimus.dose) || 0.06), 0.5)} mg PO Q12H`;
        setPill('pill-tac', txt);
      }
      if (D.mmf) {
        const txt = state.mode === 'ptcy'
          ? `${Math.min(4, Math.max(1, Math.round(bw * 10.8 / 180)))}# TIDAC`
          : `${D.mmf.doseTab || 2}# ${D.mmf.freq || 'BIDAC'}`;
        setPill('pill-mmf', txt);
      }
      if (D.mtx) {
        setPill('pill-mtx', state.mode === 'ptcy' ? `${Math.round(bsa * 10)} mg` : `${Math.round(bsa * 15)} mg → ${Math.round(bsa * 10)} mg`);
      }
    } else {
      if (D.rituximab) setPill('pill-ritux', D.rituximab.route === 'SC' ? '1400 mg SC' : `${mround(bsa * (Number(D.rituximab.dose) || 375), 100)} mg IV`);
      if (D.brentuximab) setPill('pill-bv', `${Math.min(180, mround(calc.anthro.actualBW * (Number(D.brentuximab.dose) || 1.8), 5))} mg`);
      if (D.bcnu) setPill('pill-bcnu', `${mround(bsa * (Number(D.bcnu.dose) || 300), 10)} mg`);
      if (D.bendamustine) setPill('pill-benda', `${mround(bsa * (Number(D.bendamustine.dose) || 200), 10)} mg/day`);
      if (D.etoposide) setPill('pill-eto', `${mround(bsa * (Number(D.etoposide.dose) || 200), 10)} mg/day`);
      if (D.cytarabine) setPill('pill-arac', `${mround(bsa * (Number(D.cytarabine.dose) || 100), 20)} mg BID`);
      if (D.melphalan) setPill('pill-mel', `${mround(bsa * (Number(D.melphalan.dose) || 140), 10)} mg/day`);
      if (D.gemcitabine) {
        const tot = mround(bsa * (Number(D.gemcitabine.dose) || 1875), 20);
        const rate = tot > 0 ? Math.round((10 * bsa * 60 / tot) * 500) : 0;
        setPill('pill-gem', `${tot} mg (${rate} ml/hr)`);
      }
      if (D.busulfanAuto) {
        const d = D.busulfanAuto.unit === 'mg/m2' ? mround(bsa * Number(D.busulfanAuto.dose), 6) : mround(bw * Number(D.busulfanAuto.dose), 6);
        setPill('pill-bu-auto', `${d} mg in N/S ${mround(d * 10 / 6, 10)} ml`);
      }
      if (D.thiotepaAuto) setPill('pill-tt-auto', `${mround(bw * (Number(D.thiotepaAuto.dose) || 5), 10)} mg ${D.thiotepaAuto.freq}`);
    }
  }

  // --- Editable Schedule Table (with IVF overrides) ---
  function renderScheduleEditor(calc) {
    const days = calc.scheduleDays;
    let html = `<table class="sched-table"><thead>
      <tr><th class="row-lbl">Day</th>${days.map(d => `<th class="${d.day===0?'d0-col':''}">${d.day>0?'+'+d.day:d.day}</th>`).join('')}</tr>
      <tr><td class="row-lbl">Week Days</td>${days.map(d => `<td class="${d.day===0?'d0-col':''}">${d.weekday}</td>`).join('')}</tr>
      <tr><td class="row-lbl">Date</td>${days.map(d => `<td class="${d.day===0?'d0-col':''}">${d.dateStr}</td>`).join('')}</tr>
    </thead><tbody>`;

    for (const row of calc.scheduleRows) {
      html += `<tr><td class="row-lbl">${escHtml(row.name)}</td>${days.map(d => {
        const hit = row.days.has(d.day);
        return `<td class="${hit ? 'mark-v' : (d.day===0?'d0-col':'')}">${hit ? 'V' : ''}</td>`;
      }).join('')}</tr>`;
    }

    html += `<tr><td class="row-lbl">Basic IVF(ml)</td>${days.map(d =>
      `<td><input class="ivf-input" type="number" step="500" data-ivf-day="${d.day}" value="${d.ivf}"></td>`
    ).join('')}</tr></tbody></table>`;

    const container = $('scheduleEditorContainer');
    container.innerHTML = html;
    container.querySelectorAll('[data-ivf-day]').forEach(inp => {
      inp.addEventListener('change', () => {
        state.ivfOverrides[Number(inp.dataset.ivfDay)] = Number(inp.value) || 0;
        renderLivePreview(window.BMTCalc.computeProtocol(state));
      });
    });
  }

  // --- Step 4: Supportive Meds & Anti-emetics ---
  function renderMeds() {
    const M = state.meds;
    const AE = state.antiemetics;
    const isAuto = state.mode === 'auto';

    $('medsContainer').innerHTML = `
      <div class="med-checks">
        <label class="check-pill"><input type="checkbox" data-med="feburic" ${M.feburic?'checked':''}> Feburic 0.5# QD (自費)</label>
        <label class="check-pill"><input type="checkbox" data-med="micafungin" ${M.micafungin?'checked':''}> Micafungin 50mg QD</label>
        <label class="check-pill"><input type="checkbox" data-med="baktar" ${M.baktar?'checked':''}> Baktar 1# QD</label>
        <label class="check-pill"><input type="checkbox" data-med="valtrex" ${M.valtrex?'checked':''}> Valtrex 1# QD</label>
        <label class="check-pill"><input type="checkbox" data-med="cefepime" ${M.cefepime?'checked':''}> Cefepime 1g Q12H (D0~D+2)</label>
        <label class="check-pill"><input type="checkbox" data-med="levofloxacin" ${M.levofloxacin?'checked':''}> Levofloxacin PRN WBC&lt;1000</label>
        <label class="check-pill"><input type="checkbox" data-med="folicAcid" ${M.folicAcid?'checked':''}> Folic acid 1# QD (since D+1)</label>
        <label class="check-pill"><input type="checkbox" data-med="gcsf" ${M.gcsf?'checked':''}> G-CSF (Filgrastim 5 ug/kg)</label>
        ${!isAuto ? `<label class="check-pill"><input type="checkbox" data-med="letermovir" ${M.letermovir?'checked':''}> Letermovir (CMV 預防)</label>` : ''}
        <label class="check-pill"><input type="checkbox" data-med="urso" ${M.urso?'checked':''}> Ursodiol (Urso 2# BID)</label>
        <label class="check-pill"><input type="checkbox" data-med="esomeprazole" ${M.esomeprazole?'checked':''}> Esomeprazole 1# QDAC</label>
        <label class="check-pill"><input type="checkbox" data-med="glutamine" ${M.glutamine?'checked':''}> IV Alanyl Glutamine (自費)</label>
        ${!isAuto ? `<label class="check-pill"><input type="checkbox" data-med="foley" ${M.foley?'checked':''}> Endoxan 期間放 Foley</label>` : ''}
        ${state.mode === 'ptcy' ? `<label class="check-pill"><input type="checkbox" data-med="bmOnAdmission" ${M.bmOnAdmission?'checked':''}> 轉入移植室日做 BM</label>` : ''}
      </div>

      <div class="form-grid-2" style="margin-bottom:12px; padding:12px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
        <div class="field">
          <label><span class="lbl-main">化療起日</span><span class="lbl-sub">(計算止吐／預防藥)</span></label>
          <select data-field-m="chemoStartD" data-num="1">${dayOptions(-9, -2, state.chemoStartD)}</select>
        </div>
        <div class="field">
          <label><span class="lbl-main">化療迄日</span><span class="lbl-sub">(計算 Kytril／Aloxi)</span></label>
          <select data-field-m="chemoEndD" data-num="1">${dayOptions(-7, -1, state.chemoEndD)}</select>
        </div>
        <div class="field">
          <label><span class="lbl-main">Aprepitant 劑型</span><span class="lbl-sub">(Emend)</span></label>
          <select data-ae="emendMode">
            <option value="PO" ${AE.emendMode==='PO'?'selected':''}>PO（前3天 125-80-80 健保 → 續 125 自費）</option>
            <option value="IV" ${AE.emendMode==='IV'?'selected':''}>IV（150mg Q3D：第1天、第4天、PTCy 第1天）</option>
          </select>
        </div>
        <div class="field">
          <label><span class="lbl-main">5-HT3 止吐藥</span></label>
          <select data-ae="serotoninAgent">
            <option value="Kytril" ${AE.serotoninAgent==='Kytril'?'selected':''}>Granisetron (Kytril) QD</option>
            <option value="Aloxi" ${AE.serotoninAgent==='Aloxi'?'selected':''}>Palonosetron (Aloxi) QOD</option>
          </select>
        </div>
      </div>

      <div class="form-grid" style="margin-bottom:12px;">
        <div class="field">
          <label><span class="lbl-main">G-CSF 起始日</span></label>
          <select data-med-val="gcsfStartD" data-num="1">${dayOptions(1, 7, M.gcsfStartD)}</select>
        </div>
        <div class="field">
          <label><span class="lbl-main">G-CSF 頻率</span></label>
          <select data-med-val="gcsfFreq">
            <option value="QN" ${(!M.gcsfFreq || M.gcsfFreq==='QN')?'selected':''}>QN</option>
            <option value="QD" ${M.gcsfFreq==='QD'?'selected':''}>QD</option>
          </select>
        </div>
        <div class="field">
          <label>
            <span class="lbl-main">
              <span>G-CSF 劑量</span>
              <span class="lbl-inline-chk"><input type="checkbox" data-med="gcsfAuto" ${M.gcsfAuto?'checked':''}> 自動</span>
            </span>
            <span class="lbl-sub">(mcg，300/75 組合)</span>
          </label>
          <input type="number" step="75" id="gcsfMcgInput" data-med-val="gcsfMcg" data-num="1" value="${M.gcsfMcg}" ${M.gcsfAuto?'disabled':''}>
          <small id="gcsfComboHint" style="font-size:11px;color:#475569;"></small>
        </div>
        <div class="field">
          <label><span class="lbl-main">G-CSF 稀釋 N/S</span><span class="lbl-sub">(ml，預設=劑量÷15)</span></label>
          <input type="number" step="5" id="gcsfFluidInput" data-med-val="gcsfFluid" data-num="1" value="${M.gcsfFluid || 20}" ${M.gcsfAuto?'disabled':''}>
        </div>
        ${!isAuto ? `
          <div class="field">
            <label><span class="lbl-main">Letermovir 劑量</span></label>
            <select data-med-val="letermovirDose">
              <option value="1# QD since D+1" ${M.letermovirDose==='1# QD since D+1'?'selected':''}>1# (240mg) QD since D+1（併用CsA）</option>
              <option value="2# QD since D+5" ${M.letermovirDose==='2# QD since D+5'?'selected':''}>2# (480mg) QD since D+5（Tacrolimus/無CsA）</option>
            </select>
          </div>
        ` : ''}
      </div>

      <div class="field full">
        <label><span>Other order</span><span class="lbl-sub">(自備藥、門診慢性用藥、B 肝抗病毒藥、臨床試驗藥，每行一項)</span></label>
        <textarea id="otherOrdersInput" data-med-val="otherOrders" placeholder="例如：\n0.5 Baraclude 0.5 mg/tab for CDC Approval 1 tab QDAC PO\nCrestor 10 mg/tab 1 tab QD PO">${escHtml(M.otherOrders || '')}</textarea>
      </div>
    `;

    const c = $('medsContainer');
    c.querySelectorAll('[data-med]').forEach(chk => {
      chk.addEventListener('change', () => {
        state.meds[chk.dataset.med] = chk.checked;
        if (chk.dataset.med === 'gcsfAuto') renderMeds();
        updateDynamicViews();
      });
    });
    c.querySelectorAll('[data-med-val]').forEach(el => {
      el.addEventListener('input', () => {
        state.meds[el.dataset.medVal] = el.dataset.num ? Number(el.value) : el.value;
        if (el.dataset.medVal === 'gcsfMcg' && !state.meds.gcsfAuto) {
          const autoFl = Math.max(5, Math.round((Number(el.value) || 0) / 15));
          state.meds.gcsfFluid = autoFl;
          const flInp = $('gcsfFluidInput');
          if (flInp) flInp.value = autoFl;
        }
        updateDynamicViews();
      });
    });
    c.querySelectorAll('[data-field-m]').forEach(el => {
      el.addEventListener('input', () => {
        state[el.dataset.fieldM] = Number(el.value);
        updateDynamicViews();
      });
    });
    c.querySelectorAll('[data-ae]').forEach(el => {
      el.addEventListener('input', () => {
        state.antiemetics[el.dataset.ae] = el.value;
        updateDynamicViews();
      });
    });
    c.querySelectorAll('[data-ae-bool]').forEach(el => {
      el.addEventListener('change', () => {
        state.antiemetics[el.dataset.aeBool] = el.checked;
        updateDynamicViews();
      });
    });
  }

  // --- Live A4 Document Preview ---
  function renderLivePreview(calc) {
    const r = state.recipient;
    const d = state.donor;
    const isAuto = state.mode === 'auto';

    // Patient/Donor Preview Table
    let ptTable = '';
    if (isAuto) {
      ptTable = `<table class="doc-table">
        <tr><td class="lbl" colspan="2" style="width:26%;">Name</td><td colspan="2"><strong>${escHtml(r.name)}</strong></td></tr>
        <tr><td class="lbl" colspan="2">Chart No.</td><td colspan="2">${escHtml(r.chartNo)}</td></tr>
        <tr><td class="lbl" colspan="2">Age</td><td colspan="2">${escHtml(r.age)}</td></tr>
        <tr><td class="lbl" colspan="2">Gender</td><td colspan="2">${escHtml(r.gender)}</td></tr>
        <tr><td class="lbl" colspan="2">Height(cm) | Weight(kg)</td><td style="text-align:center;">${escHtml(r.height)}</td><td style="text-align:center;">${escHtml(r.weight)}</td></tr>
        <tr><td class="lbl" colspan="2">Blood type</td><td colspan="2"><strong>${escHtml(r.bloodType)}</strong></td></tr>
        <tr><td class="lbl" colspan="2">Test date</td><td colspan="2">${escHtml(r.testDate)}</td></tr>
        <tr><td class="lbl" colspan="2">HBV</td><td colspan="2" style="white-space:pre-wrap;">${renderPositiveBoldHtml(r.hbv)}</td></tr>
        <tr><td class="lbl" colspan="2">HCV</td><td colspan="2">${renderPositiveBoldHtml(r.hcv)}</td></tr>
        <tr><td class="lbl" colspan="2">CMV</td><td colspan="2" style="white-space:pre-wrap;">${renderPositiveBoldHtml(r.cmv)}</td></tr>
        <tr><td class="lbl" rowspan="2">EBV</td><td class="lbl" style="width:10%;">VCA</td><td colspan="2">${renderPositiveBoldHtml(r.ebvVca)}</td></tr>
        <tr><td class="lbl">Others</td><td colspan="2" style="white-space:pre-wrap;">${renderPositiveBoldHtml(r.ebvOthers)}</td></tr>
        <tr><td class="lbl" colspan="2">HIV</td><td colspan="2">${renderPositiveBoldHtml(r.hiv)}</td></tr>
        <tr><td class="lbl" colspan="2">HTLV1+2</td><td colspan="2">${renderPositiveBoldHtml(r.htlv)}</td></tr>
        <tr><td class="lbl" colspan="2">VZV</td><td colspan="2">${renderPositiveBoldHtml(r.vzv)}</td></tr>
        <tr><td class="lbl" colspan="2">STS-RPR</td><td colspan="2">${renderPositiveBoldHtml(r.rpr)}</td></tr>
        <tr><td class="lbl" colspan="2">Toxoplasma</td><td colspan="2">${renderPositiveBoldHtml(r.toxo)}</td></tr>
        <tr><td class="lbl" colspan="2">Other comorbidities</td><td colspan="2">${escHtml(r.otherComorb)}</td></tr>
      </table>`;
    } else {
      const loci = ['A', 'B', 'C', 'DR', 'DQ', 'DP'];
      const hlaHtml = loci.map((loc, idx) => {
        const vals = state.hla[loc] || ['', '', '', ''];
        const mm = calc.hlaCalc ? calc.hlaCalc.loci[loc] : {};
        const cell = (v, isMm, color) => `<td style="text-align:center;${isMm ? `color:${color};font-weight:700;` : ''}">${escHtml(v)}</td>`;
        return `<tr>
          ${idx === 0 ? `<td class="lbl" rowspan="6" style="text-align:center;">HLA</td>` : ''}
          <td class="lbl" style="text-align:center;">${loc}</td>
          ${cell(vals[0], mm.r1Mismatch, '#ff0000')}${cell(vals[1], mm.r2Mismatch, '#ff0000')}${cell(vals[2], mm.d1Mismatch, '#0007ff')}${cell(vals[3], mm.d2Mismatch, '#0007ff')}
        </tr>`;
      }).join('');

      ptTable = `<table class="doc-table">
        <tr><th colspan="2" style="width:24%;"></th><th colspan="2" style="width:38%;">Recipient</th><th colspan="2" style="width:38%;">${escHtml(d.label || 'Donor')}</th></tr>
        <tr><td class="lbl" colspan="2">Name</td><td colspan="2" style="text-align:center;"><strong>${escHtml(r.name)}</strong></td><td colspan="2" style="text-align:center;"><strong>${escHtml(d.name)}</strong></td></tr>
        <tr><td class="lbl" colspan="2">Chart number</td><td colspan="2" style="text-align:center;">${escHtml(r.chartNo)}</td><td colspan="2" style="text-align:center;">${escHtml(d.chartNo)}</td></tr>
        <tr><td class="lbl" colspan="2">Age</td><td colspan="2" style="text-align:center;">${escHtml(r.age)}</td><td colspan="2" style="text-align:center;">${escHtml(d.age)}</td></tr>
        <tr><td class="lbl" colspan="2">Gender</td><td colspan="2" style="text-align:center;">${escHtml(r.gender)}</td><td colspan="2" style="text-align:center;">${escHtml(d.gender)}</td></tr>
        <tr><td class="lbl" colspan="2">Height(cm) | Weight(kg)</td><td style="text-align:center;">${escHtml(r.height)}</td><td style="text-align:center;">${escHtml(r.weight)}</td><td style="text-align:center;">${escHtml(d.height)}</td><td style="text-align:center;">${escHtml(d.weight)}</td></tr>
        <tr><td class="lbl" colspan="2">Blood type</td><td colspan="2" style="text-align:center;"><strong>${escHtml(r.bloodType)}</strong></td><td colspan="2" style="text-align:center;"><strong>${escHtml(d.bloodType)}</strong></td></tr>
        ${hlaHtml}
        <tr><td class="lbl" colspan="2">Rejection direction:</td><td colspan="2"></td><td colspan="2" style="text-align:center;">${renderDirectionRatioHtml(calc.hlaCalc ? calc.hlaCalc.rejectionText : '', '#0007ff')}</td></tr>
        <tr><td class="lbl" colspan="2">GvHD direction:</td><td colspan="2"></td><td colspan="2" style="text-align:center;">${renderDirectionRatioHtml(calc.hlaCalc ? calc.hlaCalc.gvhdText : '', '#ff0000')}</td></tr>
        <tr><td class="lbl" colspan="2">Test date</td><td colspan="2" style="text-align:center;">${escHtml(r.testDate)}</td><td colspan="2" style="text-align:center;">${escHtml(d.testDate)}</td></tr>
        <tr><td class="lbl" colspan="2">HBV</td><td colspan="2" style="white-space:pre-wrap;">${renderPositiveBoldHtml(r.hbv)}</td><td colspan="2" style="white-space:pre-wrap;">${renderPositiveBoldHtml(d.hbv)}</td></tr>
        <tr><td class="lbl" colspan="2">HCV</td><td colspan="2">${renderPositiveBoldHtml(r.hcv)}</td><td colspan="2">${renderPositiveBoldHtml(d.hcv)}</td></tr>
        <tr><td class="lbl" colspan="2">CMV</td><td colspan="2" style="white-space:pre-wrap;">${renderPositiveBoldHtml(r.cmv)}</td><td colspan="2" style="white-space:pre-wrap;">${renderPositiveBoldHtml(d.cmv)}</td></tr>
        <tr><td class="lbl" rowspan="2">EBV</td><td class="lbl">VCA</td><td colspan="2">${renderPositiveBoldHtml(r.ebvVca)}</td><td colspan="2">${renderPositiveBoldHtml(d.ebvVca)}</td></tr>
        <tr><td class="lbl">Others</td><td colspan="2" style="white-space:pre-wrap;">${renderPositiveBoldHtml(r.ebvOthers)}</td><td colspan="2" style="white-space:pre-wrap;">${renderPositiveBoldHtml(d.ebvOthers)}</td></tr>
        <tr><td class="lbl" colspan="2">HIV</td><td colspan="2">${renderPositiveBoldHtml(r.hiv)}</td><td colspan="2">${renderPositiveBoldHtml(d.hiv)}</td></tr>
        <tr><td class="lbl" colspan="2">HTLV1+2</td><td colspan="2">${renderPositiveBoldHtml(r.htlv)}</td><td colspan="2">${renderPositiveBoldHtml(d.htlv)}</td></tr>
        <tr><td class="lbl" colspan="2">VZV</td><td colspan="2">${renderPositiveBoldHtml(r.vzv)}</td><td colspan="2">${renderPositiveBoldHtml(d.vzv)}</td></tr>
        <tr><td class="lbl" colspan="2">STS-RPR</td><td colspan="2">${renderPositiveBoldHtml(r.rpr)}</td><td colspan="2">${renderPositiveBoldHtml(d.rpr)}</td></tr>
        <tr><td class="lbl" colspan="2">Toxoplasma</td><td colspan="2">${renderPositiveBoldHtml(r.toxo)}</td><td colspan="2">${renderPositiveBoldHtml(d.toxo)}</td></tr>
        <tr><td class="lbl" colspan="2">Other comorbidities</td><td colspan="2">${escHtml(r.otherComorb)}</td><td colspan="2">${escHtml(d.otherComorb)}</td></tr>
      </table>`;
    }

    // Schedule Table Preview (10pt)
    const days = calc.scheduleDays;
    let schedHtml = `<table class="doc-table" style="text-align:center;font-size:10pt;">
      <tr><td class="lbl" style="text-align:left;background:#fff2cc;">Day</td>${days.map(x => `<td style="background:${x.day===0?'#fce4d6':'#fff2cc'};font-weight:700;${x.day===0?'color:#ff0000;':''}">${x.day>0?'+'+x.day:x.day}</td>`).join('')}</tr>
      <tr><td class="lbl" style="text-align:left;">Week Days</td>${days.map(x => `<td style="background:${x.day===0?'#fce4d6':'#efefef'};">${x.weekday}</td>`).join('')}</tr>
      <tr><td class="lbl" style="text-align:left;">Date</td>${days.map(x => `<td style="background:${x.day===0?'#fce4d6':'#efefef'};${x.day===0?'font-weight:700;':''}">${x.dateStr}</td>`).join('')}</tr>
      ${calc.scheduleRows.map(row => `<tr><td class="lbl" style="text-align:left;background:#fff;">${escHtml(row.name)}</td>${days.map(x => {
        const hit = row.days.has(x.day);
        return `<td style="${hit ? 'background:#e8f1fb;color:#1774d3;font-weight:700;' : ''}">${hit ? 'V' : ''}</td>`;
      }).join('')}</tr>`).join('')}
      <tr><td class="lbl" style="text-align:left;">Basic IVF(ml)</td>${days.map(x => `<td style="background:#f7f7f7;">${x.ivf}</td>`).join('')}</tr>
    </table>`;

    const a = calc.anthro;
    const basisNote = state.dosingBasis === 'actual'
      ? '(2012 ASCO建議藥物劑量以Actual BW/BSA計算；以下藥物劑量以 Actual BW 及 Actual BSA 計算)'
      : '(2012 ASCO建議藥物劑量以Actual BW/BSA計算；以下藥物劑量為 Adjusted BW 及 Adjusted BSA 計算)';

    const aboImgHtml = !isAuto && window.ABO_TABLE_IMAGE_B64
      ? `<img class="abo-ref-img" src="data:image/jpeg;base64,${window.ABO_TABLE_IMAGE_B64}" alt="ABO Transfusion Guidelines">`
      : '';

    const labText = isAuto
      ? '# Check one-touch, CBC/DC (omit D/C if WBC < 500) QD, BCS QW1,3,5, Aspergillus Ag QW1, others as ward routine.'
      : '# Check one-touch, CBC/DC (omit D/C if WBC < 500), BCS, CsA/Tacrolimus level (C0), CMV viral load, EBV viral load, Aspergillus Ag, BK/JC virus as ward routine.';

    $('livePreview').innerHTML = `
      <h1 class="doc-title">${escHtml(calc.title)}</h1>
      ${ptTable}

      <div class="page-break-bar">第 2 頁</div>
      <h3 class="sec-title sec-page-break">(1) General measurement order</h3>
      <div class="order-line bold"># Diagnosis:</div>
      <div class="order-line royal">${escHtml(state.diagnosis || '')}</div>
      <div class="order-line bold" style="margin-top:6px;"># Comorbidity:</div>
      <div class="order-line royal">${escHtml(state.comorbidity || 'Nil')}</div>
      <div class="order-line bold" style="margin-top:6px;"># Status: <span class="royal-blue-date">${escHtml(state.status)}</span></div>
      <div class="order-line bold"># Allergy: <span class="royal-blue-date">${escHtml(state.allergy || 'Nil')}</span></div>
      <div class="order-line bold"># Vital signs, I/O, BW, AG, Diet: <span class="royal-blue-date">as ward routine</span></div>
      <div class="order-line bold"># Admission to ${escHtml(state.ward)} on D<span class="royal-blue-date">${escHtml(window.BMTCalc.fmtDayLabel(state.admissionD).slice(1))}</span>: <span class="royal-blue-date">${escHtml(calc.admDateStr)}</span>, and D<span class="royal-blue-date">0</span>: <span class="royal-blue-date">${escHtml(calc.d0DateStr)}</span></div>
      <div class="order-line bold"># Conditioning: <span class="royal-blue-date">${escHtml(state.conditioningName)}</span></div>
      ${!isAuto && state.gvhdProphylaxis ? `<div class="order-line bold"># Acute GVHD prophylaxis: <span class="royal-blue-date">${escHtml(state.gvhdProphylaxis)}</span></div>` : ''}

      <div class="order-line bold" style="margin-top:8px;"># Medication:</div>
      ${calc.medOrders.map(m => `<div class="order-line">${renderRichOrderHtml(m)}</div>`).join('')}

      ${state.meds.otherOrders && state.meds.otherOrders.trim() ? `
        <div class="order-line bold" style="margin-top:6px;"># Other order:</div>
        <div class="order-line indent">${escHtml(state.meds.otherOrders.trim())}</div>
      ` : ''}

      <div class="order-line bold" style="margin-top:8px;"># Anti-emesis order:</div>
      ${calc.antiemeticOrders.map(x => {
        if (x.includes('\n')) {
          return x.split('\n').map((ln, idx) =>
            `<div class="order-line ${idx === 0 ? 'indent' : 'indent-sub'}">${renderRichOrderHtml(ln)}</div>`
          ).join('');
        }
        return `<div class="order-line indent">${renderRichOrderHtml(x)}</div>`;
      }).join('')}

      <div class="page-break-bar">第 3 頁</div>
      <h3 class="sec-title sec-page-break">${isAuto ? '(2) Conditioning regimen' : '(2) Conditioning and Acute GVHD prophylaxis order'}</h3>
      <div class="order-line"># Height: ${a.height} cm, Actual BW: ${a.actualBW} kg, Actual BSA: ${a.actualBSA.toFixed(2)} m2, <span class="adj-red">Adjusted BW: ${a.adjBW.toFixed(1)} kg</span>, <span class="adj-red">Adjusted BSA: ${a.adjBSA.toFixed(2)} m2</span></div>
      <div class="order-line muted">${basisNote}</div>
      ${schedHtml}
      ${calc.conditioningOrders.map(o => {
        if (o.includes('\nPre-medication:\n')) {
          let inPremed = false;
          return o.split('\n').map(ln => {
            if (ln.trim() === 'Pre-medication:') {
              inPremed = true;
              return '<div class="order-line bold">Pre-medication:</div>';
            }
            if (inPremed) {
              return `<div class="order-line indent">${renderRichOrderHtml(ln)}</div>`;
            }
            return `<div class="order-line">${renderRichOrderHtml(ln)}</div>`;
          }).join('');
        }
        return `<div class="order-line">${renderRichOrderHtml(o)}</div>`;
      }).join('')}

      <div class="page-break-bar">第 4 頁</div>
      <h3 class="sec-title sec-page-break">(3) Stem cell transplantation order</h3>
      <div class="order-line">${renderRichOrderHtml(`# ${calc.stemCellLine}`)}</div>
      <div class="order-line"># On EKG monitor, O2 use PRN during stem cell infusion.</div>
      <div class="order-line"># No leukocyte filter usage.</div>
      <div class="order-line"># Diphenhydramine 30 mg or hydrocortisone 100 mg IV before stem cell transfusion.</div>
      <div class="order-line"># Check CD34+ cell count (target 2.5 ~ 5.0 x 10^6/kg); cryopreserve stem cells &amp; lymphocytes as <span class="royal-blue-date">VS ${escHtml(state.vs || '____')}</span>'s order.</div>
      <div class="order-line"># ${isAuto ? 'Planned to infuse CD34+ cell dose = ' : 'Stem cell infusion: '}<span class="${calc.cd34Pending ? 'adj-red' : 'royal-blue-date'}">${escHtml(calc.cd34Display)}</span> on D<span class="royal-blue-date">0</span> (<span class="royal-blue-date">${escHtml(calc.d0MD)}</span>)</div>

      <h3 class="sec-title">(4) Blood transfusion order</h3>
      ${isAuto
        ? `<div class="order-line bold"># Blood type: ${escHtml(r.bloodType)}</div>
           ${calc.blood.rhWarning ? `<div class="order-line red"># ${escHtml(calc.blood.rhGuidance)}</div>` : ''}`
        : `<div class="order-line bold"># Blood type: Donor ${escHtml(d.bloodType)}; Recipient: ${escHtml(r.bloodType)} (${escHtml(calc.blood.mismatch)}${calc.blood.rhWarning ? '；' + escHtml(calc.blood.rhStatus) : ''})</div>
           <div class="order-line red"># Choice of RBC product: ${escHtml(calc.blood.rbc)}</div>
           <div class="order-line blue"># Choice of Platelet, FFP or cryoprecipitate: ${escHtml(calc.blood.plt)}</div>
           ${calc.blood.rhWarning ? `<div class="order-line red"># ${escHtml(calc.blood.rhGuidance)}</div>` : ''}`}
      <div class="order-line"># With irradiation except for FFP, cryoprecipitate and stem cell</div>
      <div class="order-line"># With leukocyte filter except for FFP, cryoprecipitate, "leukocyte-depleted" products, and stem cell</div>
      <div class="order-line"># With premedication: diphenhydramine 1 amp IVPRN or hydrocortisone 100mg IVPRN</div>
      ${aboImgHtml}

      <h3 class="sec-title">(5) Laboratory monitoring order</h3>
      <div class="order-line">${labText}</div>

      <div class="sig-block">
        <div class="sig-line">Primary Care: <span class="sig-name">${escHtml(state.primaryCare)}</span></div>
        <div class="sig-line">BMT CR: <span class="sig-name">${escHtml(state.bmtCr)}</span></div>
        ${state.bedCr ? `<div class="sig-line">開床CR: <span class="sig-name">${escHtml(state.bedCr)}</span></div>` : ''}
        <div class="sig-line">Attending Physician: <span class="sig-name">${escHtml(state.vs)}</span></div>
        <div class="sig-line">BMT unit director: <span class="sig-name">${escHtml(state.director || '姚明')}</span></div>
      </div>
    `;
  }

  // --- Reference Page: All Hospital Protocols & Standard Drug Dosages ---
  function renderReferencePage() {
    const data = window.BMT_REFERENCE_DATA;
    const container = $('referencePage');
    if (!data || !container) return;

    const q = refSearch.trim().toLowerCase();
    const showRegimens = refFilter !== 'drugs';
    const showDrugTable = refFilter === 'all' || refFilter === 'drugs';

    const filteredRegimens = data.regimens.filter(reg => {
      if (refFilter !== 'all' && refFilter !== reg.cat) return false;
      if (!q) return true;
      const hay = `${reg.title} ${reg.badge} ${reg.ref} ${reg.rows.map(r => r.drug).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });

    const filteredDrugs = data.drugTable.filter(dr => {
      if (!q) return true;
      const hay = `${dr.name} ${dr.category} ${dr.stdDose} ${dr.diluent} ${dr.note}`.toLowerCase();
      return hay.includes(q);
    });

    const renderRegCard = (reg) => {
      const days = reg.days;
      const tableHtml = `<table class="sched-table">
        <thead><tr><th class="row-lbl">藥物 / Day</th>${days.map(d => `<th class="${d===0?'d0-col':''}">${d>0?'+'+d:d}</th>`).join('')}</tr></thead>
        <tbody>${reg.rows.map(row => `<tr><td class="row-lbl">${escHtml(row.drug)}</td>${days.map(d => {
          const customLbl = row.labels && row.labels[String(d)];
          const marked = (row.marks || []).includes(d);
          const txt = customLbl || (marked ? 'V' : '');
          return `<td class="${txt ? 'mark-v' : (d===0?'d0-col':'')}">${escHtml(txt)}</td>`;
        }).join('')}</tr>`).join('')}</tbody>
      </table>`;

      const applyBtn = reg.presetMode && reg.presetId
        ? `<button class="btn btn-primary btn-sm" data-ref-apply-mode="${reg.presetMode}" data-ref-apply-id="${reg.presetId}">⚡ 套用此處方並編輯</button>`
        : '';

      return `<div class="ref-card">
        <div class="ref-card-head">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span class="ref-badge">${escHtml(reg.badge)}</span>
            <h4>${escHtml(reg.title)}</h4>
          </div>
          ${applyBtn}
        </div>
        <div class="ref-card-body">
          <p class="ref-note">${escHtml(reg.ref)}</p>
          ${tableHtml}
        </div>
      </div>`;
    };

    const filterBtns = [
      ['all', '全部'],
      ['allo', 'Allo-HSCT'],
      ['ptcy', 'Haplo-PTCy'],
      ['auto', 'Auto-HSCT'],
      ['drugs', '💊 藥物標準劑量總表']
    ].map(([k, lbl]) =>
      `<button class="ref-filter-btn ${refFilter === k ? 'active' : ''}" data-ref-filter="${k}">${lbl}</button>`
    ).join('');

    container.innerHTML = `
      <div class="ref-header">
        <div>
          <h2 style="margin:0; font-size:20px; color:#0f172a;">📚 常見移植處方與藥物標準劑量對照表</h2>
          <p style="margin:2px 0 0 0; font-size:13px; color:#64748b;">彙整科內 Allo / Auto / Haplo-PTCy 常用處方日程、台大 TBI 12Gy (1.5Gy BID×4d) 及藥物進位與稀釋標準</p>
        </div>
        <div class="ref-controls">
          <input class="ref-search" id="refSearchInput" type="search" value="${escHtml(refSearch)}" placeholder="搜尋處方或藥物（如 TBF3, BEAM, Tacrolimus）...">
          ${filterBtns}
        </div>
      </div>

      <div class="ref-principles">
        <h3>臨床處方大原則（Clinical Pearls）</h3>
        <ul>${data.principles.map(p => `<li>${escHtml(p)}</li>`).join('')}</ul>
      </div>

      ${showRegimens ? `
        <h3 style="margin:0 0 10px 0; font-size:16px;">常見移植 Conditioning 處方（共 ${filteredRegimens.length} 組）</h3>
        <div class="ref-grid">
          ${filteredRegimens.length ? filteredRegimens.map(renderRegCard).join('') : '<p style="color:#64748b;">無符合搜尋關鍵字的處方。</p>'}
        </div>
      ` : ''}

      ${showDrugTable ? `
        <h3 style="margin:0 0 10px 0; font-size:16px;">💊 常用移植藥物標準劑量、稀釋液與進位規則總表</h3>
        <div style="overflow-x:auto; border-radius:10px; box-shadow:var(--shadow);">
          <table class="ref-drug-table">
            <thead>
              <tr>
                <th>藥物名稱</th>
                <th>分類</th>
                <th>標準劑量</th>
                <th>計算基準</th>
                <th>進位規則 (MROUND)</th>
                <th>標準稀釋液與輸注時間</th>
                <th>臨床注意事項</th>
              </tr>
            </thead>
            <tbody>
              ${filteredDrugs.map(dr => `<tr>
                <td><strong>${escHtml(dr.name)}</strong></td>
                <td><span class="ref-badge">${escHtml(dr.category)}</span></td>
                <td><strong>${escHtml(dr.stdDose)}</strong></td>
                <td>${escHtml(dr.basis)}</td>
                <td>${escHtml(dr.round)}</td>
                <td>${escHtml(dr.diluent)}</td>
                <td>${escHtml(dr.note)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    `;

    const searchInp = $('refSearchInput');
    if (searchInp) {
      searchInp.addEventListener('input', () => {
        refSearch = searchInp.value;
        const pos = searchInp.selectionStart;
        renderReferencePage();
        const nextInp = $('refSearchInput');
        if (nextInp) {
          nextInp.focus();
          nextInp.setSelectionRange(pos, pos);
        }
      });
    }

    container.querySelectorAll('[data-ref-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        refFilter = btn.dataset.refFilter;
        renderReferencePage();
      });
    });

    container.querySelectorAll('[data-ref-apply-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetMode = btn.dataset.refApplyMode;
        const presetId = btn.dataset.refApplyId;
        const preset = (window.BMT_PRESETS[targetMode] || []).find(p => p.id === presetId);
        if (!preset) return;
        if (state.mode !== targetMode) {
          switchProtocolMode(targetMode);
        }
        const patch = deepClone(preset.patch);
        Object.keys(patch).forEach(k => {
          if (k === 'drugs') state.drugs = patch.drugs;
          else state[k] = patch[k];
        });
        state.ivfOverrides = {};
        activeView = 'editor';
        renderAll();
        showToast(`已切換至 ${targetMode.toUpperCase()} 並套用處方：${preset.name}`);
      });
    });
  }

  function switchProtocolMode(targetMode) {
    const savedRecipient = deepClone(state.recipient);
    const savedDonor = deepClone(state.donor);
    const savedHla = deepClone(state.hla);
    const savedMeta = {
      diagnosis: state.diagnosis,
      comorbidity: state.comorbidity,
      status: state.status,
      allergy: state.allergy,
      ward: state.ward,
      admissionDate: state.admissionDate,
      donorRelation: state.donorRelation,
      cd34Dose: state.cd34Dose,
      vs: state.vs,
      primaryCare: state.primaryCare,
      bmtCr: state.bmtCr,
      bedCr: state.bedCr,
      director: state.director
    };
    const savedOtherOrders = (state.meds && state.meds.otherOrders) || '';
    state = deepClone(window.BMT_EMPTY_STATES[targetMode]);
    state.recipient = savedRecipient;
    if (targetMode !== 'auto') {
      state.donor = savedDonor;
      state.hla = savedHla;
    }
    Object.assign(state, savedMeta);
    if (state.meds) state.meds.otherOrders = savedOtherOrders;
  }

  // --- Global Event Listeners ---
  document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetMode = btn.dataset.mode;
      if (targetMode === 'reference') {
        activeView = 'reference';
        renderAll();
        return;
      }
      const wasRef = activeView === 'reference';
      activeView = 'editor';
      if (targetMode === state.mode) {
        if (wasRef) renderAll();
        return;
      }
      switchProtocolMode(targetMode);
      renderAll();
      showToast(`已切換至 ${btn.textContent} 模式（已保留病患基本資料）`);
    });
  });

  $('dosingBasisSelect').addEventListener('change', (e) => {
    state.dosingBasis = e.target.value;
    updateDynamicViews();
  });

  $('customConditioningNotes').addEventListener('input', (e) => {
    state.customConditioningNotes = e.target.value;
    updateDynamicViews();
  });

  $('btnResetIvf').addEventListener('click', () => {
    state.ivfOverrides = {};
    updateDynamicViews();
    showToast('已重設為預設 Basic IVF');
  });

  $('btnLoadDemo').addEventListener('click', () => {
    state = deepClone(window.BMT_DEMO_CASES[state.mode]);
    renderAll();
    showToast('已載入範例病患資料');
  });

  $('btnClearForm').addEventListener('click', () => {
    Object.keys(state.recipient).forEach(k => { state.recipient[k] = ''; });
    Object.keys(state.donor).forEach(k => { state.donor[k] = k === 'label' ? 'Donor' : ''; });
    ['A', 'B', 'C', 'DR', 'DQ', 'DP'].forEach(loc => { state.hla[loc] = ['', '', '', '']; });
    state.hla.autoCalc = true;
    state.hla.rejectionManual = '';
    state.hla.gvhdManual = '';
    state.diagnosis = '';
    state.comorbidity = '';
    state.status = '';
    state.allergy = '';
    state.admissionDate = '';
    state.cd34Dose = '';
    state.vs = '';
    state.donorRelation = 'auto';
    state.meds.feburicNote = '';
    state.meds.letermovirNote = '';
    state.meds.otherOrders = '';
    state.customConditioningNotes = '';
    const impStatus = $('candidateImportStatus');
    if (impStatus) { impStatus.style.display = 'none'; impStatus.innerHTML = ''; }
    renderAll();
    showToast('已清空病患資料');
  });

  // Export Word (.docx)
  function doExportDocx() {
    try {
      const calc = window.BMTCalc.computeProtocol(state);
      const filename = window.BMTDocx.downloadDocx(state, calc);
      showToast(`已匯出 Word 檔：${filename}`);
    } catch (err) {
      console.error(err);
      alert('匯出 Word 檔發生錯誤：' + err.message);
    }
  }
  if ($('btnExportDocx')) $('btnExportDocx').addEventListener('click', doExportDocx);
  $('btnExportDocx2').addEventListener('click', doExportDocx);
  $('btnPrintPreview').addEventListener('click', () => window.print());

  // Save / Load JSON Draft (uses File System Access API with shared id so Load opens directly in the Saved folder!)
  let lastDraftHandle = null;

  $('btnSaveJson').addEventListener('click', async () => {
    const filename = `BMT_draft_${(state.recipient.name || 'patient').replace(/[\\/:*?"<>|]/g, '_')}.json`;
    const jsonStr = JSON.stringify(state, null, 2);

    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const pickerOpts = {
          id: 'bmt-protocol-drafts',
          suggestedName: filename,
          types: [{ description: 'BMT Protocol 草稿 (JSON)', accept: { 'application/json': ['.json'] } }]
        };
        if (lastDraftHandle) pickerOpts.startIn = lastDraftHandle;
        const handle = await window.showSaveFilePicker(pickerOpts);
        const writable = await handle.createWritable();
        await writable.write(jsonStr);
        await writable.close();
        lastDraftHandle = handle;
        showToast(`已儲存草稿：${handle.name}（下次讀檔將自動開啟此資料夾）`);
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        // Fall back to standard download if file:// blocks picker
      }
    }

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`已下載草稿：${filename}`);
  });

  function applyLoadedJsonText(text, fileName) {
    const parsed = JSON.parse(text);
    if (!parsed.mode || !parsed.recipient) throw new Error('格式不符');
    state = parsed;
    renderAll();
    showToast(`已載入草稿：${fileName}`);
  }

  $('btnLoadJson').addEventListener('click', async () => {
    if (typeof window.showOpenFilePicker === 'function') {
      try {
        const pickerOpts = {
          id: 'bmt-protocol-drafts',
          multiple: false,
          types: [{ description: 'BMT Protocol 草稿 (JSON)', accept: { 'application/json': ['.json'] } }]
        };
        if (lastDraftHandle) pickerOpts.startIn = lastDraftHandle;
        const [handle] = await window.showOpenFilePicker(pickerOpts);
        const file = await handle.getFile();
        lastDraftHandle = handle;
        applyLoadedJsonText(await file.text(), file.name);
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        // Fall back to standard file input if file:// blocks picker
      }
    }
    $('jsonFileInput').click();
  });

  $('jsonFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        applyLoadedJsonText(reader.result, file.name);
      } catch (err) {
        alert('讀取草稿失敗：' + err.message);
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  });

  // --- Candidate File Upload & Full-Document Auto-Import ---
  function applyImportedCandidate(parsed, sourceName) {
    const targetMode = parsed.detectedMode || state.mode;
    const modeLabelMap = { allo: 'Allo-HSCT', auto: 'Auto-HSCT', ptcy: 'Haplo-PTCy' };

    // Preserve care-team signatures, ward, and dosing basis across patients
    const preserved = {
      ward: state.ward,
      dosingBasis: state.dosingBasis,
      primaryCare: state.primaryCare,
      bmtCr: state.bmtCr,
      bedCr: state.bedCr,
      director: state.director
    };

    // Start from clean empty state for targetMode so no previous patient data leaks
    state = deepClone(window.BMT_EMPTY_STATES[targetMode]);
    Object.assign(state, preserved);

    // Apply unambiguous conditioning preset if detected (e.g., BEAM, Bu4Cy2, TBF3...)
    let appliedPresetName = '';
    if (parsed.suggestedPresetId && window.BMT_PRESETS[targetMode]) {
      const preset = window.BMT_PRESETS[targetMode].find(p => p.id === parsed.suggestedPresetId);
      if (preset) {
        const patch = deepClone(preset.patch);
        Object.keys(patch).forEach(k => {
          if (k === 'drugs') state.drugs = patch.drugs;
          else state[k] = patch[k];
        });
        appliedPresetName = preset.name;
      }
    }

    // Fill Recipient, Donor, HLA
    Object.assign(state.recipient, parsed.recipient || {});
    if (targetMode !== 'auto') {
      state.donor.label = (parsed.donor && parsed.donor.label) || 'Donor';
      Object.assign(state.donor, parsed.donor || {});
      state.donorRelation = 'auto';
      ['A', 'B', 'C', 'DR', 'DQ', 'DP'].forEach(loc => {
        state.hla[loc] = (parsed.hla && parsed.hla[loc]) ? parsed.hla[loc] : ['', '', '', ''];
      });
      state.hla.autoCalc = true;
      state.hla.rejectionManual = (parsed.hla && parsed.hla.rejectionManual) || '';
      state.hla.gvhdManual = (parsed.hla && parsed.hla.gvhdManual) || '';
    }

    // Fill Clinical Info
    if (parsed.vs) state.vs = parsed.vs;
    if (parsed.diagnosis) state.diagnosis = parsed.diagnosis;
    if (parsed.status) state.status = parsed.status;
    if (parsed.comorbidity) state.comorbidity = parsed.comorbidity;

    // If GVHD prophylaxis in plan specifies CsA / Tacrolimus / MMF / MTX, sync drug toggles cleanly
    if (targetMode !== 'auto' && parsed.plan && parsed.plan.gvhdProphylaxis) {
      const g = parsed.plan.gvhdProphylaxis;
      const D = state.drugs;
      if (/\bPTCy\b/i.test(g) && D.ptcy) D.ptcy.enabled = true;
      if (/\brATG\b/i.test(g) && D.ratg) D.ratg.enabled = true;
      if (/\bCsA\b|cyclosporine/i.test(g) && D.csa) {
        D.csa.enabled = true;
        if (D.tacrolimus) D.tacrolimus.enabled = false;
      } else if (/\bTacrolimus\b|FK-?506|Prograf/i.test(g) && D.tacrolimus) {
        D.tacrolimus.enabled = true;
        if (D.csa) D.csa.enabled = false;
      }
      if (/\bMMF\b|Myfortic/i.test(g) && D.mmf) {
        D.mmf.enabled = true;
        if (D.mtx) D.mtx.enabled = false;
      } else if (/\bMTX\b/i.test(g) && D.mtx) {
        D.mtx.enabled = true;
        if (D.mmf) D.mmf.enabled = false;
      }
      const derived = window.BMTCalc.deriveGvhdProphylaxis(state);
      if (derived) state.gvhdProphylaxis = derived;
    }

    renderAll();

    // Show concise import status banner inside Step 1
    const statusEl = $('candidateImportStatus');
    if (statusEl) {
      const ptLabel = state.recipient.name ? `${state.recipient.name}${state.recipient.chartNo ? ' (' + state.recipient.chartNo + ')' : ''}` : '未命名病患';
      const planBits = [];
      if (parsed.plan && parsed.plan.transplantType) planBits.push(`Type: ${parsed.plan.transplantType}`);
      if (parsed.plan && parsed.plan.conditioningRegimen) planBits.push(`Conditioning: ${parsed.plan.conditioningRegimen}`);
      if (parsed.plan && parsed.plan.gvhdProphylaxis) planBits.push(`GVHD: ${parsed.plan.gvhdProphylaxis}`);
      statusEl.innerHTML = `
        <strong>✓ 已匯入 Candidate 檔案：${escHtml(sourceName)}</strong>（${escHtml(ptLabel)}・模式：<strong>${modeLabelMap[targetMode] || targetMode}</strong>${appliedPresetName ? `・已套用處方：<strong>${escHtml(appliedPresetName)}</strong>` : ''}）<br>
        已自動帶入：${escHtml((parsed.summary || []).join('、') || '基本資料')}
        ${planBits.length ? `<br><span style="opacity:0.9;">原始 HSCT Plan：${escHtml(planBits.join(' ｜ '))}</span>` : ''}
      `;
      statusEl.style.display = 'block';
    }
    showToast(`已成功匯入 ${sourceName}（${modeLabelMap[targetMode] || targetMode}）`);
  }

  async function handleCandidateFile(file) {
    if (!file) return;
    try {
      const parsed = await window.BMTCandidateImporter.parseFile(file);
      const hasData = (parsed.summary && parsed.summary.length > 0) ||
        Object.keys(parsed.recipient || {}).length > 0 ||
        Boolean(parsed.diagnosis);
      if (!hasData) {
        alert('未在檔案中偵測到可辨識的 HSCT Candidate 資料，請確認檔案內容格式。');
        return;
      }
      applyImportedCandidate(parsed, file.name);
    } catch (err) {
      console.error(err);
      alert('匯入 Candidate 檔案失敗：' + (err && err.message ? err.message : err));
    }
  }

  if ($('btnUploadCandidate')) {
    $('btnUploadCandidate').addEventListener('click', () => $('candidateFileInput').click());
  }
  if ($('candidateFileInput')) {
    $('candidateFileInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleCandidateFile(file);
      e.target.value = '';
    });
  }
  const dropzone = $('candidateDropzone');
  if (dropzone) {
    dropzone.addEventListener('click', () => $('candidateFileInput').click());
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        $('candidateFileInput').click();
      }
    });
  }
  const candCard = $('candidateCard');
  if (candCard) {
    candCard.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (dropzone) dropzone.classList.add('drag-over');
    });
    candCard.addEventListener('dragleave', (e) => {
      if (!candCard.contains(e.relatedTarget) && dropzone) dropzone.classList.remove('drag-over');
    });
    candCard.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dropzone) dropzone.classList.remove('drag-over');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleCandidateFile(file);
    });
  }

  // Paste Import Modal (supports HTML clipboard table + TSV + vertical plain-text + full Candidate doc)
  let capturedPasteHtml = '';
  const updatePasteHint = (msg) => {
    const h = $('pasteModeHint');
    if (!h) return;
    if (!msg) { h.style.display = 'none'; h.textContent = ''; }
    else { h.style.display = 'block'; h.textContent = msg; }
  };

  const openPasteModal = () => {
    capturedPasteHtml = '';
    $('pasteTextarea').value = '';
    updatePasteHint('');
    $('pasteModal').classList.add('open');
    setTimeout(() => $('pasteTextarea').focus(), 50);
  };
  const closePasteModal = () => $('pasteModal').classList.remove('open');

  $('pasteTextarea').addEventListener('paste', (e) => {
    const html = (e.clipboardData && e.clipboardData.getData('text/html')) || '';
    if (html && /<table[\s>]/i.test(html)) {
      capturedPasteHtml = html;
      updatePasteHint('✓ 已偵測到 Word / Google Docs / Excel 原始表格結構，按下解析將以精準格線模式匯入！');
    } else {
      capturedPasteHtml = '';
      updatePasteHint('✓ 已偵測到純文字內容，將自動辨識 Candidate 文件或表格格式。');
    }
  });

  $('pasteTextarea').addEventListener('input', () => {
    if (!$('pasteTextarea').value.trim()) {
      capturedPasteHtml = '';
      updatePasteHint('');
    }
  });

  if ($('btnPasteImport')) $('btnPasteImport').addEventListener('click', openPasteModal);
  $('btnPasteImport2').addEventListener('click', openPasteModal);
  $('btnCloseModal').addEventListener('click', closePasteModal);
  $('btnCancelModal').addEventListener('click', closePasteModal);
  $('btnConfirmPaste').addEventListener('click', () => {
    const raw = $('pasteTextarea').value;
    if (!raw.trim() && !capturedPasteHtml) {
      showToast('請先貼上表格或 Candidate 內容');
      return;
    }

    // If pasted content looks like a full Candidate document (has Diagnosis / Comorbidity / HSCT plan), use full importer
    const isFullDoc = window.BMTCandidateImporter &&
      /(?:Definite\s+Diagnosis|Other\s+Comorbidities|HSCT\s+plan|Pre-HSCT\s+evaluation|Donor\s+data)/i.test(raw + ' ' + capturedPasteHtml);
    if (isFullDoc) {
      const fullParsed = window.BMTCandidateImporter.parseRichContent(raw, capturedPasteHtml);
      if ((fullParsed.summary && fullParsed.summary.length > 0) || fullParsed.diagnosis) {
        closePasteModal();
        applyImportedCandidate(fullParsed, '貼上之 Candidate 內容');
        return;
      }
    }

    const parsed = window.BMTCalc.parseCandidateTable(raw, state.mode, capturedPasteHtml);

    // Clear stale Recipient / Donor / HLA fields before filling new patient
    Object.keys(state.recipient).forEach(k => { state.recipient[k] = ''; });
    Object.assign(state.recipient, parsed.recipient);

    if (state.mode !== 'auto') {
      Object.keys(state.donor).forEach(k => { state.donor[k] = k === 'label' ? 'Donor' : ''; });
      state.donor.label = parsed.donor.label || 'Donor';
      Object.assign(state.donor, parsed.donor);
      state.donorRelation = 'auto';
      ['A', 'B', 'C', 'DR', 'DQ', 'DP'].forEach(loc => {
        state.hla[loc] = parsed.hla[loc] ? parsed.hla[loc] : ['', '', '', ''];
      });
      state.hla.rejectionManual = parsed.hla.rejectionManual || '';
      state.hla.gvhdManual = parsed.hla.gvhdManual || '';
    }

    closePasteModal();
    renderAll();
    const modeLabel = parsed.source === 'html' ? 'HTML 表格格線' : (parsed.source === 'vertical' ? '逐行純文字' : 'Tab 分欄');
    showToast(`已透過「${modeLabel}」成功解析並填入 Candidate 資料！`);
  });

  // Initial render
  renderAll();
})();
