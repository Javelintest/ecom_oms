"""Database connection and session management"""
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Database configuration
# Default to SQLite for local testing
# For MySQL/MariaDB: mysql+pymysql://username:password@localhost:3306/database_name

# Get the project root directory (two levels up from this file)
project_root = Path(__file__).parent.parent.parent.parent
db_path = project_root / "javelin_oms_test.db"

DB_URL = os.getenv(
    "DB_URL",
    f"sqlite:///{db_path}"  # Local SQLite test database
    # For MySQL: "mysql+pymysql://root:@localhost:3306/javelin_oms"
    # Default XAMPP credentials: root user with no password
    # Change if you have set a password: "mysql+pymysql://root:yourpassword@localhost:3306/javelin_oms"
)

# Create engine with appropriate settings
if DB_URL.startswith("sqlite"):
    engine = create_engine(DB_URL, echo=False, connect_args={"check_same_thread": False})
else:
    # MySQL/MariaDB connection
    engine = create_engine(
        DB_URL,
        echo=False,
        pool_pre_ping=True,  # Verify connections before using
        pool_recycle=3600,   # Recycle connections after 1 hour
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for FastAPI to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

