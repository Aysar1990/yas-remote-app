/**
 * YAS Remote Pro - UI & Commands Module
 * Version: 3.1
 */

/**
 * Switch tab
 */
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById('tab-' + tabName).classList.add('active');
}

/**
 * Send keyboard text
 */
function sendText() {
    const input = document.getElementById('kbInput');
    const text = input.value;
    if (text) {
        send({ type: 'type', text: text });
        input.value = '';
        toast('Sent');
    }
}

/**
 * Send special key
 */
function sendKey(key) {
    send({ type: 'key', key: key });
}

/**
 * Send key combo
 */
function sendCombo(keys) {
    send({ type: 'hotkey', keys: keys.split('+') });
}

/**
 * Send PIN digit
 */
function sendPin(digit) {
    send({ type: 'key', key: digit.toString() });
}

/**
 * Send PIN Enter
 */
function sendPinEnter() {
    send({ type: 'key', key: 'enter' });
    toast('PIN Sent');
}

/**
 * Open application
 */
function openApp(app) {
    send({ type: 'open_app', app: app });
    toast('Opening ' + app);
}

/**
 * System command
 */
function sysCmd(cmd) {
    send({ type: 'system', action: cmd });
    toast(cmd.charAt(0).toUpperCase() + cmd.slice(1));
}

/**
 * Volume control
 */
function volume(action) {
    send({ type: 'volume', action: action });
}

/**
 * Media control
 */
function media(action) {
    send({ type: 'media', action: action });
}

/**
 * Show toast message
 */
function toast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => t.classList.remove('show'), 2500);
}

/**
 * Show error message
 */
function showError(msg) {
    const el = document.getElementById('errorMsg');
    el.textContent = msg;
    el.style.display = 'block';
    document.getElementById('statusMsg').style.display = 'none';
    document.getElementById('warningMsg').style.display = 'none';
}

/**
 * Show status message
 */
function showStatus(msg) {
    const el = document.getElementById('statusMsg');
    el.textContent = msg;
    el.style.display = 'block';
    document.getElementById('errorMsg').style.display = 'none';
    document.getElementById('warningMsg').style.display = 'none';
}

/**
 * Show warning message
 */
function showWarning(msg) {
    const el = document.getElementById('warningMsg');
    el.textContent = msg;
    el.style.display = 'block';
    document.getElementById('errorMsg').style.display = 'none';
    document.getElementById('statusMsg').style.display = 'none';
}

/**
 * Close modal
 */
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

/**
 * Initialize app
 */
function initApp() {
    checkTrustedDevice();
    initScreenHandlers();
    initDropZone();
    
    // Enter key for password
    document.getElementById('password').addEventListener('keypress', e => {
        if (e.key === 'Enter') connect();
    });
    
    // Enter key for keyboard input
    document.getElementById('kbInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') sendText();
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initApp);
