/**
 * SpreadsheetML export matrices for Форма 1 / Форма 2.
 * Matrix: { sheetName, colCount, colWidths, rows: [{ cells, style?, mergeAcross?, height? }] }
 *
 * Форма 2 (эталон (Форма 2).xlsx):
 * - строки «Участок…» / «Цех…» — подытоги, видны в таблице
 * - sumMin / sumHour считаются ТОЛЬКО по операциям (без участков), иначе двойной счёт
 * - без style parent / подкраски
 */

/**
 * @param {{ product: string, rows: Array<{ op: string, min: string|number, hour: string|number }>, sumMin: string|number, sumHour: string|number }} args
 */
function exportMatrixF1({ product, rows, sumMin, sumHour }) {
  const colCount = 3;
  const colWidths = [280, 70, 70];
  const matrixRows = [
    {
      cells: [`Сводная ведомость нормативной трудоемкости операций на изделие ${product}`],
      style: 'title',
      mergeAcross: colCount - 1,
      height: 28,
    },
    {
      cells: ['Операции', 'Трудоемкость, н.мин.', 'Трудоемкость, н.ч.'],
      style: 'hdr',
    },
    {
      cells: ['Итого', sumMin, sumHour],
      style: 'total',
    },
    ...rows.map((r) => ({
      cells: [r.op, r.min, r.hour],
      style: 'data',
    })),
  ];
  return {
    sheetName: 'Форма1',
    colCount,
    colWidths,
    rows: matrixRows,
  };
}

/**
 * @param {{ product: string, rows: Array<{ unit: string, min: string|number, hour: string|number }>, sumMin: string|number, sumHour: string|number }} args
 * sumMin/sumHour must already exclude section rows (Участок/Цех) — caller uses sumF2.
 */
function exportMatrixF2({ product, rows, sumMin, sumHour }) {
  const colCount = 3;
  const colWidths = [280, 70, 70];
  const matrixRows = [
    {
      cells: [`Сводная ведомость нормативной трудоемкости операций по подразделениям на изделие ${product}`],
      style: 'title',
      mergeAcross: colCount - 1,
      height: 28,
    },
    {
      cells: ['Подразделение/Операции', 'Трудоемкость, н.мин.', 'Трудоемкость, н.ч.'],
      style: 'hdr',
    },
    {
      cells: ['Итого', sumMin, sumHour],
      style: 'total',
    },
    // always style 'data' — no parent highlight (unlike Материалы)
    ...rows.map((r) => ({
      cells: [r.unit, r.min, r.hour],
      style: 'data',
    })),
  ];
  return {
    sheetName: 'Форма2',
    colCount,
    colWidths,
    rows: matrixRows,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { exportMatrixF1, exportMatrixF2 };
}
