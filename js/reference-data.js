// Comprehensive Hospital BMT Conditioning Regimens & Standard Drug Dosage Reference
// Compiled directly from Allo, Auto, PTCy Google Sheet "常見移植處方" tabs & 2026 hospital protocols

window.BMT_REFERENCE_DATA = {
  principles: [
    '只要 Donor 不是 Matched Sibling (MSD)，即應評估加上 rATG（Thymoglobuline）。',
    '常見 rATG 總劑量：MUD 5 mg/kg（2.5 mg/kg × 2d，若為 7/8 MMUD 請告知 VS 不合位點討論劑量）；Haplo GIAC / MMUD 6 mg/kg（3 mg/kg × 2d）；NTUH-modified PTCy 4 mg/kg（2 mg/kg × 2d）；懷孕多次 Donor（≥ G3）可考慮給 2.5 mg/kg × 1 天。',
    'Myfortic 換算原則：原始 protocol 用 MMF (Cellcept 250mg/tab) 15 mg/kg TID（上限 3 g/day），因本院改用 Myfortic (180mg/tab) 顆數對換，故為 10.8 mg/kg TID，上限 2160 mg/day（4# TID）。',
    'PTCy 絕對守則：最後一劑 Post-transplant Cyclophosphamide 後 24 小時內，不得給予任何免疫抑制劑（包含類固醇）。',
    '藥物交互作用與間隔：Busulfan 使用期間避免 Acetaminophen、Metronidazole、Triazoles；Endoxan 須與最後一劑 Busulfan 間隔 24 小時；Melphalan 須與幹細胞輸注間隔 > 24 小時；CsA/Tacrolimus 併用 Triazole 劑量減半。'
  ],

  drugTable: [
    { name: 'Fludarabine', category: 'Conditioning', stdDose: '30 mg/m²/day QD', basis: 'Adj BSA', round: 'MROUND 5 mg (50mg/vial)', diluent: 'N/S 100 ml IF 30 min', note: '自費，依總劑量自動估算支數' },
    { name: 'Busulfan (Busulfex)', category: 'Conditioning', stdDose: '3.2 mg/kg/day QD (Auto 可用 100 mg/m²)', basis: 'Adj BW (或 BSA)', round: 'MROUND 6 mg (60mg/10ml/amp)', diluent: 'N/S 約 10 倍體積 (dose×10/6) IF 3 hrs', note: '避免 Acetaminophen/Metronidazole/Triazoles；自動併用 Keppra 1# BID' },
    { name: 'Cyclophosphamide (Allo)', category: 'Conditioning', stdDose: '60 mg/kg/day QD (VSAA: 50 mg/kg/d)', basis: 'Adj BW', round: 'MROUND 50 mg', diluent: 'N/S 100cc IF 2.5 hrs', note: '距最後一劑 Busulfan 24 小時後給；併用 Mesna & U/A 監測' },
    { name: 'Cyclophosphamide (Pre-PTCy)', category: 'PTCy', stdDose: '14.5 mg/kg/day QD (D-7~D-6)', basis: 'Adj BW', round: 'MROUND 10 mg', diluent: 'N/S 100 ml IF 1 hr', note: 'Johns Hopkins RIC/MAC-PTCy 前導劑量' },
    { name: 'Cyclophosphamide (Post-PTCy)', category: 'PTCy', stdDose: '40 或 50 mg/kg/day QD (D+3~D+4)', basis: 'Adj BW', round: 'MROUND 10 mg', diluent: 'N/S 100 ml IF 2.5 hrs', note: '兩劑間隔 24 小時；打完 24 小時內禁用任何 ISD（含類固醇）' },
    { name: 'Mesna', category: 'Adjuvant', stdDose: 'Endoxan 單日劑量的一半 ×3（Allo 30 mg/kg；PTCy 20–25 mg/kg）', basis: 'Endoxan ÷ 2', round: 'MROUND 100 mg', diluent: '1h前 N/S 100cc；8h/14h後 N/S 500cc (with titration)', note: '原則為 Endoxan 劑量的一半，以 100 mg 為單位取最接近劑量；亦可手動調整' },
    { name: 'Thiotepa', category: 'Conditioning', stdDose: 'TBF: 5 mg/kg QD ×2d；TT-BCNU: 5 mg/kg BID ×2d', basis: 'Adj BW', round: 'MROUND 10 mg (100mg/vial)', diluent: 'N/S 500 ml IF 3 hrs', note: '自費／專案申請；穿過 BBB 適用 CNS lymphoma 或 TBF' },
    { name: 'TBI', category: 'Conditioning', stdDose: '台大 MAC 12Gy：150 cGy (1.5 Gy) BID × 4天；RIC-PTCy：200 cGy QD D-1 (SAA 400 cGy)', basis: '固定劑量', round: '—', diluent: '—', note: '需給止吐與 Solu-Medrol 40mg IV；BT <38.5°C、Hb ≥11.0 g/dL' },
    { name: 'rATG (Thymoglobuline)', category: 'GVHD', stdDose: 'MUD 2.5 mg/kg ×2d (總5)；Haplo/MMUD 3 mg/kg ×2d (總6)；PTCy 2 mg/kg ×2d', basis: 'Adj BW', round: '總量 MROUND 25 mg (25mg/vial，首日較多如 425→225/200)', diluent: 'N/S 500 ml IF 12 hrs', note: 'Pre-med: Solu-Medrol 40mg Q12H (PTCy 80mg), Vena 30mg, Scanol 1#' },
    { name: 'Cyclosporine (CsA)', category: 'GVHD', stdDose: '1.5 mg/kg Q12H (3 mg/kg/day)；併用 Triazole 減半為 0.75 mg/kg', basis: 'Adj BW', round: 'MROUND 25 mg (50mg/amp)', diluent: 'N/S 250 ml IF 3 hrs Q12H', note: 'Allo D-1 起；PTCy D+5 PM 起；追蹤 C0 level' },
    { name: 'Tacrolimus (Prograf)', category: 'GVHD', stdDose: 'PO 0.06 mg/kg Q12H (併用 Triazole 0.03)；IV 0.03 mg/kg/day cIF', basis: 'Adj BW', round: 'PO MROUND 0.5 mg', diluent: 'IV: N/S 250 ml cIF（勿用 PVC）', note: 'PTCy D+5 PM 起；Target level 5–15 ng/mL；IV 不可混 Acyclovir' },
    { name: 'Mycophenolate (Myfortic)', category: 'GVHD', stdDose: 'Allo RIC: 2# BIDAC；PTCy: 10.8 mg/kg TIDAC（上限 4# TID）', basis: 'Adj BW', round: '180 mg/cap 整顆', diluent: 'PO', note: 'Allo D0 輸後 4–6h 起；PTCy D+6 起；D+30 評估 taper' },
    { name: 'Methotrexate (MTX)', category: 'GVHD', stdDose: 'Allo MAC: D+1 15 mg/m² → D+3/6/11 10 mg/m²；PTCy: D+6/11 10 mg/m²', basis: 'Adj BSA', round: '四捨五入至整數 mg', diluent: 'IV push', note: '距幹細胞輸注滿 24h；每次後 12h 給 Leucovorin 15mg IV Q6H ×4' },
    { name: 'Rituximab', category: 'Auto', stdDose: 'IV 375 mg/m² 或 SC 1400 mg ONCE', basis: 'Adj BSA (IV)', round: 'IV MROUND 100 mg', diluent: 'IV: N/S 500 ml IF 2 hrs', note: 'Pre-med: Vena 30mg IVP + Rinderon 4mg IVP + Scanol 1#' },
    { name: 'Brentuximab (BV)', category: 'Auto', stdDose: '1.8 mg/kg ONCE (上限 180 mg)', basis: 'Actual BW', round: 'MROUND 5 mg (50mg/vial)', diluent: 'N/S 100 ml IF 30 min', note: '每瓶用 10ml DW 沿壁緩溶，不需 pre-med' },
    { name: 'Carmustine (BCNU)', category: 'Auto', stdDose: 'BEAM 300 mg/m²；TT-BCNU 400 mg/m²', basis: 'Adj BSA', round: 'MROUND 10 mg', diluent: 'D5W 250 ml IF 3 hrs', note: '需 titration 滴注' },
    { name: 'Bendamustine', category: 'Auto', stdDose: '200 mg/m²/day QD ×2d', basis: 'Adj BSA', round: 'MROUND 10 mg', diluent: 'N/S 500 ml IF 2 hrs', note: '自費，取代 BCNU (Benda-EAM)' },
    { name: 'Etoposide', category: 'Auto', stdDose: '200 mg/m²/day QD ×4d', basis: 'Adj BSA', round: 'MROUND 10 mg', diluent: 'N/S 1000 ml IF 4–6 hrs', note: 'BEAM / Benda-EAM 標準劑量' },
    { name: 'Cytarabine (Ara-C)', category: 'Auto', stdDose: '100–200 mg/m²/dose BID ×4d (共 8 劑)', basis: 'Adj BSA', round: 'MROUND 20 mg', diluent: 'N/S 250 ml IF 2 hrs BID', note: '請向 VS 確認 100 或 200；每次前 30m 給 Solu-Medrol 40mg IVP' },
    { name: 'Melphalan', category: 'Auto / Allo', stdDose: 'BEAM 140 mg/m²；MM 100 或 70 mg/m² ×2d (D-4~D-3)；GemBuMel 60 mg/m² ×2d', basis: 'Adj BSA', round: 'MROUND 10 mg', diluent: 'N/S 50–250 ml IF ≤30 min', note: '必須與幹細胞輸注間隔 > 24 小時' },
    { name: 'Gemcitabine', category: 'Auto', stdDose: '1875 mg/m² (舊版 HL 2775 mg/m²) D-7 & D-3', basis: 'Adj BSA', round: 'MROUND 20 mg (200mg/vial)', diluent: 'N/S 稀釋至總量 500 ml (Pump 10 mg/m²/min)', note: '自費，固定流速 10 mg/m²/min' }
  ],

  regimens: [
    // --- Allo ---
    {
      cat: 'allo',
      title: 'Allo RIC：Flu5 + Bu2 + Cy1 (Matched Sibling / MUD)',
      badge: 'Allo RIC',
      presetMode: 'allo',
      presetId: 'allo_ric_flu5bu2cy1',
      ref: '科內標準 RIC 處方（心臟不佳者 Cy 60 mg/kg ×1d 可改 Melphalan 140 mg/m² ×1d）',
      days: [-7, -6, -5, -4, -3, -2, -1, 0, 1],
      rows: [
        { drug: 'Fludarabine (30 mg/m²/d)', marks: [-7, -6, -5, -4, -3] },
        { drug: 'Busulfex (3.2 mg/kg/d)', marks: [-7, -6] },
        { drug: 'Endoxan (60 mg/kg/d)', marks: [-3] },
        { drug: 'rATG (2.5 mg/kg/d，MUD用)', marks: [-2, -1] },
        { drug: 'CsA (1.5 mg/kg Q12H)', marks: [-1, 0, 1] },
        { drug: 'Myfortic (180mg 2# BIDAC)', marks: [0, 1] }
      ]
    },
    {
      cat: 'allo',
      title: 'Allo MAC：Bu4 + Cy2 (MSD / MUD)',
      badge: 'Allo MAC',
      presetMode: 'allo',
      presetId: 'allo_mac_bu4cy2',
      ref: 'MSD 可與 VS 確認是否加 rATG 2.5 mg/kg；MTX 須與幹細胞輸注隔 24h (D1,3,6,11 或 D2,4,7,12)',
      days: [-7, -6, -5, -4, -3, -2, -1, 0, 1],
      rows: [
        { drug: 'Busulfex (3.2 mg/kg/d)', marks: [-7, -6, -5, -4] },
        { drug: 'Endoxan (60 mg/kg/d)', marks: [-3, -2] },
        { drug: 'rATG (2.5 mg/kg/d，MUD用)', marks: [-2, -1] },
        { drug: 'CsA (1.5 mg/kg Q12H)', marks: [-1, 0, 1] },
        { drug: 'MTX (15→10 mg/m²)', marks: [1] }
      ]
    },
    {
      cat: 'allo',
      title: 'Allo TBF3：Flu5 + Bu3 + Thiotepa2',
      badge: 'Allo TBF3',
      presetMode: 'allo',
      presetId: 'allo_tbf3',
      ref: '高復發風險 / Refractory AML 常用強化處方（Thiotepa 5 mg/kg QD ×2d 自費）',
      days: [-7, -6, -5, -4, -3, -2, -1, 0, 1],
      rows: [
        { drug: 'Fludarabine (30 mg/m²/d)', marks: [-7, -6, -5, -4, -3] },
        { drug: 'Busulfex (3.2 mg/kg/d)', marks: [-7, -6, -5] },
        { drug: 'Thiotepa (5 mg/kg/d QD)', marks: [-4, -3] },
        { drug: 'rATG (2.5 mg/kg/d)', marks: [-2, -1] },
        { drug: 'CsA (1.5 mg/kg Q12H)', marks: [-1, 0, 1] },
        { drug: 'MTX (15→10 mg/m²)', marks: [1] }
      ]
    },
    {
      cat: 'allo',
      title: 'Allo MAC：TBI 12Gy + Cy2 (ALL / CNS risk)',
      badge: 'Allo MAC-TBI',
      presetMode: 'allo',
      presetId: 'allo_mac_tbicy',
      ref: 'TBI 150 cGy BID × 4 days (Total 1200 cGy)；EBMT 2019 提醒注意 VOD 風險',
      days: [-7, -6, -5, -4, -3, -2, -1, 0, 1],
      rows: [
        { drug: 'TBI (150 cGy BID)', marks: [-7, -6, -5, -4] },
        { drug: 'Endoxan (60 mg/kg/d)', marks: [-3, -2] },
        { drug: 'CsA (1.5 mg/kg Q12H)', marks: [-1, 0, 1] },
        { drug: 'MTX (15→10 mg/m²)', marks: [1] }
      ]
    },
    {
      cat: 'allo',
      title: 'Allo VSAA：Cy 200 + rATG (BM)',
      badge: 'VSAA',
      presetMode: 'allo',
      presetId: 'allo_vsaa',
      ref: 'Endoxan 50 mg/kg/d ×4d + rATG 2.5 mg/kg/d ×3d；GVHD 預防 CsA + MTX（或 Myfortic）',
      days: [-7, -6, -5, -4, -3, -2, -1, 0, 1],
      rows: [
        { drug: 'Endoxan (50 mg/kg/d)', marks: [-7, -6, -5, -4] },
        { drug: 'rATG (2.5 mg/kg/d)', marks: [-3, -2, -1] },
        { drug: 'Stem cell', labels: { 0: 'BMSC', 1: 'BMSC' } },
        { drug: 'CsA', marks: [-1, 0, 1] },
        { drug: 'MTX / Myfortic', marks: [1] }
      ]
    },
    {
      cat: 'allo',
      title: 'Haplo GIAC MAC：Bu4 + Cy2 + Flu3 (BM + PB)',
      badge: 'Haplo GIAC',
      presetMode: 'allo',
      presetId: 'allo_giac_mac',
      ref: 'D0 輸 BMSC、D+1 輸 PBSC，故 MTX 通常順延至 D+2, D+4, D+7, D+12（第一劑 15、後三劑 10 mg/m²）',
      days: [-8, -7, -6, -5, -4, -3, -2, -1, 0, 1],
      rows: [
        { drug: 'Fludarabine (30 mg/m²/d)', marks: [-8, -7, -6] },
        { drug: 'Busulfex (3.2 mg/kg/d)', marks: [-8, -7, -6, -5] },
        { drug: 'Endoxan (60 mg/kg/d)', marks: [-4, -3] },
        { drug: 'rATG (3 mg/kg/d，總 6)', marks: [-2, -1] },
        { drug: 'Stem cell', labels: { 0: 'BMSC', 1: 'PBSC' } },
        { drug: 'CsA', marks: [-1, 0, 1] },
        { drug: 'MTX (D+2/4/7/12)', marks: [] }
      ]
    },
    {
      cat: 'allo',
      title: 'Refractory 2-stage：Clofarabine + Ara-C + Bu2Cy1',
      badge: 'Refractory',
      presetMode: null,
      presetId: null,
      ref: 'Ref: PMC5210249（Clofarabine 30 mg/m²/d + Ara-C 1000 mg/m²/d D-13~-9，接 Cy1Bu2）',
      days: [-13, -12, -11, -10, -9, -5, -4, -3, 0],
      rows: [
        { drug: 'Clofarabine (30 mg/m²/d)', marks: [-13, -12, -11, -10, -9] },
        { drug: 'Ara-C (1000 mg/m²/d)', marks: [-13, -12, -11, -10, -9] },
        { drug: 'Endoxan (60 mg/kg/d)', marks: [-5] },
        { drug: 'Busulfex (3.2 mg/kg/d)', marks: [-4, -3] }
      ]
    },

    // --- PTCy ---
    {
      cat: 'ptcy',
      title: 'Haplo PTCy RIC：Flu5 + Bu2 + Pre-Cy + TBI 2Gy (Johns Hopkins)',
      badge: 'PTCy RIC',
      presetMode: 'ptcy',
      presetId: 'ptcy_ric_jh',
      ref: 'D-1 給 TBI 2Gy 避免 Graft failure；PTCy 40 或 50 mg/kg D+3~+4；D+5 PM 起 Tacrolimus/CsA，D+6 起 Myfortic 10.8 mg/kg TID',
      days: [-7, -6, -5, -4, -3, -2, -1, 0, 3, 4, 5, 6],
      rows: [
        { drug: 'Fludarabine (30 mg/m²/d)', marks: [-7, -6, -5, -4, -3] },
        { drug: 'Endoxan (14.5 mg/kg/d)', marks: [-7, -6] },
        { drug: 'Busulfex (3.2 mg/kg/d)', marks: [-4, -3] },
        { drug: 'TBI', labels: { '-1': '2Gy' } },
        { drug: 'PTCy (40–50 mg/kg/d)', marks: [3, 4] },
        { drug: 'Tacrolimus / CsA', marks: [5, 6] },
        { drug: 'Myfortic (10.8mg/kg TID)', marks: [6] }
      ]
    },
    {
      cat: 'ptcy',
      title: 'Haplo PTCy MAC (Chemo)：Flu5 + Bu4 + Pre-Cy + TBI 2Gy',
      badge: 'PTCy MAC',
      presetMode: 'ptcy',
      presetId: 'ptcy_mac_chemo',
      ref: 'Ref: Int J Hematol 2019; 110:30–38（劉家豪醫師 JH 版本）；最後一劑 PTCy 後 24h 內禁用任何 ISD',
      days: [-7, -6, -5, -4, -3, -2, -1, 0, 3, 4, 5, 6],
      rows: [
        { drug: 'Fludarabine (30 mg/m²/d)', marks: [-7, -6, -5, -4, -3] },
        { drug: 'Endoxan (14.5 mg/kg/d)', marks: [-7, -6] },
        { drug: 'Busulfex (3.2 mg/kg/d)', marks: [-5, -4, -3, -2] },
        { drug: 'TBI', labels: { '-1': '2Gy' } },
        { drug: 'PTCy (50 mg/kg/d)', marks: [3, 4] },
        { drug: 'Tacrolimus (0.12 mg/kg/d)', marks: [5, 6] },
        { drug: 'Myfortic (10.8mg/kg TID)', marks: [6] }
      ]
    },
    {
      cat: 'ptcy',
      title: 'Haplo PTCy TBF2：Thiotepa2 + Flu4 + Bu2 + PTCy',
      badge: 'PTCy TBF2',
      presetMode: 'ptcy',
      presetId: 'ptcy_tbf2',
      ref: 'Ref: 2019 EHA；Thiotepa 5 mg/kg ×2d + Flu 30 mg/m² + Bu 3.2 mg/kg (或 130 mg/m²)',
      days: [-7, -6, -5, -4, -3, -2, -1, 0, 3, 4, 5, 6],
      rows: [
        { drug: 'Thiotepa (5 mg/kg/d)', marks: [-7, -6] },
        { drug: 'Fludarabine (30 mg/m²/d)', marks: [-5, -4, -3, -2] },
        { drug: 'Busulfex (3.2 mg/kg/d)', marks: [-5, -4] },
        { drug: 'PTCy (40–50 mg/kg/d)', marks: [3, 4] },
        { drug: 'Tacrolimus / CsA', marks: [5, 6] },
        { drug: 'Myfortic', marks: [6] }
      ]
    },
    {
      cat: 'ptcy',
      title: 'Haplo PTCy MAC (TBI 12Gy)：Flu3 + TBI 1.5Gy BID×4d + PTCy (台大版本)',
      badge: 'PTCy TBI',
      presetMode: 'ptcy',
      presetId: 'ptcy_mac_tbi',
      ref: '台大 TBI 12 Gy 標準為 150 cGy (1.5 Gy) BID × 4 days (D-4~D-1, total 1200 cGy) + Fludarabine 30 mg/m² ×3d + PTCy 50 mg/kg D+3~+4',
      days: [-7, -6, -5, -4, -3, -2, -1, 0, 3, 4, 5, 6],
      rows: [
        { drug: 'Fludarabine (30 mg/m²/d)', marks: [-7, -6, -5] },
        { drug: 'TBI (150 cGy BID ×4d)', marks: [-4, -3, -2, -1] },
        { drug: 'PTCy (50 mg/kg/d)', marks: [3, 4] },
        { drug: 'Tacrolimus', marks: [5, 6] },
        { drug: 'Myfortic', marks: [6] }
      ]
    },
    {
      cat: 'ptcy',
      title: 'Haplo PTCy for SAA (BMT CTN 1502)',
      badge: 'PTCy SAA',
      presetMode: null,
      presetId: null,
      ref: 'rATG 0.5/2/2 mg/kg (D-9~-7) + Flu5 + Pre-Cy 14.5 + TBI 2Gy (或 4Gy) + BMSC + PTCy 50 + Tacrolimus IV (0.03 mg/kg, TDM 10–15) + Myfortic',
      days: [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 3, 4, 5],
      rows: [
        { drug: 'rATG (mg/kg)', labels: { '-9': '0.5', '-8': '2.0', '-7': '2.0' } },
        { drug: 'Fludarabine (30 mg/m²/d)', marks: [-6, -5, -4, -3, -2] },
        { drug: 'Endoxan (14.5 mg/kg/d)', marks: [-6, -5] },
        { drug: 'TBI', labels: { '-1': '2Gy' } },
        { drug: 'PTCy (50 mg/kg/d)', marks: [3, 4] },
        { drug: 'Tacrolimus + Myfortic + G-CSF', marks: [5] }
      ]
    },

    // --- Auto ---
    {
      cat: 'auto',
      title: 'Auto：(R / BV)-BEAM',
      badge: 'Auto BEAM',
      presetMode: 'auto',
      presetId: 'auto_beam',
      ref: 'B-cell lymphoma 可加 Rituximab (375 mg/m² IV 或 1400 mg SC)；HL/CD30+ 可加 BV 1.8 mg/kg (Actual BW)；Ara-C 100–200 mg/m² BID 請向 VS 確認',
      days: [-7, -6, -5, -4, -3, -2, -1, 0],
      rows: [
        { drug: 'Rituximab / BV (選用)', marks: [-7] },
        { drug: 'BCNU (300 mg/m²/d)', marks: [-7] },
        { drug: 'Etoposide (200 mg/m²/d)', marks: [-6, -5, -4, -3] },
        { drug: 'Cytarabine (100–200 mg/m² BID)', marks: [-6, -5, -4, -3] },
        { drug: 'Melphalan (140 mg/m²/d)', marks: [-2] }
      ]
    },
    {
      cat: 'auto',
      title: 'Auto：Benda-EAM (取代 BCNU)',
      badge: 'Auto Benda-EAM',
      presetMode: 'auto',
      presetId: 'auto_benda_eam',
      ref: 'Ref: Blood 2011; 118(12):3419-3425；Bendamustine 200 mg/m²/d ×2d (自費)',
      days: [-7, -6, -5, -4, -3, -2, -1, 0],
      rows: [
        { drug: 'Bendamustine (200 mg/m²/d)', marks: [-7, -6] },
        { drug: 'Etoposide (200 mg/m²/d)', marks: [-5, -4, -3, -2] },
        { drug: 'Cytarabine (100–200 mg/m² BID)', marks: [-5, -4, -3, -2] },
        { drug: 'Melphalan (140 mg/m²/d)', marks: [-1] }
      ]
    },
    {
      cat: 'auto',
      title: 'Auto：Gem / Bu / Mel (Refractory HL / MM)',
      badge: 'Auto GemBuMel',
      presetMode: 'auto',
      presetId: 'auto_gembumel',
      ref: 'Ref: Lancet Haematol 2017; Blood 2015；Gemcitabine 1875 mg/m² (固定流速 10 mg/m²/min)，Bu 3.2 mg/kg 或 100 mg/m²，Mel 60 mg/m² ×2d',
      days: [-7, -6, -5, -4, -3, -2, -1, 0],
      rows: [
        { drug: 'Gemcitabine (1875 mg/m²)', marks: [-7, -3] },
        { drug: 'Busulfan (3.2mg/kg 或 100mg/m²)', marks: [-7, -6, -5, -4] },
        { drug: 'Melphalan (60 mg/m²/d)', marks: [-3, -2] },
        { drug: 'Keppra (1# BID)', marks: [-7, -6, -5, -4, -3] }
      ]
    },
    {
      cat: 'auto',
      title: 'Auto：(R)-Thiotepa + BCNU (PCNSL / CNS Lymphoma)',
      badge: 'Auto TT-BCNU',
      presetMode: 'auto',
      presetId: 'auto_tt_bcnu',
      ref: 'Ref: JCO 2006；BCNU 400 mg/m² D-5 + Thiotepa 5 mg/kg BID D-4~-3 (總 10 mg/kg，100mg/vial 需專案申請)',
      days: [-6, -5, -4, -3, -2, -1, 0],
      rows: [
        { drug: 'Rituximab (375 mg/m²，選用)', marks: [-6] },
        { drug: 'BCNU (400 mg/m²/d)', marks: [-5] },
        { drug: 'Thiotepa (5 mg/kg BID)', marks: [-4, -3] }
      ]
    },
    {
      cat: 'auto',
      title: 'Auto：High-Dose Melphalan (Multiple Myeloma)',
      badge: 'Auto MM',
      presetMode: 'auto',
      presetId: 'auto_hd_mel',
      ref: '實際施打於 D-4 及 D-3 兩天：各打 100 mg/m²/day（總 200 mg/m²）或 70 mg/m²/day（總 140 mg/m²），取決於病人年紀及腎功能；須距幹細胞輸注 > 24 小時',
      days: [-5, -4, -3, -2, -1, 0],
      rows: [
        { drug: 'Melphalan (100 或 70 mg/m²/d)', marks: [-4, -3] }
      ]
    },
    {
      cat: 'auto',
      title: 'Auto：(R)-TBC (Thiotepa / Busulfan / Cyclophosphamide)',
      badge: 'Auto TBC',
      presetMode: null,
      presetId: null,
      ref: 'PCNSL 強化處方：Rituximab D-10 + Thiotepa 250 mg/m² D-9~-7 + Busulfan 3.2 mg/kg D-6~-4 + Cy 60 mg/kg D-3~-2',
      days: [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0],
      rows: [
        { drug: 'Rituximab (375 mg/m²)', marks: [-10] },
        { drug: 'Thiotepa (250 mg/m²/d)', marks: [-9, -8, -7] },
        { drug: 'Busulfan (3.2 mg/kg/d)', marks: [-6, -5, -4] },
        { drug: 'Cyclophosphamide (60 mg/kg/d)', marks: [-3, -2] }
      ]
    }
  ]
};
