import os
import json
import sqlite3
from pathlib import Path
from typing import List, Dict, Any, Optional

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_DIR.mkdir(parents=True, exist_ok=True)
SQLITE_PATH = DB_DIR / "mediread.sqlite3"

def init_db():
    """Khởi tạo cấu trúc bảng SQLite tương đồng với Supabase SQL ở Mục 4 của đề án"""
    conn = sqlite3.connect(str(SQLITE_PATH))
    cursor = conn.cursor()
    
    # 1. Bảng scans
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        doc_type TEXT NOT NULL,
        ocr_text TEXT,
        image_path TEXT,
        result_json TEXT,
        low_confidence INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. Bảng medication_schedules
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS medication_schedules (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        scan_id TEXT,
        medicine_name TEXT NOT NULL,
        dosage TEXT,
        time_slot TEXT NOT NULL,
        remind_at TEXT NOT NULL,
        active INTEGER DEFAULT 1
    )
    """)

    # 3. Bảng intake_logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS intake_logs (
        id TEXT PRIMARY KEY,
        schedule_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        scheduled_for TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        taken_at TIMESTAMP,
        UNIQUE (schedule_id, scheduled_for)
    )
    """)

    conn.commit()
    conn.close()

# Khởi tạo ngay khi nạp module
init_db()

def save_scan(scan_id: str, user_id: str, doc_type: str, ocr_text: str, result_dict: dict, low_conf: bool = False, image_path: str = ""):
    conn = sqlite3.connect(str(SQLITE_PATH))
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO scans (id, user_id, doc_type, ocr_text, image_path, result_json, low_confidence)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (scan_id, user_id, doc_type, ocr_text, image_path, json.dumps(result_dict, ensure_ascii=False), 1 if low_conf else 0))
    conn.commit()
    conn.close()

def get_scans(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(str(SQLITE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scans WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", (user_id, limit))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        item = dict(r)
        if item.get("result_json"):
            item["result"] = json.loads(item["result_json"])
        results.append(item)
    conn.close()
    return results

def get_scan_by_id(scan_id: str) -> Optional[Dict[str, Any]]:
    conn = sqlite3.connect(str(SQLITE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scans WHERE id = ?", (scan_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        item = dict(row)
        if item.get("result_json"):
            item["result"] = json.loads(item["result_json"])
        return item
    return None

def save_schedules(user_id: str, scan_id: str, schedules: List[Dict[str, Any]]):
    conn = sqlite3.connect(str(SQLITE_PATH))
    cursor = conn.cursor()
    for s in schedules:
        cursor.execute("""
            INSERT OR REPLACE INTO medication_schedules (id, user_id, scan_id, medicine_name, dosage, time_slot, remind_at, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (s["id"], user_id, scan_id, s["medicine_name"], s.get("dosage", ""), s["time_slot"], s["remind_at"], 1 if s.get("active", True) else 0))
    conn.commit()
    conn.close()

def get_schedules(user_id: str) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(str(SQLITE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM medication_schedules WHERE user_id = ? AND active = 1", (user_id,))
    rows = cursor.fetchall()
    results = [dict(r) for r in rows]
    conn.close()
    return results

def toggle_schedule_log(schedule_id: str, user_id: str, today_str: str, status: str = "taken"):
    conn = sqlite3.connect(str(SQLITE_PATH))
    cursor = conn.cursor()
    import uuid
    log_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO intake_logs (id, schedule_id, user_id, scheduled_for, status, taken_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(schedule_id, scheduled_for) DO UPDATE SET
            status = excluded.status,
            taken_at = CURRENT_TIMESTAMP
    """, (log_id, schedule_id, user_id, today_str, status))
    conn.commit()
    conn.close()
