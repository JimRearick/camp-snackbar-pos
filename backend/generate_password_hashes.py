#!/usr/bin/env python3
"""
Generate bcrypt password hashes for default users
Password: camp2026
"""
import bcrypt

password = "camp2026"

# Generate 3 hashes (one for each default user)
users = ['admin', 'pos', 'prep']

print("Generated bcrypt hashes for password: camp2026\n")
print("Copy these into schema.sql:\n")

for username in users:
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    print(f"{username}: {password_hash}")
