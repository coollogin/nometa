/**
 * main.js - Главный процесс Electron
 */
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

const CHANNELS = {
    SELECT_FOLDER: 'select-folder',
    SCAN_START: 'scan-start',
    CLEAN_START: 'clean-start',
    CLOSE_WINDOW: 'close-window',
    MINIMIZE_WINDOW: 'minimize-window',
    SELECT_FILES: 'select-files',
    WINDOW_DRAG_START: 'window-drag-start',
    WINDOW_DRAG_MOVE: 'window-drag-move',
    WINDOW_DRAG_END: 'window-drag-end',
    CHECK_OFFICE: 'check-office'
};

console.log('CHANNELS loaded:', Object.keys(CHANNELS));

let mainWindow = null;

function createWindow() {
    console.log('Creating window...');
    
    const windowPath = path.join(__dirname, '..', 'renderer', 'index.html');
    console.log('Loading file:', windowPath);
    console.log('File exists:', require('fs').existsSync(windowPath));

    mainWindow = new BrowserWindow({
        width: 540,
        height: 400,
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        frame: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false
        },
        backgroundColor: '#1e1e1e'
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

    mainWindow.on('drop', (event, files) => {
        console.log('mainWindow.on(drop) - files:', files);
        event.preventDefault();
        
        const fs = require('fs');
        fs.writeFileSync('C:/temp/drop-debug.log', `drop: ${JSON.stringify(files)}\n`, { flag: 'a' });
        
        if (files && files.length > 0) {
            const validFiles = files.filter(f => {
                const ext = path.extname(f).toLowerCase();
                return ['.docx', '.xlsx', '.pptx', '.pdf', '.odt', '.ods', '.odp', '.doc', '.xls', '.ppt'].includes(ext);
            });
            if (validFiles.length > 0) {
                mainWindow.webContents.send('external-drop', { paths: validFiles, isFolder: false });
            }
        }
    });
    
    console.log('Window created');
}

// IPC handlers
ipcMain.handle(CHANNELS.SELECT_FOLDER, async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'dontAddToRecent'],
        title: 'Выберите папку'
    });
    return (!result.canceled && result.filePaths.length > 0) 
        ? { success: true, path: result.filePaths[0] } 
        : { success: false };
});

ipcMain.handle(CHANNELS.SCAN_START, async (event, folderPath) => {
    const { scanFolder } = require('../services/fileScanner');
    return await scanFolder(folderPath);
});

ipcMain.handle(CHANNELS.CLEAN_START, async (event, filePaths) => {
    const { cleanBatch } = require('../services/metadataCleaner');
    return await cleanBatch(filePaths);
});

ipcMain.on(CHANNELS.CLOSE_WINDOW, () => {
    if (mainWindow) mainWindow.close();
});

ipcMain.on(CHANNELS.MINIMIZE_WINDOW, () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.handle(CHANNELS.SELECT_FILES, async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections', 'dontAddToRecent'],
        title: 'Выберите файлы',
        filters: [
            { name: 'Документы', extensions: ['docx', 'xlsx', 'pptx', 'pdf', 'odt', 'ods', 'odp', 'doc', 'xls', 'ppt'] },
            { name: 'Все файлы', extensions: ['*'] }
        ]
    });
    return (!result.canceled && result.filePaths.length > 0) 
        ? { success: true, paths: result.filePaths } 
        : { success: false };
});

ipcMain.handle(CHANNELS.CHECK_OFFICE, async () => {
    const { checkOfficeInstalled } = require('../services/oleCleaner');
    const result = await checkOfficeInstalled();
    console.log('CHECK_OFFICE result:', result);
    return { installed: result };
});

let dragOffset = { x: 0, y: 0 };
ipcMain.on(CHANNELS.WINDOW_DRAG_START, (event, { mouseX, mouseY }) => {
    if (!mainWindow) return;
    const bounds = mainWindow.getBounds();
    dragOffset = { x: bounds.x - mouseX, y: bounds.y - mouseY };
});

ipcMain.on(CHANNELS.WINDOW_DRAG_MOVE, (event, { mouseX, mouseY }) => {
    if (!mainWindow) return;
    mainWindow.setPosition(mouseX + dragOffset.x, mouseY + dragOffset.y);
});

ipcMain.on(CHANNELS.WINDOW_DRAG_END, () => {
    dragOffset = { x: 0, y: 0 };
});

console.log('Registering app.whenReady handler...');
app.whenReady().then(() => {
    console.log('app.whenReady resolved');
    createWindow();
}).catch(err => {
    console.error('app.whenReady error:', err);
});

app.on('window-all-closed', () => {
    console.log('window-all-closed');
    if (process.platform !== 'darwin') app.quit();
});