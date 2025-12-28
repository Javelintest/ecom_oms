"""
Database Migration: Add Customer Management Tables
Creates tables for customers, addresses, contacts, and ledger
"""
from sqlalchemy import create_engine, text
from backend.apps.common.db import SQLALCHEMY_DATABASE_URL
import sys

def run_migration():
    """Create customer management tables"""
    
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    migrations = [
        # 1. Create customers table
        """
        CREATE TABLE IF NOT EXISTS customers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company_id INT,
            customer_code VARCHAR(50) UNIQUE NOT NULL,
            customer_name VARCHAR(200) NOT NULL,
            display_name VARCHAR(200),
            customer_type VARCHAR(50) DEFAULT 'RETAIL',
            email VARCHAR(200),
            phone VARCHAR(20),
            mobile VARCHAR(20),
            website VARCHAR(200),
            gst_number VARCHAR(15),
            pan_number VARCHAR(10),
            tax_registration_number VARCHAR(50),
            currency VARCHAR(10) DEFAULT 'INR',
            payment_terms VARCHAR(50) DEFAULT 'NET_30',
            credit_limit DECIMAL(15,2) DEFAULT 0,
            opening_balance DECIMAL(15,2) DEFAULT 0,
            opening_balance_date DATETIME,
            current_balance DECIMAL(15,2) DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            is_credit_hold BOOLEAN DEFAULT FALSE,
            is_blacklisted BOOLEAN DEFAULT FALSE,
            notes TEXT,
            tags JSON,
            custom_fields JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by_user_id INT,
            INDEX idx_company (company_id),
            INDEX idx_customer_code (customer_code),
            INDEX idx_customer_name (customer_name),
            INDEX idx_email (email),
            INDEX idx_gst (gst_number),
            FOREIGN KEY (company_id) REFERENCES companies(id),
            FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """,
        
        # 2. Create customer_addresses table
        """
        CREATE TABLE IF NOT EXISTS customer_addresses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT NOT NULL,
            address_type VARCHAR(20) DEFAULT 'BOTH',
            is_default BOOLEAN DEFAULT FALSE,
            address_line1 VARCHAR(255) NOT NULL,
            address_line2 VARCHAR(255),
            city VARCHAR(100) NOT NULL,
            state VARCHAR(100) NOT NULL,
            country VARCHAR(100) DEFAULT 'India' NOT NULL,
            postal_code VARCHAR(20) NOT NULL,
            landmark VARCHAR(200),
            contact_person VARCHAR(100),
            phone VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_customer (customer_id),
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """,
        
        # 3. Create customer_contacts table
        """
        CREATE TABLE IF NOT EXISTS customer_contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT NOT NULL,
            name VARCHAR(200) NOT NULL,
            email VARCHAR(200),
            phone VARCHAR(20),
            mobile VARCHAR(20),
            designation VARCHAR(100),
            department VARCHAR(100),
            role VARCHAR(50),
            is_primary BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_customer (customer_id),
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """,
        
        # 4. Create customer_ledger table
        """
        CREATE TABLE IF NOT EXISTS customer_ledger (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT NOT NULL,
            company_id INT,
            transaction_date DATETIME NOT NULL,
            transaction_type VARCHAR(50) NOT NULL,
            reference_number VARCHAR(100),
            reference_type VARCHAR(50),
            reference_id INT,
            debit_amount DECIMAL(15,2) DEFAULT 0,
            credit_amount DECIMAL(15,2) DEFAULT 0,
            balance DECIMAL(15,2) DEFAULT 0,
            description VARCHAR(500),
            notes TEXT,
            due_date DATETIME,
            is_reconciled BOOLEAN DEFAULT FALSE,
            reconciled_date DATETIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by_user_id INT,
            INDEX idx_customer (customer_id),
            INDEX idx_company (company_id),
            INDEX idx_transaction_date (transaction_date),
            INDEX idx_transaction_type (transaction_type),
            INDEX idx_reference_number (reference_number),
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
            FOREIGN KEY (company_id) REFERENCES companies(id),
            FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
    ]
    
    try:
        with engine.connect() as connection:
            print("Starting customer management migration...")
            
            for i, migration in enumerate(migrations, 1):
                print(f"Running migration {i}/{len(migrations)}...")
                connection.execute(text(migration))
                connection.commit()
            
            print("✅ All migrations completed successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
