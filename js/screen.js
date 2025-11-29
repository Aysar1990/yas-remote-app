/**
 * YAS Remote Pro - Screen & Touch Handler
 * Version: 3.1
 */

// Touch state
let touchStartTime = 0;
let longPressTimer = null;
let isTouchMoved = false;

/**
 * Initialize screen touch handlers
 */
function initScreenHandlers() {
    const screenImg = document.getElementById('screenImg');
    
    screenImg.addEventListener('touchstart', handleTouchStart);
    screenImg.addEventListener('touchmove', handleTouchMove);
    screenImg.addEventListener('touchend', handleTouchEnd);
}

/**
 * Handle touch start
 */
function handleTouchStart(e) {
    if (e.touches.length === 1) {
        isTouchMoved = false;
        touchStartTime = Date.now();
        
        const touch = e.touches[0];
        const rect = e.target.getBoundingClientRect();
        STATE.mx = ((touch.clientX - rect.left) / rect.width) * 100;
        STATE.my = ((touch.clientY - rect.top) / rect.height) * 100;
        
        // Long press for right click
        longPressTimer = setTimeout(() => {
            if (!isTouchMoved) {
                showClickDot(touch.clientX, touch.clientY);
                click1('right', 1);
                toast('Right Click');
            }
        }, 500);
    }
}

/**
 * Handle touch move
 */
function handleTouchMove(e) {
    if (e.touches.length === 1) {
        isTouchMoved = true;
        
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        
        const touch = e.touches[0];
        const rect = e.target.getBoundingClientRect();
        STATE.mx = ((touch.clientX - rect.left) / rect.width) * 100;
        STATE.my = ((touch.clientY - rect.top) / rect.height) * 100;
        
        send({ type: 'move', x: STATE.mx, y: STATE.my });
    }
}

/**
 * Handle touch end
 */
function handleTouchEnd(e) {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    
    if (e.touches.length === 0 && !isTouchMoved && Date.now() - touchStartTime < 500) {
        const touch = e.changedTouches[0];
        showClickDot(touch.clientX, touch.clientY);
        click1('left', 1);
    }
}

/**
 * Show click indicator dot
 */
function showClickDot(x, y) {
    const dot = document.createElement('div');
    dot.className = 'click-dot';
    dot.style.left = x + 'px';
    dot.style.top = y + 'px';
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 500);
}

/**
 * Show screen image
 */
function showScreen(data) {
    document.getElementById('screenMsg').style.display = 'none';
    const img = document.getElementById('screenImg');
    img.style.display = 'block';
    img.src = 'data:image/' + (data.format || 'jpeg') + ';base64,' + data.data;
}

/**
 * Mouse click
 */
function click1(btn, n) {
    send({ type: 'click', x: STATE.mx, y: STATE.my, button: btn, clicks: n });
}

/**
 * Mouse scroll
 */
function scroll1(dir) {
    send({ type: 'scroll', direction: dir, amount: 3 });
}

/**
 * Zoom in
 */
function zoomIn() {
    STATE.zoom = Math.min(4, STATE.zoom + 0.25);
    document.getElementById('screenImg').style.transform = 'scale(' + STATE.zoom + ')';
}

/**
 * Zoom out
 */
function zoomOut() {
    STATE.zoom = Math.max(0.5, STATE.zoom - 0.25);
    document.getElementById('screenImg').style.transform = 'scale(' + STATE.zoom + ')';
}

/**
 * Toggle drag mode
 */
function toggleDrag() {
    STATE.dragMode = !STATE.dragMode;
    toast(STATE.dragMode ? 'Drag ON' : 'Drag OFF');
}

/**
 * Set quality
 */
function setQuality(q) {
    send({ type: 'set_quality', quality: q });
    document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}
