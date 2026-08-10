/**
 * Excel SpreadsheetML export matrices — Форма 3 и Материалы.
 *
 * Matrix: { sheetName, colCount, colWidths, rows: [{ cells, style?, mergeAcross?, height? }] }
 * Styles: title | hdr | total | data | parent | sig | letter | letterwrap
 *
 * Order: title → header → «Итого» → data → blank → signature
 * Форма 3: NO parent tint — all data rows plain (эталон xlsx).
 * Материалы: name with 2+ leading spaces → data (white); else parent (tinted)
 * Form 3 Итого: caller must pass sum of operations only (exclude изделие/участок).
 */

/** True if name is a child/nested row (2+ leading spaces / indent from 1C). */
function isChildName(name) {
  const s = String(name ?? '');
  if (!s.trim()) return false;
  const m = s.match(/^[\s\u00a0\u2007\u202f\u3000]+/);
  if (!m) return false;
  const lead = m[0].replace(/\t/g, '  ');
  return lead.length >= 2 || m[0].includes('\t');
}

function hierarchyStyle(name) {
  return isChildName(name) ? 'data' : 'parent';
}

/** Материалы: подкраска только «Участок…» */
function isMatSectionName(name) {
  const t = String(name ?? '').trim();
  return /^участок(?:\s|№|$)/i.test(t);
}
function matHierarchyStyle(name) {
  return isMatSectionName(name) ? 'parent' : 'data';
}

function emptyCells(n) {
  return Array.from({ length: n }, () => '');
}

/**
 * Signature block: blank row, then role in col 0 and FIO in rightmost col.
 * @param {number} colCount
 * @param {string} role
 * @param {string} fio
 */
function signatureRows(colCount, role, fio) {
  const row = emptyCells(colCount);
  row[0] = role;
  row[colCount - 1] = fio ?? '';
  return [
    { cells: emptyCells(colCount) },
    { cells: row, style: 'sig' },
  ];
}

/**
 * Форма 3 — Сводная ведомость нормативной трудоемкости работ
 * по подразделениям и номенклатуре.
 *
 * @param {{ product: string, rows: Array<{name?, qty?, min?, hour?}>, sumMin: any, sumHour: any, fioBtn: string }} opts
 * @returns {{ sheetName: string, colCount: number, colWidths: number[], rows: object[] }}
 */
function exportMatrixF3({ product, rows, sumMin, sumHour, fioBtn }) {
  const colCount = 4;
  // name wide; qty / min / hour narrower
  const colWidths = [280, 90, 90, 90];
  const data = Array.isArray(rows) ? rows : [];
  const title =
    `Сводная ведомость нормативной трудоемкости работ по подразделениям и номенклатуре на изделие ${product ?? ''}`;

  const out = [
    { cells: [title], style: 'title', mergeAcross: colCount - 1 },
    {
      cells: [
        'Изделие/Подразделение/Операция',
        'Количество: шт — для изделий/подразделений, н.мин — для операций',
        'Трудоемкость, н.мин.',
        'Трудоемкость, н.ч.',
      ],
      style: 'hdr',
    },
    // IMMEDIATELY after header
    { cells: ['Итого', '', sumMin, sumHour], style: 'total' },
    // Form 3: no hierarchyStyle/parent highlight
    ...data.map((r) => ({
      cells: [r.name, r.qty, r.min, r.hour],
      style: 'data',
    })),
    ...signatureRows(colCount, 'Начальник БТН', fioBtn),
  ];

  return {
    sheetName: 'Форма3',
    colCount,
    colWidths,
    rows: out,
  };
}

/**
 * Материалы — Сводная ведомость плановой себестоимости
 * продукции-материальных затрат.
 *
 * @param {{ product: string, rows: Array<{name?, unit?, qty?}>, sumQty: any, fioBpp: string }} opts
 * @returns {{ sheetName: string, colCount: number, colWidths: number[], rows: object[] }}
 */
function exportMatrixMat({ product, rows, sumQty, fioBpp }) {
  const colCount = 3;
  // name wide; unit / qty narrower
  const colWidths = [320, 80, 80];
  const data = Array.isArray(rows) ? rows : [];
  const title =
    `Сводная ведомость плановой себестоимости продукции-материальных затрат на изделие ${product ?? ''}`;

  const out = [
    { cells: [title], style: 'title', mergeAcross: colCount - 1 },
    {
      cells: ['Полуфабрикат / Номенклатура', 'Ед. изм.', 'Количество'],
      style: 'hdr',
    },
    // IMMEDIATELY after header
    { cells: ['Итого', '', sumQty], style: 'total' },
    ...data.map((r) => ({
      cells: [r.name, r.unit, r.qty],
      style: matHierarchyStyle(r.name),
    })),
    ...signatureRows(colCount, 'Начальник ТБПП', fioBpp),
  ];

  return {
    sheetName: 'Материалы',
    colCount,
    colWidths,
    rows: out,
  };
}

// UMD-ish: browser global + CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { exportMatrixF3, exportMatrixMat, isChildName, hierarchyStyle };
}
if (typeof window !== 'undefined') {
  window.exportMatrixF3 = exportMatrixF3;
  window.exportMatrixMat = exportMatrixMat;
}
