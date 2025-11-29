# YAS Remote Control - PC Server (Relay Mode) v3.2
# Features: Screen sharing, Control, File Transfer, File Manager, File Watcher

import asyncio
import websockets
import json
import base64
import pyautogui
import pyperclip
from io import BytesIO
from PIL import Image
import threading
import time
import platform
import psutil
import os
import shutil
from pathlib import Path
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# ============================================
# Configuration
# ============================================
RELAY_SERVER = "wss://yas-remote-relay.onrender.com"
PASSWORD = "YasRemote2025"
COMPUTER_NAME = platform.node()
VERSION = "3.2"

# File Transfer Settings
DOWNLOADS_FOLDER = os.path.expanduser("~/Downloads/YAS Remote")
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB

# Screenshot settings
QUALITY_LEVELS = {
    "low": {"quality": 30, "max_dim": 600},
    "medium": {"quality": 50, "max_dim": 800},
    "high": {"quality": 70, "max_dim": 1200},
    "hd": {"quality": 85, "max_dim": 1920}
}
current_quality = "medium"
screenshot_interval = 0.2

# State
ws = None
connected_clients = []
current_screenshot = None
screenshot_lock = threading.Lock()
file_watchers = {}  # watcherId -> Observer

# Quick Access Folders
QUICK_ACCESS = {
    "desktop": os.path.expanduser("~/Desktop"),
    "documents": os.path.expanduser("~/Documents"),
    "downloads": os.path.expanduser("~/Downloads"),
    "pictures": os.path.expanduser("~/Pictures"),
    "yas_remote": DOWNLOADS_FOLDER
}

# Ensure folders exist
os.makedirs(DOWNLOADS_FOLDER, exist_ok=True)

# ============================================
# Screenshot Functions
# ============================================
def capture_screenshot(quality_level=None):
    global current_quality
    if quality_level:
        current_quality = quality_level
    
    settings = QUALITY_LEVELS.get(current_quality, QUALITY_LEVELS["medium"])
    
    try:
        screenshot = pyautogui.screenshot()
        width, height = screenshot.size
        max_dim = settings["max_dim"]
        
        if width > max_dim or height > max_dim:
            ratio = min(max_dim / width, max_dim / height)
            new_size = (int(width * ratio), int(height * ratio))
            screenshot = screenshot.resize(new_size, Image.LANCZOS)
        
        buffer = BytesIO()
        try:
            screenshot.save(buffer, format="WEBP", quality=settings["quality"])
            format_type = "webp"
        except:
            screenshot.save(buffer, format="JPEG", quality=settings["quality"])
            format_type = "jpeg"
        
        return {
            "width": screenshot.size[0],
            "height": screenshot.size[1],
            "format": format_type,
            "data": base64.b64encode(buffer.getvalue()).decode("utf-8")
        }
    except Exception as e:
        print(f"Screenshot error: {e}")
        return None

def screenshot_loop():
    global current_screenshot
    while True:
        if connected_clients:
            screenshot = capture_screenshot()
            if screenshot:
                with screenshot_lock:
                    current_screenshot = screenshot
        time.sleep(screenshot_interval)

# ============================================
# System Info
# ============================================
def get_system_info():
    try:
        cpu = psutil.cpu_percent(interval=0.1)
        ram = psutil.virtual_memory().percent
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            gpu = gpus[0].load * 100 if gpus else 0
        except:
            gpu = 0
        
        return {"cpu": round(cpu), "ram": round(ram), "gpu": round(gpu)}
    except Exception as e:
        return {"cpu": 0, "ram": 0, "gpu": 0}


# ============================================
# File Watcher Class
# ============================================
import queue
file_events_queue = queue.Queue()

class YASFileHandler(FileSystemEventHandler):
    def __init__(self, watcher_id):
        self.watcher_id = watcher_id
    
    def on_created(self, event):
        self._queue_event("created", event.src_path, event.is_directory)
    
    def on_modified(self, event):
        if not event.is_directory:
            self._queue_event("modified", event.src_path, event.is_directory)
    
    def on_deleted(self, event):
        self._queue_event("deleted", event.src_path, event.is_directory)
    
    def on_moved(self, event):
        self._queue_event("renamed", event.dest_path, event.is_directory, event.src_path)
    
    def _queue_event(self, event_type, path, is_dir, old_path=None):
        file_events_queue.put({
            "type": "file_change_event",
            "event": event_type,
            "path": path,
            "oldPath": old_path,
            "isDirectory": is_dir,
            "watcherId": self.watcher_id
        })

def start_file_watcher(watcher_id, path):
    global file_watchers
    
    if not os.path.exists(path):
        return {"success": False, "error": "Path does not exist"}
    
    if watcher_id in file_watchers:
        stop_file_watcher(watcher_id)
    
    try:
        event_handler = YASFileHandler(watcher_id)
        observer = Observer()
        observer.schedule(event_handler, path, recursive=True)
        observer.start()
        file_watchers[watcher_id] = {"observer": observer, "path": path}
        print(f"👁️ Watching: {path}")
        return {"success": True, "watcherId": watcher_id, "path": path}
    except Exception as e:
        return {"success": False, "error": str(e)}

def stop_file_watcher(watcher_id):
    global file_watchers
    
    if watcher_id in file_watchers:
        try:
            file_watchers[watcher_id]["observer"].stop()
            file_watchers[watcher_id]["observer"].join(timeout=2)
            del file_watchers[watcher_id]
            print(f"🔕 Stopped watching: {watcher_id}")
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    return {"success": False, "error": "Watcher not found"}

def get_watched_folders():
    return [{"watcherId": wid, "path": data["path"]} for wid, data in file_watchers.items()]

# ============================================
# File Manager Operations
# ============================================
def file_operation(operation, source_path, dest_path=None, new_name=None):
    try:
        if operation == "copy":
            if os.path.isdir(source_path):
                shutil.copytree(source_path, dest_path)
            else:
                shutil.copy2(source_path, dest_path)
            return {"success": True, "operation": operation, "path": dest_path}
        
        elif operation == "move":
            shutil.move(source_path, dest_path)
            return {"success": True, "operation": operation, "path": dest_path}
        
        elif operation == "delete":
            if os.path.isdir(source_path):
                shutil.rmtree(source_path)
            else:
                os.remove(source_path)
            return {"success": True, "operation": operation, "path": source_path}
        
        elif operation == "rename":
            parent = os.path.dirname(source_path)
            new_path = os.path.join(parent, new_name)
            os.rename(source_path, new_path)
            return {"success": True, "operation": operation, "path": new_path}
        
        elif operation == "create_folder":
            os.makedirs(source_path, exist_ok=True)
            return {"success": True, "operation": operation, "path": source_path}
        
        else:
            return {"success": False, "error": f"Unknown operation: {operation}"}
    
    except Exception as e:
        return {"success": False, "operation": operation, "error": str(e)}

# ============================================
# File Transfer Functions
# ============================================
def get_mime_type(filename):
    ext = Path(filename).suffix.lower()
    mime_types = {
        '.pdf': 'application/pdf', '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.gif': 'image/gif', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
        '.zip': 'application/zip', '.rar': 'application/x-rar-compressed',
        '.txt': 'text/plain'
    }
    return mime_types.get(ext, 'application/octet-stream')

def save_received_file(filename, file_data):
    try:
        file_path = os.path.join(DOWNLOADS_FOLDER, filename)
        
        if os.path.exists(file_path):
            name, ext = os.path.splitext(filename)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{name}_{timestamp}{ext}"
            file_path = os.path.join(DOWNLOADS_FOLDER, filename)
        
        file_bytes = base64.b64decode(file_data)
        
        with open(file_path, 'wb') as f:
            f.write(file_bytes)
        
        print(f"📥 Saved: {file_path}")
        return {"success": True, "path": file_path, "filename": filename}
    except Exception as e:
        print(f"❌ Save error: {e}")
        return {"success": False, "error": str(e)}

def read_file_for_download(file_path):
    try:
        if not os.path.exists(file_path):
            return {"success": False, "error": "File not found"}
        
        if os.path.getsize(file_path) > MAX_FILE_SIZE:
            return {"success": False, "error": "File too large (max 100 MB)"}
        
        with open(file_path, 'rb') as f:
            file_data = base64.b64encode(f.read()).decode('utf-8')
        
        return {
            "success": True,
            "fileName": os.path.basename(file_path),
            "fileData": file_data,
            "fileSize": os.path.getsize(file_path)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def browse_directory(path=""):
    try:
        if not path:
            # Return quick access folders
            items = []
            for name, folder_path in QUICK_ACCESS.items():
                if os.path.exists(folder_path):
                    items.append({
                        "name": name.replace("_", " ").title(),
                        "path": folder_path,
                        "type": "folder",
                        "icon": "quick"
                    })
            return {"success": True, "path": "", "items": items}
        
        if not os.path.exists(path):
            return {"success": False, "error": "Path does not exist"}
        
        items = []
        entries = list(os.scandir(path))[:50]  # Limit to 50 items
        
        # Sort: folders first, then files
        folders = []
        files = []
        
        for entry in entries:
            try:
                if entry.name.startswith('.'):
                    continue
                
                item = {
                    "name": entry.name,
                    "path": entry.path,
                    "type": "folder" if entry.is_dir() else "file"
                }
                
                if entry.is_file():
                    item["size"] = entry.stat().st_size
                    files.append(item)
                else:
                    folders.append(item)
            except:
                continue
        
        folders.sort(key=lambda x: x["name"].lower())
        files.sort(key=lambda x: x["name"].lower())
        
        return {"success": True, "path": path, "items": folders + files}
    except Exception as e:
        return {"success": False, "error": str(e)}

# ============================================
# Control Functions
# ============================================
def handle_command(cmd):
    try:
        cmd_type = cmd.get("type")
        
        if cmd_type == "click":
            x = cmd.get("x", 50)
            y = cmd.get("y", 50)
            screen = pyautogui.size()
            abs_x = int((x / 100) * screen.width)
            abs_y = int((y / 100) * screen.height)
            pyautogui.click(abs_x, abs_y, clicks=cmd.get("clicks", 1), button=cmd.get("button", "left"))
        
        elif cmd_type == "move":
            x = cmd.get("x", 50)
            y = cmd.get("y", 50)
            screen = pyautogui.size()
            abs_x = int((x / 100) * screen.width)
            abs_y = int((y / 100) * screen.height)
            pyautogui.moveTo(abs_x, abs_y)
        
        elif cmd_type == "scroll":
            direction = cmd.get("direction", "down")
            amount = cmd.get("amount", 3)
            pyautogui.scroll(amount if direction == "up" else -amount)
        
        elif cmd_type == "type":
            text = cmd.get("text", "")
            # استخدام Clipboard لدعم العربي والأحرف الخاصة
            pyperclip.copy(text)
            pyautogui.hotkey('ctrl', 'a')  # تحديد الكل
            time.sleep(0.05)
            pyautogui.hotkey('ctrl', 'v')  # لصق
            time.sleep(0.1)
        
        elif cmd_type == "key":
            pyautogui.press(cmd.get("key", ""))
        
        elif cmd_type == "hotkey":
            keys = cmd.get("keys", [])
            if keys:
                pyautogui.hotkey(*keys)
        
        elif cmd_type == "set_quality":
            global current_quality
            current_quality = cmd.get("quality", "medium")
        
        elif cmd_type == "get_system_info":
            return {"type": "result", "data": {"data": get_system_info()}}
        
        elif cmd_type == "volume":
            action = cmd.get("action")
            if action == "up":
                pyautogui.press("volumeup")
            elif action == "down":
                pyautogui.press("volumedown")
            elif action == "mute":
                pyautogui.press("volumemute")
        
        elif cmd_type == "media":
            action = cmd.get("action")
            if action == "playpause":
                pyautogui.press("playpause")
            elif action == "next":
                pyautogui.press("nexttrack")
            elif action == "prev":
                pyautogui.press("prevtrack")
        
        elif cmd_type == "system":
            action = cmd.get("action")
            if action == "lock":
                if platform.system() == "Windows":
                    os.system("rundll32.exe user32.dll,LockWorkStation")
            elif action == "sleep":
                if platform.system() == "Windows":
                    os.system("rundll32.exe powrprof.dll,SetSuspendState 0,1,0")
        
        elif cmd_type == "open_app":
            app = cmd.get("app", "")
            app_commands = {
                "chrome": "start chrome",
                "explorer": "explorer",
                "notepad": "notepad",
                "calc": "calc",
                "cmd": "start cmd",
                "taskmgr": "taskmgr"
            }
            if app in app_commands:
                os.system(app_commands[app])
        
        return None
    except Exception as e:
        print(f"Command error: {e}")
        return None


# ============================================
# WebSocket Handler
# ============================================
async def handle_file_command(websocket, data):
    command = data.get("command")
    requester_id = data.get("requesterId")
    
    if command == "file_receive":
        result = save_received_file(data.get("fileName"), data.get("fileData"))
        await websocket.send(json.dumps({
            "type": "file_save_result",
            "success": result["success"],
            "path": result.get("path", ""),
            "error": result.get("error", "")
        }))
    
    elif command == "file_download_request":
        result = read_file_for_download(data.get("filePath"))
        await websocket.send(json.dumps({
            "type": "file_download_response",
            "requesterId": requester_id,
            "fileName": result.get("fileName", ""),
            "fileData": result.get("fileData", ""),
            "error": result.get("error", "")
        }))
    
    elif command == "browse_files":
        result = browse_directory(data.get("path", ""))
        # Send directly to requester via relay
        await websocket.send(json.dumps({
            "type": "browse_result_relay",
            "requesterId": requester_id,
            "success": result.get("success", False),
            "path": result.get("path", ""),
            "items": result.get("items", []),
            "error": result.get("error", "")
        }))
    
    elif command == "file_operation":
        result = file_operation(
            data.get("operation"),
            data.get("sourcePath"),
            data.get("destPath"),
            data.get("newName")
        )
        await websocket.send(json.dumps({
            "type": "file_operation_result",
            "requesterId": requester_id,
            **result
        }))
    
    elif command == "start_watcher":
        result = start_file_watcher(
            data.get("watcherId"),
            data.get("path")
        )
        await websocket.send(json.dumps({
            "type": "watcher_result",
            "requesterId": requester_id,
            **result
        }))
    
    elif command == "stop_watcher":
        result = stop_file_watcher(data.get("watcherId"))
        await websocket.send(json.dumps({
            "type": "watcher_result",
            **result
        }))
    
    elif command == "get_watched_folders":
        folders = get_watched_folders()
        await websocket.send(json.dumps({
            "type": "watched_folders",
            "requesterId": requester_id,
            "folders": folders
        }))

async def connect_to_relay():
    global ws, connected_clients
    
    while True:
        try:
            print(f"🔌 Connecting to relay server...")
            async with websockets.connect(RELAY_SERVER, ping_interval=20, ping_timeout=60) as websocket:
                ws = websocket
                
                # Register computer
                await websocket.send(json.dumps({
                    "type": "register_computer",
                    "password": PASSWORD,
                    "info": {
                        "name": COMPUTER_NAME,
                        "os": platform.system(),
                        "version": VERSION
                    }
                }))
                
                print(f"""
╔══════════════════════════════════════════╗
║     YAS Remote Pro - PC Server           ║
║     Version: {VERSION}                          ║
╠══════════════════════════════════════════╣
║  ✅ Connected to relay server            ║
║  🔑 Password: {PASSWORD}              ║
║  💻 Computer: {COMPUTER_NAME[:20]:<20} ║
║  📁 Downloads: ~/Downloads/YAS Remote    ║
║  ⏳ Waiting for mobile connection...     ║
╚══════════════════════════════════════════╝
                """)
                
                # Screenshot thread
                screenshot_thread = threading.Thread(target=screenshot_loop, daemon=True)
                screenshot_thread.start()
                
                # Send screenshots task
                async def send_screenshots():
                    while True:
                        if connected_clients and current_screenshot:
                            with screenshot_lock:
                                await websocket.send(json.dumps({
                                    "type": "screenshot",
                                    "data": current_screenshot
                                }))
                        await asyncio.sleep(screenshot_interval)
                
                screenshot_task = asyncio.create_task(send_screenshots())
                
                # Process file events task
                async def process_file_events():
                    while True:
                        try:
                            while not file_events_queue.empty():
                                event = file_events_queue.get_nowait()
                                await websocket.send(json.dumps(event))
                        except:
                            pass
                        await asyncio.sleep(0.5)
                
                file_events_task = asyncio.create_task(process_file_events())
                
                # Message loop
                async for message in websocket:
                    try:
                        data = json.loads(message)
                        msg_type = data.get("type")
                        
                        if msg_type == "registered":
                            print("✅ Registered with relay server")
                        
                        elif msg_type == "users_changed":
                            connected_clients = data.get("users", [])
                            count = data.get("totalCount", 0)
                            print(f"👥 Connected users: {count}")
                            for user in connected_clients:
                                device = user.get("deviceInfo", {})
                                trusted = "🔐" if device.get("trusted") else "📱"
                                print(f"   {trusted} {device.get('name', 'Unknown')} - {device.get('browser', '')}")
                        
                        elif msg_type == "command":
                            cmd_data = data.get("data", {})
                            result = handle_command(cmd_data)
                            if result:
                                await websocket.send(json.dumps(result))
                        
                        elif msg_type == "file_command":
                            await handle_file_command(websocket, data)
                        
                    except json.JSONDecodeError:
                        pass
                    except Exception as e:
                        print(f"Message error: {e}")
                
                screenshot_task.cancel()
                file_events_task.cancel()
                
        except websockets.ConnectionClosed:
            print("⚠️ Connection closed. Reconnecting in 5s...")
        except Exception as e:
            print(f"❌ Error: {e}. Reconnecting in 5s...")
        
        # Stop all watchers on disconnect
        for watcher_id in list(file_watchers.keys()):
            stop_file_watcher(watcher_id)
        
        await asyncio.sleep(5)

# ============================================
# Main
# ============================================
if __name__ == "__main__":
    print("🚀 Starting YAS Remote Pro PC Server...")
    pyautogui.FAILSAFE = False
    
    try:
        asyncio.run(connect_to_relay())
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
        # Stop all watchers
        for watcher_id in list(file_watchers.keys()):
            stop_file_watcher(watcher_id)
