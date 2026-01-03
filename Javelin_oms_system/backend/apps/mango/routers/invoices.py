"""Tax Invoices Management API Endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from ...common.dependencies import get_db
from ...common.models import Invoice, InvoiceItem, Customer, Product, SalesOrder, SalesOrderItem, Company
from .. import schemas

router = APIRouter(prefix="/invoices", tags=["Invoices"])


# Simple dependency for current user (replace with actual auth later)
async def get_current_user():
    """Temporary user context - replace with real auth"""
    return {"user_id": 1, "company_id": 1}


def generate_invoice_number(db: Session, company_id: int) -> str:
    """Generate next invoice number: INV-0001, INV-0002, etc."""
    last_invoice = db.query(Invoice).filter(
        Invoice.company_id == company_id
    ).order_by(Invoice.id.desc()).first()
    
    if last_invoice and last_invoice.invoice_number:
        try:
            last_num = int(last_invoice.invoice_number.split("-")[1])
            return f"INV-{last_num + 1:04d}"
        except:
            pass
    return "INV-0001"


@router.get("")
def get_invoices(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    payment_status: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get list of invoices with filters"""
    
    from sqlalchemy.orm import joinedload
    
    query = db.query(Invoice).options(joinedload(Invoice.customer)).filter(
        Invoice.company_id == current_user.get("company_id", 1)
    )
    
    # Apply filters
    if status:
        query = query.filter(Invoice.status == status.upper())
    
    if payment_status:
        query = query.filter(Invoice.payment_status == payment_status.upper())
    
    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)
    
    if search:
        query = query.join(Customer).filter(
            or_(
                Invoice.invoice_number.contains(search),
                Customer.name.contains(search),
                Customer.email.contains(search)
            )
        )
    
    if start_date:
        query = query.filter(Invoice.invoice_date >= start_date)
    
    if end_date:
        query = query.filter(Invoice.invoice_date <= end_date)
    
    invoices = query.order_by(Invoice.invoice_date.desc()).offset(skip).limit(limit).all()
    
    # Convert to response format
    result = []
    for invoice in invoices:
        invoice_dict = {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "customer_id": invoice.customer_id,
            "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
            "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
            "status": invoice.status,
            "payment_status": invoice.payment_status,
            "total_amount": float(invoice.total_amount) if invoice.total_amount else 0.0,
            "paid_amount": float(invoice.paid_amount) if invoice.paid_amount else 0.0,
            "balance_amount": float(invoice.balance_amount) if invoice.balance_amount else 0.0,
            "currency": invoice.currency,
            "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
            "customer": {
                "id": invoice.customer.id,
                "name": invoice.customer.name,
                "email": invoice.customer.email,
                "customer_code": invoice.customer.customer_code
            } if invoice.customer else None
        }
        result.append(invoice_dict)
    
    return result


@router.get("/{invoice_id}")
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get invoice by ID"""
    
    from sqlalchemy.orm import joinedload
    
    invoice = db.query(Invoice).options(
        joinedload(Invoice.customer),
        joinedload(Invoice.items)
    ).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Convert to response format
    return {
        "id": invoice.id,
        "company_id": invoice.company_id,
        "invoice_number": invoice.invoice_number,
        "sales_order_id": invoice.sales_order_id,
        "quotation_id": invoice.quotation_id,
        "customer_id": invoice.customer_id,
        "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
        "status": invoice.status,
        "payment_status": invoice.payment_status,
        "subtotal": float(invoice.subtotal) if invoice.subtotal else 0.0,
        "tax_amount": float(invoice.tax_amount) if invoice.tax_amount else 0.0,
        "discount_amount": float(invoice.discount_amount) if invoice.discount_amount else 0.0,
        "shipping_charges": float(invoice.shipping_charges) if invoice.shipping_charges else 0.0,
        "total_amount": float(invoice.total_amount) if invoice.total_amount else 0.0,
        "paid_amount": float(invoice.paid_amount) if invoice.paid_amount else 0.0,
        "balance_amount": float(invoice.balance_amount) if invoice.balance_amount else 0.0,
        "currency": invoice.currency,
        "gst_number": invoice.gst_number,
        "customer_gst_number": invoice.customer_gst_number,
        "place_of_supply": invoice.place_of_supply,
        "tax_type": invoice.tax_type,
        "igst_amount": float(invoice.igst_amount) if invoice.igst_amount else 0.0,
        "cgst_amount": float(invoice.cgst_amount) if invoice.cgst_amount else 0.0,
        "sgst_amount": float(invoice.sgst_amount) if invoice.sgst_amount else 0.0,
        "shipping_address": invoice.shipping_address,
        "billing_address": invoice.billing_address,
        "payment_terms": invoice.payment_terms,
        "delivery_terms": invoice.delivery_terms,
        "notes": invoice.notes,
        "terms_conditions": invoice.terms_conditions,
        "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
        "updated_at": invoice.updated_at.isoformat() if invoice.updated_at else None,
        "items": [
            {
                "id": item.id,
                "invoice_id": item.invoice_id,
                "product_id": item.product_id,
                "sku": item.sku,
                "description": item.description,
                "hsn_code": item.hsn_code,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price) if item.unit_price else 0.0,
                "discount_percent": float(item.discount_percent) if item.discount_percent else 0.0,
                "discount_amount": float(item.discount_amount) if item.discount_amount else 0.0,
                "tax_rate": float(item.tax_rate) if item.tax_rate else 0.0,
                "tax_amount": float(item.tax_amount) if item.tax_amount else 0.0,
                "line_total": float(item.line_total) if item.line_total else 0.0,
                "igst_rate": float(item.igst_rate) if item.igst_rate else 0.0,
                "igst_amount": float(item.igst_amount) if item.igst_amount else 0.0,
                "cgst_rate": float(item.cgst_rate) if item.cgst_rate else 0.0,
                "cgst_amount": float(item.cgst_amount) if item.cgst_amount else 0.0,
                "sgst_rate": float(item.sgst_rate) if item.sgst_rate else 0.0,
                "sgst_amount": float(item.sgst_amount) if item.sgst_amount else 0.0,
                "unit_of_measure": item.unit_of_measure,
                "notes": item.notes
            }
            for item in invoice.items
        ],
        "customer": {
            "id": invoice.customer.id,
            "name": invoice.customer.name,
            "email": invoice.customer.email,
            "customer_code": invoice.customer.customer_code,
            "phone": getattr(invoice.customer, 'phone', None),
            "address": getattr(invoice.customer, 'address', None),
            "gst_number": getattr(invoice.customer, 'gst_number', None)
        } if invoice.customer else None
    }


@router.post("")
def create_invoice(
    invoice: schemas.InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new tax invoice"""
    
    from sqlalchemy.orm import joinedload
    
    company_id = current_user.get("company_id", 1)
    user_id = current_user.get("user_id", 1)
    
    # Generate invoice number
    invoice_number = generate_invoice_number(db, company_id)
    
    # Calculate totals
    subtotal = Decimal(0)
    tax_amount = Decimal(0)
    discount_amount = Decimal(0)
    igst_total = Decimal(0)
    cgst_total = Decimal(0)
    sgst_total = Decimal(0)
    
    # Get company GST info if available
    company = db.query(Company).filter(Company.id == company_id).first()
    company_gst = invoice.gst_number or (getattr(company, 'gst_number', None) if company else None)
    
    # Create invoice
    db_invoice = Invoice(
        company_id=company_id,
        invoice_number=invoice_number,
        sales_order_id=invoice.sales_order_id,
        quotation_id=invoice.quotation_id,
        customer_id=invoice.customer_id,
        invoice_date=invoice.invoice_date or datetime.now(),
        due_date=invoice.due_date,
        status=invoice.status or "DRAFT",
        shipping_address=invoice.shipping_address,
        billing_address=invoice.billing_address,
        payment_terms=invoice.payment_terms,
        delivery_terms=invoice.delivery_terms,
        notes=invoice.notes,
        terms_conditions=invoice.terms_conditions,
        currency=invoice.currency or "INR",
        shipping_charges=invoice.shipping_charges or 0,
        gst_number=company_gst,
        customer_gst_number=invoice.customer_gst_number,
        place_of_supply=invoice.place_of_supply,
        tax_type=invoice.tax_type or "GST",
        payment_status="UNPAID",
        created_by_user_id=user_id
    )
    
    db.add(db_invoice)
    db.flush()  # Get the ID
    
    # Get customer for place of supply logic
    customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first()
    customer_state = getattr(customer, 'state', None) if customer else None
    company_state = getattr(company, 'state', None) if company else None
    
    # Add items
    for item_data in invoice.items:
        # Calculate line totals
        line_subtotal = Decimal(str(item_data.quantity)) * Decimal(str(item_data.unit_price))
        line_discount = (line_subtotal * Decimal(str(item_data.discount_percent or 0))) / 100
        line_after_discount = line_subtotal - line_discount
        line_tax = (line_after_discount * Decimal(str(item_data.tax_rate or 0))) / 100
        line_total = line_after_discount + line_tax
        
        # Calculate GST breakdown (IGST for inter-state, CGST+SGST for intra-state)
        is_interstate = customer_state and company_state and customer_state != company_state
        tax_rate = Decimal(str(item_data.tax_rate or 0))
        
        if is_interstate:
            # Inter-state: IGST
            item_igst = line_tax
            item_cgst = Decimal(0)
            item_sgst = Decimal(0)
        else:
            # Intra-state: CGST + SGST (split 50-50)
            item_igst = Decimal(0)
            item_cgst = line_tax / 2
            item_sgst = line_tax / 2
        
        # Get product if product_id provided
        product = None
        if item_data.product_id:
            product = db.query(Product).filter(Product.id == item_data.product_id).first()
        
        db_item = InvoiceItem(
            invoice_id=db_invoice.id,
            product_id=item_data.product_id,
            sku=item_data.sku or (product.sku if product else None),
            description=item_data.description or (product.name if product else ""),
            hsn_code=item_data.hsn_code or (getattr(product, 'hsn_code', None) if product else None),
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            discount_percent=item_data.discount_percent or 0,
            discount_amount=float(line_discount),
            tax_rate=item_data.tax_rate or 0,
            tax_amount=float(line_tax),
            line_total=float(line_total),
            igst_rate=tax_rate if is_interstate else 0,
            igst_amount=float(item_igst),
            cgst_rate=tax_rate / 2 if not is_interstate else 0,
            cgst_amount=float(item_cgst),
            sgst_rate=tax_rate / 2 if not is_interstate else 0,
            sgst_amount=float(item_sgst),
            unit_of_measure=item_data.unit_of_measure or "PCS",
            notes=item_data.notes
        )
        
        db.add(db_item)
        
        subtotal += line_subtotal
        discount_amount += line_discount
        tax_amount += line_tax
        igst_total += item_igst
        cgst_total += item_cgst
        sgst_total += item_sgst
    
    # Update invoice totals
    db_invoice.subtotal = float(subtotal)
    db_invoice.discount_amount = float(discount_amount)
    db_invoice.tax_amount = float(tax_amount)
    db_invoice.igst_amount = float(igst_total)
    db_invoice.cgst_amount = float(cgst_total)
    db_invoice.sgst_amount = float(sgst_total)
    db_invoice.total_amount = float(subtotal - discount_amount + tax_amount + Decimal(str(db_invoice.shipping_charges or 0)))
    db_invoice.balance_amount = db_invoice.total_amount
    
    db.commit()
    
    # Reload with relationships
    db_invoice = db.query(Invoice).options(
        joinedload(Invoice.customer),
        joinedload(Invoice.items)
    ).filter(Invoice.id == db_invoice.id).first()
    
    return get_invoice(db_invoice.id, db, current_user)


@router.post("/from-sales-order/{sales_order_id}")
def create_invoice_from_sales_order(
    sales_order_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create invoice from sales order"""
    
    from sqlalchemy.orm import joinedload
    
    # Get sales order with product relationships
    sales_order = db.query(SalesOrder).options(
        joinedload(SalesOrder.customer),
        joinedload(SalesOrder.items).joinedload(SalesOrderItem.product)
    ).filter(
        SalesOrder.id == sales_order_id,
        SalesOrder.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not sales_order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    # Create invoice from sales order
    invoice_data = schemas.InvoiceCreate(
        sales_order_id=sales_order_id,
        customer_id=sales_order.customer_id,
        invoice_date=datetime.now(),
        due_date=sales_order.delivery_date,
        status="DRAFT",
        shipping_address=sales_order.shipping_address,
        payment_terms=sales_order.payment_terms,
        delivery_terms=sales_order.delivery_terms,
        notes=f"Invoice generated from Sales Order {sales_order.order_number}",
        currency=sales_order.currency,
        shipping_charges=float(sales_order.shipping_charges or 0),
        items=[
            schemas.InvoiceItemCreate(
                product_id=item.product_id,
                sku=item.sku,
                description=item.description,
                hsn_code=getattr(item.product, 'hsn_code', None) if item.product else None,
                quantity=item.quantity,
                unit_price=float(item.unit_price),
                discount_percent=float(item.discount_percent or 0),
                tax_rate=float(item.tax_rate or 0),
                unit_of_measure=item.unit_of_measure
            )
            for item in sales_order.items
        ]
    )
    
    return create_invoice(invoice_data, db, current_user)


@router.put("/{invoice_id}")
def update_invoice(
    invoice_id: int,
    invoice: schemas.InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update an invoice"""
    
    from sqlalchemy.orm import joinedload
    
    db_invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if db_invoice.status in ["PAID", "CANCELLED"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot update invoice that is paid or cancelled"
        )
    
    # Update fields
    if invoice.customer_id is not None:
        db_invoice.customer_id = invoice.customer_id
    if invoice.invoice_date is not None:
        db_invoice.invoice_date = invoice.invoice_date
    if invoice.due_date is not None:
        db_invoice.due_date = invoice.due_date
    if invoice.status is not None:
        db_invoice.status = invoice.status.upper()
    if invoice.shipping_address is not None:
        db_invoice.shipping_address = invoice.shipping_address
    if invoice.billing_address is not None:
        db_invoice.billing_address = invoice.billing_address
    if invoice.payment_terms is not None:
        db_invoice.payment_terms = invoice.payment_terms
    if invoice.notes is not None:
        db_invoice.notes = invoice.notes
    
    db.commit()
    
    return get_invoice(invoice_id, db, current_user)


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete an invoice"""
    
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status == "PAID":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete paid invoice"
        )
    
    db.delete(invoice)
    db.commit()
    
    return {"success": True, "message": "Invoice deleted successfully"}


@router.post("/{invoice_id}/mark-paid")
def mark_invoice_paid(
    invoice_id: int,
    payment_data: schemas.InvoicePaymentUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark invoice as paid or partially paid"""
    
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    paid_amount = Decimal(str(payment_data.paid_amount))
    total_amount = Decimal(str(invoice.total_amount))
    current_paid = Decimal(str(invoice.paid_amount or 0))
    new_paid = current_paid + paid_amount
    
    if new_paid > total_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount exceeds invoice total. Invoice total: {total_amount}, Already paid: {current_paid}, New payment: {paid_amount}"
        )
    
    invoice.paid_amount = float(new_paid)
    invoice.balance_amount = float(total_amount - new_paid)
    
    if new_paid >= total_amount:
        invoice.payment_status = "PAID"
        invoice.status = "PAID"
        invoice.paid_date = datetime.now()
    elif new_paid > 0:
        invoice.payment_status = "PARTIAL"
    
    invoice.last_payment_date = datetime.now()
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Invoice payment recorded. Balance: {invoice.balance_amount}",
        "payment_status": invoice.payment_status,
        "balance_amount": float(invoice.balance_amount)
    }


@router.get("/{invoice_id}/pdf")
def generate_invoice_pdf(
    invoice_id: int,
    view: bool = Query(False, description="View in browser instead of download"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Generate Tax Invoice PDF - returns HTML for viewing or PDF for download"""
    
    from sqlalchemy.orm import joinedload
    from fastapi.responses import HTMLResponse
    
    invoice = db.query(Invoice).options(
        joinedload(Invoice.customer),
        joinedload(Invoice.items)
    ).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Get company info
    company = db.query(Company).filter(Company.id == invoice.company_id).first()
    company_name = company.name if company else "Company"
    company_address = getattr(company, 'address', '') if company else ''
    company_phone = getattr(company, 'phone', '') if company else ''
    company_email = getattr(company, 'email', '') if company else ''
    company_gst = invoice.gst_number or (getattr(company, 'gst_number', None) if company else None)
    company_state = getattr(company, 'state', None) if company else None
    
    # Format currency symbol
    currency_symbols = {
        "INR": "₹",
        "USD": "$",
        "EUR": "€",
        "GBP": "£"
    }
    currency_symbol = currency_symbols.get(invoice.currency, invoice.currency)
    
    # Determine if inter-state or intra-state
    customer_state = getattr(invoice.customer, 'state', None) if invoice.customer else None
    is_interstate = customer_state and company_state and customer_state != company_state
    
    # Generate HTML for Tax Invoice
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Tax Invoice {invoice.invoice_number}</title>
        <style>
            @media print {{
                @page {{
                    margin: 1cm;
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
                border: 2px solid #000;
                padding: 15px;
                margin-bottom: 20px;
            }}
            .header h1 {{
                color: #000;
                margin: 0;
                font-size: 28px;
                font-weight: bold;
                text-align: center;
            }}
            .header h2 {{
                color: #000;
                margin: 5px 0;
                font-size: 16px;
                font-weight: normal;
                text-align: center;
            }}
            .company-info {{
                float: right;
                text-align: right;
                font-size: 11px;
            }}
            .invoice-info {{
                margin: 20px 0;
                display: flex;
                justify-content: space-between;
            }}
            .info-box {{
                border: 1px solid #000;
                padding: 10px;
                margin-bottom: 15px;
                font-size: 11px;
            }}
            .info-box h3 {{
                margin: 0 0 8px 0;
                color: #000;
                font-size: 12px;
                text-transform: uppercase;
                font-weight: bold;
            }}
            .info-box p {{
                margin: 3px 0;
                font-size: 11px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 10px;
            }}
            th {{
                background: #000;
                color: white;
                padding: 8px;
                text-align: left;
                font-weight: 600;
                border: 1px solid #000;
            }}
            td {{
                padding: 8px;
                border: 1px solid #000;
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
                padding: 6px 10px;
                border: 1px solid #000;
            }}
            .totals .label {{
                text-align: right;
                font-weight: 600;
            }}
            .totals .amount {{
                text-align: right;
            }}
            .total-row {{
                background: #f0f0f0;
                font-weight: bold;
            }}
            .total-row td {{
                padding: 10px;
                font-size: 12px;
            }}
            .gst-summary {{
                margin-top: 20px;
                border: 1px solid #000;
                padding: 10px;
            }}
            .gst-summary h4 {{
                margin: 0 0 10px 0;
                font-size: 12px;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 15px;
                border-top: 2px solid #000;
                font-size: 10px;
                text-align: center;
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
            }}
            .btn-primary {{
                background: #2563eb;
                color: white;
            }}
            .btn-secondary {{
                background: #64748b;
                color: white;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>TAX INVOICE</h1>
            <h2>{invoice.invoice_number}</h2>
            <div class="company-info">
                <strong>{company_name}</strong><br>
                {company_address}<br>
                {f'Phone: {company_phone}' if company_phone else ''}<br>
                {f'Email: {company_email}' if company_email else ''}<br>
                {f'GSTIN: {company_gst}' if company_gst else ''}
            </div>
        </div>
        
        <div class="invoice-info">
            <div class="info-box" style="flex: 1; margin-right: 10px;">
                <h3>Bill To:</h3>
                <p><strong>{invoice.customer.name if invoice.customer else 'N/A'}</strong></p>
                {f'<p>{invoice.customer.email}</p>' if invoice.customer and invoice.customer.email else ''}
                {f'<p>{invoice.customer.phone}</p>' if invoice.customer and getattr(invoice.customer, "phone", None) else ''}
                {f'<p>GSTIN: {invoice.customer_gst_number}</p>' if invoice.customer_gst_number else ''}
                {f'<p>{invoice.billing_address}</p>' if invoice.billing_address else ''}
            </div>
            
            <div class="info-box" style="flex: 1; margin-left: 10px;">
                <h3>Ship To:</h3>
                {f'<p>{invoice.shipping_address}</p>' if invoice.shipping_address else '<p>Same as billing address</p>'}
            </div>
        </div>
        
        <div class="info-box">
            <div style="display: flex; justify-content: space-between;">
                <div>
                    <strong>Invoice Date:</strong> {invoice.invoice_date.strftime('%d-%m-%Y') if invoice.invoice_date else 'N/A'}<br>
                    <strong>Due Date:</strong> {invoice.due_date.strftime('%d-%m-%Y') if invoice.due_date else 'N/A'}<br>
                    <strong>Place of Supply:</strong> {invoice.place_of_supply or (customer_state if customer_state else 'N/A')}
                </div>
                <div>
                    <strong>Status:</strong> {invoice.status}<br>
                    <strong>Payment Status:</strong> {invoice.payment_status}<br>
                    {f'<strong>Balance:</strong> {currency_symbol}{float(invoice.balance_amount):,.2f}' if invoice.balance_amount > 0 else ''}
                </div>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th style="width: 3%;">#</th>
                    <th style="width: 8%;">HSN</th>
                    <th style="width: 30%;">Description</th>
                    <th style="width: 6%;" class="text-center">Qty</th>
                    <th style="width: 10%;" class="text-right">Rate</th>
                    <th style="width: 8%;" class="text-right">Disc %</th>
                    <th style="width: 8%;" class="text-right">Tax %</th>
                    {f'<th style="width: 8%;" class="text-right">IGST</th>' if is_interstate else '<th style="width: 4%;" class="text-right">CGST</th><th style="width: 4%;" class="text-right">SGST</th>'}
                    <th style="width: 10%;" class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                {''.join([
                    f'''
                    <tr>
                        <td>{idx + 1}</td>
                        <td>{item.hsn_code or 'N/A'}</td>
                        <td>
                            <strong>{item.description or 'N/A'}</strong>
                            {f'<br><small>SKU: {item.sku}</small>' if item.sku else ''}
                        </td>
                        <td class="text-center">{item.quantity} {item.unit_of_measure or 'PCS'}</td>
                        <td class="text-right">{currency_symbol}{float(item.unit_price):,.2f}</td>
                        <td class="text-right">{float(item.discount_percent or 0):.2f}%</td>
                        <td class="text-right">{float(item.tax_rate or 0):.2f}%</td>
                        {f'<td class="text-right">{currency_symbol}{float(item.igst_amount):,.2f}</td>' if is_interstate else f'<td class="text-right">{currency_symbol}{float(item.cgst_amount):,.2f}</td><td class="text-right">{currency_symbol}{float(item.sgst_amount):,.2f}</td>'}
                        <td class="text-right"><strong>{currency_symbol}{float(item.line_total):,.2f}</strong></td>
                    </tr>
                    '''
                    for idx, item in enumerate(invoice.items)
                ])}
            </tbody>
        </table>
        
        <div class="totals">
            <table>
                <tr>
                    <td class="label">Subtotal:</td>
                    <td class="amount">{currency_symbol}{float(invoice.subtotal or 0):,.2f}</td>
                </tr>
                <tr>
                    <td class="label">Discount:</td>
                    <td class="amount">{currency_symbol}{float(invoice.discount_amount or 0):,.2f}</td>
                </tr>
                {f'<tr><td class="label">IGST:</td><td class="amount">{currency_symbol}{float(invoice.igst_amount or 0):,.2f}</td></tr>' if is_interstate else f'<tr><td class="label">CGST:</td><td class="amount">{currency_symbol}{float(invoice.cgst_amount or 0):,.2f}</td></tr><tr><td class="label">SGST:</td><td class="amount">{currency_symbol}{float(invoice.sgst_amount or 0):,.2f}</td></tr>'}
                <tr>
                    <td class="label">Shipping:</td>
                    <td class="amount">{currency_symbol}{float(invoice.shipping_charges or 0):,.2f}</td>
                </tr>
                <tr class="total-row">
                    <td class="label">TOTAL:</td>
                    <td class="amount">{currency_symbol}{float(invoice.total_amount or 0):,.2f}</td>
                </tr>
                {f'<tr><td class="label">Paid:</td><td class="amount">{currency_symbol}{float(invoice.paid_amount or 0):,.2f}</td></tr>' if invoice.paid_amount > 0 else ''}
                {f'<tr><td class="label">Balance:</td><td class="amount"><strong>{currency_symbol}{float(invoice.balance_amount or 0):,.2f}</strong></td></tr>' if invoice.balance_amount > 0 else ''}
            </table>
        </div>
        
        {f'<div class="info-box"><h3>Notes</h3><p>{invoice.notes}</p></div>' if invoice.notes else ''}
        {f'<div class="info-box"><h3>Terms & Conditions</h3><p>{invoice.terms_conditions}</p></div>' if invoice.terms_conditions else ''}
        
        <div class="footer">
            <p style="text-align: center;">
                <strong>This is a computer-generated invoice.</strong><br>
                Generated on {datetime.now().strftime('%d-%m-%Y at %I:%M %p')}
            </p>
        </div>
        
        <div class="action-buttons no-print">
            <button class="btn btn-primary" onclick="window.print()">🖨️ Print Invoice</button>
            <button class="btn btn-secondary" onclick="window.close()">❌ Close</button>
        </div>
    </body>
    </html>
    """
    
    if view:
        return HTMLResponse(content=html_content)
    else:
        return HTMLResponse(content=html_content, headers={
            "Content-Disposition": f'attachment; filename="TaxInvoice_{invoice.invoice_number}.html"'
        })

