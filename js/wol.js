/**
 * YAS Remote Pro - Wake on LAN Module
 * Version: 3.3
 * Uses Tailscale for WoL across the internet
 */

const WOL_CONFIG = {
    // Computer's MAC Address (Ethernet)
    MAC_ADDRESS: "18-C0-4D-01-E9-AE",
    
    // Tailscale IP of the computer
    TAILSCALE_IP: "100.118.245.72",
    
    // Broadcast address for local network
    BROADCAST_IP: "192.168.1.255",
    
    // WoL Port
    WOL_PORT: 9
};

/**
 * Check if PC is online via Tailscale
 */
async function checkPCStatus() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`http://${WOL_CONFIG.TAILSCALE_IP}:5000/status`, {
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response.ok;
    } catch (e) {
        return false;
    }
}

/**
 * Send Wake on LAN packet via Relay Server
 */
async function wakePC() {
    const wakeBtn = document.getElementById('wakeBtn');
    const wakeStatus = document.getElementById('wakeStatus');
    
    if (wakeBtn) {
        wakeBtn.disabled = true;
        wakeBtn.innerHTML = '⏳ Sending...';
    }
    
    if (wakeStatus) {
        wakeStatus.textContent = 'Sending Wake signal...';
        wakeStatus.style.display = 'block';
    }
    
    try {
        // Send WoL request to Relay Server
        const response = await fetch(`${CONFIG.RELAY_SERVER.replace('wss://', 'https://')}/wol`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mac: WOL_CONFIG.MAC_ADDRESS,
                broadcastIp: WOL_CONFIG.BROADCAST_IP,
                port: WOL_CONFIG.WOL_PORT
            })
        });
        
        if (response.ok) {
            if (wakeStatus) {
                wakeStatus.textContent = '✅ Wake signal sent! PC should start in 10-30 seconds...';
                wakeStatus.className = 'wake-status success';
            }
            toast('Wake signal sent!', 'success');
            
            // Start checking if PC is online
            startPCStatusCheck();
        } else {
            throw new Error('Failed to send wake signal');
        }
    } catch (error) {
        console.error('WoL Error:', error);
        
        // Fallback: Try direct Tailscale WoL
        try {
            await sendDirectWoL();
        } catch (e) {
            if (wakeStatus) {
                wakeStatus.textContent = '❌ Failed to send wake signal. Make sure Tailscale is connected.';
                wakeStatus.className = 'wake-status error';
            }
            toast('Wake failed', 'error');
        }
    } finally {
        if (wakeBtn) {
            wakeBtn.disabled = false;
            wakeBtn.innerHTML = '🔌 Wake PC';
        }
    }
}

/**
 * Send direct WoL via Tailscale subnet
 */
async function sendDirectWoL() {
    // This will be handled by Python server when it's online
    // For now, we rely on the Relay Server
    console.log('Direct WoL not available from browser');
}

/**
 * Start checking PC status periodically
 */
let statusCheckInterval = null;
let statusCheckCount = 0;

function startPCStatusCheck() {
    statusCheckCount = 0;
    
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
    
    const wakeStatus = document.getElementById('wakeStatus');
    
    statusCheckInterval = setInterval(async () => {
        statusCheckCount++;
        
        if (wakeStatus) {
            wakeStatus.textContent = `⏳ Waiting for PC... (${statusCheckCount * 5}s)`;
        }
        
        const isOnline = await checkPCStatus();
        
        if (isOnline) {
            clearInterval(statusCheckInterval);
            if (wakeStatus) {
                wakeStatus.textContent = '✅ PC is online! You can connect now.';
                wakeStatus.className = 'wake-status success';
            }
            toast('PC is online!', 'success');
            
            // Auto-show connect form
            document.getElementById('password').focus();
        }
        
        // Stop checking after 2 minutes
        if (statusCheckCount >= 24) {
            clearInterval(statusCheckInterval);
            if (wakeStatus) {
                wakeStatus.textContent = '⚠️ PC did not respond. Try again or check if PC supports WoL.';
                wakeStatus.className = 'wake-status warning';
            }
        }
    }, 5000);
}

/**
 * Update Wake button visibility based on connection status
 */
function updateWakeButton(isConnected) {
    const wakeSection = document.getElementById('wakeSection');
    if (wakeSection) {
        wakeSection.style.display = isConnected ? 'none' : 'block';
    }
}
