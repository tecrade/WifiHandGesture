import socket
import numpy as np
import time
import asyncio
import threading
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# UDP config — must match the Arduino sketch
UDP_IP   = "0.0.0.0"   # listen on all interfaces
UDP_PORT = 5005

current_gesture = "RELAX"
connected_clients = set()

# =========================
# HARDWARE LOGIC THREAD
# (UDP replaces serial/COM13; all detection logic is unchanged)
# =========================
def hardware_loop():
    global current_gesture

    # --- Open UDP socket (replaces serial.Serial('COM13', ...)) ---
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.bind((UDP_IP, UDP_PORT))
        sock.settimeout(1.0)          # 1 s recv timeout — same feel as serial timeout=1
        print(f"🔵 UDP socket listening on {UDP_IP}:{UDP_PORT}")
    except Exception as e:
        print("Hardware connection issue:", e)
        print("Backend running in simulation mode until hardware connects... (No UDP socket)")
        return

    # ------------------------------------------------------------------
    # Helper: reads lines from incoming UDP datagrams.
    # The Arduino sends both MPU and EMG lines in a single packet,
    # separated by '\n', so we split and buffer them — same byte stream
    # semantics the serial readline() loop expected.
    # ------------------------------------------------------------------
    line_buffer = []

    def readline():
        """Return the next complete line, refilling from UDP when empty."""
        while not line_buffer:
            try:
                data, _ = sock.recvfrom(4096)
                lines = data.decode(errors='ignore').split('\n')
                line_buffer.extend(l.strip() for l in lines if l.strip())
            except socket.timeout:
                pass
        return line_buffer.pop(0)

    # =========================
    # MPU CALIBRATION (unchanged)
    # =========================
    print("🔵 Keep hand still for MPU calibration...")
    ax_list, ay_list, az_list = [], [], []
    gx_list, gy_list, gz_list = [], [], []

    start = time.time()
    while time.time() - start < 3:
        line = readline()
        if "AX:" in line:
            values = line.replace(",", " ").split()
            for v in values:
                if   "AX:" in v: ax_list.append(int(v.split(":")[1]))
                elif "AY:" in v: ay_list.append(int(v.split(":")[1]))
                elif "AZ:" in v: az_list.append(int(v.split(":")[1]))
                elif "GX:" in v: gx_list.append(int(v.split(":")[1]))
                elif "GY:" in v: gy_list.append(int(v.split(":")[1]))
                elif "GZ:" in v: gz_list.append(int(v.split(":")[1]))

    ax_off = np.mean(ax_list) if ax_list else 0
    ay_off = np.mean(ay_list) if ay_list else 0
    az_off = np.mean(az_list) if az_list else 0
    gx_off = np.mean(gx_list) if gx_list else 0
    gy_off = np.mean(gy_list) if gy_list else 0
    gz_off = np.mean(gz_list) if gz_list else 0

    roll_base = (
        np.mean([np.degrees(np.arctan2(ay_list[i], az_list[i])) for i in range(len(ax_list))])
        if ax_list else 0
    )
    print("✅ MPU Calibration Done\n")

    # =========================
    # EMG CALIBRATION (unchanged)
    # =========================
    def collect_rssi_samples(name):
        print(f"\n👉 Perform: {name} for RSSI Calibration")
        time.sleep(5)
        samples = []
        while len(samples) < 20:
            line = readline()
            if not line.startswith("RSSI"):
                continue
            parts = line.split(",")
            if len(parts) >= 2:
                try:
                    samples.append(int(parts[1]))
                except:
                    pass
        avg = np.mean(samples)
        print(f"{name} RSSI Avg: {avg:.2f}")
        return avg

    print("🚀 RSSI Calibration\n")
    relax_avg = collect_rssi_samples("RELAX")
    pinch_avg = collect_rssi_samples("PINCH")
    fist_avg  = collect_rssi_samples("FIST")
    flex_avg  = collect_rssi_samples("WRIST FLEX")

    gesture_map = {
        "RELAX": relax_avg,
        "PINCH": pinch_avg,
        "FIST":  fist_avg,
        "FLEX":  flex_avg,
    }
    print("\n✅ RSSI Calibration Done\n")

    # =========================
    # DETECTION LOOP (unchanged)
    # =========================
    window      = []
    mpu_gesture = "RELAX"
    emg_gesture = "RELAX"

    print("🚀 Detection Started...\n")

    while True:
        try:
            line = readline()

            # --- MPU PROCESSING (unchanged) ---
            if "AX:" in line:
                values = line.replace(",", " ").split()
                ax = ay = az = gx = gy = gz = 0
                for v in values:
                    if   "AX:" in v: ax = int(v.split(":")[1]) - ax_off
                    elif "AY:" in v: ay = int(v.split(":")[1]) - ay_off
                    elif "AZ:" in v: az = int(v.split(":")[1]) - az_off
                    elif "GX:" in v: gx = int(v.split(":")[1]) - gx_off
                    elif "GY:" in v: gy = int(v.split(":")[1]) - gy_off
                    elif "GZ:" in v: gz = int(v.split(":")[1]) - gz_off

                roll     = np.degrees(np.arctan2(ay, az)) if az != 0 else 0
                rotation = roll - roll_base
                motion   = abs(gx) + abs(gy) + abs(gz)

                if   motion > 45000: mpu_gesture = "WAVE"
                elif motion < 5000:
                    if rotation < -120 or rotation > 120: mpu_gesture = "ROTATION"
                    else:                                  mpu_gesture = "RELAX"

            # --- EMG PROCESSING (unchanged) ---
            if line.startswith("RSSI"):
                parts = line.split(",")
                if len(parts) >= 2:
                    try:
                        emg_val = int(parts[1])
                        window.append(emg_val)
                        if len(window) > 10:
                            window.pop(0)

                        current = np.mean(window)
                        closest, min_diff = None, float("inf")
                        for g, avg in gesture_map.items():
                            diff = abs(current - avg)
                            if diff < min_diff:
                                min_diff = diff
                                closest  = g
                        emg_gesture = closest
                    except:
                        pass

            # --- FINAL PRIORITY LOGIC (unchanged) ---
            new_gesture = "RELAX"
            if   mpu_gesture == "WAVE":     new_gesture = "WAVE"
            elif emg_gesture == "PINCH":    new_gesture = "PINCH"
            #elif mpu_gesture == "ROTATION": new_gesture = "ROTATION"
            elif mpu_gesture == "RELAX":
                if emg_gesture in ["FIST", "FLEX"]: new_gesture = emg_gesture
                else:                               new_gesture = "RELAX"
            else:
                new_gesture = "RELAX"

            if mpu_gesture == "RELAX" and emg_gesture == "RELAX":
                new_gesture = "RELAX"

            current_gesture = new_gesture

        except Exception as e:
            time.sleep(0.01)


# Start hardware monitoring thread
thread = threading.Thread(target=hardware_loop, daemon=True)
thread.start()


@app.websocket("/ws/gesture")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        last_sent = ""
        while True:
            if current_gesture != last_sent:
                await websocket.send_text(current_gesture)
                last_sent = current_gesture
            await asyncio.sleep(0.05)
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
