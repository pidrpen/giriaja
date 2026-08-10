/**
 * SpreadsheetML export matrices for Word-like letter forms:
 * Комплект (kit) and Распоряжение (rasp).
 *
 * CRITICAL: never put long paragraphs into one merged/wrap cell (vertical stretch).
 * - 2 columns, colWidths ~ [220, 80]
 * - each logical line = separate ROW with style "letter", fixed height ~14–16 (no wrap)
 * - long text: wrapLines() → many short letter rows
 * - style "letterwrap" only if a multi-line cell is unavoidable (height = 14 * lineCount)
 * - title: style title, height 22–28, mergeAcross 1
 * - signatures: col0 = role, col1 = FIO, style sig, height 16
 *
 * Matrix: { sheetName, colCount, colWidths, rows: [{ cells, style?, mergeAcross?, height? }] }
 */

const LETTER_H = 15;
const TITLE_H = 24;
const SIG_H = 16;
const BLANK_H = 14;
const KIT_WRAP = 96;
const RASP_WRAP = 80;

/**
 * Split text into lines at word boundaries (prefer near maxLen).
 * Also prefers sentence ends (. ; ! ?) when they fall past ~50% of maxLen.
 * @param {string} text
 * @param {number} maxLen
 * @returns {string[]}
 */
function wrapLines(text, maxLen) {
  const s = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return [];
  const limit = Math.max(8, Number(maxLen) || 90);
  if (s.length <= limit) return [s];

  const lines = [];
  let rest = s;
  while (rest.length > limit) {
    let window = rest.slice(0, limit + 1);
    let breakAt = window.lastIndexOf(' ');
    if (breakAt <= 0) breakAt = limit;

    // Prefer sentence boundary in the second half of the window
    const candidate = rest.slice(0, breakAt);
    let sentAt = -1;
    for (const sep of ['. ', '; ', '! ', '? ', '… ']) {
      const i = candidate.lastIndexOf(sep);
      if (i > sentAt) sentAt = i + sep.length - 1; // end of punctuation (before trailing space index)
    }
    // sentAt points at last char of punctuation; include it, drop following space
    if (sentAt >= Math.floor(limit * 0.5)) {
      breakAt = sentAt + 1;
    }

    const line = rest.slice(0, breakAt).trim();
    if (line) lines.push(line);
    rest = rest.slice(breakAt).trim();
  }
  if (rest) lines.push(rest);
  return lines;
}

function blankRow(height) {
  return { cells: ['', ''], style: 'letter', height: height == null ? BLANK_H : height };
}

/** Normal letter line — fixed height, no wrap (text already pre-wrapped into one visual line). */
function letterLine(text, opts) {
  const o = opts || {};
  const row = {
    cells: o.rightCol ? ['', text] : [text, ''],
    style: o.style || 'letter',
    height: o.height != null ? o.height : LETTER_H,
  };
  if (o.mergeAcross != null) row.mergeAcross = o.mergeAcross;
  return row;
}

/** Right-aligned header line (org name): full width via merge, style letterRight. */
function letterRight(text) {
  return {
    cells: [text, ''],
    style: 'letterRight',
    mergeAcross: 1,
    height: LETTER_H,
  };
}

/** Push wrapLines result as separate letter rows. */
function pushWrapped(rows, text, maxLen, style) {
  const lines = wrapLines(text, maxLen);
  if (!lines.length) {
    rows.push(blankRow());
    return;
  }
  lines.forEach((ln) => {
    rows.push(letterLine(ln, { style: style || 'letter', mergeAcross: 1 }));
  });
}

/**
 * Комплект документов (letter form).
 * @param {{
 *   product: string,
 *   orderDate: string,
 *   fioGi: string,
 *   pagePhrases: { stat: string, f1: string, f2: string, f3: string, mat: string }
 * }} args
 * pagePhrases values are preformatted, e.g. "на 2 листах"
 */
function exportMatrixKit({ product, orderDate, fioGi, pagePhrases }) {
  const pp = product || '(ВВЕСТИ НОМЕР ИЗДЕЛИЯ)';
  const phrases = pagePhrases || {};
  const ph = (k, fallback) => phrases[k] || fallback || 'на 1 листе';

  const colCount = 2;
  const colWidths = [220, 80];
  const rows = [];

  // Org header (right)
  rows.push(letterRight('Акционерное общество'));
  rows.push(letterRight('«Завод «Универсалмаш»'));
  rows.push(blankRow());

  // Title (center)
  rows.push({
    cells: [`Комплект документов на изделие ${pp}`, ''],
    style: 'title',
    mergeAcross: 1,
    height: TITLE_H,
  });
  rows.push(blankRow());

  // Intro — split to letter lines (~90–100 chars)
  const intro =
    `В соответствии с п-п 2-2.9 Распоряжения ${orderDate || ''} ` +
    `направляю на согласование комиссии следующий пакет документов на изделие ${pp}:`;
  pushWrapped(rows, intro, KIT_WRAP, 'letter');
  rows.push(blankRow());

  // Numbered package list — each logical item wrapped to short letter rows
  const items = [
    `Отчет «Статистика выгрузки и сравнение контрольных сумм спецификаций» ${ph('stat')} формата А4`,
    `Сводная ведомость нормативной трудоемкости операций на изделие ${pp} (Форма 1) ${ph('f1')} формата А4`,
    `Сводная ведомость нормативной трудоемкости операций по подразделениям на изделие ${pp} (Форма 2) ${ph('f2')} формата А4`,
    `Сводная ведомость нормативной трудоемкости работ по подразделениям и номенклатуре на изделие ${pp} (Форма 3) ${ph('f3')} формата А4`,
    `Сводная ведомость плановой себестоимости продукции-материальных затрат на изделие ${pp} ${ph('mat')} формата А4`,
  ];
  items.forEach((item) => {
    pushWrapped(rows, item, KIT_WRAP, 'letter');
  });

  rows.push(blankRow());
  rows.push(blankRow());

  // Signature
  rows.push({
    cells: ['Главный инженер', fioGi || ''],
    style: 'sig',
    height: SIG_H,
  });

  return {
    sheetName: 'Комплект',
    colCount,
    colWidths,
    rows,
  };
}

/**
 * Распоряжение (letter form).
 * @param {{ orderDate: string, productsText: string, fioGi: string }} args
 * productsText: multi-line product list (split by newlines → one row each)
 */
function exportMatrixRasp({ orderDate, productsText, fioGi }) {
  const colCount = 2;
  const colWidths = [220, 80];
  const rows = [];

  // Title
  rows.push({
    cells: ['О запуске в работу спецификаций изделий в 1С-ERP', ''],
    style: 'title',
    mergeAcross: 1,
    height: TITLE_H,
  });
  rows.push(blankRow());

  // Long intro — ~70–90 char letter rows
  const intro =
    `На основании сформированных технологическим и планово-диспетчерским отделами документов и отчетов ` +
    `в соответствии с Распоряжением ${orderDate || ''} комиссия приняла решение запустить в работу для открытия этапов ` +
    `с отражением выпуска в учетной системе 1С-ERP спецификации следующих изделий:`;
  pushWrapped(rows, intro, RASP_WRAP, 'letter');
  rows.push(blankRow());

  // Product list — one row per source line
  const productLines = String(productsText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!productLines.length) {
    rows.push(letterLine('Ввести номер изделия', { mergeAcross: 1 }));
  } else {
    productLines.forEach((line) => {
      // keep long product lines readable without tall wrap cells
      const parts = wrapLines(line, KIT_WRAP);
      if (!parts.length) {
        rows.push(blankRow());
      } else {
        parts.forEach((ln) => rows.push(letterLine(ln, { mergeAcross: 1 })));
      }
    });
  }

  rows.push(blankRow());

  // Signatures with blank row between blocks
  const sigs = [
    ['Операционный директор', 'В.В. Романов'],
    ['Заместитель директора по ВК и МТС', 'Е.В. Мазур'],
    ['Заместитель директора по производству', 'С.В. Сухарев'],
    ['Заместитель директора по экономике и финансам', 'А.Г. Сыркина'],
    ['Главный инженер', fioGi || ''],
  ];
  sigs.forEach(([role, fio], i) => {
    rows.push({
      cells: [role, fio],
      style: 'sig',
      height: SIG_H,
    });
    if (i < sigs.length - 1) {
      rows.push(blankRow());
    }
  });

  return {
    sheetName: 'Распоряжение',
    colCount,
    colWidths,
    rows,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { wrapLines, exportMatrixKit, exportMatrixRasp };
}
