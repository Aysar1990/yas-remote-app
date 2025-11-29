/**
 * YAS Remote Pro - Authentication Module
 * Version: 3.1
 */

/**
 * Check for trusted device on load
 */
function checkTrustedDevice() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.deviceId && data.password) {
                document.getElementById('trustedBanner').style.display = 'block';
                document.getElementById('trustCheckbox').style.display = 'none';
                document.getElementById('password').value = data.password;
            }
        } catch (e) {
            console.error('Error checking trusted device:', e);
        }
    }
}

/**
 * Save trusted device
 */
function saveTrustedDevice(deviceId, password) {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
        deviceId: deviceId,
        password: password,
        savedAt: Date.now()
    }));
}

/**
 * Forget trusted device
 */
function forgetDevice() {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    document.getElementById('trustedBanner').style.display = 'none';
    document.getElementById('trustCheckbox').style.display = 'flex';
    document.getElementById('password').value = '';
    toast('Device forgotten');
}

/**
 * Auto login with trusted device
 */
function autoLogin() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!saved) return;
    
    try {
        const data = JSON.parse(saved);
        const btn = document.getElementById('connectBtn');
        btn.disabled = true;
        btn.textContent = 'Auto-connecting...';
        showStatus('Connecting...');
        
        STATE.ws = new WebSocket(CONFIG.RELAY_SERVER);
        
        STATE.ws.onopen = () => {
            STATE.ws.send(JSON.stringify({
                type: 'auto_login',
                deviceId: data.deviceId,
                password: data.password
            }));
        };
        
        STATE.ws.onmessage = (e) => handleMessage(JSON.parse(e.data));
        STATE.ws.onerror = () => { showError('Connection failed'); resetConnection(); };
        STATE.ws.onclose = () => { if (STATE.connected) toast('Disconnected'); resetConnection(); };
    } catch (e) {
        showError('Auto-login failed');
        forgetDevice();
    }
}

/**
 * Manual connect
 */
function connect() {
    const pwd = document.getElementById('password').value.trim();
    const trustDevice = document.getElementById('trustDevice').checked;
    const btn = document.getElementById('connectBtn');
    
    if (!pwd) {
        showError('Enter password');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Connecting...';
    showStatus('Connecting...');
    
    STATE.ws = new WebSocket(CONFIG.RELAY_SERVER);
    
    STATE.ws.onopen = () => {
        STATE.ws.send(JSON.stringify({
            type: 'connect_to_computer',
            password: pwd,
            trustDevice: trustDevice,
            deviceInfo: {
                name: getDeviceName(),
                browser: getBrowserName()
            }
        }));
    };
    
    STATE.ws.onmessage = (e) => handleMessage(JSON.parse(e.data));
    STATE.ws.onerror = () => { showError('Connection failed'); resetConnection(); };
    STATE.ws.onclose = () => { if (STATE.connected) toast('Disconnected'); resetConnection(); };
}

/**
 * Reset connection state
 */
function resetConnection() {
    document.getElementById('connectBtn').disabled = false;
    document.getElementById('connectBtn').textContent = 'Connect';
    STATE.connected = false;
    STATE.sessionId = null;
    if (STATE.sessionTimerInterval) {
        clearInterval(STATE.sessionTimerInterval);
        STATE.sessionTimerInterval = null;
    }
}

/**
 * Disconnect
 */
function disconnect() {
    if (STATE.ws) {
        STATE.ws.send(JSON.stringify({ type: 'logout' }));
        STATE.ws.close();
    }
    document.getElementById('appScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    resetConnection();
}

/**
 * Start session timer
 */
function startSessionTimer() {
    updateSessionTimer();
    STATE.sessionTimerInterval = setInterval(updateSessionTimer, 1000);
}

/**
 * Update session timer display
 */
function updateSessionTimer() {
    const remaining = STATE.sessionExpiry - Date.now();
    const timer = document.getElementById('sessionTimer');
    
    if (remaining <= 0) {
        toast('Session expired', 'warning');
        disconnect();
        return;
    }
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    timer.className = 'session-timer';
    if (remaining < 5 * 60 * 1000) {
        timer.classList.add('danger');
    } else if (remaining < 10 * 60 * 1000) {
        timer.classList.add('warning');
    }
}

/**
 * Refresh session timer
 */
function refreshSessionTimer() {
    STATE.sessionExpiry = Date.now() + CONFIG.SESSION_TIMEOUT;
}
