"""Order service for business logic"""
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.apps.common.models import Order, OrderItem, Platform
from backend.apps.common.utils import parse_datetime


class OrderService:
    """Service for order-related operations"""
    
    @staticmethod
    def list_orders(
        db: Session,
        platform_id: Optional[int] = None,
        status: Optional[str] = None,
        limit: int = 200
    ) -> List[Dict[str, Any]]:
        """List orders with optional filters"""
        query = db.query(Order)
        
        if platform_id:
            query = query.filter(Order.platform_id == platform_id)
        if status:
            query = query.filter(Order.order_status == status)
        
        orders = query.order_by(Order.purchase_date.desc()).limit(limit).all()
        
        return [
            {
                "id": o.id,
                "platform": o.platform.display_name if o.platform else "Unknown",
                "platform_id": o.platform_id,
                "platform_order_id": o.platform_order_id,
                "status": o.order_status,
                "purchase_date": o.purchase_date.isoformat() if o.purchase_date else None,
                "order_total": float(o.order_total or 0),
                "currency": o.currency,
                "customer_name": o.customer_name,
                "marketplace_id": o.marketplace_id,
            }
            for o in orders
        ]
    
    @staticmethod
    def save_order(db: Session, platform_id: int, order_data: Dict[str, Any]) -> Order:
        """Save a single order to database"""
        # Check if order already exists
        existing = db.query(Order).filter_by(
            platform_id=platform_id,
            platform_order_id=order_data["platform_order_id"]
        ).first()
        
        if existing:
            return existing
        
        # Parse dates
        purchase_date = parse_datetime(order_data.get("purchase_date"))
        last_update_date = parse_datetime(order_data.get("last_update_date"))
        
        # Create order
        order = Order(
            platform_id=platform_id,
            platform_order_id=order_data["platform_order_id"],
            order_status=order_data.get("order_status", "Pending"),
            purchase_date=purchase_date,
            last_update_date=last_update_date,
            order_total=order_data.get("order_total", "0"),
            currency=order_data.get("currency", "INR"),
            marketplace_id=order_data.get("marketplace_id"),
            customer_name=order_data.get("customer_name"),
            customer_email=order_data.get("customer_email"),
            shipping_address=order_data.get("shipping_address"),
            platform_metadata=order_data.get("platform_metadata", {}),
        )
        db.add(order)
        db.flush()
        
        # Create order items
        for item_data in order_data.get("items", []):
            item = OrderItem(
                order_id=order.id,
                platform_order_id=order.platform_order_id,
                product_id=item_data.get("product_id"),
                sku=item_data.get("sku"),
                product_name=item_data.get("product_name"),
                quantity=item_data.get("quantity", 1),
                item_price=item_data.get("item_price", "0"),
                platform_metadata=item_data.get("platform_metadata", {}),
            )
            db.add(item)
        
        return order


    @staticmethod
    def get_order_by_id(db: Session, platform_order_id: str, platform_name: str = "amazon") -> Optional[Dict[str, Any]]:
        """Get a single order by platform order ID"""
        platform = db.query(Platform).filter_by(name=platform_name).first()
        if not platform:
            return None
        
        order = db.query(Order).filter_by(
            platform_id=platform.id,
            platform_order_id=platform_order_id
        ).first()
        
        if not order:
            return None
        
        # Get order items
        items = db.query(OrderItem).filter_by(order_id=order.id).all()
        
        return {
            "id": order.id,
            "platform": order.platform.display_name if order.platform else "Unknown",
            "platform_id": order.platform_id,
            "platform_order_id": order.platform_order_id,
            "status": order.order_status,
            "purchase_date": order.purchase_date.isoformat() if order.purchase_date else None,
            "last_update_date": order.last_update_date.isoformat() if order.last_update_date else None,
            "order_total": float(order.order_total or 0),
            "currency": order.currency,
            "customer_name": order.customer_name,
            "customer_email": order.customer_email,
            "shipping_address": order.shipping_address,
            "marketplace_id": order.marketplace_id,
            "platform_metadata": order.platform_metadata,
            "items": [
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "sku": item.sku,
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "item_price": float(item.item_price or 0),
                    "platform_metadata": item.platform_metadata,
                }
                for item in items
            ]
        }


