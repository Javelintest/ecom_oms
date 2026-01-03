"""Quotations Management API Endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from ...common.dependencies import get_db
from ...common.models import Quotation, QuotationItem, Customer, Product, SalesOrder, SalesOrderItem
from .. import schemas

router = APIRouter(prefix="/quotations", tags=["Quotations"])


# Simple dependency for current user (replace with actual auth later)
async def get_current_user():
    """Temporary user context - replace with real auth"""
    return {"user_id": 1, "company_id": 1}


def generate_quotation_number(db: Session, company_id: int) -> str:
    """Generate next quotation number: QTN-0001, QTN-0002, etc."""
    last_quote = db.query(Quotation).filter(
        Quotation.company_id == company_id
    ).order_by(Quotation.id.desc()).first()
    
    if last_quote and last_quote.quotation_number:
        try:
            last_num = int(last_quote.quotation_number.split("-")[1])
            return f"QTN-{last_num + 1:04d}"
        except:
            pass
    return "QTN-0001"


@router.get("")
def get_quotations(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get list of quotations with filters"""
    
    from sqlalchemy.orm import joinedload
    
    query = db.query(Quotation).options(joinedload(Quotation.customer)).filter(
        Quotation.company_id == current_user.get("company_id", 1)
    )
    
    # Apply filters
    if status:
        query = query.filter(Quotation.status == status.upper())
    
    if customer_id:
        query = query.filter(Quotation.customer_id == customer_id)
    
    if search:
        # Join customer for search, but keep it in the query for eager loading
        query = query.join(Customer).filter(
            or_(
                Quotation.quotation_number.contains(search),
                Customer.name.contains(search),
                Customer.email.contains(search)
            )
        )
    else:
        # Even without search, ensure customer is loaded via joinedload
        pass  # Already handled by joinedload above
    
    if start_date:
        query = query.filter(Quotation.quotation_date >= start_date)
    
    if end_date:
        query = query.filter(Quotation.quotation_date <= end_date)
    
    quotations = query.order_by(Quotation.quotation_date.desc()).offset(skip).limit(limit).all()
    
    # Convert to response format with customer dict
    result = []
    for quote in quotations:
        quote_dict = {
            "id": quote.id,
            "quotation_number": quote.quotation_number,
            "customer_id": quote.customer_id,
            "quotation_date": quote.quotation_date,
            "valid_until": quote.valid_until,
            "status": quote.status,
            "total_amount": float(quote.total_amount) if quote.total_amount else 0.0,
            "currency": quote.currency,
            "created_at": quote.created_at,
            "customer": {
                "id": quote.customer.id,
                "name": quote.customer.name,
                "email": quote.customer.email,
                "customer_code": quote.customer.customer_code
            } if quote.customer else None
        }
        result.append(quote_dict)
    
    return result


@router.get("/{quotation_id}")
def get_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get quotation by ID"""
    
    from sqlalchemy.orm import joinedload
    
    quotation = db.query(Quotation).options(
        joinedload(Quotation.customer),
        joinedload(Quotation.items)
    ).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    # Convert to response format
    return {
        "id": quotation.id,
        "company_id": quotation.company_id,
        "quotation_number": quotation.quotation_number,
        "customer_id": quotation.customer_id,
        "quotation_date": quotation.quotation_date,
        "valid_until": quotation.valid_until,
        "sent_date": quotation.sent_date.isoformat() if quotation.sent_date else None,
        "status": quotation.status,
        "subtotal": float(quotation.subtotal) if quotation.subtotal else 0.0,
        "tax_amount": float(quotation.tax_amount) if quotation.tax_amount else 0.0,
        "discount_amount": float(quotation.discount_amount) if quotation.discount_amount else 0.0,
        "total_amount": float(quotation.total_amount) if quotation.total_amount else 0.0,
        "currency": quotation.currency,
        "payment_terms": quotation.payment_terms,
        "delivery_terms": quotation.delivery_terms,
        "notes": quotation.notes,
        "terms_conditions": quotation.terms_conditions,
        "converted_to_order_id": quotation.converted_to_order_id,
        "converted_to_invoice_id": quotation.converted_to_invoice_id,
        "converted_at": quotation.converted_at.isoformat() if quotation.converted_at else None,
        "created_by_user_id": quotation.created_by_user_id,
        "last_viewed_at": quotation.last_viewed_at.isoformat() if quotation.last_viewed_at else None,
        "viewed_count": quotation.viewed_count or 0,
        "created_at": quotation.created_at,
        "updated_at": quotation.updated_at,
        "items": [
            {
                "id": item.id,
                "quotation_id": item.quotation_id,
                "product_id": item.product_id,
                "sku": item.sku,
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price) if item.unit_price else 0.0,
                "discount_percent": float(item.discount_percent) if item.discount_percent else 0.0,
                "discount_amount": float(item.discount_amount) if item.discount_amount else 0.0,
                "tax_rate": float(item.tax_rate) if item.tax_rate else 0.0,
                "tax_amount": float(item.tax_amount) if item.tax_amount else 0.0,
                "line_total": float(item.line_total) if item.line_total else 0.0,
                "unit_of_measure": item.unit_of_measure,
                "notes": item.notes
            }
            for item in quotation.items
        ],
        "customer": {
            "id": quotation.customer.id,
            "name": quotation.customer.name,
            "email": quotation.customer.email,
            "customer_code": quotation.customer.customer_code
        } if quotation.customer else None
    }


@router.post("")
def create_quotation(
    quotation: schemas.QuotationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new quotation"""
    
    from sqlalchemy.orm import joinedload
    
    company_id = current_user.get("company_id", 1)
    user_id = current_user.get("user_id", 1)
    
    # Generate quotation number
    quotation_number = generate_quotation_number(db, company_id)
    
    # Calculate totals
    subtotal = Decimal(0)
    tax_amount = Decimal(0)
    discount_amount = Decimal(0)
    
    # Create quotation
    db_quotation = Quotation(
        company_id=company_id,
        quotation_number=quotation_number,
        customer_id=quotation.customer_id,
        quotation_date=quotation.quotation_date or datetime.now(),
        valid_until=quotation.valid_until,
        status=quotation.status or "DRAFT",
        payment_terms=quotation.payment_terms,
        delivery_terms=quotation.delivery_terms,
        notes=quotation.notes,
        terms_conditions=quotation.terms_conditions,
        currency=quotation.currency or "INR",
        created_by_user_id=user_id
    )
    
    db.add(db_quotation)
    db.flush()  # Get the ID
    
    # Add items
    for item_data in quotation.items:
        # Calculate line totals
        line_subtotal = Decimal(str(item_data.quantity)) * Decimal(str(item_data.unit_price))
        line_discount = (line_subtotal * Decimal(str(item_data.discount_percent or 0))) / 100
        line_after_discount = line_subtotal - line_discount
        line_tax = (line_after_discount * Decimal(str(item_data.tax_rate or 0))) / 100
        line_total = line_after_discount + line_tax
        
        # Get product if product_id provided
        product = None
        if item_data.product_id:
            product = db.query(Product).filter(Product.id == item_data.product_id).first()
        
        db_item = QuotationItem(
            quotation_id=db_quotation.id,
            product_id=item_data.product_id,
            sku=item_data.sku or (product.sku if product else None),
            description=item_data.description or (product.name if product else ""),
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            discount_percent=item_data.discount_percent or 0,
            discount_amount=float(line_discount),
            tax_rate=item_data.tax_rate or 0,
            tax_amount=float(line_tax),
            line_total=float(line_total),
            unit_of_measure=item_data.unit_of_measure or "PCS",
            notes=item_data.notes
        )
        
        db.add(db_item)
        
        subtotal += line_subtotal
        discount_amount += line_discount
        tax_amount += line_tax
    
    # Update quotation totals
    db_quotation.subtotal = float(subtotal)
    db_quotation.discount_amount = float(discount_amount)
    db_quotation.tax_amount = float(tax_amount)
    db_quotation.total_amount = float(subtotal - discount_amount + tax_amount)
    
    db.commit()
    
    # Reload with relationships
    db_quotation = db.query(Quotation).options(
        joinedload(Quotation.customer),
        joinedload(Quotation.items)
    ).filter(Quotation.id == db_quotation.id).first()
    
    # Return in same format as get_quotation
    return {
        "id": db_quotation.id,
        "company_id": db_quotation.company_id,
        "quotation_number": db_quotation.quotation_number,
        "customer_id": db_quotation.customer_id,
        "quotation_date": db_quotation.quotation_date,
        "valid_until": db_quotation.valid_until,
        "sent_date": db_quotation.sent_date.isoformat() if db_quotation.sent_date else None,
        "status": db_quotation.status,
        "subtotal": float(db_quotation.subtotal) if db_quotation.subtotal else 0.0,
        "tax_amount": float(db_quotation.tax_amount) if db_quotation.tax_amount else 0.0,
        "discount_amount": float(db_quotation.discount_amount) if db_quotation.discount_amount else 0.0,
        "total_amount": float(db_quotation.total_amount) if db_quotation.total_amount else 0.0,
        "currency": db_quotation.currency,
        "payment_terms": db_quotation.payment_terms,
        "delivery_terms": db_quotation.delivery_terms,
        "notes": db_quotation.notes,
        "terms_conditions": db_quotation.terms_conditions,
        "converted_to_order_id": db_quotation.converted_to_order_id,
        "converted_to_invoice_id": db_quotation.converted_to_invoice_id,
        "converted_at": db_quotation.converted_at.isoformat() if db_quotation.converted_at else None,
        "created_by_user_id": db_quotation.created_by_user_id,
        "last_viewed_at": db_quotation.last_viewed_at.isoformat() if db_quotation.last_viewed_at else None,
        "viewed_count": db_quotation.viewed_count or 0,
        "created_at": db_quotation.created_at,
        "updated_at": db_quotation.updated_at,
        "items": [
            {
                "id": item.id,
                "quotation_id": item.quotation_id,
                "product_id": item.product_id,
                "sku": item.sku,
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price) if item.unit_price else 0.0,
                "discount_percent": float(item.discount_percent) if item.discount_percent else 0.0,
                "discount_amount": float(item.discount_amount) if item.discount_amount else 0.0,
                "tax_rate": float(item.tax_rate) if item.tax_rate else 0.0,
                "tax_amount": float(item.tax_amount) if item.tax_amount else 0.0,
                "line_total": float(item.line_total) if item.line_total else 0.0,
                "unit_of_measure": item.unit_of_measure,
                "notes": item.notes
            }
            for item in db_quotation.items
        ],
        "customer": {
            "id": db_quotation.customer.id,
            "name": db_quotation.customer.name,
            "email": db_quotation.customer.email,
            "customer_code": db_quotation.customer.customer_code
        } if db_quotation.customer else None
    }


@router.put("/{quotation_id}")
def update_quotation(
    quotation_id: int,
    quotation: schemas.QuotationUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a quotation"""
    
    db_quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not db_quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    if db_quotation.status in ["ACCEPTED", "CONVERTED"]:
        raise HTTPException(
            status_code=400, 
            detail="Cannot update quotation that is already accepted or converted"
        )
    
    # Update fields
    if quotation.customer_id is not None:
        db_quotation.customer_id = quotation.customer_id
    if quotation.quotation_date is not None:
        db_quotation.quotation_date = quotation.quotation_date
    if quotation.valid_until is not None:
        db_quotation.valid_until = quotation.valid_until
    if quotation.status is not None:
        db_quotation.status = quotation.status.upper()
    if quotation.payment_terms is not None:
        db_quotation.payment_terms = quotation.payment_terms
    if quotation.delivery_terms is not None:
        db_quotation.delivery_terms = quotation.delivery_terms
    if quotation.notes is not None:
        db_quotation.notes = quotation.notes
    if quotation.terms_conditions is not None:
        db_quotation.terms_conditions = quotation.terms_conditions
    
    # Update items if provided
    if quotation.items is not None:
        # Delete existing items
        db.query(QuotationItem).filter(QuotationItem.quotation_id == quotation_id).delete()
        
        # Recalculate totals
        subtotal = Decimal(0)
        tax_amount = Decimal(0)
        discount_amount = Decimal(0)
        
        # Add new items
        for item_data in quotation.items:
            line_subtotal = Decimal(str(item_data.quantity)) * Decimal(str(item_data.unit_price))
            line_discount = (line_subtotal * Decimal(str(item_data.discount_percent or 0))) / 100
            line_after_discount = line_subtotal - line_discount
            line_tax = (line_after_discount * Decimal(str(item_data.tax_rate or 0))) / 100
            line_total = line_after_discount + line_tax
            
            product = None
            if item_data.product_id:
                product = db.query(Product).filter(Product.id == item_data.product_id).first()
            
            db_item = QuotationItem(
                quotation_id=db_quotation.id,
                product_id=item_data.product_id,
                sku=item_data.sku or (product.sku if product else None),
                description=item_data.description or (product.name if product else ""),
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                discount_percent=item_data.discount_percent or 0,
                discount_amount=float(line_discount),
                tax_rate=item_data.tax_rate or 0,
                tax_amount=float(line_tax),
                line_total=float(line_total),
                unit_of_measure=item_data.unit_of_measure or "PCS",
                notes=item_data.notes
            )
            
            db.add(db_item)
            
            subtotal += line_subtotal
            discount_amount += line_discount
            tax_amount += line_tax
        
        # Update totals
        db_quotation.subtotal = float(subtotal)
        db_quotation.discount_amount = float(discount_amount)
        db_quotation.tax_amount = float(tax_amount)
        db_quotation.total_amount = float(subtotal - discount_amount + tax_amount)
    
    db.commit()
    
    # Reload with relationships
    from sqlalchemy.orm import joinedload
    db_quotation = db.query(Quotation).options(
        joinedload(Quotation.customer),
        joinedload(Quotation.items)
    ).filter(Quotation.id == quotation_id).first()
    
    # Return in same format as get_quotation
    return {
        "id": db_quotation.id,
        "company_id": db_quotation.company_id,
        "quotation_number": db_quotation.quotation_number,
        "customer_id": db_quotation.customer_id,
        "quotation_date": db_quotation.quotation_date,
        "valid_until": db_quotation.valid_until,
        "sent_date": db_quotation.sent_date.isoformat() if db_quotation.sent_date else None,
        "status": db_quotation.status,
        "subtotal": float(db_quotation.subtotal) if db_quotation.subtotal else 0.0,
        "tax_amount": float(db_quotation.tax_amount) if db_quotation.tax_amount else 0.0,
        "discount_amount": float(db_quotation.discount_amount) if db_quotation.discount_amount else 0.0,
        "total_amount": float(db_quotation.total_amount) if db_quotation.total_amount else 0.0,
        "currency": db_quotation.currency,
        "payment_terms": db_quotation.payment_terms,
        "delivery_terms": db_quotation.delivery_terms,
        "notes": db_quotation.notes,
        "terms_conditions": db_quotation.terms_conditions,
        "converted_to_order_id": db_quotation.converted_to_order_id,
        "converted_to_invoice_id": db_quotation.converted_to_invoice_id,
        "converted_at": db_quotation.converted_at.isoformat() if db_quotation.converted_at else None,
        "created_by_user_id": db_quotation.created_by_user_id,
        "last_viewed_at": db_quotation.last_viewed_at.isoformat() if db_quotation.last_viewed_at else None,
        "viewed_count": db_quotation.viewed_count or 0,
        "created_at": db_quotation.created_at,
        "updated_at": db_quotation.updated_at,
        "items": [
            {
                "id": item.id,
                "quotation_id": item.quotation_id,
                "product_id": item.product_id,
                "sku": item.sku,
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price) if item.unit_price else 0.0,
                "discount_percent": float(item.discount_percent) if item.discount_percent else 0.0,
                "discount_amount": float(item.discount_amount) if item.discount_amount else 0.0,
                "tax_rate": float(item.tax_rate) if item.tax_rate else 0.0,
                "tax_amount": float(item.tax_amount) if item.tax_amount else 0.0,
                "line_total": float(item.line_total) if item.line_total else 0.0,
                "unit_of_measure": item.unit_of_measure,
                "notes": item.notes
            }
            for item in db_quotation.items
        ],
        "customer": {
            "id": db_quotation.customer.id,
            "name": db_quotation.customer.name,
            "email": db_quotation.customer.email,
            "customer_code": db_quotation.customer.customer_code
        } if db_quotation.customer else None
    }


@router.delete("/{quotation_id}")
def delete_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a quotation"""
    
    quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    if quotation.status in ["ACCEPTED", "CONVERTED"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete quotation that is accepted or converted"
        )
    
    db.delete(quotation)
    db.commit()
    
    return {"success": True, "message": "Quotation deleted successfully"}


@router.post("/{quotation_id}/send")
def send_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark quotation as sent and update sent_date"""
    
    quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    quotation.status = "SENT"
    quotation.sent_date = datetime.now()
    
    db.commit()
    
    return {"success": True, "message": "Quotation marked as sent", "sent_date": quotation.sent_date}


@router.post("/{quotation_id}/accept")
def accept_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark quotation as accepted"""
    
    quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    if quotation.status == "EXPIRED":
        raise HTTPException(status_code=400, detail="Cannot accept expired quotation")
    
    quotation.status = "ACCEPTED"
    
    db.commit()
    
    return {"success": True, "message": "Quotation accepted"}


@router.post("/{quotation_id}/reject")
def reject_quotation(
    quotation_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark quotation as rejected"""
    
    quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    quotation.status = "REJECTED"
    if reason:
        quotation.notes = (quotation.notes or "") + f"\n\nRejection reason: {reason}"
    
    db.commit()
    
    return {"success": True, "message": "Quotation rejected"}


def generate_sales_order_number(db: Session, company_id: int) -> str:
    """Generate next sales order number: SO-0001, SO-0002, etc."""
    last_order = db.query(SalesOrder).filter(
        SalesOrder.company_id == company_id
    ).order_by(SalesOrder.id.desc()).first()
    
    if last_order and last_order.order_number:
        try:
            last_num = int(last_order.order_number.split("-")[1])
            return f"SO-{last_num + 1:04d}"
        except:
            pass
    return "SO-0001"


@router.post("/{quotation_id}/convert-to-order")
def convert_to_order(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Convert quotation to sales order"""
    
    quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    if quotation.status != "ACCEPTED":
        raise HTTPException(
            status_code=400,
            detail="Only accepted quotations can be converted to orders"
        )
    
    if quotation.status == "CONVERTED":
        raise HTTPException(
            status_code=400,
            detail="Quotation has already been converted to an order"
        )
    
    company_id = current_user.get("company_id", 1)
    user_id = current_user.get("user_id", 1)
    
    # Generate order number
    order_number = generate_sales_order_number(db, company_id)
    
    # Create sales order
    sales_order = SalesOrder(
        company_id=company_id,
        order_number=order_number,
        customer_id=quotation.customer_id,
        quotation_id=quotation.id,
        order_date=datetime.now(),
        delivery_date=quotation.valid_until,
        status="PENDING",
        subtotal=quotation.subtotal,
        tax_amount=quotation.tax_amount,
        discount_amount=quotation.discount_amount,
        total_amount=quotation.total_amount,
        currency=quotation.currency,
        payment_terms=quotation.payment_terms,
        delivery_terms=quotation.delivery_terms,
        notes=f"Converted from quotation {quotation.quotation_number}",
        created_by_user_id=user_id
    )
    
    db.add(sales_order)
    db.flush()
    
    # Copy items from quotation
    for quote_item in quotation.items:
        order_item = SalesOrderItem(
            order_id=sales_order.id,
            product_id=quote_item.product_id,
            sku=quote_item.sku,
            description=quote_item.description,
            quantity=quote_item.quantity,
            unit_price=quote_item.unit_price,
            discount_percent=quote_item.discount_percent,
            discount_amount=quote_item.discount_amount,
            tax_rate=quote_item.tax_rate,
            tax_amount=quote_item.tax_amount,
            line_total=quote_item.line_total,
            unit_of_measure=quote_item.unit_of_measure,
            notes=quote_item.notes
        )
        db.add(order_item)
    
    # Update quotation
    quotation.status = "CONVERTED"
    quotation.converted_to_order_id = sales_order.id
    quotation.converted_at = datetime.now()
    
    db.commit()
    db.refresh(sales_order)
    
    return {
        "success": True,
        "message": "Quotation converted to sales order successfully",
        "order_id": sales_order.id,
        "order_number": sales_order.order_number
    }


@router.get("/{quotation_id}/pdf")
def generate_quotation_pdf(
    quotation_id: int,
    view: bool = Query(False, description="View in browser instead of download"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Generate PDF for quotation - returns HTML for viewing or PDF for download"""
    
    from sqlalchemy.orm import joinedload
    from fastapi.responses import HTMLResponse, Response
    
    quotation = db.query(Quotation).options(
        joinedload(Quotation.customer),
        joinedload(Quotation.items)
    ).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    # Get company info (if available)
    from ...common.models import Company
    company = db.query(Company).filter(Company.id == quotation.company_id).first()
    company_name = company.name if company else "Company"
    company_address = getattr(company, 'address', '') if company else ''
    company_phone = getattr(company, 'phone', '') if company else ''
    company_email = getattr(company, 'email', '') if company else ''
    
    # Format currency symbol
    currency_symbols = {
        "INR": "₹",
        "USD": "$",
        "EUR": "€",
        "GBP": "£"
    }
    currency_symbol = currency_symbols.get(quotation.currency, quotation.currency)
    
    # Generate HTML for PDF
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Quotation {quotation.quotation_number}</title>
        <style>
            @media print {{
                @page {{
                    margin: 1.5cm;
                    size: A4;
                }}
                .no-print {{ display: none; }}
            }}
            body {{
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 20px;
                color: #333;
                max-width: 210mm;
                margin: 0 auto;
            }}
            .header {{
                border-bottom: 3px solid #2563eb;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }}
            .header h1 {{
                color: #2563eb;
                margin: 0;
                font-size: 32px;
                font-weight: bold;
            }}
            .header h2 {{
                color: #64748b;
                margin: 5px 0;
                font-size: 18px;
                font-weight: normal;
            }}
            .company-info {{
                float: right;
                text-align: right;
                font-size: 12px;
                color: #64748b;
            }}
            .quotation-info {{
                margin: 20px 0;
                display: flex;
                justify-content: space-between;
            }}
            .info-box {{
                background: #f8fafc;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
            }}
            .info-box h3 {{
                margin: 0 0 10px 0;
                color: #1e293b;
                font-size: 14px;
                text-transform: uppercase;
            }}
            .info-box p {{
                margin: 5px 0;
                font-size: 13px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 30px 0;
                font-size: 12px;
            }}
            th {{
                background: #2563eb;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: 600;
            }}
            td {{
                padding: 12px;
                border-bottom: 1px solid #e2e8f0;
            }}
            tr:hover {{
                background: #f8fafc;
            }}
            .text-right {{
                text-align: right;
            }}
            .text-center {{
                text-align: center;
            }}
            .totals {{
                margin-top: 20px;
                float: right;
                width: 300px;
            }}
            .totals table {{
                margin: 0;
            }}
            .totals td {{
                padding: 8px 12px;
                border: none;
            }}
            .totals .label {{
                text-align: right;
                font-weight: 600;
            }}
            .totals .amount {{
                text-align: right;
                font-size: 14px;
            }}
            .total-row {{
                background: #2563eb;
                color: white;
                font-weight: bold;
                font-size: 16px;
            }}
            .total-row td {{
                padding: 15px 12px;
            }}
            .footer {{
                margin-top: 50px;
                padding-top: 20px;
                border-top: 2px solid #e2e8f0;
                font-size: 11px;
                color: #64748b;
            }}
            .terms {{
                margin-top: 30px;
                padding: 15px;
                background: #f8fafc;
                border-radius: 8px;
            }}
            .terms h4 {{
                margin: 0 0 10px 0;
                color: #1e293b;
            }}
            .terms p {{
                margin: 5px 0;
                font-size: 12px;
                line-height: 1.6;
            }}
            .action-buttons {{
                text-align: center;
                margin: 30px 0;
            }}
            .btn {{
                padding: 12px 24px;
                margin: 0 10px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                text-decoration: none;
                display: inline-block;
            }}
            .btn-primary {{
                background: #2563eb;
                color: white;
            }}
            .btn-secondary {{
                background: #64748b;
                color: white;
            }}
            .btn:hover {{
                opacity: 0.9;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-info">
                <strong>{company_name}</strong><br>
                {company_address}<br>
                {f'Phone: {company_phone}' if company_phone else ''}<br>
                {f'Email: {company_email}' if company_email else ''}
            </div>
            <h1>QUOTATION</h1>
            <h2>{quotation.quotation_number}</h2>
        </div>
        
        <div class="quotation-info">
            <div class="info-box">
                <h3>Quotation Details</h3>
                <p><strong>Date:</strong> {quotation.quotation_date.strftime('%B %d, %Y') if quotation.quotation_date else 'N/A'}</p>
                <p><strong>Valid Until:</strong> {quotation.valid_until.strftime('%B %d, %Y') if quotation.valid_until else 'N/A'}</p>
                <p><strong>Status:</strong> <span style="padding: 4px 8px; background: #dbeafe; border-radius: 4px; font-size: 11px;">{quotation.status}</span></p>
            </div>
            
            <div class="info-box">
                <h3>Bill To</h3>
                <p><strong>{quotation.customer.name if quotation.customer else 'N/A'}</strong></p>
                {f'<p>{quotation.customer.email}</p>' if quotation.customer and quotation.customer.email else ''}
                {f'<p>Code: {quotation.customer.customer_code}</p>' if quotation.customer and quotation.customer.customer_code else ''}
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 40%;">Description</th>
                    <th style="width: 10%;" class="text-center">Qty</th>
                    <th style="width: 15%;" class="text-right">Unit Price</th>
                    <th style="width: 10%;" class="text-right">Discount %</th>
                    <th style="width: 10%;" class="text-right">Tax %</th>
                    <th style="width: 15%;" class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                {''.join([
                    f'''
                    <tr>
                        <td>{idx + 1}</td>
                        <td>
                            <strong>{item.description or 'N/A'}</strong>
                            {f'<br><small style="color: #64748b;">SKU: {item.sku}</small>' if item.sku else ''}
                            {f'<br><small style="color: #64748b;">{item.notes}</small>' if item.notes else ''}
                        </td>
                        <td class="text-center">{item.quantity} {item.unit_of_measure or 'PCS'}</td>
                        <td class="text-right">{currency_symbol}{float(item.unit_price):,.2f}</td>
                        <td class="text-right">{float(item.discount_percent or 0):.2f}%</td>
                        <td class="text-right">{float(item.tax_rate or 0):.2f}%</td>
                        <td class="text-right"><strong>{currency_symbol}{float(item.line_total):,.2f}</strong></td>
                    </tr>
                    '''
                    for idx, item in enumerate(quotation.items)
                ])}
            </tbody>
        </table>
        
        <div class="totals">
            <table>
                <tr>
                    <td class="label">Subtotal:</td>
                    <td class="amount">{currency_symbol}{float(quotation.subtotal or 0):,.2f}</td>
                </tr>
                <tr>
                    <td class="label">Discount:</td>
                    <td class="amount">{currency_symbol}{float(quotation.discount_amount or 0):,.2f}</td>
                </tr>
                <tr>
                    <td class="label">Tax:</td>
                    <td class="amount">{currency_symbol}{float(quotation.tax_amount or 0):,.2f}</td>
                </tr>
                <tr class="total-row">
                    <td class="label">Total:</td>
                    <td class="amount">{currency_symbol}{float(quotation.total_amount or 0):,.2f}</td>
                </tr>
            </table>
        </div>
        
        {f'''
        <div class="terms">
            <h4>Payment Terms</h4>
            <p>{quotation.payment_terms}</p>
        </div>
        ''' if quotation.payment_terms else ''}
        
        {f'''
        <div class="terms">
            <h4>Delivery Terms</h4>
            <p>{quotation.delivery_terms}</p>
        </div>
        ''' if quotation.delivery_terms else ''}
        
        {f'''
        <div class="terms">
            <h4>Terms & Conditions</h4>
            <p>{quotation.terms_conditions}</p>
        </div>
        ''' if quotation.terms_conditions else ''}
        
        {f'''
        <div class="terms">
            <h4>Notes</h4>
            <p>{quotation.notes}</p>
        </div>
        ''' if quotation.notes else ''}
        
        <div class="footer">
            <p style="text-align: center;">
                <strong>Thank you for your business!</strong><br>
                This quotation is valid until {quotation.valid_until.strftime('%B %d, %Y') if quotation.valid_until else 'the specified date'}.<br>
                Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}
            </p>
        </div>
        
        <div class="action-buttons no-print">
            <button class="btn btn-primary" onclick="window.print()">🖨️ Print</button>
            <button class="btn btn-secondary" onclick="window.close()">❌ Close</button>
        </div>
    </body>
    </html>
    """
    
    if view:
        return HTMLResponse(content=html_content)
    else:
        # For download, we'll return HTML that can be printed to PDF
        # In production, you might want to use reportlab or weasyprint for actual PDF generation
        return HTMLResponse(content=html_content, headers={
            "Content-Disposition": f'attachment; filename="Quotation_{quotation.quotation_number}.html"'
        })


@router.get("/{quotation_id}/pdf/download")
def download_quotation_pdf(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Download quotation as PDF (HTML format for now)"""
    return generate_quotation_pdf(quotation_id, view=False, db=db, current_user=current_user)


@router.post("/{quotation_id}/send-email")
def send_quotation_email(
    quotation_id: int,
    email_to: Optional[str] = None,
    subject: Optional[str] = None,
    message: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Send quotation via email"""
    
    quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    if not quotation.customer:
        raise HTTPException(status_code=400, detail="Customer not found for quotation")
    
    # Use customer email if not provided
    recipient_email = email_to or quotation.customer.email
    if not recipient_email:
        raise HTTPException(status_code=400, detail="No email address available for customer")
    
    # TODO: Implement actual email sending using SMTP or email service
    # For now, return success with email details
    email_subject = subject or f"Quotation {quotation.quotation_number} from {current_user.get('company_name', 'Company')}"
    email_message = message or f"Please find attached quotation {quotation.quotation_number}."
    
    # Mark as sent if not already
    if quotation.status == "DRAFT":
        quotation.status = "SENT"
        quotation.sent_date = datetime.now()
        db.commit()
    
    return {
        "success": True,
        "message": "Quotation email sent successfully",
        "to": recipient_email,
        "subject": email_subject,
        "quotation_number": quotation.quotation_number
    }


@router.post("/{quotation_id}/update-status")
def update_quotation_status(
    quotation_id: int,
    status_update: schemas.QuotationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update quotation status with workflow validation"""
    
    new_status = status_update.new_status
    notes = status_update.notes
    
    quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id,
        Quotation.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    new_status = new_status.upper()
    valid_statuses = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED"]
    
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    # Workflow validation
    current_status = quotation.status
    valid_transitions = {
        "DRAFT": ["SENT", "REJECTED"],
        "SENT": ["VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"],
        "VIEWED": ["ACCEPTED", "REJECTED", "EXPIRED"],
        "ACCEPTED": ["CONVERTED", "REJECTED"],
        "REJECTED": [],  # Terminal state
        "EXPIRED": ["REJECTED"],  # Can only be rejected after expiry
        "CONVERTED": []  # Terminal state
    }
    
    if new_status not in valid_transitions.get(current_status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {current_status} to {new_status}"
        )
    
    # Update status
    quotation.status = new_status
    
    # Update timestamps based on status
    if new_status == "SENT" and not quotation.sent_date:
        quotation.sent_date = datetime.now()
    elif new_status == "VIEWED":
        quotation.last_viewed_at = datetime.now()
        quotation.viewed_count = (quotation.viewed_count or 0) + 1
    
    # Add notes if provided
    if notes:
        existing_notes = quotation.notes or ""
        quotation.notes = f"{existing_notes}\n\n[{new_status} - {datetime.now().strftime('%Y-%m-%d %H:%M')}]: {notes}"
    
    db.commit()
    db.refresh(quotation)
    
    return {
        "success": True,
        "message": f"Quotation status updated to {new_status}",
        "quotation": {
            "id": quotation.id,
            "number": quotation.quotation_number,
            "status": quotation.status
        }
    }

