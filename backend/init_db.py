#!/usr/bin/env python3
import sqlite3
import os

# Use local path for development
DB_PATH = 'camp_snackbar.db'

# Remove existing database if it exists to ensure clean initialization
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)
    print(f"Removed existing database at {DB_PATH}")

# Read schema file
with open('schema.sql', 'r') as f:
    schema = f.read()

# Create database
conn = sqlite3.connect(DB_PATH)
conn.executescript(schema)
conn.commit()
conn.close()

print(f"Database initialized successfully at {os.path.abspath(DB_PATH)}")
