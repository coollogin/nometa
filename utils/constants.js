/**
 * constants.js - Константы проекта NoMeta
 */

// Поддерживаемые расширения файлов
const SUPPORTED_EXTENSIONS = {
    OFFICE_MODERN: ['.docx', '.xlsx', '.pptx'],
    OFFICE_LEGACY: ['.doc', '.xls', '.ppt'],
    PDF: ['.pdf'],
    OPEN_DOCUMENT: ['.odt', '.ods', '.odp']
};

const ALL_EXTENSIONS = [
    ...SUPPORTED_EXTENSIONS.OFFICE_MODERN,
    ...SUPPORTED_EXTENSIONS.OFFICE_LEGACY,
    ...SUPPORTED_EXTENSIONS.PDF,
    ...SUPPORTED_EXTENSIONS.OPEN_DOCUMENT
];

// Настройки
const DEFAULTS = {
    TEMP_SUFFIX: '.nometa_temp'
};

// IPC каналы
const CHANNELS = {
    SELECT_FOLDER: 'select-folder',
    SCAN_START: 'scan-start',
    CLEAN_START: 'clean-start',
    CLOSE_WINDOW: 'close-window',
    MINIMIZE_WINDOW: 'minimize-window',
    WINDOW_DRAG_START: 'window-drag-start',
    WINDOW_DRAG_MOVE: 'window-drag-move',
    WINDOW_DRAG_END: 'window-drag-end',
    CHECK_OFFICE: 'check-office'
};

module.exports = {
    SUPPORTED_EXTENSIONS,
    ALL_EXTENSIONS,
    DEFAULTS,
    CHANNELS
};
