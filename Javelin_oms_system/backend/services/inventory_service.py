"""Inventory service for business logic"""
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from ..common.models import Inventory, Platform


class InventoryService:
    """Service for inventory-related operations"""
    
    @staticmethod
    def list_inventory(
        db: Session,
        platform_id: Optional[int] = None,
        sku: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """List inventory with optional filters"""
        query = db.query(Inventory)
        
        if platform_id:
            query = query.filter(Inventory.platform_id == platform_id)
        if sku:
            query = query.filter(Inventory.sku == sku)
        
        inv_items = query.order_by(Inventory.sku).all()
        
        return [
            {
                "id": i.id,
                "platform": i.platform.display_name if i.platform else "Unknown",
                "platform_id": i.platform_id,
                "sku": i.sku,
                "product_id": i.product_id,
                "product_name": i.product_name,
                "total_quantity": i.total_quantity,
                "available_quantity": i.available_quantity,
                "reserved_quantity": i.reserved_quantity,
                "updated_at": i.updated_at.isoformat() if i.updated_at else None,
            }
            for i in inv_items
        ]
    
    @staticmethod
    def upsert_inventory(db: Session, platform_id: int, inv_data: Dict[str, Any]) -> Inventory:
        """Upsert inventory item"""
        sku = inv_data.get("sku")
        if not sku:
            raise ValueError("SKU is required")
        
        # Find existing inventory
        inv = db.query(Inventory).filter_by(
            platform_id=platform_id,
            sku=sku
        ).first()
        
        if not inv:
            inv = Inventory(
                platform_id=platform_id,
                sku=sku
            )
            db.add(inv)
        
        # Update fields
        inv.product_id = inv_data.get("product_id")
        inv.product_name = inv_data.get("product_name")
        inv.total_quantity = inv_data.get("total_quantity", 0)
        inv.available_quantity = inv_data.get("available_quantity", 0)
        inv.reserved_quantity = inv_data.get("reserved_quantity", 0)
        inv.platform_metadata = inv_data.get("platform_metadata", {})
        
        return inv

