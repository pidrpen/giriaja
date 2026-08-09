/**
 * SpreadsheetML export matrices for Форма 1 / Форма 2.
 * Matrix: { sheetName, colCount, colWidths, rows: [{ cells, style?, mergeAcross?, height? }] }
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
