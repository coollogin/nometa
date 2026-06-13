/**
 * metadataCleaner.js
 * 
 * Сервис очистки метаданных из офисных документов.
 * Безопасная обработка: backup -> очистка копии -> проверка -> замена оригинала.
 */

const fs = require('fs').promises;
const path = require('path');
const { SUPPORTED_EXTENSIONS } = require('../utils/constants');
const oleCleaner = require('./oleCleaner');

const BACKUP_SUFFIX = '.nometa_backup';

async function cleanMetadata(filePath) {
    if (!isSupportedFormat(filePath)) {
        return { success: false, error: 'Формат не поддерживается' };
    }

    const backupPath = filePath + BACKUP_SUFFIX;

    try {
        // 1. Создаём backup оригинала
        await fs.copyFile(filePath, backupPath);

        // 2. Очищаем метаданные
        const ext = path.extname(filePath).toLowerCase();
        let result;

        if (SUPPORTED_EXTENSIONS.OFFICE_MODERN.includes(ext) ||
            SUPPORTED_EXTENSIONS.OFFICE_LEGACY.includes(ext)) {
            result = await oleCleaner.cleanOfficeFile(filePath);
        } else if (SUPPORTED_EXTENSIONS.PDF.includes(ext)) {
            await cleanPdf(filePath);
            result = { success: true };
        } else if (SUPPORTED_EXTENSIONS.OPEN_DOCUMENT.includes(ext)) {
            await cleanOpenDocument(filePath);
            result = { success: true };
        } else {
            result = { success: false, error: 'Неизвестный формат' };
        }

        // 3. Если очистка не удалась — восстанавливаем из backup
        if (!result.success) {
            await restoreFromBackup(filePath, backupPath);
            return result;
        }

        // 4. Проверяем что файл не стал пустым (защита от повреждения)
        const stats = await fs.stat(filePath);
        if (stats.size === 0) {
            await restoreFromBackup(filePath, backupPath);
            return { success: false, error: 'Файл стал пустым после очистки' };
        }

        // 5. Успех — удаляем backup
        await fs.unlink(backupPath).catch(() => {});

        return { success: true };
    } catch (err) {
        // При любой ошибке восстанавливаем из backup
        await restoreFromBackup(filePath, backupPath);
        return { success: false, error: err.message };
    }
}

/**
 * Восстанавливает файл из backup при ошибке
 */
async function restoreFromBackup(filePath, backupPath) {
    try {
        await fs.access(backupPath);
        await fs.unlink(filePath).catch(() => {});
        await fs.rename(backupPath, filePath);
    } catch {
        // Если backup тоже не удалось восстановить — просто логируем
    }
}

function isSupportedFormat(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return [
        ...SUPPORTED_EXTENSIONS.OFFICE_MODERN,
        ...SUPPORTED_EXTENSIONS.PDF,
        ...SUPPORTED_EXTENSIONS.OPEN_DOCUMENT,
        ...SUPPORTED_EXTENSIONS.OFFICE_LEGACY
    ].includes(ext);
}

async function cleanPdf(filePath) {
    const { PDFDocument } = require('pdf-lib');
    
    const data = await fs.readFile(filePath);
    const pdf = await PDFDocument.load(data, { ignoreEncryption: true });
    
    const pageCount = pdf.getPageCount();
    const newPdf = await PDFDocument.create();
    
    for (let i = 0; i < pageCount; i++) {
        const [page] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(page);
    }
    
    const cleaned = await newPdf.save();
    const tempPath = filePath + '.tmp';
    await fs.writeFile(tempPath, cleaned);
    await fs.unlink(filePath);
    await fs.rename(tempPath, filePath);
}

async function cleanOpenDocument(filePath) {
    const AdmZip = require('adm-zip');
    const buffer = await fs.readFile(filePath);
    const zip = new AdmZip(buffer);
    
    try { zip.deleteFile('meta.xml'); } catch {}
    
    const tempPath = filePath + '.tmp';
    zip.writeZip(tempPath);
    await fs.unlink(filePath);
    await fs.rename(tempPath, filePath);
}

async function cleanBatch(filePaths) {
    const results = [];
    
    for (const file of filePaths) {
        const result = await cleanMetadata(file);
        results.push({ file, ...result });
    }
    
    return results;
}

module.exports = { 
    cleanMetadata, 
    cleanBatch 
};
