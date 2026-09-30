import sqlite3
import os
import shutil

edge_history = os.path.join(os.environ['LOCALAPPDATA'], 'Microsoft', 'Edge', 'User Data', 'Default', 'History')
temp_path = os.path.join(os.environ['TEMP'], 'EdgeHistory_temp2.db')

try:
    shutil.copyfile(edge_history, temp_path)
    conn = sqlite3.connect(temp_path)
    c = conn.cursor()
    c.execute("SELECT url, title FROM urls WHERE url LIKE '%vercel%' OR url LIKE '%sgn%' ORDER BY last_visit_time DESC LIMIT 25")
    for r in c.fetchall():
        print(f"{r[0]} | {r[1]}")
    conn.close()
except Exception as e:
    print("Error:", e)
