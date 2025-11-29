/**
 * YAS Remote Pro - Configuration
 * Version: 3.1
 */

const CONFIG = {
    // Server
    RELAY_SERVER: "wss://yas-remote-relay.onrender.com",
    VERSION: "3.1",
    
    // Storage
    STORAGE_KEY: "yas_remote_trusted",
    
    // Session
    SESSION_TIMEOUT: 30 * 60 * 1000,  // 30 minutes
    
    // File Transfer
    CHUNK_SIZE: 64 * 1024,  // 64 KB
    MAX_FILE_SIZE: 100 * 1024 * 1024,  // 100 MB
    
    // Monitor
    MONITOR_INTERVAL: 3000  // 3 seconds
};

// Global State
const STATE = {
    ws: null,
    connected: false,
    sessionId: null,
    sessionExpiry: null,
    sessionTimerInterval: null,
    
    // Mouse
    mx: 50,
    my: 50,
    zoom: 1,
    dragMode: false,
    
    // Files
    activeTransfers: new Map(),
    recentFiles: [],
    currentBrowsePath: ""
};

// File Icons
const FILE_ICONS = {
    'pdf': '📕', 'doc': '📘', 'docx': '📘', 'xls': '📗', 'xlsx': '📗',
    'ppt': '📙', 'pptx': '📙', 'txt': '📄', 'jpg': '🖼️', 'jpeg': '🖼️',
    'png': '🖼️', 'gif': '🖼️', 'mp4': '🎬', 'mp3': '🎵', 'zip': '📦',
    'rar': '📦', 'exe': '⚙️', 'apk': '📱', 'default': '📄'
};

/**
 * Get file icon by extension
 */
function getFileIcon(ext) {
    return FILE_ICONS[ext?.toLowerCase()] || FILE_ICONS.default;
}

/**
 * Format file size
 */
function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get device name
 */
function getDeviceName() {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Android/.test(ua)) return 'Android';
    return 'Mobile';
}

/**
 * Get browser name
 */
function getBrowserName() {
    const ua = navigator.userAgent;
    if (/Chrome/.test(ua)) return 'Chrome';
    if (/Safari/.test(ua)) return 'Safari';
    if (/Firefox/.test(ua)) return 'Firefox';
    return 'Browser';
}
