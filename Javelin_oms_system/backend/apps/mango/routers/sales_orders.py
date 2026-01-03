"""Sales Orders Management API Endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from ...common.dependencies import get_db
from ...common.models import SalesOrder, SalesOrderItem, Customer, Product, Quotation
from .. import schemas

router = APIRouter(prefix="/sales-orders", tags=["Sales Orders"])


# Simple dependency for current user (replace with actual auth later)
async def get_current_user():
    """Temporary user context - replace with real auth"""
    return {"user_id": 1, "company_id": 1}


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


@router.get("")
def get_sales_orders(
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
    """Get list of sales orders with filters"""
    
    from sqlalchemy.orm import joinedload
    
    query = db.query(SalesOrder).options(joinedload(SalesOrder.customer)).filter(
        SalesOrder.company_id == current_user.get("company_id", 1)
    )
    
    # Apply filters
    if status:
        query = query.filter(SalesOrder.status == status.upper())
    
    if customer_id:
        query = query.filter(SalesOrder.customer_id == customer_id)
    
    if search:
        query = query.join(Customer).filter(
            or_(
                SalesOrder.order_number.contains(search),
                Customer.name.contains(search),
                Customer.email.contains(search)
            )
        )
    
    if start_date:
        query = query.filter(SalesOrder.order_date >= start_date)
    
    if end_date:
        query = query.filter(SalesOrder.order_date <= end_date)
    
    orders = query.order_by(SalesOrder.order_date.desc()).offset(skip).limit(limit).all()
    
    # Convert to response format
    result = []
    for order in orders:
        order_dict = {
            "id": order.id,
            "order_number": order.order_number,
            "customer_id": order.customer_id,
            "order_date": order.order_date.isoformat() if order.order_date else None,
            "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
            "status": order.status,
            "total_amount": float(order.total_amount) if order.total_amount else 0.0,
            "currency": order.currency,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "customer": {
                "id": order.customer.id,
                "name": order.customer.name,
                "email": order.customer.email,
                "customer_code": order.customer.customer_code
            } if order.customer else None
        }
        result.append(order_dict)
    
    return result


@router.get("/{order_id}")
def get_sales_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get sales order by ID"""
    
    from sqlalchemy.orm import joinedload
    
    order = db.query(SalesOrder).options(
        joinedload(SalesOrder.customer),
        joinedload(SalesOrder.items)
    ).filter(
        SalesOrder.id == order_id,
        SalesOrder.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    # Convert to response format
    return {
        "id": order.id,
        "company_id": order.company_id,
        "order_number": order.order_number,
        "customer_id": order.customer_id,
        "quotation_id": order.quotation_id,
        "order_date": order.order_date.isoformat() if order.order_date else None,
        "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
        "status": order.status,
        "subtotal": float(order.subtotal) if order.subtotal else 0.0,
        "tax_amount": float(order.tax_amount) if order.tax_amount else 0.0,
        "discount_amount": float(order.discount_amount) if order.discount_amount else 0.0,
        "shipping_charges": float(order.shipping_charges) if order.shipping_charges else 0.0,
        "total_amount": float(order.total_amount) if order.total_amount else 0.0,
        "currency": order.currency,
        "shipping_address": order.shipping_address,
        "shipping_method": order.shipping_method,
        "tracking_number": order.tracking_number,
        "payment_terms": order.payment_terms,
        "delivery_terms": order.delivery_terms,
        "notes": order.notes,
        "created_by_user_id": order.created_by_user_id,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        "items": [
            {
                "id": item.id,
                "order_id": item.order_id,
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
            for item in order.items
        ],
        "customer": {
            "id": order.customer.id,
            "name": order.customer.name,
            "email": order.customer.email,
            "customer_code": order.customer.customer_code,
            "phone": getattr(order.customer, 'phone', None),
            "address": getattr(order.customer, 'address', None)
        } if order.customer else None
    }


@router.post("")
def create_sales_order(
    order: schemas.SalesOrderCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new sales order"""
    
    from sqlalchemy.orm import joinedload
    
    company_id = current_user.get("company_id", 1)
    user_id = current_user.get("user_id", 1)
    
    # Generate order number
    order_number = generate_sales_order_number(db, company_id)
    
    # Calculate totals
    subtotal = Decimal(0)
    tax_amount = Decimal(0)
    discount_amount = Decimal(0)
    
    # Create sales order
    db_order = SalesOrder(
        company_id=company_id,
        order_number=order_number,
        customer_id=order.customer_id,
        quotation_id=order.quotation_id,
        order_date=order.order_date or datetime.now(),
        delivery_date=order.delivery_date,
        status=order.status or "PENDING",
        shipping_address=order.shipping_address,
        shipping_method=order.shipping_method,
        payment_terms=order.payment_terms,
        delivery_terms=order.delivery_terms,
        notes=order.notes,
        currency=order.currency or "INR",
        shipping_charges=order.shipping_charges or 0,
        created_by_user_id=user_id
    )
    
    db.add(db_order)
    db.flush()  # Get the ID
    
    # Add items
    for item_data in order.items:
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
        
        db_item = SalesOrderItem(
            order_id=db_order.id,
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
    
    # Update order totals
    db_order.subtotal = float(subtotal)
    db_order.discount_amount = float(discount_amount)
    db_order.tax_amount = float(tax_amount)
    db_order.total_amount = float(subtotal - discount_amount + tax_amount + Decimal(str(db_order.shipping_charges or 0)))
    
    db.commit()
    
    # Reload with relationships
    db_order = db.query(SalesOrder).options(
        joinedload(SalesOrder.customer),
        joinedload(SalesOrder.items)
    ).filter(SalesOrder.id == db_order.id).first()
    
    # Return in same format as get_sales_order
    return {
        "id": db_order.id,
        "order_number": db_order.order_number,
        "customer_id": db_order.customer_id,
        "order_date": db_order.order_date.isoformat() if db_order.order_date else None,
        "status": db_order.status,
        "total_amount": float(db_order.total_amount) if db_order.total_amount else 0.0,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "sku": item.sku,
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price) if item.unit_price else 0.0,
                "line_total": float(item.line_total) if item.line_total else 0.0
            }
            for item in db_order.items
        ],
        "customer": {
            "id": db_order.customer.id,
            "name": db_order.customer.name,
            "email": db_order.customer.email
        } if db_order.customer else None
    }


@router.put("/{order_id}")
def update_sales_order(
    order_id: int,
    order: schemas.SalesOrderUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a sales order"""
    
    from sqlalchemy.orm import joinedload
    
    db_order = db.query(SalesOrder).filter(
        SalesOrder.id == order_id,
        SalesOrder.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not db_order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    if db_order.status in ["DELIVERED", "CANCELLED"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot update order that is delivered or cancelled"
        )
    
    # Update fields
    if order.customer_id is not None:
        db_order.customer_id = order.customer_id
    if order.order_date is not None:
        db_order.order_date = order.order_date
    if order.delivery_date is not None:
        db_order.delivery_date = order.delivery_date
    if order.status is not None:
        db_order.status = order.status.upper()
    if order.shipping_address is not None:
        db_order.shipping_address = order.shipping_address
    if order.shipping_method is not None:
        db_order.shipping_method = order.shipping_method
    if order.tracking_number is not None:
        db_order.tracking_number = order.tracking_number
    if order.payment_terms is not None:
        db_order.payment_terms = order.payment_terms
    if order.delivery_terms is not None:
        db_order.delivery_terms = order.delivery_terms
    if order.notes is not None:
        db_order.notes = order.notes
    if order.shipping_charges is not None:
        db_order.shipping_charges = order.shipping_charges
    
    # Update items if provided
    if order.items is not None:
        # Delete existing items
        db.query(SalesOrderItem).filter(SalesOrderItem.order_id == order_id).delete()
        
        # Recalculate totals
        subtotal = Decimal(0)
        tax_amount = Decimal(0)
        discount_amount = Decimal(0)
        
        # Add new items
        for item_data in order.items:
            line_subtotal = Decimal(str(item_data.quantity)) * Decimal(str(item_data.unit_price))
            line_discount = (line_subtotal * Decimal(str(item_data.discount_percent or 0))) / 100
            line_after_discount = line_subtotal - line_discount
            line_tax = (line_after_discount * Decimal(str(item_data.tax_rate or 0))) / 100
            line_total = line_after_discount + line_tax
            
            product = None
            if item_data.product_id:
                product = db.query(Product).filter(Product.id == item_data.product_id).first()
            
            db_item = SalesOrderItem(
                order_id=db_order.id,
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
        db_order.subtotal = float(subtotal)
        db_order.discount_amount = float(discount_amount)
        db_order.tax_amount = float(tax_amount)
        db_order.total_amount = float(subtotal - discount_amount + tax_amount + Decimal(str(db_order.shipping_charges or 0)))
    
    db.commit()
    
    # Reload with relationships
    db_order = db.query(SalesOrder).options(
        joinedload(SalesOrder.customer),
        joinedload(SalesOrder.items)
    ).filter(SalesOrder.id == order_id).first()
    
    return get_sales_order(order_id, db, current_user)


@router.delete("/{order_id}")
def delete_sales_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a sales order"""
    
    order = db.query(SalesOrder).filter(
        SalesOrder.id == order_id,
        SalesOrder.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    if order.status in ["SHIPPED", "DELIVERED"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete order that is shipped or delivered"
        )
    
    db.delete(order)
    db.commit()
    
    return {"success": True, "message": "Sales order deleted successfully"}


@router.post("/{order_id}/update-status")
def update_order_status(
    order_id: int,
    status: str = Query(..., description="New status: PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update sales order status"""
    
    order = db.query(SalesOrder).filter(
        SalesOrder.id == order_id,
        SalesOrder.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    valid_statuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]
    if status.upper() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    order.status = status.upper()
    db.commit()
    
    return {"success": True, "message": f"Order status updated to {status.upper()}", "status": order.status}


@router.get("/{order_id}/pdf")
def generate_sales_order_pdf(
    order_id: int,
    view: bool = Query(False, description="View in browser instead of download"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Generate PDF for sales order - returns HTML for viewing or PDF for download"""
    
    from sqlalchemy.orm import joinedload
    from fastapi.responses import HTMLResponse
    
    order = db.query(SalesOrder).options(
        joinedload(SalesOrder.customer),
        joinedload(SalesOrder.items)
    ).filter(
        SalesOrder.id == order_id,
        SalesOrder.company_id == current_user.get("company_id", 1)
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    # Get company info
    from ...common.models import Company
    company = db.query(Company).filter(Company.id == order.company_id).first()
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
    currency_symbol = currency_symbols.get(order.currency, order.currency)
    
    # Generate HTML for PDF (similar to quotation template)
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Sales Order {order.order_number}</title>
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
                border-bottom: 3px solid #10b981;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }}
            .header h1 {{
                color: #10b981;
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
            .order-info {{
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
                background: #10b981;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: 600;
            }}
            td {{
                padding: 12px;
                border-bottom: 1px solid #e2e8f0;
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
                background: #10b981;
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
                background: #10b981;
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
            <div class="company-info">
                <strong>{company_name}</strong><br>
                {company_address}<br>
                {f'Phone: {company_phone}' if company_phone else ''}<br>
                {f'Email: {company_email}' if company_email else ''}
            </div>
            <h1>SALES ORDER</h1>
            <h2>{order.order_number}</h2>
        </div>
        
        <div class="order-info">
            <div class="info-box">
                <h3>Order Details</h3>
                <p><strong>Date:</strong> {order.order_date.strftime('%B %d, %Y') if order.order_date else 'N/A'}</p>
                <p><strong>Delivery Date:</strong> {order.delivery_date.strftime('%B %d, %Y') if order.delivery_date else 'N/A'}</p>
                <p><strong>Status:</strong> <span style="padding: 4px 8px; background: #dbeafe; border-radius: 4px; font-size: 11px;">{order.status}</span></p>
            </div>
            
            <div class="info-box">
                <h3>Bill To</h3>
                <p><strong>{order.customer.name if order.customer else 'N/A'}</strong></p>
                {f'<p>{order.customer.email}</p>' if order.customer and order.customer.email else ''}
                {f'<p>Code: {order.customer.customer_code}</p>' if order.customer and order.customer.customer_code else ''}
            </div>
        </div>
        
        {f'<div class="info-box"><h3>Shipping Address</h3><p>{order.shipping_address}</p></div>' if order.shipping_address else ''}
        
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
                        </td>
                        <td class="text-center">{item.quantity} {item.unit_of_measure or 'PCS'}</td>
                        <td class="text-right">{currency_symbol}{float(item.unit_price):,.2f}</td>
                        <td class="text-right">{float(item.discount_percent or 0):.2f}%</td>
                        <td class="text-right">{float(item.tax_rate or 0):.2f}%</td>
                        <td class="text-right"><strong>{currency_symbol}{float(item.line_total):,.2f}</strong></td>
                    </tr>
                    '''
                    for idx, item in enumerate(order.items)
                ])}
            </tbody>
        </table>
        
        <div class="totals">
            <table>
                <tr>
                    <td class="label">Subtotal:</td>
                    <td class="amount">{currency_symbol}{float(order.subtotal or 0):,.2f}</td>
                </tr>
                <tr>
                    <td class="label">Discount:</td>
                    <td class="amount">{currency_symbol}{float(order.discount_amount or 0):,.2f}</td>
                </tr>
                <tr>
                    <td class="label">Tax:</td>
                    <td class="amount">{currency_symbol}{float(order.tax_amount or 0):,.2f}</td>
                </tr>
                <tr>
                    <td class="label">Shipping:</td>
                    <td class="amount">{currency_symbol}{float(order.shipping_charges or 0):,.2f}</td>
                </tr>
                <tr class="total-row">
                    <td class="label">Total:</td>
                    <td class="amount">{currency_symbol}{float(order.total_amount or 0):,.2f}</td>
                </tr>
            </table>
        </div>
        
        {f'<div class="info-box"><h3>Notes</h3><p>{order.notes}</p></div>' if order.notes else ''}
        
        <div class="footer">
            <p style="text-align: center;">
                <strong>Thank you for your order!</strong><br>
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
        return HTMLResponse(content=html_content, headers={
            "Content-Disposition": f'attachment; filename="SalesOrder_{order.order_number}.html"'
        })

