/**
 * fileScanner.js
 * 
 * Сервис рекурсивного сканирования папки на офисные документы.
 */

const fs = require('fs').promises;
const path = require('path');
const { ALL_EXTENSIONS } = require('../utils/constants');

/**
 * Сканирует папку на файлы с нужными расширениями
 */
async function scanFolder(folderPath) {
    try {
        await fs.access(folderPath);
    } catch (error) {
        throw new Error(`Папка не найдена: ${folderPath}`);
    }

    const foundFiles = [];
    
    async function walk(currentPath) {
        try {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                
                if (entry.isDirectory()) {
                    await walk(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (ALL_EXTENSIONS.includes(ext)) {
                        foundFiles.push(fullPath);
                    }
                }
            }
        } catch (error) {
            console.error(`[SCAN ERROR] ${error.message}`);
        }
    }
    
    await walk(folderPath);
    
    return { files: foundFiles, count: foundFiles.length };
}

module.exports = { scanFolder };