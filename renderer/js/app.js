/**
 * app.js - UI логика NoMeta
 * Адаптировано из nometa_temp с поддержкой drag&drop
 */

const state = { folder: null, files: [] };

// Элементы UI
const dropArea = document.getElementById('drop-area');
const selectFolderBtn = document.getElementById('select-folder-btn');
const selectFileBtn = document.getElementById('select-file-btn');
const folderInfo = document.getElementById('folder-info');
const filesCount = document.getElementById('files-count');
const processedCount = document.getElementById('processed-count');
const errorCount = document.getElementById('error-count');
const startBtn = document.getElementById('start-btn');
const progressArea = document.getElementById('progress-area');
const progressFill = document.getElementById('progress-fill');
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const aboutModal = document.getElementById('about-modal');
const aboutClose = document.getElementById('about-close');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const aboutBtn = document.getElementById('about-btn');

document.addEventListener('DOMContentLoaded', init);

function init() {
    selectFolderBtn.onclick = (e) => {
        e.stopPropagation();
        handleSelectFolder();
    };
    selectFileBtn.onclick = (e) => {
        e.stopPropagation();
        handleSelectFiles();
    };
    startBtn.onclick = handleStart;

    minimizeBtn.onclick = () => nometaAPI.minimizeWindow();
    closeBtn.onclick = () => nometaAPI.closeWindow();

    aboutBtn.onclick = () => aboutModal.classList.remove('hidden');
    aboutClose.onclick = () => aboutModal.classList.add('hidden');

    themeToggleBtn.onclick = () => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
        themeToggleBtn.textContent = isLight ? '🌙' : '☀';
    };

    nometaAPI.onExternalDrop((data) => {
        if (data && data.paths && data.paths.length > 0) {
            handleExternalFiles(data.paths);
        }
    });

    initDragAndDrop();
}

function resetState() {
    progressArea.classList.add('hidden');
    progressFill.style.width = '0%';
    processedCount.textContent = '0';
    processedCount.className = 'info-value';
    errorCount.textContent = '0';
    errorCount.className = 'info-value';
}

function handleExternalFiles(paths) {
    resetState();
    const normalizedPaths = paths.map(p => p.replace(/\//g, '\\'));
    const supportedExtensions = ['.docx', '.xlsx', '.pptx', '.pdf', '.odt', '.ods', '.odp', '.doc', '.xls', '.ppt'];
    const validFiles = normalizedPaths.filter(f => {
        const ext = window.path?.extname(f).toLowerCase() || '';
        return supportedExtensions.includes(ext);
    });
    state.folder = null;
    state.files = validFiles;
    filesCount.textContent = validFiles.length;
    folderInfo.classList.remove('hidden');
    startBtn.disabled = false;
}

function initDragAndDrop() {
    dropArea.addEventListener('dragenter', (e) => {
        e.preventDefault(); e.stopPropagation();
        dropArea.classList.add('dragover');
    });
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault(); e.stopPropagation();
        dropArea.classList.add('dragover');
    });
    dropArea.addEventListener('dragleave', (e) => {
        e.preventDefault(); e.stopPropagation();
        dropArea.classList.remove('dragover');
    });
    dropArea.addEventListener('drop', async (e) => {
        e.preventDefault(); e.stopPropagation();
        dropArea.classList.remove('dragover');
        resetState();
        const files = e.dataTransfer.files;
        const supportedExtensions = ['.docx', '.xlsx', '.pptx', '.pdf', '.odt', '.ods', '.odp', '.doc', '.xls', '.ppt'];
        const documentFiles = [];
        for (let i = 0; i < files.length; i++) {
            let fp = files[i].path;
            if (!fp) continue;
            fp = fp.replace(/\//g, '\\');
            if (fp.includes('_clean') || fp.includes('_tmp')) continue;
            const ext = window.path?.extname(fp).toLowerCase() || '';
            if (supportedExtensions.includes(ext)) {
                documentFiles.push(fp);
            }
        }
        state.folder = null;
        state.files = documentFiles;
        filesCount.textContent = documentFiles.length;
        folderInfo.classList.remove('hidden');
        startBtn.disabled = false;
    });
}

async function handleSelectFiles() {
    resetState();
    const result = await nometaAPI.selectFiles();
    if (!result.success) return;
    const validPaths = result.paths.filter(f => {
        const ext = f.toLowerCase().match(/\.(docx|xlsx|pptx|pdf|odt|ods|odp|doc|xls|ppt)$/);
        return ext !== null && !f.includes('_clean') && !f.includes('_tmp');
    });
    state.folder = null;
    state.files = validPaths;
    filesCount.textContent = validPaths.length;
    folderInfo.classList.remove('hidden');
    startBtn.disabled = false;
}

async function handleSelectFolder() {
    resetState();
    const result = await nometaAPI.selectFolder();
    if (result.success) {
        state.folder = result.path;
        await scanFolder(result.path);
    }
}

async function scanFolder(folderPath) {
    resetState();
    const result = await nometaAPI.startScan(folderPath);
    state.files = result.files.map(f => f.replace(/\//g, '\\'));
    filesCount.textContent = result.count;
    folderInfo.classList.remove('hidden');
    startBtn.disabled = result.count === 0;
}

async function handleStart() {
    if (state.files.length === 0) return;
    progressArea.classList.remove('hidden');
    progressFill.className = 'progress-fill';
    progressFill.style.width = '0%';
    startBtn.disabled = true;
    startBtn.textContent = 'Обработка...';
    
    const filesToProcess = state.files.filter(f => !f.includes('_clean') && !f.includes('_tmp'));
    const hasOffice = filesToProcess.some(f => /\.(docx|xlsx|pptx|doc|xls|ppt)$/i.test(f));
    
    if (hasOffice) {
        const officeCheck = await nometaAPI.checkOffice();
        if (!officeCheck.installed) {
            alert('Для очистки Office файлов требуется установленный Microsoft Office');
            startBtn.textContent = 'Очистить метаданные';
            startBtn.disabled = false;
            return;
        }
    }

    let success = 0, failed = 0;
    const total = filesToProcess.length;

    // Обрабатываем файлы по одному для обновления прогресса
    for (let i = 0; i < total; i++) {
        const file = filesToProcess[i];
        const result = await nometaAPI.cleanFiles([file]);
        
        if (result[0].success) {
            success++;
        } else {
            failed++;
            console.error(file + ': ' + result[0].error);
        }

        // Обновляем прогресс после каждого файла
        const percent = Math.round(((i + 1) / total) * 100);
        progressFill.style.width = percent + '%';
    }
    
    // Окрашиваем прогресс-бар: зелёный при успехе, красный при ошибках
    if (failed > 0) {
        progressFill.classList.add('progress-error');
    } else {
        progressFill.classList.add('progress-success');
    }
    
    processedCount.textContent = success;
    processedCount.className = success > 0 ? 'info-value success' : 'info-value';
    errorCount.textContent = failed;
    errorCount.className = failed > 0 ? 'info-value error' : 'info-value';
    
    // Обнуляем найденные файлы и блокируем кнопку
    state.files = [];
    filesCount.textContent = '0';
    startBtn.textContent = 'Очистить метаданные';
    startBtn.disabled = true;
}