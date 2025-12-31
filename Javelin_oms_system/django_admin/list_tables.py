import os
import sys
import django
from django.db import connection

# Add the project directory to the sys.path
sys.path.append('/Users/surajjha/Desktop/S Code/01_Jav_Order_M_OMS/Javelin_oms_system/django_admin')

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

def list_tables():
    with connection.cursor() as cursor:
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print("Tables in DB:")
        for t in tables:
            print(t[0])

if __name__ == "__main__":
    list_tables()
