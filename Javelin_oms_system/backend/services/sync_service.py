"""Sync service for syncing data from platforms"""
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from ..common.models import Platform, SyncLog
from ..platforms import get_adapter
from .order_service import OrderService
from .inventory_service import InventoryService


class SyncService:
    """Service for syncing data from platforms"""
    
    @staticmethod
    def sync_orders(
        db: Session,
        platform_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Sync orders from one or all platforms"""
        if platform_name:
            platforms_to_sync = db.query(Platform).filter_by(
                name=platform_name.lower(),
                is_active=1
            ).all()
            if not platforms_to_sync:
                raise ValueError(f"Platform '{platform_name}' not found or inactive")
        else:
            platforms_to_sync = db.query(Platform).filter_by(is_active=1).all()
        
        total_inserted = 0
        results = {}
        
        for platform in platforms_to_sync:
            try:
                # Pass API config to adapter (for Amazon SP-API credentials)
                adapter = get_adapter(platform.name, api_config=platform.api_config)
                data = adapter.fetch_recent_orders()
                inserted = 0
                
                for order_data in data:
                    try:
                        OrderService.save_order(db, platform.id, order_data)
                        inserted += 1
                    except Exception as e:
                        # Log individual order errors but continue
                        print(f"Error saving order {order_data.get('platform_order_id')}: {e}")
                        continue
                
                db.commit()
                
                # Log sync
                log = SyncLog(
                    platform_id=platform.id,
                    job_type="orders",
                    status="success",
                    message=f"Inserted {inserted} orders from {platform.display_name}",
                    records_processed=inserted
                )
                db.add(log)
                db.commit()
                
                results[platform.name] = inserted
                total_inserted += inserted
                
            except Exception as e:
                db.rollback()
                # Log error
                log = SyncLog(
                    platform_id=platform.id if platform else None,
                    job_type="orders",
                    status="failed",
                    message=f"Error syncing {platform.display_name if platform else 'unknown'}: {str(e)}",
                    error_details=str(e)
                )
                db.add(log)
                db.commit()
                results[platform.name] = {"error": str(e)}
        
        return {
            "status": "ok",
            "total_inserted": total_inserted,
            "platforms": results
        }
    
    @staticmethod
    def sync_inventory(
        db: Session,
        platform_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Sync inventory from one or all platforms"""
        if platform_name:
            platforms_to_sync = db.query(Platform).filter_by(
                name=platform_name.lower(),
                is_active=1
            ).all()
            if not platforms_to_sync:
                raise ValueError(f"Platform '{platform_name}' not found or inactive")
        else:
            platforms_to_sync = db.query(Platform).filter_by(is_active=1).all()
        
        total_upserted = 0
        results = {}
        
        for platform in platforms_to_sync:
            try:
                # Pass API config to adapter (for Amazon SP-API credentials)
                adapter = get_adapter(platform.name, api_config=platform.api_config)
                data = adapter.fetch_inventory_snapshot()
                upserted = 0
                
                for inv_data in data:
                    try:
                        InventoryService.upsert_inventory(db, platform.id, inv_data)
                        upserted += 1
                    except Exception as e:
                        print(f"Error upserting inventory {inv_data.get('sku')}: {e}")
                        continue
                
                db.commit()
                
                # Log sync
                log = SyncLog(
                    platform_id=platform.id,
                    job_type="inventory",
                    status="success",
                    message=f"Upserted {upserted} SKUs from {platform.display_name}",
                    records_processed=upserted
                )
                db.add(log)
                db.commit()
                
                results[platform.name] = upserted
                total_upserted += upserted
                
            except Exception as e:
                db.rollback()
                # Log error
                log = SyncLog(
                    platform_id=platform.id if platform else None,
                    job_type="inventory",
                    status="failed",
                    message=f"Error syncing {platform.display_name if platform else 'unknown'}: {str(e)}",
                    error_details=str(e)
                )
                db.add(log)
                db.commit()
                results[platform.name] = {"error": str(e)}
        
        return {
            "status": "ok",
            "total_upserted": total_upserted,
            "platforms": results
        }

