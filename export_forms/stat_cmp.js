/**
 * SpreadsheetML export matrices for Статистика / Сравнение.
 * Matrix: { sheetName, colCount, colWidths, rows: [{ cells, style?, mergeAcross?, height? }] }
 * Styles: title, hdr, total, data, parent, sig, section, letter, letterwrap
 */

function emptyCells(n) {
  return Array.from({ length: n }, () => '');
}

/** @param {number} colCount @param {Array<[string, string]>} pairs */
function sigRows(colCount, pairs) {
  const out = [];
  out.push({ cells: emptyCells(colCount) });
  pairs.forEach(([role, fio]) => {
    const row = emptyCells(colCount);
    row[0] = role;
    row[colCount - 1] = fio;
    out.push({ cells: row, style: 'sig' });
    out.push({ cells: emptyCells(colCount) });
  });
  return out;
}

/**
 * @param {{
 *   product: string,
 *   unload: Array<{ status: string, section: string, info: string, qty: string|number, total: string|number }>,
 *   sums: Array<{ code: string, name: string, qtySum: string|number, laborSum: string|number }>,
 *   fioBtn: string,
 *   fioBpp: string,
 * }} args
 */
function exportMatrixStat({ product, unload, sums, fioBtn, fioBpp }) {
  const colCount = 5;
  const colWidths = [90, 110, 160, 90, 90];
  const matrixRows = [
    {
      cells: [`Статистика выгрузки и контрольные суммы спецификаций на изделие ${product}`],
      style: 'title',
      mergeAcross: colCount - 1,
      height: 28,
    },
    {
      cells: ['Статистика выгрузки изделия'],
      style: 'section',
      mergeAcross: colCount - 1,
    },
    {
      cells: ['Статус', 'Раздел', 'Информация', 'Количество', 'Всего проверено'],
      style: 'hdr',
    },
    ...(unload || []).map((r) => ({
      cells: [r.status, r.section, r.info, r.qty, r.total],
      style: 'data',
    })),
    { cells: emptyCells(colCount) },
    {
      cells: ['Контрольные суммы на изделие'],
      style: 'section',
      mergeAcross: colCount - 1,
    },
    {
      cells: [
        'Код Союза',
        'Наименование изделия',
        'Контрольная сумма по количеству',
        'Контрольная сумма по трудоемкости',
        '',
      ],
      style: 'hdr',
    },
    ...(sums || []).map((r) => ({
      cells: [r.code, r.name, r.qtySum, r.laborSum, ''],
      style: 'data',
    })),
    ...sigRows(colCount, [
      ['Начальник БТН', fioBtn],
      ['Начальник БПП', fioBpp],
    ]),
  ];
  return {
    sheetName: 'Статистика',
    colCount,
    colWidths,
    rows: matrixRows,
  };
}

/**
 * @param {{
 *   product: string,
 *   rows: Array<{ oldCode: string, oldName: string, newCode: string, newName: string, note: string }>,
 * }} args
 */
function exportMatrixCmp({ product, rows }) {
  const colCount = 5;
  const colWidths = [80, 160, 80, 160, 120];
  const matrixRows = [
    {
      cells: [`Сравнение старой и новой спецификации ${product}`],
      style: 'title',
      mergeAcross: colCount - 1,
      height: 28,
    },
    {
      cells: ['Старый код', 'Старое наименование', 'Новый код', 'Новое наименование', 'Примечание'],
      style: 'hdr',
    },
    ...(rows || []).map((r) => ({
      cells: [r.oldCode, r.oldName, r.newCode, r.newName, r.note],
      style: 'data',
    })),
  ];
  return {
    sheetName: 'Сравнение',
    colCount,
    colWidths,
    rows: matrixRows,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { exportMatrixStat, exportMatrixCmp };
}
