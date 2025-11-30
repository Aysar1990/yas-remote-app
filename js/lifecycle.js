/**
 * YAS Remote Pro - App Lifecycle Management
 * Version: 3.3.1
 * Handles app state changes and connection recovery
 */

let lastActiveTime = Date.now();
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

/**
 * Initialize lifecycle handlers
 */
function initLifecycle() {
    // Check if Capacitor is available (Android app)
    if (window.Capacitor) {
        // Capacitor App Plugin
        const { App } = window.Capacitor.Plugins;
        
        // App state change listener
        App.addListener('appStateChange', handleAppStateChange);
        
        console.log('✅ Capacitor lifecycle handlers initialized');
    } else {
        // Fallback for web browser (visibility API)
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleWindowFocus);
        window.addEventListener('blur', handleWindowBlur);
        
        console.log('✅ Web lifecycle handlers initialized');
    }
    
    // Periodic connection check
    setInterval(checkConnectionHealth, 5000);
}

/**
 * Handle Capacitor app state change
 */
function handleAppStateChange(state) {
    console.log('App state changed:', state.isActive ? 'Active' : 'Background');
    
    if (state.isActive) {
        // App came to foreground
        handleAppResume();
    } else {
        // App went to background
        handleAppPause();
    }
}

/**
 * Handle visibility change (web)
 */
function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
        handleAppResume();
    } else {
        handleAppPause();
    }
}

/**
 * Handle window focus (web)
 */
function handleWindowFocus() {
    handleAppResume();
}

/**
 * Handle window blur (web)
 */
function handleWindowBlur() {
    handleAppPause();
}

/**
 * App resumed (came to foreground)
 */
function handleAppResume() {
    console.log('📱 App resumed');
    lastActiveTime = Date.now();
    
    // If we were connected, verify connection is still alive
    if (STATE.connected) {
        setTimeout(() => {
            verifyConnection();
        }, 500);
    }
}

/**
 * App paused (went to background)
 */
function handleAppPause() {
    console.log('📱 App paused');
    // Don't disconnect, just log the time
    lastActiveTime = Date.now();
}

/**
 * Verify connection is alive
 */
function verifyConnection() {
    if (!STATE.ws || STATE.ws.readyState !== WebSocket.OPEN) {
        console.warn('⚠️ WebSocket not open, attempting reconnect...');
        attemptReconnect();
        return;
    }
    
    // Send ping to verify connection
    try {
        STATE.ws.send(JSON.stringify({ type: 'ping' }));
        console.log('🔄 Sent ping to verify connection');
        
        // Set timeout to detect if connection is dead
        const pingTimeout = setTimeout(() => {
            console.warn('⚠️ Ping timeout, connection may be dead');
            attemptReconnect();
        }, 3000);
        
        // Clear timeout when we receive any message
        const originalOnMessage = STATE.ws.onmessage;
        STATE.ws.onmessage = (e) => {
            clearTimeout(pingTimeout);
            if (originalOnMessage) {
                originalOnMessage(e);
            }
        };
    } catch (e) {
        console.error('❌ Error sending ping:', e);
        attemptReconnect();
    }
}

/**
 * Attempt to reconnect
 */
function attemptReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('❌ Max reconnection attempts reached');
        showReconnectDialog();
        return;
    }
    
    reconnectAttempts++;
    console.log(`🔄 Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
    
    // Close existing connection
    if (STATE.ws) {
        STATE.ws.close();
    }
    
    // Try auto-login first
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            reconnectWithCredentials(data.deviceId, data.password, true);
        } catch (e) {
            console.error('Error parsing saved credentials:', e);
            showReconnectDialog();
        }
    } else {
        showReconnectDialog();
    }
}

/**
 * Reconnect with credentials
 */
function reconnectWithCredentials(deviceId, password, isAutoLogin) {
    toast('🔄 Reconnecting...', 'info');
    
    STATE.ws = new WebSocket(CONFIG.RELAY_SERVER);
    
    STATE.ws.onopen = () => {
        console.log('✅ WebSocket reconnected');
        
        if (isAutoLogin) {
            STATE.ws.send(JSON.stringify({
                type: 'auto_login',
                deviceId: deviceId,
                password: password
            }));
        } else {
            STATE.ws.send(JSON.stringify({
                type: 'connect_to_computer',
                password: password,
                deviceInfo: {
                    name: getDeviceName(),
                    browser: getBrowserName()
                }
            }));
        }
    };
    
    STATE.ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        
        if (data.type === 'connected') {
            reconnectAttempts = 0; // Reset counter on success
            toast('✅ Reconnected!', 'success');
        }
        
        handleMessage(data);
    };
    
    STATE.ws.onerror = (e) => {
        console.error('WebSocket error during reconnect:', e);
        setTimeout(() => attemptReconnect(), 2000);
    };
    
    STATE.ws.onclose = () => {
        if (STATE.connected) {
            toast('Connection lost', 'warning');
            setTimeout(() => attemptReconnect(), 2000);
        }
    };
}

/**
 * Show reconnect dialog
 */
function showReconnectDialog() {
    const reconnect = confirm('Connection lost. Reconnect now?');
    if (reconnect) {
        reconnectAttempts = 0;
        disconnect();
        // Return to login screen where user can reconnect
    }
}

/**
 * Check connection health periodically
 */
function checkConnectionHealth() {
    if (!STATE.connected) return;
    
    // If WebSocket is not open, try to reconnect
    if (!STATE.ws || STATE.ws.readyState !== WebSocket.OPEN) {
        console.warn('⚠️ Connection health check failed');
        attemptReconnect();
    }
}

/**
 * Reset reconnect counter (call after successful manual connection)
 */
function resetReconnectCounter() {
    reconnectAttempts = 0;
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLifecycle);
} else {
    initLifecycle();
}
