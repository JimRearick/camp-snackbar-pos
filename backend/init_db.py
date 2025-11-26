#!/usr/bin/env python3
import sqlite3
import os

# Use local path for development
DB_PATH = 'camp_snackbar.db'

# Read schema file
with open('schema.sql', 'r') as f:
    schema = f.read()

# Create database
conn = sqlite3.connect(DB_PATH)
conn.executescript(schema)
conn.commit()
conn.close()

print(f"Database initialized successfully at {os.path.abspath(DB_PATH)}")
