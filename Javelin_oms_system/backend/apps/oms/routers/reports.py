"""Reports router - fetch and display reports from e-commerce platforms"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging

from backend.apps.common.db import get_db
from backend.apps.common import models
from ..platforms import get_adapter

router = APIRouter(prefix="/reports", tags=["reports"])
logger = logging.getLogger(__name__)


# Available Amazon report types
AMAZON_REPORT_TYPES = {
    "GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL": {
        "name": "All Orders",
        "description": "Order report with buyer and product information",
        "category": "Orders"
    },
    "GET_AMAZON_FULFILLED_SHIPMENTS_DATA_GENERAL": {
        "name": "Amazon Fulfilled Shipments",
        "description": "Shipment tracking information for FBA orders",
        "category": "Fulfillment"
    },
    "GET_FLAT_FILE_OPEN_LISTINGS_DATA": {
        "name": "Active Listings",
        "description": "All active product listings",
        "category": "Inventory"
    },
    "GET_MERCHANT_LISTINGS_ALL_DATA": {
        "name": "All Listings",
        "description": "All product listings including inactive",
        "category": "Inventory"
    },
    "GET_FBA_FULFILLMENT_CURRENT_INVENTORY_DATA": {
        "name": "FBA Inventory",
        "description": "Current FBA inventory levels",
        "category": "Inventory"
    },
    "GET_SELLER_FEEDBACK_DATA": {
        "name": "Seller Feedback",
        "description": "Customer feedback and ratings",
        "category": "Performance"
    },
    "GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE": {
        "name": "Settlement Report",
        "description": "Financial settlement details",
        "category": "Finance"
    },
    "GET_FLAT_FILE_RETURNS_DATA_BY_RETURN_DATE": {
        "name": "Returns Report",
        "description": "Product return information",
        "category": "Returns"
    },
}


@router.get("/types", response_model=List[Dict[str, Any]])
def get_report_types(
    platform_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get available report types for platforms"""
    if platform_id:
        platform = db.query(models.Platform).filter_by(id=platform_id).first()
        if not platform:
            raise HTTPException(status_code=404, detail="Platform not found")
        
        if platform.name == "amazon":
            return [
                {
                    "type": key,
                    "name": value["name"],
                    "description": value["description"],
                    "category": value["category"],
                    "platform": "amazon"
                }
                for key, value in AMAZON_REPORT_TYPES.items()
            ]
        else:
            return []
    else:
        # Return all available report types
        all_types = []
        for key, value in AMAZON_REPORT_TYPES.items():
            all_types.append({
                "type": key,
                "name": value["name"],
                "description": value["description"],
                "category": value["category"],
                "platform": "amazon"
            })
        return all_types


@router.post("/request")
async def request_report(
    platform_id: int = Query(...),
    report_type: str = Query(...),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Request a report from a platform"""
    platform = db.query(models.Platform).filter_by(id=platform_id).first()
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    if not platform.is_active:
        raise HTTPException(status_code=400, detail="Platform is not active")
    
    try:
        adapter = get_adapter(platform.name, platform.api_config)
        
        # For Amazon, use SP-API Reports API
        if platform.name == "amazon":
            from ..platforms.amazon.spapi_client import AmazonSPAPIClient
            from ..platforms.amazon.config import AmazonSPAPIConfig
            
            config = AmazonSPAPIConfig.from_platform_config(platform.api_config)
            client = AmazonSPAPIClient(config)
            
            # Request report
            report_id = await client.request_report(
                report_type=report_type,
                start_date=start_date,
                end_date=end_date
            )
            
            return {
                "status": "success",
                "message": "Report requested successfully",
                "report_id": report_id,
                "platform": platform.name
            }
        else:
            return {
                "status": "error",
                "message": f"Reports not implemented for {platform.display_name}"
            }
            
    except Exception as e:
        logger.error(f"Error requesting report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{report_id}")
async def get_report_status(
    report_id: str,
    platform_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """Get the status of a requested report"""
    platform = db.query(models.Platform).filter_by(id=platform_id).first()
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    try:
        if platform.name == "amazon":
            from ..platforms.amazon.spapi_client import AmazonSPAPIClient
            from ..platforms.amazon.config import AmazonSPAPIConfig
            
            config = AmazonSPAPIConfig.from_platform_config(platform.api_config)
            client = AmazonSPAPIClient(config)
            
            status = await client.get_report_status(report_id)
            return status
        else:
            raise HTTPException(status_code=400, detail="Platform not supported")
            
    except Exception as e:
        logger.error(f"Error getting report status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{report_document_id}")
async def download_report(
    report_document_id: str,
    platform_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """Download a completed report"""
    platform = db.query(models.Platform).filter_by(id=platform_id).first()
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    try:
        if platform.name == "amazon":
            from ..platforms.amazon.spapi_client import AmazonSPAPIClient
            from ..platforms.amazon.config import AmazonSPAPIConfig
            
            config = AmazonSPAPIConfig.from_platform_config(platform.api_config)
            client = AmazonSPAPIClient(config)
            
            report_data = await client.download_report(report_document_id)
            return {
                "status": "success",
                "data": report_data
            }
        else:
            raise HTTPException(status_code=400, detail="Platform not supported")
            
    except Exception as e:
        logger.error(f"Error downloading report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_reports(
    platform_id: int = Query(...),
    report_types: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db)
):
    """List all reports for a platform"""
    platform = db.query(models.Platform).filter_by(id=platform_id).first()
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    try:
        if platform.name == "amazon":
            from ..platforms.amazon.spapi_client import AmazonSPAPIClient
            from ..platforms.amazon.config import AmazonSPAPIConfig
            
            try:
                config = AmazonSPAPIConfig.from_platform_config(platform.api_config)
                client = AmazonSPAPIClient(config)
                
                reports = await client.get_reports(report_types=report_types)
                return {
                    "status": "success",
                    "reports": reports,
                    "platform": platform.name
                }
            except Exception as api_error:
                # Check if it's an authentication error
                error_str = str(api_error)
                if "invalid_client" in error_str or "Client authentication failed" in error_str or \
                   "Unauthorized" in error_str or "401" in error_str:
                    logger.warning(f"Amazon credentials invalid, returning mock data: {api_error}")
                    
                    # Return mock reports data for testing
                    from datetime import datetime, timedelta
                    mock_reports = [
                        {
                            "report_id": "MOCK_REPORT_001",
                            "report_type": "GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL",
                            "processing_status": "DONE",
                            "report_document_id": "MOCK_DOC_001",
                            "created_time": (datetime.now() - timedelta(days=1)).isoformat(),
                            "processing_end_time": (datetime.now() - timedelta(hours=23)).isoformat()
                        },
                        {
                            "report_id": "MOCK_REPORT_002",
                            "report_type": "GET_MERCHANT_LISTINGS_ALL_DATA",
                            "processing_status": "DONE",
                            "report_document_id": "MOCK_DOC_002",
                            "created_time": (datetime.now() - timedelta(days=2)).isoformat(),
                            "processing_end_time": (datetime.now() - timedelta(days=2, hours=1)).isoformat()
                        },
                        {
                            "report_id": "MOCK_REPORT_003",
                            "report_type": "GET_FBA_FULFILLMENT_CURRENT_INVENTORY_DATA",
                            "processing_status": "IN_PROGRESS",
                            "report_document_id": None,
                            "created_time": (datetime.now() - timedelta(hours=2)).isoformat(),
                            "processing_end_time": None
                        },
                        {
                            "report_id": "MOCK_REPORT_004",
                            "report_type": "GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE",
                            "processing_status": "DONE",
                            "report_document_id": "MOCK_DOC_004",
                            "created_time": (datetime.now() - timedelta(days=7)).isoformat(),
                            "processing_end_time": (datetime.now() - timedelta(days=7, hours=2)).isoformat()
                        }
                    ]
                    
                    return {
                        "status": "success",
                        "reports": mock_reports,
                        "platform": platform.name,
                        "mock_data": True,
                        "message": "Using mock data - Amazon credentials are invalid. Please update credentials in Connections page."
                    }
                else:
                    # Re-raise if it's not an auth error
                    raise
        else:
            raise HTTPException(status_code=400, detail="Platform not supported")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

