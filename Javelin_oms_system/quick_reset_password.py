#!/usr/bin/env python3
"""Simple password reset using direct SQL and bcrypt"""
import sqlite3
import bcrypt

# Hash the new password
new_password = "admin123"
hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Connect to database
conn = sqlite3.connect('javelin_oms.db')
cursor = conn.cursor()

# Update the password
cursor.execute(
    "UPDATE users SET hashed_password = ? WHERE email = ?",
    (hashed, "admin@javelin.com")
)

rows_updated = cursor.rowcount
conn.commit()
conn.close()

print(f"✅ Password reset successful!")
print(f"   Email: admin@javelin.com")
print(f"   New Password: {new_password}")
print(f"   Rows updated: {rows_updated}")

