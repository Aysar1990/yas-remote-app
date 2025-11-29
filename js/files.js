/**
 * YAS Remote Pro - File Transfer Module
 * Version: 3.1
 */

/**
 * Initialize drop zone
 */
function initDropZone() {
    const dropZone = document.getElementById('dropZone');
    
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
    
    // Request upload start
    STATE.ws.send(JSON.stringify({
        type: 'file_upload_start',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream'
    }));
    
    // Store file for chunked upload
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
        
        // Small delay to prevent overwhelming
        await new Promise(r => setTimeout(r, 10));
    }
    
    // Complete upload
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
    
    if (STATE.recentFiles.length === 0) {
        container.innerHTML = '<p style="color: var(--text2); font-size: 13px; text-align: center; padding: 16px;">No recent transfers</p>';
        return;
    }
    
    container.innerHTML = STATE.recentFiles.slice(0, 5).map(file => `
        <div class="recent-file">
            <span class="recent-file-icon">${getFileIcon(file.extension)}</span>
            <div class="recent-file-info">
                <div class="recent-file-name">${file.name}</div>
                <div class="recent-file-meta">${file.sizeFormatted} • ${file.direction === 'upload' ? '↑ Uploaded' : '↓ Downloaded'}</div>
            </div>
        </div>
    `).join('');
}

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
    document.getElementById('browserPath').textContent = path || 'Select location...';
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
    document.getElementById('browserPath').textContent = data.path || 'Select location...';
    STATE.currentBrowsePath = data.path;
    
    if (!data.items || data.items.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text2);">Empty folder</p>';
        return;
    }
    
    container.innerHTML = data.items.map(item => `
        <div class="file-item" onclick="${item.type === 'folder' 
            ? `browsePath('${item.path.replace(/\\/g, '\\\\')}')` 
            : `downloadFile('${item.path.replace(/\\/g, '\\\\')}')`}">
            <span class="file-item-icon">${item.type === 'folder' ? '📁' : getFileIcon(item.name.split('.').pop())}</span>
            <span class="file-item-name">${item.name}</span>
            ${item.type === 'file' ? `<span class="file-item-size">${formatSize(item.size)}</span>` : ''}
        </div>
    `).join('');
}
