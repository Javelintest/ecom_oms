"""
Duplicate Detection Service
Handles duplicate checking and resolution during import
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Optional, Tuple
from apps.common.models import MangoChannelOrder, ChannelFieldDefinition

class DuplicateDetector:
    """Handles duplicate detection and resolution during order import"""
    
    def __init__(self, db: Session, company_id: int, platform: str):
        self.db = db
        self.company_id = company_id
        self.platform = platform
        self._pk_fields = None
        self._on_duplicate_strategy = None
        
    def get_primary_key_fields(self) -> list:
        """Get primary key field names for this platform"""
        if self._pk_fields is None:
            fields = self.db.query(ChannelFieldDefinition).filter(
                ChannelFieldDefinition.company_id == self.company_id,
                ChannelFieldDefinition.platform == self.platform,
                ChannelFieldDefinition.is_primary_key == True
            ).all()
            self._pk_fields = [f.field_key for f in fields]
        return self._pk_fields
    
    def get_duplicate_strategy(self) -> str:
        """Get duplicate handling strategy (skip/update/error)"""
        if self._on_duplicate_strategy is None:
            # Get first PK field's duplicate strategy
            field = self.db.query(ChannelFieldDefinition).filter(
                ChannelFieldDefinition.company_id == self.company_id,
                ChannelFieldDefinition.platform == self.platform,
                ChannelFieldDefinition.is_primary_key == True
            ).first()
            
            self._on_duplicate_strategy = field.on_duplicate if field else 'skip'
        
        return self._on_duplicate_strategy
    
    def check_duplicate(self, row_data: Dict) -> Optional[MangoChannelOrder]:
        """
        Check if order already exists based on primary keys
        Returns existing order if found, None otherwise
        """
        pk_fields = self.get_primary_key_fields()
        
        if not pk_fields:
            # No primary keys defined, can't check for duplicates
            return None
        
        # Build query
        query = self.db.query(MangoChannelOrder).filter(
            MangoChannelOrder.company_id == self.company_id,
            MangoChannelOrder.platform == self.platform
        )
        
        # Add PK filters
        for pk_field in pk_fields:
            if pk_field in row_data:
                # Filter by JSON path in channel_data
                json_path = f"$.{pk_field}"
                query = query.filter(
                    func.json_extract(MangoChannelOrder.channel_data, json_path) == row_data[pk_field]
                )
        
        return query.first()
    
    def handle_row(self, row_data: Dict, row_index: int) -> Tuple[str, Optional[str]]:
        """
        Handle a single row import with duplicate detection
        
        Returns:
            Tuple of (action, error_message)
            action: 'created', 'updated', 'skipped', 'error'
            error_message: Error details if action is 'error'
        """
        try:
            # Check for existing order
            existing_order = self.check_duplicate(row_data)
            
            if existing_order:
                strategy = self.get_duplicate_strategy()
                
                if strategy == 'skip':
                    return ('skipped', None)
                
                elif strategy == 'error':
                    pk_fields = self.get_primary_key_fields()
                    pk_values = {pk: row_data.get(pk) for pk in pk_fields}
                    return ('error', f"Duplicate found for {pk_values}")
                
                elif strategy == 'update':
                    # Update existing record
                    existing_order.channel_data = row_data
                    existing_order.updated_at = func.now()
                    return ('updated', None)
            
            else:
                # Create new order
                order_id = (row_data.get('order_id') or 
                           row_data.get('Order ID') or 
                           f"{self.platform}_{row_index}")
                customer_name = (row_data.get('customer_name') or 
                               row_data.get('Customer Name') or 
                               "Unknown")
                
                new_order = MangoChannelOrder(
                    company_id=self.company_id,
                    platform=self.platform,
                    platform_order_id=order_id,
                    customer_name=customer_name,
                    order_status="pending",
                    channel_data=row_data
                )
                
                self.db.add(new_order)
                return ('created', None)
        
        except Exception as e:
            return ('error', str(e))
