/**
 * YAS Remote Pro - Connection & Message Handler
 * Version: 3.1
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
    }
}

/**
 * Handle successful connection
 */
function handleConnected(data) {
    STATE.connected = true;
    STATE.sessionId = data.sessionId;
    STATE.sessionExpiry = Date.now() + (data.expiresIn || CONFIG.SESSION_TIMEOUT);
    
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
 * Show sessions modal
 */
function showSessionsModal() {
    document.getElementById('sessionsModal').classList.add('show');
    send({ type: 'get_sessions' });
}

/**
 * Render sessions list
 */
function renderSessions(sessions) {
    const body = document.getElementById('sessionsBody');
    
    if (!sessions?.length) {
        body.innerHTML = '<p style="color: var(--text2); text-align: center;">No active sessions</p>';
        return;
    }
    
    body.innerHTML = sessions.map(s => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg); border-radius: 10px; margin-bottom: 10px;">
            <div style="width: 40px; height: 40px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                ${s.deviceInfo?.trusted ? '🔐' : '📱'}
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 500;">${s.deviceInfo?.name || 'Unknown'}</div>
                <div style="font-size: 12px; color: var(--text2);">${s.deviceInfo?.browser || ''}</div>
            </div>
        </div>
    `).join('');
}
