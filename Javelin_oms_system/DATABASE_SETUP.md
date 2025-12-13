# Database Setup Guide for XAMPP (MySQL/MariaDB)

This guide will help you set up the MySQL/MariaDB database for the Javelin OMS system using XAMPP and phpMyAdmin.

## Prerequisites

- XAMPP installed and running
- MySQL/MariaDB service started in XAMPP
- phpMyAdmin accessible at `http://localhost/phpmyadmin`

## Step 1: Create Database

### Option A: Using phpMyAdmin (Recommended)

1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. Click on **"New"** in the left sidebar
3. Enter database name: `javelin_oms`
4. Select collation: `utf8mb4_unicode_ci` (recommended)
5. Click **"Create"**

### Option B: Using SQL Command

In phpMyAdmin SQL tab, run:

```sql
CREATE DATABASE javelin_oms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Step 2: Configure Database Connection

### Default XAMPP Configuration

XAMPP typically uses:
- **Host**: `localhost`
- **Port**: `3306`
- **Username**: `root`
- **Password**: (empty by default)

### Update Environment Variable

Create a `.env` file in the project root or set environment variable:

```bash
export DB_URL="mysql+pymysql://root:@localhost:3306/javelin_oms"
```

If you have set a MySQL password:

```bash
export DB_URL="mysql+pymysql://root:yourpassword@localhost:3306/javelin_oms"
```

### Or Update in Code

The default configuration in `backend/common/db.py` is set to:
```python
DB_URL = "mysql+pymysql://root:@localhost:3306/javelin_oms"
```

If your MySQL has a password, update it to:
```python
DB_URL = "mysql+pymysql://root:yourpassword@localhost:3306/javelin_oms"
```

## Step 3: Test Connection

1. Make sure XAMPP MySQL service is running
2. Start the backend server:
   ```bash
   cd Javelin_oms_system
   uvicorn backend.main:app --reload
   ```
3. The tables will be automatically created on first run
4. Check phpMyAdmin to see the created tables:
   - `platforms`
   - `orders`
   - `order_items`
   - `inventory`
   - `sync_logs`

## Step 4: Verify Tables

In phpMyAdmin:

1. Select `javelin_oms` database
2. You should see these tables:
   - ✅ `platforms` - Platform configurations
   - ✅ `orders` - Unified orders table
   - ✅ `order_items` - Order line items
   - ✅ `inventory` - Inventory data
   - ✅ `sync_logs` - Sync operation logs

## Troubleshooting

### Connection Refused Error

**Problem**: `Can't connect to MySQL server`

**Solutions**:
1. Check if XAMPP MySQL service is running
2. Verify port 3306 is not blocked
3. Check XAMPP control panel - MySQL should show "Running"

### Access Denied Error

**Problem**: `Access denied for user 'root'@'localhost'`

**Solutions**:
1. Check if MySQL password is set in XAMPP
2. Update `DB_URL` with correct password
3. Or reset MySQL password in XAMPP

### Database Doesn't Exist

**Problem**: `Unknown database 'javelin_oms'`

**Solutions**:
1. Create the database in phpMyAdmin (Step 1)
2. Verify database name matches in `DB_URL`

### Character Set Issues

**Problem**: Encoding errors with special characters

**Solutions**:
1. Ensure database uses `utf8mb4_unicode_ci` collation
2. Check table character sets in phpMyAdmin

## Database Credentials

### Default XAMPP Settings
- **Host**: `localhost` or `127.0.0.1`
- **Port**: `3306`
- **Username**: `root`
- **Password**: (empty) or your custom password

### Custom Configuration

If you've changed XAMPP MySQL settings, update the connection string:

```python
DB_URL = "mysql+pymysql://username:password@localhost:3306/javelin_oms"
```

## Migration from SQLite

If you were using SQLite before:

1. Export data from SQLite (if needed)
2. Create MySQL database
3. Update `DB_URL` to MySQL connection string
4. Restart server - tables will be recreated
5. Re-connect platforms and sync data

## Security Notes

⚠️ **Important for Production**:
- Never use `root` user in production
- Create a dedicated database user with limited privileges
- Use strong passwords
- Restrict database access to specific IPs

### Create Dedicated User (Optional)

```sql
CREATE USER 'javelin_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON javelin_oms.* TO 'javelin_user'@'localhost';
FLUSH PRIVILEGES;
```

Then update connection:
```python
DB_URL = "mysql+pymysql://javelin_user:strong_password@localhost:3306/javelin_oms"
```

