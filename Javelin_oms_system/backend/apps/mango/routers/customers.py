"""Customer Management API Endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from decimal import Decimal

from backend.apps.common.db import get_db
from backend.apps.common.models import Customer, CustomerAddress, CustomerContact, CustomerLedger
from backend.apps.mango import schemas

router = APIRouter(tags=["Customers"])



# Simple dependency for current user (replace with actual auth later)
async def get_current_user():
    """Temporary user context - replace with real auth"""
    return {"user_id": 1, "company_id": 1}


# Helper function to generate customer code
def generate_customer_code(db: Session) -> str:
    """Generate next customer code: CUST-0001, CUST-0002, etc."""
    last_customer = db.query(Customer).order_by(Customer.id.desc()).first()
    if last_customer and last_customer.customer_code:
        try:
            last_num = int(last_customer.customer_code.split("-")[1])
            return f"CUST-{last_num + 1:04d}"
        except:
            pass
    return "CUST-0001"


# ============================================================
# CUSTOMER CRUD ENDPOINTS
# ============================================================

@router.post("", response_model=schemas.CustomerResponse)
def create_customer(
    customer: schemas.CustomerCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new customer with addresses and contacts"""
    
    # Generate customer code
    customer_code = generate_customer_code(db)
    
    # Create customer
    db_customer = Customer(
        company_id=current_user.get("company_id", 1),
        customer_code=customer_code,
        name=customer.name,
        display_name=customer.display_name or customer.name,
        customer_type=customer.customer_type,
        email=customer.email,
        phone=customer.phone,
        mobile=customer.mobile,
        website=customer.website,
        gst_number=customer.gst_number,
        pan_number=customer.pan_number,
        tax_registration_number=customer.tax_registration_number,
        currency=customer.currency,
        payment_terms=customer.payment_terms,
        credit_limit=customer.credit_limit,
        opening_balance=customer.opening_balance,
        opening_balance_date=customer.opening_balance_date,
        current_balance=customer.opening_balance,  # Initialize with opening balance
        is_active=customer.is_active,
        is_credit_hold=customer.is_credit_hold,
        notes=customer.notes,
        tags=customer.tags,
        created_by_user_id=current_user.get("user_id")
    )
    
    db.add(db_customer)
    db.flush()  # Get customer ID
    
    # Add addresses
    for addr in customer.addresses:
        db_address = CustomerAddress(
            customer_id=db_customer.id,
            **addr.dict()
        )
        db.add(db_address)
    
    # Add contacts
    for contact in customer.contacts:
        db_contact = CustomerContact(
            customer_id=db_customer.id,
            **contact.dict()
        )
        db.add(db_contact)
    
    # Create opening balance ledger entry if applicable
    if customer.opening_balance != 0:
        opening_entry = CustomerLedger(
            customer_id=db_customer.id,
            company_id=current_user.get("company_id", 1),
            transaction_date=customer.opening_balance_date or datetime.now(),
            transaction_type="OPENING",
            debit_amount=customer.opening_balance if customer.opening_balance > 0 else 0,
            credit_amount=abs(customer.opening_balance) if customer.opening_balance < 0 else 0,
            balance=customer.opening_balance,
            description="Opening Balance",
            created_by_user_id=current_user.get("user_id")
        )
        db.add(opening_entry)
    
    db.commit()
    db.refresh(db_customer)
    
    return db_customer


@router.get("", response_model=List[schemas.CustomerListResponse])
def get_customers(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    customer_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_credit_hold: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get list of customers with filters"""
    
    query = db.query(Customer).filter(
        Customer.company_id == current_user.get("company_id", 1)
    )
    
    # Apply filters
    if search:
        query = query.filter(
            (Customer.name.contains(search)) |
            (Customer.email.contains(search)) |
            (Customer.phone.contains(search)) |
            (Customer.customer_code.contains(search))
        )
    
    if customer_type:
        query = query.filter(Customer.customer_type == customer_type)
    
    if is_active is not None:
        query = query.filter(Customer.is_active == is_active)
    
    if is_credit_hold is not None:
        query = query.filter(Customer.is_credit_hold == is_credit_hold)
    
    customers = query.offset(skip).limit(limit).all()
    
    return customers


@router.get("/{customer_id}", response_model=schemas.CustomerResponse)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get single customer with all details"""
    
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return customer


@router.put("/{customer_id}", response_model=schemas.CustomerResponse)
def update_customer(
    customer_id: int,
    customer_update: schemas.CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update customer details"""
    
    db_customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Update fields
    update_data = customer_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_customer, field, value)
    
    db.commit()
    db.refresh(db_customer)
    
    return db_customer


@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Soft delete customer (mark as inactive)"""
    
    db_customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    db_customer.is_active = False
    db.commit()
    
    return {"success": True, "message": "Customer deactivated successfully"}


# ============================================================
# CUSTOMER LEDGER ENDPOINTS
# ============================================================

@router.get("/{customer_id}/ledger", response_model=List[schemas.CustomerLedgerResponse])
def get_customer_ledger(
    customer_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    transaction_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get customer ledger entries"""
    
    query = db.query(CustomerLedger).filter(
        CustomerLedger.customer_id == customer_id,
        CustomerLedger.company_id == current_user.get("company_id", 1)
    )
    
    if start_date:
        query = query.filter(CustomerLedger.transaction_date >= start_date)
    
    if end_date:
        query = query.filter(CustomerLedger.transaction_date <= end_date)
    
    if transaction_type:
        query = query.filter(CustomerLedger.transaction_type == transaction_type)
    
    entries = query.order_by(CustomerLedger.transaction_date.desc()).offset(skip).limit(limit).all()
    
    return entries


@router.post("/{customer_id}/ledger", response_model=schemas.CustomerLedgerResponse)
def create_ledger_entry(
    customer_id: int,
    entry: schemas.CustomerLedgerCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create manual ledger entry (for adjustments)"""
    
    # Get customer
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Calculate new balance
    balance_change = entry.debit_amount - entry.credit_amount
    new_balance = customer.current_balance + balance_change
    
    # Create ledger entry
    db_entry = CustomerLedger(
        customer_id=customer_id,
        company_id=current_user.get("company_id", 1),
        transaction_date=entry.transaction_date,
        transaction_type=entry.transaction_type,
        reference_number=entry.reference_number,
        reference_type=entry.reference_type,
        debit_amount=entry.debit_amount,
        credit_amount=entry.credit_amount,
        balance=new_balance,
        description=entry.description,
        notes=entry.notes,
        due_date=entry.due_date,
        created_by_user_id=current_user.get("user_id")
    )
    
    db.add(db_entry)
    
    # Update customer balance
    customer.current_balance = new_balance
    
    db.commit()
    db.refresh(db_entry)
    
    return db_entry


@router.get("/{customer_id}/balance", response_model=schemas.CustomerBalanceResponse)
def get_customer_balance(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get customer balance with aging analysis"""
    
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Calculate aging (simplified - would need more complex logic for real aging)
    now = datetime.now()
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)
    ninety_days_ago = now - timedelta(days=90)
    
    # Get outstanding invoices (entries with due dates)
    ledger_entries = db.query(CustomerLedger).filter(
        CustomerLedger.customer_id == customer_id,
        CustomerLedger.transaction_type == "INVOICE",
        CustomerLedger.is_reconciled == False
    ).all()
    
    aging_current = 0
    aging_30 = 0
    aging_60 = 0
    aging_90_plus = 0
    
    for entry in ledger_entries:
        if entry.due_date:
            if entry.due_date >= thirty_days_ago:
                aging_current += float(entry.debit_amount)
            elif entry.due_date >= sixty_days_ago:
                aging_30 += float(entry.debit_amount)
            elif entry.due_date >= ninety_days_ago:
                aging_60 += float(entry.debit_amount)
            else:
                aging_90_plus += float(entry.debit_amount)
    
    return {
        "customer_id": customer.id,
        "customer_name": customer.name,
        "current_balance": float(customer.current_balance),
        "credit_limit": float(customer.credit_limit),
        "available_credit": float(customer.credit_limit - customer.current_balance),
        "aging_current": aging_current,
        "aging_30": aging_30,
        "aging_60": aging_60,
        "aging_90_plus": aging_90_plus
    }


@router.get("/{customer_id}/statement", response_model=schemas.CustomerStatementResponse)
def get_customer_statement(
    customer_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Generate customer statement"""
    
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get transactions
    query = db.query(CustomerLedger).filter(CustomerLedger.customer_id == customer_id)
    
    if start_date:
        query = query.filter(CustomerLedger.transaction_date >= start_date)
    if end_date:
        query = query.filter(CustomerLedger.transaction_date <= end_date)
    
    transactions = query.order_by(CustomerLedger.transaction_date).all()
    
    # Calculate totals
    total_debit = sum(float(t.debit_amount) for t in transactions)
    total_credit = sum(float(t.credit_amount) for t in transactions)
    opening_balance = customer.opening_balance
    closing_balance = opening_balance + total_debit - total_credit
    
    return {
        "customer": customer,
        "opening_balance": float(opening_balance),
        "transactions": transactions,
        "closing_balance": closing_balance,
        "total_debit": total_debit,
        "total_credit": total_credit
    }


@router.get("/{customer_id}/analytics")
def get_customer_analytics(
    customer_id: int,
    months: int = Query(12, description="Number of months of data to fetch"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive customer analytics and statistics"""
    
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=months * 30)
    
    # Get all ledger entries in date range
    ledger_entries = db.query(CustomerLedger).filter(
        CustomerLedger.customer_id == customer_id,
        CustomerLedger.company_id == current_user.get("company_id", 1),
        CustomerLedger.transaction_date >= start_date,
        CustomerLedger.transaction_date <= end_date
    ).order_by(CustomerLedger.transaction_date).all()
    
    # Calculate monthly trends
    monthly_data = {}
    for entry in ledger_entries:
        month_key = entry.transaction_date.strftime("%Y-%m")
        if month_key not in monthly_data:
            monthly_data[month_key] = {
                "sales": 0,
                "payments": 0,
                "returns": 0,
                "balance": 0
            }
        
        if entry.transaction_type == "INVOICE":
            monthly_data[month_key]["sales"] += float(entry.debit_amount)
        elif entry.transaction_type == "PAYMENT":
            monthly_data[month_key]["payments"] += float(entry.credit_amount)
        elif entry.transaction_type in ["CREDIT_NOTE", "RETURN"]:
            monthly_data[month_key]["returns"] += float(entry.credit_amount)
        
        monthly_data[month_key]["balance"] = float(entry.balance)
    
    # Convert to list format for frontend
    monthly_trends = []
    for month in sorted(monthly_data.keys()):
        monthly_trends.append({
            "month": month,
            **monthly_data[month]
        })
    
    # Transaction breakdown by type
    transaction_breakdown = {}
    for entry in ledger_entries:
        txn_type = entry.transaction_type
        if txn_type not in transaction_breakdown:
            transaction_breakdown[txn_type] = {
                "count": 0,
                "total_amount": 0
            }
        transaction_breakdown[txn_type]["count"] += 1
        if entry.debit_amount > 0:
            transaction_breakdown[txn_type]["total_amount"] += float(entry.debit_amount)
        if entry.credit_amount > 0:
            transaction_breakdown[txn_type]["total_amount"] += float(entry.credit_amount)
    
    # Outstanding invoices
    outstanding_invoices = db.query(CustomerLedger).filter(
        CustomerLedger.customer_id == customer_id,
        CustomerLedger.transaction_type == "INVOICE",
        CustomerLedger.is_reconciled == False,
        CustomerLedger.debit_amount > 0
    ).order_by(CustomerLedger.due_date.asc()).limit(10).all()
    
    outstanding_list = []
    for inv in outstanding_invoices:
        days_overdue = 0
        if inv.due_date:
            days_overdue = (datetime.now() - inv.due_date).days
        outstanding_list.append({
            "id": inv.id,
            "reference_number": inv.reference_number,
            "invoice_date": inv.transaction_date.isoformat() if inv.transaction_date else None,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "amount": float(inv.debit_amount),
            "days_overdue": days_overdue if days_overdue > 0 else 0
        })
    
    # Calculate statistics
    total_sales = sum(float(e.debit_amount) for e in ledger_entries if e.transaction_type == "INVOICE")
    total_payments = sum(float(e.credit_amount) for e in ledger_entries if e.transaction_type == "PAYMENT")
    total_returns = sum(float(e.credit_amount) for e in ledger_entries if e.transaction_type in ["CREDIT_NOTE", "RETURN"])
    avg_invoice_value = total_sales / max(transaction_breakdown.get("INVOICE", {}).get("count", 1), 1)
    
    # Calculate average payment days (simplified)
    payment_days = []
    for entry in ledger_entries:
        if entry.transaction_type == "PAYMENT" and entry.reference_number:
            # Find corresponding invoice
            invoice = db.query(CustomerLedger).filter(
                CustomerLedger.customer_id == customer_id,
                CustomerLedger.reference_number == entry.reference_number,
                CustomerLedger.transaction_type == "INVOICE"
            ).first()
            if invoice and invoice.due_date:
                days = (entry.transaction_date - invoice.due_date).days
                if days > 0:
                    payment_days.append(days)
    
    avg_payment_days = sum(payment_days) / len(payment_days) if payment_days else 0
    
    # Recent activity (last 10 transactions)
    recent_activity = ledger_entries[-10:] if len(ledger_entries) > 10 else ledger_entries
    recent_list = []
    for act in reversed(recent_activity):
        recent_list.append({
            "id": act.id,
            "date": act.transaction_date.isoformat() if act.transaction_date else None,
            "type": act.transaction_type,
            "reference": act.reference_number,
            "description": act.description,
            "amount": float(act.debit_amount if act.debit_amount > 0 else act.credit_amount),
            "is_debit": act.debit_amount > 0
        })
    
    return {
        "monthly_trends": monthly_trends,
        "transaction_breakdown": transaction_breakdown,
        "outstanding_invoices": outstanding_list,
        "recent_activity": recent_list,
        "statistics": {
            "total_sales": total_sales,
            "total_payments": total_payments,
            "total_returns": total_returns,
            "avg_invoice_value": avg_invoice_value,
            "avg_payment_days": round(avg_payment_days, 1),
            "total_transactions": len(ledger_entries),
            "outstanding_count": len(outstanding_list)
        }
    }
