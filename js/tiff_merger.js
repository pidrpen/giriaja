    function initTailwind() {
      document.documentElement.style.setProperty('--accent', '#3b82f6');
    }

    // State
    let pages = [];
    let selectedPageIndex = null;

    function updatePageCount() {
      const countEl = document.getElementById('pageCount');
      const emptyState = document.getElementById('emptyState');
      countEl.textContent = `${pages.length} страниц${pages.length === 1 ? 'а' : (pages.length > 1 && pages.length < 5) ? 'ы' : ''}`;
      if (pages.length === 0) emptyState.classList.remove('hidden');
      else emptyState.classList.add('hidden');
    }

    console.error('[tiff_merger] Partial JS uploaded - full version pending');
    alert('Логика ещё не полностью залита. Подожди следующий коммит.');

    function clearAllPages() { pages = []; selectedPageIndex = null; updatePageCount(); }
    function movePageUp() {}
    function movePageDown() {}
    function exportAsTIFF() { alert('JS неполный'); }
    function exportAsPDF() { alert('JS неполный'); }
    function quickConvertToTIFF() {}
    function quickConvertToPDF() {}
    function setupFileHandling() {
      const dropzone = document.getElementById('dropzone');
      const fileInput = document.getElementById('fileInput');
      if (dropzone) dropzone.addEventListener('click', () => fileInput && fileInput.click());
      if (fileInput) fileInput.addEventListener('change', () => alert('Полный JS ещё загружается'));
    }
    function renderPages() { updatePageCount(); }
    function init() { setupFileHandling(); renderPages(); }
    window.addEventListener('DOMContentLoaded', init);
