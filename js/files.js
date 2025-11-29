/**
 * YAS Remote Pro - File Transfer & Manager Module
 * Version: 3.2
 */

/**
 * Initialize drop zone
 */
function initDropZone() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
        dropZone.addEventListener(event, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });
    
    ['dragenter', 'dragover'].forEach(event => {
        dropZone.addEventListener(event, () => dropZone.classList.add('dragover'));
    });
    
    ['dragleave', 'drop'].forEach(event => {
        dropZone.addEventListener(event, () => dropZone.classList.remove('dragover'));
    });
    
    dropZone.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files.length) handleFiles(files);
    });
}

/**
 * Handle file selection
 */
function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length) handleFiles(files);
    event.target.value = '';
}

/**
 * Handle multiple files
 */
function handleFiles(files) {
    Array.from(files).forEach(file => uploadFile(file));
}

/**
 * Start file upload
 */
async function uploadFile(file) {
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        toast('File too large (max 100 MB)', 'error');
        return;
    }
    
    STATE.ws.send(JSON.stringify({
        type: 'file_upload_start',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream'
    }));
    
    STATE.activeTransfers.set('pending_' + file.name, {
        file: file,
        status: 'pending'
    });
}

/**
 * Handle upload ready response
 */
function handleFileUploadReady(data) {
    if (data.success) {
        const pendingKey = Array.from(STATE.activeTransfers.keys()).find(k => k.startsWith('pending_'));
        if (pendingKey) {
            const transfer = STATE.activeTransfers.get(pendingKey);
            STATE.activeTransfers.delete(pendingKey);
            STATE.activeTransfers.set(data.transferId, {
                ...transfer,
                transferId: data.transferId,
                fileName: transfer.file.name,
                fileSize: transfer.file.size,
                direction: 'upload',
                status: 'uploading',
                progress: 0
            });
            renderTransfers();
            sendFileChunks(data.transferId, transfer.file);
        }
    } else {
        toast(data.error, 'error');
    }
}

/**
 * Send file in chunks
 */
async function sendFileChunks(transferId, file) {
    const totalChunks = Math.ceil(file.size / CONFIG.CHUNK_SIZE);
    
    for (let i = 0; i < totalChunks; i++) {
        const start = i * CONFIG.CHUNK_SIZE;
        const end = Math.min(start + CONFIG.CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        const reader = new FileReader();
        const chunkData = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(chunk);
        });
        
        STATE.ws.send(JSON.stringify({
            type: 'file_chunk',
            transferId: transferId,
            chunkIndex: i,
            data: chunkData
        }));
        
        await new Promise(r => setTimeout(r, 10));
    }
    
    STATE.ws.send(JSON.stringify({
        type: 'file_upload_complete',
        transferId: transferId
    }));
}

/**
 * Handle file progress update
 */
function handleFileProgress(data) {
    if (STATE.activeTransfers.has(data.transferId)) {
        const transfer = STATE.activeTransfers.get(data.transferId);
        transfer.progress = data.progress;
        transfer.speed = data.speed;
        renderTransfers();
    }
}

/**
 * Handle upload success
 */
function handleFileUploadSuccess(data) {
    STATE.activeTransfers.delete(data.transferId);
    renderTransfers();
    toast('Uploaded: ' + data.fileName, 'success');
    loadRecentFiles();
}

/**
 * Handle file download data
 */
function handleFileDownloadData(data) {
    if (data.error) {
        toast('Download failed: ' + data.error, 'error');
    } else {
        saveDownloadedFile(data.fileName, data.fileData);
        loadRecentFiles();
    }
}

/**
 * Request file download
 */
function downloadFile(filePath) {
    STATE.ws.send(JSON.stringify({
        type: 'file_download_request',
        filePath: filePath
    }));
    toast('Downloading...');
    closeFileBrowser();
}

/**
 * Save downloaded file
 */
function saveDownloadedFile(fileName, fileData) {
    try {
        const byteCharacters = atob(fileData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        
        toast('Downloaded: ' + fileName, 'success');
    } catch (e) {
        toast('Download failed', 'error');
    }
}

/**
 * Cancel transfer
 */
function cancelTransfer(transferId) {
    STATE.ws.send(JSON.stringify({
        type: 'file_cancel',
        transferId: transferId
    }));
    STATE.activeTransfers.delete(transferId);
    renderTransfers();
}

/**
 * Load recent files
 */
function loadRecentFiles() {
    STATE.ws.send(JSON.stringify({ type: 'get_recent_files' }));
}

/**
 * Render active transfers
 */
function renderTransfers() {
    const container = document.getElementById('transfersContainer');
    if (!container) return;
    
    if (STATE.activeTransfers.size === 0) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="file-section-title">📊 Active Transfers</div>';
    
    STATE.activeTransfers.forEach((transfer, id) => {
        if (transfer.status === 'completed' || transfer.status === 'failed') return;
        
        const progress = transfer.progress || 0;
        const statusClass = transfer.status === 'error' ? 'error' : '';
        
        html += `
            <div class="transfer-item">
                <div class="transfer-header">
                    <span class="transfer-icon">${transfer.direction === 'upload' ? '📤' : '📥'}</span>
                    <div class="transfer-info">
                        <div class="transfer-name">${transfer.fileName}</div>
                        <div class="transfer-size">${formatSize(transfer.fileSize)}</div>
                    </div>
                    <button class="transfer-cancel" onclick="cancelTransfer('${id}')">✕</button>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${statusClass}" style="width: ${progress}%"></div>
                </div>
                <div class="transfer-status">
                    <span>${progress}%</span>
                    <span>${transfer.speed ? formatSize(transfer.speed) + '/s' : ''}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Render recent files
 */
function renderRecentFiles() {
    const container = document.getElementById('recentFilesList');
    if (!container) return;
    
    if (STATE.recentFiles.length === 0) {
        container.innerHTML = '<p style="color: var(--text2); font-size: 13px; text-align: center; padding: 16px;">No recent transfers</p>';
        return;
    }
    
    container.innerHTML = STATE.recentFiles.slice(0, 5).map(file => `
        <div class="recent-file">
            <span class="recent-file-icon">${getFileIcon(file.extension)}</span>
            <div class="recent-file-info">
                <div class="recent-file-name">${file.name}</div>
                <div class="recent-file-meta">${file.sizeFormatted} • ${file.direction === 'upload' ? '↑' : '↓'}</div>
            </div>
        </div>
    `).join('');
}


// ============================================
// File Browser
// ============================================

/**
 * Show file browser
 */
function showFileBrowser() {
    document.getElementById('fileBrowserModal').classList.add('show');
    browsePath('');
}

/**
 * Close file browser
 */
function closeFileBrowser() {
    document.getElementById('fileBrowserModal').classList.remove('show');
}

/**
 * Browse path
 */
function browsePath(path) {
    STATE.currentBrowsePath = path;
    document.getElementById('browserPath').textContent = path || 'Quick Access';
    document.getElementById('browserItems').innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text2);">Loading...</p>';
    
    STATE.ws.send(JSON.stringify({
        type: 'browse_files',
        path: path
    }));
}

/**
 * Browse parent directory
 */
function browseParent() {
    if (STATE.currentBrowsePath) {
        const parent = STATE.currentBrowsePath.split(/[/\\]/).slice(0, -1).join('\\');
        browsePath(parent || '');
    }
}

/**
 * Render browser items
 */
function renderBrowserItems(data) {
    const container = document.getElementById('browserItems');
    document.getElementById('browserPath').textContent = data.path || 'Quick Access';
    STATE.currentBrowsePath = data.path;
    
    if (!data.items || data.items.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text2);">Empty folder</p>';
        return;
    }
    
    container.innerHTML = data.items.map(item => {
        const isQuick = item.icon === 'quick';
        const icon = item.type === 'folder' ? (isQuick ? '⭐' : '📁') : getFileIcon(item.name.split('.').pop());
        
        return `
            <div class="file-item" onclick="${item.type === 'folder' 
                ? `browsePath('${item.path.replace(/\\/g, '\\\\')}')` 
                : `showFileActions('${item.path.replace(/\\/g, '\\\\')}')`}">
                <span class="file-item-icon">${icon}</span>
                <span class="file-item-name">${item.name}</span>
                ${item.type === 'file' ? `<span class="file-item-size">${formatSize(item.size)}</span>` : ''}
            </div>
        `;
    }).join('');
}

// ============================================
// File Manager Operations
// ============================================

/**
 * Show file actions menu
 */
function showFileActions(filePath) {
    STATE.selectedFilePath = filePath;
    document.getElementById('fileActionsModal').classList.add('show');
    document.getElementById('selectedFileName').textContent = filePath.split(/[/\\]/).pop();
}

/**
 * Close file actions modal
 */
function closeFileActions() {
    document.getElementById('fileActionsModal').classList.remove('show');
}

/**
 * Download selected file
 */
function downloadSelectedFile() {
    downloadFile(STATE.selectedFilePath);
    closeFileActions();
}

/**
 * Delete selected file
 */
function deleteSelectedFile() {
    if (confirm('Delete this file?')) {
        fileOperation('delete', STATE.selectedFilePath);
        closeFileActions();
    }
}

/**
 * Rename selected file
 */
function renameSelectedFile() {
    const currentName = STATE.selectedFilePath.split(/[/\\]/).pop();
    const newName = prompt('New name:', currentName);
    
    if (newName && newName !== currentName) {
        fileOperation('rename', STATE.selectedFilePath, null, newName);
        closeFileActions();
    }
}

/**
 * Copy selected file
 */
function copySelectedFile() {
    STATE.clipboardFile = { path: STATE.selectedFilePath, operation: 'copy' };
    toast('File copied to clipboard');
    closeFileActions();
}

/**
 * Cut selected file
 */
function cutSelectedFile() {
    STATE.clipboardFile = { path: STATE.selectedFilePath, operation: 'move' };
    toast('File cut to clipboard');
    closeFileActions();
}

/**
 * Paste file
 */
function pasteFile() {
    if (!STATE.clipboardFile) {
        toast('Nothing to paste', 'warning');
        return;
    }
    
    const destPath = STATE.currentBrowsePath || '';
    if (!destPath) {
        toast('Select a destination folder', 'warning');
        return;
    }
    
    const fileName = STATE.clipboardFile.path.split(/[/\\]/).pop();
    const fullDestPath = destPath + '\\' + fileName;
    
    fileOperation(STATE.clipboardFile.operation, STATE.clipboardFile.path, fullDestPath);
    
    if (STATE.clipboardFile.operation === 'move') {
        STATE.clipboardFile = null;
    }
}

/**
 * Create new folder
 */
function createNewFolder() {
    const folderName = prompt('Folder name:');
    
    if (folderName) {
        const folderPath = (STATE.currentBrowsePath || '') + '\\' + folderName;
        fileOperation('create_folder', folderPath);
    }
}

/**
 * Execute file operation
 */
function fileOperation(operation, sourcePath, destPath = null, newName = null) {
    STATE.ws.send(JSON.stringify({
        type: 'file_operation',
        operation: operation,
        sourcePath: sourcePath,
        destPath: destPath,
        newName: newName
    }));
}

/**
 * Handle file operation result
 */
function handleFileOperationResult(data) {
    if (data.success) {
        toast(`${data.operation} completed`, 'success');
        // Refresh current folder
        if (STATE.currentBrowsePath !== undefined) {
            browsePath(STATE.currentBrowsePath);
        }
    } else {
        toast(`${data.operation} failed: ${data.error}`, 'error');
    }
}

// ============================================
// File Watcher
// ============================================

/**
 * Start watching a folder
 */
function startWatcher(path) {
    const watcherId = 'watcher_' + Date.now();
    STATE.ws.send(JSON.stringify({
        type: 'start_file_watcher',
        path: path,
        watcherId: watcherId
    }));
}

/**
 * Stop watching a folder
 */
function stopWatcher(watcherId) {
    STATE.ws.send(JSON.stringify({
        type: 'stop_file_watcher',
        watcherId: watcherId
    }));
}

/**
 * Get watched folders
 */
function getWatchedFolders() {
    STATE.ws.send(JSON.stringify({ type: 'get_watched_folders' }));
}

/**
 * Handle watcher result
 */
function handleWatcherResult(data) {
    if (data.success) {
        toast('Watching: ' + data.path, 'success');
        getWatchedFolders();
    } else {
        toast('Watcher error: ' + data.error, 'error');
    }
}

/**
 * Handle file change event
 */
function handleFileChange(data) {
    const fileName = data.path.split(/[/\\]/).pop();
    const eventIcons = {
        'created': '📄',
        'modified': '✏️',
        'deleted': '🗑️',
        'renamed': '📝'
    };
    
    const icon = eventIcons[data.event] || '📄';
    toast(`${icon} ${data.event}: ${fileName}`, 'info');
    
    // Add to notifications
    addFileNotification(data);
}

/**
 * Add file notification
 */
function addFileNotification(data) {
    if (!STATE.fileNotifications) {
        STATE.fileNotifications = [];
    }
    
    STATE.fileNotifications.unshift({
        event: data.event,
        path: data.path,
        timestamp: data.timestamp || Date.now()
    });
    
    // Keep only last 20
    if (STATE.fileNotifications.length > 20) {
        STATE.fileNotifications.pop();
    }
    
    updateNotificationBadge();
}

/**
 * Update notification badge
 */
function updateNotificationBadge() {
    const badge = document.getElementById('notifBadge');
    if (badge) {
        const count = STATE.fileNotifications?.length || 0;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
    }
}

/**
 * Render watched folders
 */
function renderWatchedFolders() {
    const container = document.getElementById('watchedFoldersList');
    if (!container) return;
    
    if (!STATE.watchedFolders?.length) {
        container.innerHTML = '<p style="color: var(--text2); font-size: 13px; text-align: center;">No watched folders</p>';
        return;
    }
    
    container.innerHTML = STATE.watchedFolders.map(w => `
        <div class="watched-item">
            <span class="watched-icon">👁️</span>
            <span class="watched-path">${w.path}</span>
            <button class="watched-stop" onclick="stopWatcher('${w.watcherId}')">✕</button>
        </div>
    `).join('');
}

/**
 * Watch current folder
 */
function watchCurrentFolder() {
    if (STATE.currentBrowsePath) {
        startWatcher(STATE.currentBrowsePath);
    } else {
        toast('Select a folder first', 'warning');
    }
}
