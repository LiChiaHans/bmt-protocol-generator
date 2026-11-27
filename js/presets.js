// Clinical Regimen Presets & Sample Templates (No real patient PII)
window.BMT_PRESETS = {
  allo: [
    {
      id: 'allo_ric_flu5bu2cy1',
      name: 'RIC Flu5Bu2Cy1 (MUD / MSD)',
      desc: 'Fludarabine D-7~-3, Busulfex D-7~-6, Cy D-3, rATG D-2~-1, CsA + Myfortic',
      patch: {
        admissionD: -7,
        conditioningName: 'RIC (Flu5Bu2Cy1)',
        gvhdProphylaxis: 'rATG + CsA + MMF',
        stemCellSource: 'PBSC',
        chemoStartD: -7,
        chemoEndD: -3,
        drugs: {
          tbi: { enabled: false, dose: 150, freq: 'BID', startD: -7, endD: -4 },
          fludarabine: { enabled: true, dose: 30, startD: -7, endD: -3 },
          busulfan: { enabled: true, dose: 3.2, startD: -7, endD: -6 },
          thiotepa: { enabled: false, dose: 5, freq: 'QD', startD: -4, endD: -3 },
          cyclophosphamide: { enabled: true, dose: 60, startD: -3, endD: -3 },
          melphalan: { enabled: false, dose: 140, startD: -3, endD: -3 },
          ratg: { enabled: true, dose: 2.5, freq: 'QD', startD: -2, endD: -1 },
          csa: { enabled: true, dose: 1.5, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' },
          tacrolimus: { enabled: false, route: 'PO', dose: 0.06, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' },
          mmf: { enabled: true, doseTab: 2, freq: 'BIDAC', startD: 0 },
          mtx: { enabled: false, shift1Day: false }
        }
      }
    },
    {
      id: 'allo_mac_bu4cy2',
      name: 'MAC Bu4Cy2 (MUD / MSD)',
      desc: 'Busulfex D-7~-4, Cyclophosphamide D-4~-3, rATG D-2~-1, CsA + MTX',
      patch: {
        admissionD: -7,
        conditioningName: 'MAC (Bu4Cy2)',
        gvhdProphylaxis: 'rATG + CsA + MTX',
        stemCellSource: 'PBSC',
        chemoStartD: -7,
        chemoEndD: -3,
        drugs: {
          tbi: { enabled: false, dose: 150, freq: 'BID', startD: -7, endD: -4 },
          fludarabine: { enabled: false, dose: 30, startD: -7, endD: -3 },
          busulfan: { enabled: true, dose: 3.2, startD: -7, endD: -4 },
          thiotepa: { enabled: false, dose: 5, freq: 'QD', startD: -4, endD: -3 },
          cyclophosphamide: { enabled: true, dose: 60, startD: -3, endD: -2 },
          melphalan: { enabled: false, dose: 140, startD: -3, endD: -3 },
          ratg: { enabled: true, dose: 2.5, freq: 'QD', startD: -2, endD: -1 },
          csa: { enabled: true, dose: 1.5, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' },
          tacrolimus: { enabled: false, route: 'PO', dose: 0.06, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' },
          mmf: { enabled: false, doseTab: 2, freq: 'BIDAC', startD: 0 },
          mtx: { enabled: true, shift1Day: false }
        }
      }
    },
    {
      id: 'allo_tbf3',
      name: 'TBF3 (Flu5Bu3Thiotepa2)',
      desc: 'Fludarabine D-7~-3, Busulfex D-7~-5, Thiotepa D-4~-3, rATG D-2~-1, CsA + MTX',
      patch: {
        admissionD: -7,
        conditioningName: 'TBF3 (Flu5Bu3Thiotepa2)',
        gvhdProphylaxis: 'rATG + CsA + MTX',
        stemCellSource: 'PBSC',
        chemoStartD: -7,
        chemoEndD: -3,
        drugs: {
          tbi: { enabled: false, dose: 150, freq: 'BID', startD: -7, endD: -4 },
          fludarabine: { enabled: true, dose: 30, startD: -7, endD: -3 },
          busulfan: { enabled: true, dose: 3.2, startD: -7, endD: -5 },
          thiotepa: { enabled: true, dose: 5, freq: 'QD', startD: -4, endD: -3 },
          cyclophosphamide: { enabled: false, dose: 60, startD: -3, endD: -3 },
          melphalan: { enabled: false, dose: 140, startD: -3, endD: -3 },
          ratg: { enabled: true, dose: 2.5, freq: 'QD', startD: -2, endD: -1 },
          csa: { enabled: true, dose: 1.5, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' },
          tacrolimus: { enabled: false, route: 'PO', dose: 0.06, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' },
          mmf: { enabled: false, doseTab: 2, freq: 'BIDAC', startD: 0 },
          mtx: { enabled: true, shift1Day: false }
        }
      }
    },
    {
      id: 'allo_mac_tbicy',
      name: 'MAC TBI-Cy2 (台大 1.5Gy BID×4d)',
      desc: 'TBI 150 cGy BID D-7~-4 (1200 cGy), Cyclophosphamide D-3~-2, CsA + MTX',
      patch: {
        admissionD: -7,
        conditioningName: 'MAC (TBI-Cy2)',
        gvhdProphylaxis: 'CsA + MTX',
        stemCellSource: 'PBSC',
        chemoStartD: -7,
        chemoEndD: -2,
        drugs: {
          tbi: { enabled: true, preset: 'standard', dose: 150, freq: 'BID', startD: -7, endD: -4, extraDay: '' },
          fludarabine: { enabled: false, dose: 30, startD: -7, endD: -3 },
          busulfan: { enabled: false, dose: 3.2, startD: -7, endD: -4 },
          thiotepa: { enabled: false, dose: 5, freq: 'QD', startD: -4, endD: -3 },
          cyclophosphamide: { enabled: true, dose: 60, startD: -3, endD: -2 },
          melphalan: { enabled: false, dose: 140, startD: -3, endD: -3 },
          ratg: { enabled: false, dose: 2.5, freq: 'QD', startD: -2, endD: -1 },
          csa: { enabled: true, dose: 1.5, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' },
          tacrolimus: { enabled: false, route: 'PO', dose: 0.06, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' },
          mmf: { enabled: false, doseTab: 2, freq: 'BIDAC', startD: 0 },
          mtx: { enabled: true, shift1Day: false }
        }
      }
    },
    {
      id: 'allo_mac_tbicy_ntucc',
      name: 'MAC TBI-Cy2 癌醫 (2Gy×6d: D-8~-4, D-1)',
      desc: '癌醫排程：週一 D-8 入院，TBI 200 cGy (2Gy) QD D-8~-4 及 D-1 (總 12Gy)，Cy D-3~-2，CsA + MTX',
      patch: {
        admissionD: -8,
        conditioningName: 'MAC (TBI-Cy2, 癌醫 2Gy×6d)',
        gvhdProphylaxis: 'CsA + MTX',
        stemCellSource: 'PBSC',
        chemoStartD: -8,
        chemoEndD: -1,
        drugs: {
          tbi: { enabled: true, preset: 'ntucc', dose: 200, freq: 'QD', startD: -8, endD: -4, extraDay: -1 },
          fludarabine: { enabled: false, dose: 30, startD: -7, endD: -3 },
          busulfan: { enabled: false, dose: 3.2, startD: -7, endD: -4 },
          thiotepa: { enabled: false, dose: 5, freq: 'QD', startD: -4, endD: -3 },
          cyclophosphamide: { enabled: true, dose: 60, startD: -3, endD: -2 },
          melphalan: { enabled: false, dose: 140, startD: -3, endD: -3 },
          ratg: { enabled: false, dose: 2.5, freq: 'QD', startD: -2, endD: -1 },
          csa: { enabled: true, dose: 1.5, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' },
          tacrolimus: { enabled: false, route: 'PO', dose: 0.06, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' },
          mmf: { enabled: false, doseTab: 2, freq: 'BIDAC', startD: 0 },
          mtx: { enabled: true, shift1Day: false }
        }
      }
    },
    {
      id: 'allo_giac_mac',
      name: 'GIAC MAC (Haplo BM+PB)',
      desc: 'Fludarabine D-8~-6, Busulfex D-8~-5, Cy D-4~-3, rATG 3mg/kg D-2~-1, CsA + MTX',
      patch: {
        admissionD: -8,
        conditioningName: 'MAC GIAC (Bu4Cy2+Flu3)',
        gvhdProphylaxis: 'rATG + CsA + MTX',
        stemCellSource: 'BM+PBSC',
        chemoStartD: -8,
        chemoEndD: -3,
        drugs: {
          tbi: { enabled: false, dose: 150, freq: 'BID', startD: -7, endD: -4 },
          fludarabine: { enabled: true, dose: 30, startD: -8, endD: -6 },
          busulfan: { enabled: true, dose: 3.2, startD: -8, endD: -5 },
          thiotepa: { enabled: false, dose: 5, freq: 'QD', startD: -4, endD: -3 },
          cyclophosphamide: { enabled: true, dose: 60, startD: -4, endD: -3 },
          melphalan: { enabled: false, dose: 140, startD: -3, endD: -3 },
          ratg: { enabled: true, dose: 3.0, freq: 'QD', startD: -2, endD: -1 },
          csa: { enabled: true, dose: 1.5, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' },
          tacrolimus: { enabled: false, route: 'PO', dose: 0.06, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' },
          mmf: { enabled: false, doseTab: 2, freq: 'BIDAC', startD: 0 },
          mtx: { enabled: true, shift1Day: true }
        }
      }
    },
    {
      id: 'allo_vsaa',
      name: 'VSAA (Cy50 x4 + rATG)',
      desc: 'Cyclophosphamide 50 mg/kg D-7~-4, rATG 2.5 mg/kg D-3~-1, CsA + MTX',
      patch: {
        admissionD: -7,
        conditioningName: 'VSAA (Cy200 + rATG)',
        gvhdProphylaxis: 'rATG + CsA + MTX',
        stemCellSource: 'BM+PBSC',
        chemoStartD: -7,
        chemoEndD: -4,
        drugs: {
          tbi: { enabled: false, dose: 150, freq: 'BID', startD: -7, endD: -4 },
          fludarabine: { enabled: false, dose: 30, startD: -7, endD: -3 },
          busulfan: { enabled: false, dose: 3.2, startD: -7, endD: -4 },
          thiotepa: { enabled: false, dose: 5, freq: 'QD', startD: -4, endD: -3 },
          cyclophosphamide: { enabled: true, dose: 50, startD: -7, endD: -4 },
          melphalan: { enabled: false, dose: 140, startD: -3, endD: -3 },
          ratg: { enabled: true, dose: 2.5, freq: 'QD', startD: -3, endD: -1 },
          csa: { enabled: true, dose: 1.5, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' },
          tacrolimus: { enabled: false, route: 'PO', dose: 0.06, freq: 'Q12H', startD: -1, diluent: 'N/S 250ml' },
          mmf: { enabled: false, doseTab: 2, freq: 'BIDAC', startD: 0 },
          mtx: { enabled: true, shift1Day: false }
        }
      }
    }
  ],

  auto: [
    {
      id: 'auto_beam',
      name: 'BEAM',
      desc: 'BCNU 300 D-7, Etoposide 200 D-6~-3, Ara-C 100 BID D-6~-3, Melphalan 140 D-2',
      patch: {
        admissionD: -7,
        conditioningName: 'BEAM',
        chemoStartD: -7,
        chemoEndD: -2,
        drugs: {
          rituximab: { enabled: false, route: 'IV', dose: 375, day: -7 },
          brentuximab: { enabled: false, dose: 1.8, day: -7 },
          bcnu: { enabled: true, dose: 300, day: -7 },
          bendamustine: { enabled: false, dose: 200, startD: -7, endD: -6 },
          etoposide: { enabled: true, dose: 200, startD: -6, endD: -3 },
          cytarabine: { enabled: true, dose: 100, startD: -6, endD: -3 },
          melphalan: { enabled: true, dose: 140, startD: -2, endD: -2, fluid: 250 },
          gemcitabine: { enabled: false, dose: 1875, day1: -7, day2: -3 },
          busulfanAuto: { enabled: false, dose: 100, unit: 'mg/m2', startD: -7, endD: -4 },
          thiotepaAuto: { enabled: false, dose: 5, freq: 'BID', startD: -4, endD: -3 }
        }
      }
    },
    {
      id: 'auto_r_beam',
      name: 'R-BEAM (B-cell Lymphoma)',
      desc: 'Rituximab D-7, BCNU D-6, Etoposide/Ara-C D-5~-2, Melphalan D-1',
      patch: {
        admissionD: -7,
        conditioningName: 'R-BEAM',
        chemoStartD: -6,
        chemoEndD: -1,
        drugs: {
          rituximab: { enabled: true, route: 'SC', dose: 1400, day: -7 },
          brentuximab: { enabled: false, dose: 1.8, day: -7 },
          bcnu: { enabled: true, dose: 300, day: -6 },
          bendamustine: { enabled: false, dose: 200, startD: -7, endD: -6 },
          etoposide: { enabled: true, dose: 200, startD: -5, endD: -2 },
          cytarabine: { enabled: true, dose: 100, startD: -5, endD: -2 },
          melphalan: { enabled: true, dose: 140, startD: -1, endD: -1, fluid: 250 },
          gemcitabine: { enabled: false, dose: 1875, day1: -7, day2: -3 },
          busulfanAuto: { enabled: false, dose: 100, unit: 'mg/m2', startD: -7, endD: -4 },
          thiotepaAuto: { enabled: false, dose: 5, freq: 'BID', startD: -4, endD: -3 }
        }
      }
    },
    {
      id: 'auto_bv_beam',
      name: 'BV-BEAM (Hodgkin / CD30+)',
      desc: 'Brentuximab 1.8 mg/kg D-7, BCNU D-6, Etoposide/Ara-C D-5~-2, Melphalan D-1',
      patch: {
        admissionD: -7,
        conditioningName: 'BV-BEAM',
        chemoStartD: -6,
        chemoEndD: -1,
        drugs: {
          rituximab: { enabled: false, route: 'IV', dose: 375, day: -7 },
          brentuximab: { enabled: true, dose: 1.8, day: -7 },
          bcnu: { enabled: true, dose: 300, day: -6 },
          bendamustine: { enabled: false, dose: 200, startD: -7, endD: -6 },
          etoposide: { enabled: true, dose: 200, startD: -5, endD: -2 },
          cytarabine: { enabled: true, dose: 100, startD: -5, endD: -2 },
          melphalan: { enabled: true, dose: 140, startD: -1, endD: -1, fluid: 250 },
          gemcitabine: { enabled: false, dose: 1875, day1: -7, day2: -3 },
          busulfanAuto: { enabled: false, dose: 100, unit: 'mg/m2', startD: -7, endD: -4 },
          thiotepaAuto: { enabled: false, dose: 5, freq: 'BID', startD: -4, endD: -3 }
        }
      }
    },
    {
      id: 'auto_benda_eam',
      name: 'Benda-EAM',
      desc: 'Bendamustine 200 D-7~-6, Etoposide/Ara-C D-5~-2, Melphalan 140 D-1',
      patch: {
        admissionD: -7,
        conditioningName: 'Benda-EAM',
        chemoStartD: -7,
        chemoEndD: -1,
        drugs: {
          rituximab: { enabled: false, route: 'IV', dose: 375, day: -8 },
          brentuximab: { enabled: false, dose: 1.8, day: -8 },
          bcnu: { enabled: false, dose: 300, day: -7 },
          bendamustine: { enabled: true, dose: 200, startD: -7, endD: -6 },
          etoposide: { enabled: true, dose: 200, startD: -5, endD: -2 },
          cytarabine: { enabled: true, dose: 100, startD: -5, endD: -2 },
          melphalan: { enabled: true, dose: 140, startD: -1, endD: -1, fluid: 250 },
          gemcitabine: { enabled: false, dose: 1875, day1: -7, day2: -3 },
          busulfanAuto: { enabled: false, dose: 100, unit: 'mg/m2', startD: -7, endD: -4 },
          thiotepaAuto: { enabled: false, dose: 5, freq: 'BID', startD: -4, endD: -3 }
        }
      }
    },
    {
      id: 'auto_gembumel',
      name: 'GemBuMel (Refractory HL / MM)',
      desc: 'Gemcitabine 1875 D-7 & D-3, Busulfan 3.2 mg/kg D-7~-4, Melphalan 60 D-3~-2',
      patch: {
        admissionD: -7,
        conditioningName: 'GemBuMel',
        chemoStartD: -7,
        chemoEndD: -2,
        drugs: {
          rituximab: { enabled: false, route: 'IV', dose: 375, day: -8 },
          brentuximab: { enabled: false, dose: 1.8, day: -8 },
          bcnu: { enabled: false, dose: 300, day: -7 },
          bendamustine: { enabled: false, dose: 200, startD: -7, endD: -6 },
          etoposide: { enabled: false, dose: 200, startD: -6, endD: -3 },
          cytarabine: { enabled: false, dose: 100, startD: -6, endD: -3 },
          melphalan: { enabled: true, dose: 60, startD: -3, endD: -2, fluid: 100 },
          gemcitabine: { enabled: true, dose: 1875, day1: -7, day2: -3 },
          busulfanAuto: { enabled: true, dose: 3.2, unit: 'mg/kg', startD: -7, endD: -4 },
          thiotepaAuto: { enabled: false, dose: 5, freq: 'BID', startD: -4, endD: -3 }
        }
      }
    },
    {
      id: 'auto_tt_bcnu',
      name: 'TT-BCNU (PCNSL / CNS Lymphoma)',
      desc: 'BCNU 400 mg/m2 D-5, Thiotepa 5 mg/kg BID D-4~-3',
      patch: {
        admissionD: -7,
        conditioningName: 'Thiotepa+BCNU',
        chemoStartD: -5,
        chemoEndD: -3,
        drugs: {
          rituximab: { enabled: false, route: 'IV', dose: 375, day: -6 },
          brentuximab: { enabled: false, dose: 1.8, day: -6 },
          bcnu: { enabled: true, dose: 400, day: -5 },
          bendamustine: { enabled: false, dose: 200, startD: -7, endD: -6 },
          etoposide: { enabled: false, dose: 200, startD: -6, endD: -3 },
          cytarabine: { enabled: false, dose: 100, startD: -6, endD: -3 },
          melphalan: { enabled: false, dose: 140, startD: -2, endD: -2, fluid: 250 },
          gemcitabine: { enabled: false, dose: 1875, day1: -7, day2: -3 },
          busulfanAuto: { enabled: false, dose: 100, unit: 'mg/m2', startD: -7, endD: -4 },
          thiotepaAuto: { enabled: true, dose: 5, freq: 'BID', startD: -4, endD: -3 }
        }
      }
    },
    {
      id: 'auto_hd_mel',
      name: 'HD Melphalan (Multiple Myeloma)',
      desc: 'Melphalan 100 (或 70) mg/m²/day on D-4 ~ D-3（兩天總 200 或 140 mg/m²，依年紀及腎功能）',
      patch: {
        admissionD: -5,
        conditioningName: 'High-dose Melphalan (100 mg/m2 x2d)',
        chemoStartD: -4,
        chemoEndD: -3,
        drugs: {
          rituximab: { enabled: false, route: 'IV', dose: 375, day: -5 },
          brentuximab: { enabled: false, dose: 1.8, day: -5 },
          bcnu: { enabled: false, dose: 300, day: -7 },
          bendamustine: { enabled: false, dose: 200, startD: -7, endD: -6 },
          etoposide: { enabled: false, dose: 200, startD: -6, endD: -3 },
          cytarabine: { enabled: false, dose: 100, startD: -6, endD: -3 },
          melphalan: { enabled: true, dose: 100, startD: -4, endD: -3, fluid: 250 },
          gemcitabine: { enabled: false, dose: 1875, day1: -7, day2: -3 },
          busulfanAuto: { enabled: false, dose: 100, unit: 'mg/m2', startD: -7, endD: -4 },
          thiotepaAuto: { enabled: false, dose: 5, freq: 'BID', startD: -4, endD: -3 }
        }
      }
    }
  ],

  ptcy: [
    {
      id: 'ptcy_ric_jh',
      name: 'RIC PTCy + TBI 2Gy (Johns Hopkins)',
      desc: 'Flu D-7~-3, Pre-Cy 14.5 D-7~-6, Bu D-4~-3, TBI 200 D-1, PTCy 40 D+3~+4, Tacrolimus/CsA + MMF',
      patch: {
        admissionD: -7,
        conditioningName: 'RIC',
        gvhdProphylaxis: 'PTCy + Tacrolimus + MMF',
        chemoStartD: -7,
        chemoEndD: -3,
        drugs: {
          tbi: { enabled: true, dose: 200, freq: 'QD', startD: -1, endD: -1 },
          fludarabine: { enabled: true, dose: 30, startD: -7, endD: -3 },
          busulfan: { enabled: true, dose: 3.2, startD: -4, endD: -3 },
          thiotepa: { enabled: false, dose: 5, freq: 'QD', startD: -6, endD: -5 },
          preCy: { enabled: true, dose: 14.5, startD: -7, endD: -6 },
          ptcy: { enabled: true, dose: 40, mesnaPerKg: 20, startD: 3, endD: 4 },
          ratg: { enabled: false, dose: 2, freq: 'QD', startD: -2, endD: -1 },
          tacrolimus: { enabled: true, route: 'PO', dose: 0.06, freq: 'Q12H', startD: 5 },
          csa: { enabled: false, dose: 1.5, freq: 'Q12H', startD: 5 },
          mmf: { enabled: true, startD: 6 },
          mtx: { enabled: false }
        }
      }
    },
    {
      id: 'ptcy_ric_csa',
      name: 'RIC PTCy + CsA + MMF',
      desc: 'Flu D-7~-3, Pre-Cy 14.5 D-7~-6, Bu D-4~-3, TBI 200 D-1, PTCy 40 D+3~+4, CsA + MMF',
      patch: {
        admissionD: -7,
        conditioningName: 'RIC',
        gvhdProphylaxis: 'PTCy + CsA + MMF',
        chemoStartD: -7,
        chemoEndD: -3,
        drugs: {
          tbi: { enabled: true, dose: 200, freq: 'QD', startD: -1, endD: -1 },
          fludarabine: { enabled: true, dose: 30, startD: -7, endD: -3 },
          busulfan: { enabled: true, dose: 3.2, startD: -4, endD: -3 },
          thiotepa: { enabled: false, dose: 5, freq: 'QD', startD: -6, endD: -5 },
          preCy: { enabled: true, dose: 14.5, startD: -7, endD: -6 },
          ptcy: { enabled: true, dose: 40, mesnaPerKg: 20, startD: 3, endD: 4 },
          ratg: { enabled: false, dose: 2, freq: 'QD', startD: -2, endD: -1 },
          tacrolimus: { enabled: false, route: 'PO', dose: 0.06, freq: 'Q12H', startD: 5 },
          csa: { enabled: true, dose: 1.5, freq: 'Q12H', startD: 5 },
          mmf: { enabled: true, startD: 6 },
          mtx: { enabled: false }
        }
      }
    },
    {
      id: 'ptcy_mac_chemo',
      name: 'MAC Flu5Bu4 + PTCy',
      desc: 'Flu D-7~-3, Pre-Cy 14.5 D-7~-6, Bu4 D-5~-2, TBI 200 D-1, PTCy 50 D+3~+4, Tacrolimus + MMF',
      patch: {
        admissionD: -7,
        conditioningName: 'MAC (Flu5Bu4+PTCy)',
        gvhdProphylaxis: 'PTCy + Tacrolimus + MMF',
        chemoStartD: -7,
        chemoEndD: -2,
        drugs: {
          tbi: { enabled: true, dose: 200, freq: 'QD', startD: -1, endD: -1 },
          fludarabine: { enabled: true, dose: 30, startD: -7, endD: -3 },
          busulfan: { enabled: true, dose: 3.2, startD: -5, endD: -2 },
          thiotepa: { enabled: false, dose: 5, freq: 'QD', startD: -6, endD: -5 },
          preCy: { enabled: true, dose: 14.5, startD: -7, endD: -6 },
          ptcy: { enabled: true, dose: 50, mesnaPerKg: 25, startD: 3, endD: 4 },
          ratg: { enabled: false, dose: 2, freq: 'QD', startD: -2, endD: -1 },
          tacrolimus: { enabled: true, route: 'PO', dose: 0.06, freq: 'Q12H', startD: 5 },
          csa: { enabled: false, dose: 1.5, freq: 'Q12H', startD: 5 },
          mmf: { enabled: true, startD: 6 },
          mtx: { enabled: false }
        }
      }
    },
    {
      id: 'ptcy_tbf2',
      name: 'TBF2 + PTCy (Thiotepa-Bu2-Flu)',
      desc: 'Thiotepa 5 mg/kg D-7~-6, Flu D-5~-2, Bu D-5~-4, PTCy 40 D+3~+4, Tacrolimus + MMF',
      patch: {
        admissionD: -7,
        conditioningName: 'TBF2 + PTCy',
        gvhdProphylaxis: 'PTCy + Tacrolimus + MMF',
        chemoStartD: -7,
        chemoEndD: -2,
        drugs: {
          tbi: { enabled: false, dose: 200, freq: 'QD', startD: -1, endD: -1 },
          fludarabine: { enabled: true, dose: 30, startD: -5, endD: -2 },
          busulfan: { enabled: true, dose: 3.2, startD: -5, endD: -4 },
          thiotepa: { enabled: true, dose: 5, freq: 'QD', startD: -7, endD: -6 },
          preCy: { enabled: false, dose: 14.5, startD: -7, endD: -6 },
          ptcy: { enabled: true, dose: 40, mesnaPerKg: 20, startD: 3, endD: 4 },
          ratg: { enabled: false, dose: 2, freq: 'QD', startD: -2, endD: -1 },
          tacrolimus: { enabled: true, route: 'PO', dose: 0.06, freq: 'Q12H', startD: 5 },
          csa: { enabled: false, dose: 1.5, freq: 'Q12H', startD: 5 },
          mmf: { enabled: true, startD: 6 },
          mtx: { enabled: false }
        }
      }
    },
    {
      id: 'ptcy_mac_tbi',
      name: 'MAC TBI 12Gy + PTCy (台大 1.5Gy BID×4d)',
      desc: 'Flu D-7~-5, TBI 150 cGy (1.5 Gy) BID D-4~-1 (總 12Gy), PTCy 50 D+3~+4, Tacrolimus + MMF',
      patch: {
        admissionD: -7,
        conditioningName: 'MAC (TBI 12Gy + PTCy)',
        gvhdProphylaxis: 'PTCy + Tacrolimus + MMF',
        chemoStartD: -7,
        chemoEndD: -1,
        drugs: {
          tbi: { enabled: true, preset: 'standard', dose: 150, freq: 'BID', startD: -4, endD: -1, extraDay: '' },
          fludarabine: { enabled: true, dose: 30, startD: -7, endD: -5 },
          busulfan: { enabled: false, dose: 3.2, startD: -4, endD: -3 },
          thiotepa: { enabled: false, dose: 5, freq: 'QD', startD: -6, endD: -5 },
          preCy: { enabled: false, dose: 14.5, startD: -7, endD: -6 },
          ptcy: { enabled: true, dose: 50, mesnaPerKg: 25, startD: 3, endD: 4 },
          ratg: { enabled: false, dose: 2, freq: 'QD', startD: -2, endD: -1 },
          tacrolimus: { enabled: true, route: 'PO', dose: 0.06, freq: 'Q12H', startD: 5 },
          csa: { enabled: false, dose: 1.5, freq: 'Q12H', startD: 5 },
          mmf: { enabled: true, startD: 6 },
          mtx: { enabled: false }
        }
      }
    },
    {
      id: 'ptcy_mac_tbi_ntucc',
      name: 'MAC TBI 12Gy + PTCy 癌醫 (2Gy×6d: D-8~-4, D-1)',
      desc: '癌醫排程：週一 D-8 入院，TBI 200 cGy (2Gy) QD D-8~-4 及 D-1 (總 12Gy)，Flu D-7~-5，PTCy 50 D+3~+4，Tacrolimus + MMF',
      patch: {
        admissionD: -8,
        conditioningName: 'MAC (TBI 12Gy + PTCy, 癌醫 2Gy×6d)',
        gvhdProphylaxis: 'PTCy + Tacrolimus + MMF',
        chemoStartD: -8,
        chemoEndD: -1,
        drugs: {
          tbi: { enabled: true, preset: 'ntucc', dose: 200, freq: 'QD', startD: -8, endD: -4, extraDay: -1 },
          fludarabine: { enabled: true, dose: 30, startD: -7, endD: -5 },
          busulfan: { enabled: false, dose: 3.2, startD: -4, endD: -3 },
          thiotepa: { enabled: false, dose: 5, freq: 'QD', startD: -6, endD: -5 },
          preCy: { enabled: false, dose: 14.5, startD: -7, endD: -6 },
          ptcy: { enabled: true, dose: 50, mesnaPerKg: 25, startD: 3, endD: 4 },
          ratg: { enabled: false, dose: 2, freq: 'QD', startD: -2, endD: -1 },
          tacrolimus: { enabled: true, route: 'PO', dose: 0.06, freq: 'Q12H', startD: 5 },
          csa: { enabled: false, dose: 1.5, freq: 'Q12H', startD: 5 },
          mmf: { enabled: true, startD: 6 },
          mtx: { enabled: false }
        }
      }
    }
  ]
};

window.BMT_DEMO_CASES = {
  allo: {
    mode: 'allo',
    recipient: {
      name: '王大明',
      chartNo: '',
      age: '58',
      gender: 'M',
      height: '168',
      weight: '72',
      bloodType: 'A+',
      testDate: '2026/10/15',
      hbv: 'HBsAg (-)\nAnti-HBs Ab (+)\nAnti-HBc Ab (+)\nHBV DNA: (-)',
      hcv: 'Anti-HCV (-)',
      cmv: 'CMV-IgM (-)\nCMV-IgG (+)\nCMV viral load: (-)',
      ebvVca: 'IgM(-), IgG(+)',
      ebvOthers: 'EBNA Ab (+)\nEBV Viral Load: (-)',
      hiv: 'HIV screen (-)',
      htlv: 'HTLV 1+2 Ab (-)',
      vzv: 'VZV IgG (+)',
      rpr: 'STS-RPR (-)',
      toxo: 'IgM(-), IgG(<1.6)',
      otherComorb: ''
    },
    donor: {
      label: 'Donor',
      name: 'MUD',
      chartNo: '',
      age: '32',
      gender: 'F',
      height: '165',
      weight: '60',
      bloodType: 'O+',
      testDate: '2026/09/20',
      hbv: 'HBsAg (-)\nAnti-HBs Ab (-)\nAnti-HBc Ab (-)',
      hcv: 'Anti-HCV (-)',
      cmv: 'CMV-IgM (-)\nCMV-IgG (-)',
      ebvVca: '',
      ebvOthers: '',
      hiv: 'HIV screen (-)',
      htlv: 'HTLV 1+2 Ab (-)',
      vzv: '',
      rpr: 'STS-RPR (-)',
      toxo: '',
      otherComorb: ''
    },
    hla: {
      A: ['02:01', '11:01', '02:01', '11:01'],
      B: ['13:01', '52:01', '13:01', '52:01'],
      C: ['03:04', '12:02', '03:04', '12:02'],
      DR: ['10:01', '15:01', '10:01', '15:01'],
      DQ: ['05:01', '06:01', '05:01', '06:01'],
      DP: ['02:01', '05:01', '', ''],
      autoCalc: true,
      rejectionManual: '10/10 match',
      gvhdManual: '10/10 match'
    },
    diagnosis: '#. Acute myeloid leukemia with myelodysplasia-related gene mutations, ELN adverse risk\n- s/p induction chemotherapy, CR1\n- s/p consolidation HDAC x 2 cycles, CR1',
    comorbidity: '#. Hyperlipidemia\n#. Resolved HBV infection',
    status: 'CR',
    allergy: 'Nil',
    ward: '5PW',
    admissionD: -7,
    admissionDate: '2026-12-07',
    conditioningName: 'RIC (Flu5Bu2Cy1)',
    gvhdProphylaxis: 'rATG + CsA + MMF',
    donorRelation: 'auto',
    stemCellSource: 'PBSC',
    cd34Dose: '5.0',
    dosingBasis: 'adjusted',
    chemoStartD: -7,
    chemoEndD: -3,
    vs: '李婉瑄',
    primaryCare: '',
    bmtCr: '李宗翰',
    bedCr: '曾泰中',
    director: '姚明',
    meds: {
      feburic: true,
      feburicNote: '(已達CR可考慮拿掉)',
      micafungin: true,
      baktar: true,
      valtrex: true,
      cefepime: true,
      levofloxacin: true,
      folicAcid: true,
      gcsf: true,
      gcsfStartD: 5,
      gcsfFreq: 'QN',
      gcsfAuto: true,
      gcsfMcg: 300,
      gcsfFluid: 20,
      letermovir: true,
      letermovirAutoNote: true,
      letermovirDose: '1# QD since D+1',
      letermovirNote: '',
      urso: false,
      esomeprazole: false,
      glutamine: false,
      bmOnAdmission: false,
      foley: false,
      otherOrders: '0.5 Baraclude 0.5 mg/tab for CDC Approval 1 tab QDAC PO'
    },
    antiemetics: {
      emendMode: 'PO',
      cashEmend: true,
      serotoninAgent: 'Kytril'
    },
    drugs: {
      tbi: { enabled: false, dose: 150, freq: 'BID', startD: -7, endD: -4 },
      fludarabine: { enabled: true, dose: 30, startD: -7, endD: -3 },
      busulfan: { enabled: true, dose: 3.2, startD: -7, endD: -6 },
      thiotepa: { enabled: false, dose: 5, freq: 'QD', startD: -4, endD: -3 },
      cyclophosphamide: { enabled: true, dose: 60, startD: -3, endD: -3 },
      melphalan: { enabled: false, dose: 140, startD: -3, endD: -3 },
      ratg: { enabled: true, dose: 2.5, freq: 'QD', startD: -2, endD: -1 },
      csa: { enabled: true, dose: 1.5, freq: 'Q12H', startD: -1 },
      mmf: { enabled: true, doseTab: 2, freq: 'BIDAC', startD: 0 },
      mtx: { enabled: false, shift1Day: false }
    },
    customConditioningNotes: '',
    ivfOverrides: {}
  },

  auto: {
    mode: 'auto',
    recipient: {
      name: '林小美',
      chartNo: '',
      age: '65',
      gender: 'F',
      height: '160',
      weight: '58',
      bloodType: 'O+',
      testDate: '2026/09/10',
      hbv: 'HBsAg (-)\nAnti-HBs Ab (+)\nAnti-HBc Ab (+)\nHBV DNA: (-)',
      hcv: 'Anti-HCV (-)',
      cmv: 'IgG (+), IgM (-)\nCMV viral load: (-)',
      ebvVca: 'IgM(-), IgG(+)',
      ebvOthers: 'EBNA Ab (+)\nEBV Viral Load: (-)',
      hiv: 'HIV screen (-)',
      htlv: 'HTLV 1+2 Ab (-)',
      vzv: 'IgG (+)',
      rpr: 'STS-RPR (-)',
      toxo: 'IgM(-), IgG(-)',
      otherComorb: ''
    },
    donor: { label: 'Donor', name: '', chartNo: '', age: '', gender: 'M', height: '', weight: '', bloodType: 'O+', testDate: '', hbv: '', hcv: '', cmv: '', ebvVca: '', ebvOthers: '', hiv: '', htlv: '', vzv: '', rpr: '', toxo: '', otherComorb: '' },
    hla: { A: ['','','',''], B: ['','','',''], C: ['','','',''], DR: ['','','',''], DQ: ['','','',''], DP: ['','','',''], autoCalc: true, rejectionManual: '', gvhdManual: '' },
    diagnosis: '#. Extranodal NK/T-cell lymphoma, stage IV\n- s/p SMILE / AspaMetDex x 3 cycles, PR\n- s/p PBSCH on 2026/09/20',
    comorbidity: '#. Resolved HBV infection',
    status: 'PR',
    allergy: 'Nil',
    ward: '5PW',
    admissionD: -7,
    admissionDate: '2026-12-09',
    conditioningName: 'BEAM',
    gvhdProphylaxis: '',
    stemCellSource: 'PBSC',
    cd34Dose: '6.50',
    dosingBasis: 'adjusted',
    chemoStartD: -7,
    chemoEndD: -2,
    vs: '周文堅',
    primaryCare: '',
    bmtCr: '李宗翰',
    bedCr: '曾泰中',
    director: '姚明',
    meds: {
      feburic: true,
      feburicNote: '',
      micafungin: true,
      baktar: true,
      valtrex: true,
      cefepime: true,
      levofloxacin: true,
      folicAcid: true,
      gcsf: true,
      gcsfStartD: 2,
      gcsfFreq: 'QN',
      gcsfAuto: true,
      gcsfMcg: 300,
      gcsfFluid: 20,
      letermovir: false,
      letermovirDose: '',
      letermovirNote: '',
      urso: false,
      esomeprazole: false,
      glutamine: false,
      bmOnAdmission: false,
      foley: false,
      otherOrders: '(自備) Tenofovir Alafenamide (Vemlidy 25 mg/tab) 1 tab PO QDPC'
    },
    antiemetics: {
      emendMode: 'PO',
      cashEmend: true,
      serotoninAgent: 'Kytril'
    },
    drugs: {
      rituximab: { enabled: false, route: 'IV', dose: 375, day: -7 },
      brentuximab: { enabled: false, dose: 1.8, day: -7 },
      bcnu: { enabled: true, dose: 300, day: -7 },
      bendamustine: { enabled: false, dose: 200, startD: -7, endD: -6 },
      etoposide: { enabled: true, dose: 200, startD: -6, endD: -3 },
      cytarabine: { enabled: true, dose: 100, startD: -6, endD: -3 },
      melphalan: { enabled: true, dose: 140, startD: -2, endD: -2, fluid: 250 },
      gemcitabine: { enabled: false, dose: 1875, day1: -7, day2: -3 },
      busulfanAuto: { enabled: false, dose: 100, unit: 'mg/m2', startD: -7, endD: -4 },
      thiotepaAuto: { enabled: false, dose: 5, freq: 'BID', startD: -4, endD: -3 }
    },
    customConditioningNotes: '',
    ivfOverrides: {}
  },

  ptcy: {
    mode: 'ptcy',
    recipient: {
      name: '陳志強',
      chartNo: '',
      age: '59',
      gender: 'M',
      height: '169',
      weight: '66.3',
      bloodType: 'B+',
      testDate: '2026/08/10',
      hbv: 'HBsAg (-)\nAnti-HBs Ab (+)\nAnti-HBc Ab (+)',
      hcv: 'Anti-HCV (-)',
      cmv: 'CMV-IgM (-)\nCMV-IgG (+)\nCMV viral load: (-)',
      ebvVca: 'IgM(-), IgG(+)',
      ebvOthers: 'EBNA Ab (+)\nEBV Viral Load: (-)',
      hiv: 'HIV screen (-)',
      htlv: 'HTLV 1+2 Ab (-)',
      vzv: 'VZV IgG (+)',
      rpr: 'STS-RPR (-)',
      toxo: 'IgM(-), IgG(<1.6)',
      otherComorb: ''
    },
    donor: {
      label: 'Donor (女兒)',
      name: '陳小萱',
      chartNo: '',
      age: '28',
      gender: 'F',
      height: '162',
      weight: '62',
      bloodType: 'AB+',
      testDate: '2026/08/15',
      hbv: 'HBsAg (-)\nAnti-HBs Ab (-)\nAnti-HBc Ab (-)',
      hcv: 'Anti-HCV (-)',
      cmv: 'CMV-IgM (-)\nCMV-IgG (-)',
      ebvVca: 'IgM(-), IgG(+)',
      ebvOthers: 'EBNA Ab (+)',
      hiv: 'HIV screen (-)',
      htlv: 'HTLV 1+2 Ab (-)',
      vzv: 'VZV IgG (-)',
      rpr: 'STS-RPR (-)',
      toxo: 'IgM(-), IgG(<5.0)',
      otherComorb: ''
    },
    hla: {
      A: ['11:01', '24:02', '11:01', '24:02'],
      B: ['40:01', '46:01', '46:01', '-'],
      C: ['01:02', '07:02', '01:02', '-'],
      DR: ['09:01', '14:05', '09:01', '-'],
      DQ: ['03:03', '05:03', '03:03', '-'],
      DP: ['02:01', '05:01', '05:01', '-'],
      autoCalc: true,
      rejectionManual: '12/12 match',
      gvhdManual: '7/12 match'
    },
    diagnosis: '#. Acute myeloid leukemia, normal karyotype, FLT3-ITD (+), ELN intermediate risk\n- s/p induction I3A7 + FLT3 inhibitor, CR1\n- s/p consolidation IDAC x 2 cycles',
    comorbidity: '#. Type 2 diabetes mellitus\n#. Hypertension\n#. Resolved HBV infection',
    status: 'CR',
    allergy: 'Nil',
    ward: '5PW',
    admissionD: -7,
    admissionDate: '2026-12-04',
    conditioningName: 'RIC',
    gvhdProphylaxis: 'PTCy + Tacrolimus + MMF',
    donorRelation: 'auto',
    stemCellSource: 'PBSC',
    cd34Dose: '5.50',
    dosingBasis: 'adjusted',
    chemoStartD: -7,
    chemoEndD: -3,
    vs: '侯信安',
    primaryCare: '',
    bmtCr: '李宗翰',
    bedCr: '曾泰中',
    director: '姚明',
    meds: {
      feburic: true,
      feburicNote: '',
      micafungin: true,
      baktar: true,
      valtrex: true,
      cefepime: true,
      levofloxacin: true,
      folicAcid: true,
      gcsf: true,
      gcsfStartD: 5,
      gcsfFreq: 'QN',
      gcsfAuto: true,
      gcsfMcg: 300,
      gcsfFluid: 20,
      letermovir: true,
      letermovirAutoNote: true,
      letermovirDose: '2# QD since D+5',
      letermovirNote: '',
      urso: false,
      esomeprazole: false,
      glutamine: false,
      bmOnAdmission: false,
      foley: false,
      otherOrders: 'Vemlidy for CDC Approval 25 mg/tab 1 tab QDPC PO'
    },
    antiemetics: {
      emendMode: 'IV',
      cashEmend: true,
      serotoninAgent: 'Kytril'
    },
    drugs: {
      tbi: { enabled: true, dose: 200, freq: 'QD', startD: -1, endD: -1 },
      fludarabine: { enabled: true, dose: 30, startD: -7, endD: -3 },
      busulfan: { enabled: true, dose: 3.2, startD: -4, endD: -3 },
      thiotepa: { enabled: false, dose: 5, freq: 'QD', startD: -6, endD: -5 },
      preCy: { enabled: true, dose: 14.5, startD: -7, endD: -6 },
      ptcy: { enabled: true, dose: 40, mesnaPerKg: 20, startD: 3, endD: 4 },
      ratg: { enabled: false, dose: 2, freq: 'QD', startD: -2, endD: -1 },
      tacrolimus: { enabled: true, route: 'PO', dose: 0.06, freq: 'Q12H', startD: 5 },
      csa: { enabled: false, dose: 1.5, freq: 'Q12H', startD: 5 },
      mmf: { enabled: true, startD: 6 },
      mtx: { enabled: false }
    },
    customConditioningNotes: '',
    ivfOverrides: {}
  }
};

// Clean empty initial states (no pre-filled patient/donor/HLA/chart number data until user clicks 載入範例)
window.BMT_EMPTY_STATES = (function () {
  const emptyPerson = (extra) => Object.assign({
    name: '', chartNo: '', age: '', gender: '', height: '', weight: '', bloodType: '',
    testDate: '', hbv: '', hcv: '', cmv: '', ebvVca: '', ebvOthers: '',
    hiv: '', htlv: '', vzv: '', rpr: '', toxo: '', otherComorb: ''
  }, extra || {});

  const emptyHla = () => ({
    A: ['', '', '', ''], B: ['', '', '', ''], C: ['', '', '', ''],
    DR: ['', '', '', ''], DQ: ['', '', '', ''], DP: ['', '', '', ''],
    autoCalc: true, rejectionManual: '', gvhdManual: ''
  });

  const makeEmpty = (mode) => {
    const base = JSON.parse(JSON.stringify(window.BMT_DEMO_CASES[mode]));
    base.recipient = emptyPerson();
    base.donor = emptyPerson({ label: 'Donor' });
    base.hla = emptyHla();
    base.diagnosis = '';
    base.comorbidity = '';
    base.status = '';
    base.allergy = '';
    base.admissionDate = '';
    base.cd34Dose = '';
    base.vs = '';
    base.donorRelation = 'auto';
    base.primaryCare = '';
    base.bmtCr = '李宗翰';
    base.bedCr = '曾泰中';
    base.director = '姚明';
    if (base.meds) {
      base.meds.feburicNote = '';
      base.meds.letermovirNote = '';
      base.meds.otherOrders = '';
    }
    base.customConditioningNotes = '';
    base.ivfOverrides = {};
    return base;
  };

  return {
    allo: makeEmpty('allo'),
    auto: makeEmpty('auto'),
    ptcy: makeEmpty('ptcy')
  };
})();
