/**
 * oleCleaner.js - Очистка метаданных Office через COM automation.
 * Поддерживает: .docx/.xlsx/.pptx/.doc/.xls/.ppt
 */

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { execFile } = require('child_process');
const iconv = require('iconv-lite');

async function cleanOfficeFile(filePath, tempPath) {
    if (process.platform !== 'win32') {
        return { success: false, error: 'Office очистка поддерживается только на Windows с Microsoft Office' };
    }

    const ext = path.extname(filePath).toLowerCase();
    
    // Создаём временный путь с тем же расширением (Excel требует правильное расширение)
    const baseWithoutExt = filePath.slice(0, -ext.length);
    const tempPathCorrect = baseWithoutExt + '_clean' + ext;
    const backupPath = filePath + '.nometa_backup';

    try {
        // 1. Создаём backup оригинала
        await fsp.copyFile(filePath, backupPath);

        const script = generateCleanupScript(filePath, tempPathCorrect, ext);
        const wscriptPath = path.join(__dirname, 'cleanup_office.vbs');
        
        // Пишем VBScript в кодировке cp1251 (русский)
        await fsp.writeFile(wscriptPath, iconv.encode(script, 'cp1251'));
        const result = await runWScript(wscriptPath);
        await fsp.unlink(wscriptPath).catch(() => {});

        if (result.success) {
            // 2. Проверяем что файл не пустой
            const stats = await fsp.stat(tempPathCorrect).catch(() => null);
            if (!stats || stats.size === 0) {
                await fsp.unlink(tempPathCorrect).catch(() => {});
                await restoreFromBackup(filePath, backupPath);
                return { success: false, error: 'Очищенный файл пуст' };
            }

            // 3. Безопасная замена: сначала удаляем оригинал, потом переименовываем
            await fsp.unlink(filePath).catch(() => {});
            await fsp.rename(tempPathCorrect, filePath);
            
            // 4. Удаляем backup
            await fsp.unlink(backupPath).catch(() => {});
            return { success: true };
        } else {
            // Ошибка — восстанавливаем из backup
            await fsp.unlink(tempPathCorrect).catch(() => {});
            await restoreFromBackup(filePath, backupPath);
            return { success: false, error: result.error };
        }
    } catch (err) {
        await fsp.unlink(tempPathCorrect).catch(() => {});
        await restoreFromBackup(filePath, backupPath);
        return { success: false, error: err.message };
    }
}

/**
 * Восстанавливает файл из backup
 */
async function restoreFromBackup(filePath, backupPath) {
    try {
        await fsp.access(backupPath);
        await fsp.unlink(filePath).catch(() => {});
        await fsp.rename(backupPath, filePath);
    } catch {
        // Backup не удался — логируем, но не падаем
    }
}

function generateCleanupScript(filePath, tempPath, ext) {
    return getOfficeVBScript(ext, filePath, tempPath);
}

function getOfficeVBScript(ext, quotedPath, quotedTemp) {
    switch (ext) {
        case '.xls':
            return `
On Error Resume Next
Set excel = CreateObject("Excel.Application")
If Err.Number <> 0 Then
    WScript.Echo "ERROR: " & Err.Description
    WScript.Quit 1
End If
excel.Visible = False
excel.DisplayAlerts = False
Set wb = excel.Workbooks.Open("${quotedPath}")
If Err.Number <> 0 Then
    WScript.Echo "ERROR: " & Err.Description
    excel.Quit
    WScript.Quit 1
End If
wb.RemoveDocumentInformation 99
wb.SaveAs "${quotedTemp}", 1
If Err.Number <> 0 Then
    WScript.Echo "ERROR: " & Err.Description
    wb.Close False
    excel.Quit
    WScript.Quit 1
End If
wb.Close False
excel.Quit
WScript.Echo "OK"`;

        case '.xlsx':
            return `
On Error Resume Next
Set excel = CreateObject("Excel.Application")
If Err.Number <> 0 Then
    WScript.Echo "ERROR: " & Err.Description
    WScript.Quit 1
End If
excel.Visible = False
excel.DisplayAlerts = False
Set wb = excel.Workbooks.Open("${quotedPath}")
If Err.Number <> 0 Then
    WScript.Echo "ERROR: " & Err.Description
    excel.Quit
    WScript.Quit 1
End If
wb.RemoveDocumentInformation 99
wb.SaveAs "${quotedTemp}", 51
If Err.Number <> 0 Then
    WScript.Echo "ERROR: " & Err.Description
    wb.Close False
    excel.Quit
    WScript.Quit 1
End If
wb.Close False
excel.Quit
WScript.Echo "OK"`;

        case '.doc':
            return `
On Error Resume Next
Set word = CreateObject("Word.Application")
If Err.Number <> 0 Then
    WScript.Echo "ERROR: " & Err.Description
    WScript.Quit 1
End If
word.Visible = False
word.DisplayAlerts = 0
Set doc = word.Documents.Open("${quotedPath}")
If Err.Number <> 0 Then
    WScript.Echo "ERROR: " & Err.Description
    word.Quit
    WScript.Quit 1
End If
doc.RemoveDocumentInformation 99
doc.SaveAs "${quotedTemp}", 0
If Err.Number <> 0 Then
    WScript.Echo "ERROR: " & Err.Description
    doc.Close False
    word.Quit
    WScript.Quit 1
End If
doc.Close False
word.Quit
WScript.Echo "OK"`;

        case '.docx':
            return `
On Error Resume Next
Set word = CreateObject("Word.Application")
If Err.Number <> 0 Then
    WScript.Echo "ERROR: " & Err.Description
    WScript.Quit 1
End If
word.Visible = False
word.DisplayAlerts = 0
Set doc = word.Documents.Open("${quotedPath}")
If Err.Number <> 0 Then
    WScript.Echo "ERROR: " & Err.Description
    word.Quit
    WScript.Quit 1
End If
doc.RemoveDocumentInformation 99
doc.SaveAs "${quotedTemp}", 16
If Err.Number <> 0 Then
    WScript.Echo "ERROR: " & Err.Description
    doc.Close False
    word.Quit
    WScript.Quit 1
End If
doc.Close False
word.Quit
WScript.Echo "OK"`;

        default:
            return `WScript.Echo "ERROR: Unsupported format ${ext}"
WScript.Quit 1`;
    }
}

function runWScript(scriptPath) {
    return new Promise((resolve) => {
        execFile('cscript', ['/nologo', scriptPath], { encoding: 'buffer' }, (error, stdout, stderr) => {
            const output = iconv.decode(stdout, 'cp1251').trim();
            if (error) {
                resolve({ success: false, error: error.message });
                return;
            }
            if (output.includes('OK')) {
                resolve({ success: true });
            } else {
                resolve({ success: false, error: output || 'Unknown error' });
            }
        });
    });
}

async function checkOfficeInstalled() {
    if (process.platform !== 'win32') {
        return false;
    }

    const script = 'On Error Resume Next\r\n' +
        'Set word = CreateObject("Word.Application")\r\n' +
        'If Err.Number = 0 Then\r\n' +
        '    word.Quit\r\n' +
        '    WScript.Echo "OK"\r\n' +
        'Else\r\n' +
        '    WScript.Echo "NOT_INSTALLED"\r\n' +
        'End If\r\n';
    const scriptPath = path.join(__dirname, 'check_office.vbs');
    
    try {
        await fsp.writeFile(scriptPath, iconv.encode(script, 'cp1251'));
        const result = await runWScript(scriptPath);
        await fsp.unlink(scriptPath).catch(() => {});
        
        return result.success;
    } catch (e) {
        await fsp.unlink(scriptPath).catch(() => {});
        return false;
    }
}

module.exports = {
    cleanOfficeFile,
    checkOfficeInstalled
};