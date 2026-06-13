/**
 * handlers.js - IPC обработчики NoMeta
 */

const CHANNELS = {
    SELECT_FOLDER: 'select-folder',
    SELECT_FILE: 'select-file',
    SELECT_FILES: 'select-files',
    SCAN_START: 'scan-start',
    CLEAN_START: 'clean-start',
    CLOSE_WINDOW: 'close-window',
    MINIMIZE_WINDOW: 'minimize-window',
    EXTERNAL_DROP: 'external-drop',
    WINDOW_DRAG_START: 'window-drag-start',
    WINDOW_DRAG_MOVE: 'window-drag-move',
    WINDOW_DRAG_END: 'window-drag-end'
};

module.exports = { CHANNELS };