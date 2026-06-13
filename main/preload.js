/**
 * preload.js - Мост между renderer и main процессами
 */

const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

const CHANNELS = {
    SELECT_FOLDER: 'select-folder',
    SELECT_FILE: 'select-file',
    SELECT_FILES: 'select-files',
    SCAN_START: 'scan-start',
    CLEAN_START: 'clean-start',
    CLOSE_WINDOW: 'close-window',
    MINIMIZE_WINDOW: 'minimize-window',
    WINDOW_DRAG_START: 'window-drag-start',
    WINDOW_DRAG_MOVE: 'window-drag-move',
    WINDOW_DRAG_END: 'window-drag-end',
    CHECK_OFFICE: 'check-office'
};

const api = {
    selectFolder: () => ipcRenderer.invoke(CHANNELS.SELECT_FOLDER),
    selectFile: () => ipcRenderer.invoke(CHANNELS.SELECT_FILE),
    selectFiles: () => ipcRenderer.invoke(CHANNELS.SELECT_FILES),
    startScan: (folderPath) => ipcRenderer.invoke(CHANNELS.SCAN_START, folderPath),
    cleanFiles: (filePaths) => ipcRenderer.invoke(CHANNELS.CLEAN_START, filePaths),
    closeWindow: () => ipcRenderer.send(CHANNELS.CLOSE_WINDOW),
    minimizeWindow: () => ipcRenderer.send(CHANNELS.MINIMIZE_WINDOW),
    startWindowDrag: (mouseX, mouseY) => ipcRenderer.send(CHANNELS.WINDOW_DRAG_START, { mouseX, mouseY }),
    moveWindowDrag: (mouseX, mouseY) => ipcRenderer.send(CHANNELS.WINDOW_DRAG_MOVE, { mouseX, mouseY }),
    endWindowDrag: () => ipcRenderer.send(CHANNELS.WINDOW_DRAG_END),
    checkOffice: () => ipcRenderer.invoke(CHANNELS.CHECK_OFFICE),
    onExternalDrop: (callback) => ipcRenderer.on('external-drop', (_, data) => callback(data))
};

contextBridge.exposeInMainWorld('nometaAPI', api);

// Expose path.extname для получения расширения
contextBridge.exposeInMainWorld('path', {
    extname: (p) => path.extname(p)
});