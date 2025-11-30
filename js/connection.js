/**
 * YAS Remote Pro - Connection & Message Handler
 * Version: 3.2
 */

/**
 * Send command to PC
 */
function send(data) {
    if (STATE.ws && STATE.connected) {
        STATE.ws.send(JSON.stringify({ type: 'relay', data: data }));
    }
}

/**
 * Handle incoming messages
 */
function handleMessage(data) {
    switch (data.type) {
        // Connection
        case 'connected':
            handleConnected(data);
            break;
            
        case 'auto_login_failed':
            showWarning(data.reason + '. Please login manually.');
            forgetDevice();
            resetConnection();
            break;
            
        case 'error':
            showError(data.message);
            resetConnection();
            break;
            
        case 'session_expired':
            toast(data.message || 'Session expired', 'warning');
            disconnect();
            break;
            
        case 'computer_disconnected':
            toast('Computer disconnected', 'error');
            disconnect();
            break;
            
        // Screen
        case 'screenshot':
            showScreen(data.data);
            refreshSessionTimer();
            break;
            
        // System
        case 'result':
            if (data.data?.data?.cpu !== undefined) {
                updateMonitor(data.data.data);
            }
            break;
            
        // Sessions
        case 'sessions_list':
            renderSessions(data.sessions);
            break;
            
        // Connected Users
        case 'connected_users':
            renderConnectedUsers(data.users);
            break;
            
        case 'users_changed':
            STATE.connectedUsers = data.users || [];
            updateUsersCount(data.totalCount);
            renderConnectedUsers(data.users);
            break;
            
        // File Transfer
        case 'file_upload_ready':
            handleFileUploadReady(data);
            break;
            
        case 'file_progress':
            handleFileProgress(data);
            break;
            
        case 'file_upload_success':
            handleFileUploadSuccess(data);
            break;
            
        case 'file_upload_error':
            toast('Upload failed: ' + data.error, 'error');
            STATE.activeTransfers.delete(data.transferId);
            renderTransfers();
            break;
            
        case 'file_download_data':
            handleFileDownloadData(data);
            break;
            
        case 'browse_result':
        case 'browse_result_relay':
            if (data.success) {
                renderBrowserItems(data);
            } else {
                toast('Cannot browse: ' + data.error, 'error');
            }
            break;
            
        case 'recent_files':
            STATE.recentFiles = data.files || [];
            renderRecentFiles();
            break;
            
        case 'file_save_result':
            if (data.success) {
                toast('Saved to PC: ' + data.path, 'success');
            }
            break;
            
        // File Manager
        case 'file_operation_result':
            handleFileOperationResult(data);
            break;
            
        // File Watcher
        case 'file_changed':
            handleFileChange(data);
            break;
            
        case 'watcher_result':
            handleWatcherResult(data);
            break;
            
        case 'watched_folders':
            STATE.watchedFolders = data.folders || [];
            renderWatchedFolders();
            break;
    }
}

/**
 * Handle successful connection
 */
function handleConnected(data) {
    STATE.connected = true;
    STATE.sessionId = data.sessionId;
    STATE.sessionExpiry = Date.now() + (data.expiresIn || CONFIG.SESSION_TIMEOUT);
    STATE.connectedUsers = [];
    STATE.watchedFolders = [];
    
    // Reset reconnection counter
    if (typeof resetReconnectCounter === 'function') {
        resetReconnectCounter();
    }
    
    // Save trusted device if deviceId returned
    if (data.deviceId) {
        saveTrustedDevice(data.deviceId, document.getElementById('password').value);
        toast('Device trusted! 🔐');
    }
    
    // Switch screens
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'flex';
    
    // Start services
    startSessionTimer();
    startMonitor();
    loadRecentFiles();
    getConnectedUsers();
    
    toast(data.autoLogin ? 'Auto-connected! 🔐' : 'Connected!');
}

/**
 * Start system monitor
 */
function startMonitor() {
    setInterval(() => {
        if (STATE.connected) {
            send({ type: 'get_system_info' });
        }
    }, CONFIG.MONITOR_INTERVAL);
}

/**
 * Update monitor display
 */
function updateMonitor(data) {
    ['cpu', 'ram', 'gpu'].forEach(k => {
        const val = data[k] || 0;
        document.getElementById(k + 'Val').textContent = val + '%';
        const bar = document.getElementById(k + 'Bar');
        bar.style.width = val + '%';
        bar.className = 'monitor-bar-fill' + (val > 80 ? ' danger' : val > 60 ? ' warn' : '');
    });
}

/**
 * Get connected users
 */
function getConnectedUsers() {
    if (STATE.ws && STATE.connected) {
        STATE.ws.send(JSON.stringify({ type: 'get_connected_users' }));
    }
}

/**
 * Update users count badge
 */
function updateUsersCount(count) {
    const badge = document.getElementById('usersCount');
    if (badge) {
        badge.textContent = count || 0;
        badge.style.display = count > 0 ? 'inline' : 'none';
    }
}

/**
 * Render connected users
 */
function renderConnectedUsers(users) {
    const container = document.getElementById('usersListBody');
    if (!container) return;
    
    if (!users?.length) {
        container.innerHTML = '<p style="color: var(--text2); text-align: center; padding: 20px;">No connected users</p>';
        return;
    }
    
    container.innerHTML = users.map(u => {
        const device = u.deviceInfo || {};
        const isCurrent = u.isCurrentUser;
        const trusted = device.trusted ? '🔐' : '📱';
        
        return `
            <div class="user-item ${isCurrent ? 'current' : ''}">
                <div class="user-icon">${trusted}</div>
                <div class="user-info">
                    <div class="user-name">${device.name || 'Unknown'} ${isCurrent ? '(You)' : ''}</div>
                    <div class="user-meta">${device.browser || ''}</div>
                </div>
                ${!isCurrent ? `<button class="user-kick" onclick="kickUser('${u.sessionId}')">✕</button>` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Kick user
 */
function kickUser(sessionId) {
    if (confirm('Disconnect this user?')) {
        STATE.ws.send(JSON.stringify({ type: 'kick_session', sessionId: sessionId }));
    }
}

/**
 * Show sessions modal
 */
function showSessionsModal() {
    document.getElementById('sessionsModal').classList.add('show');
    getConnectedUsers();
}

/**
 * Render sessions list (legacy)
 */
function renderSessions(sessions) {
    renderConnectedUsers(sessions);
}
