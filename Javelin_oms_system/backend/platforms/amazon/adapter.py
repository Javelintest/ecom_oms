"""Amazon SP-API adapter"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging
from ..base import PlatformAdapter
from .config import AmazonSPAPIConfig
from .spapi_client import AmazonSPAPIClient

logger = logging.getLogger(__name__)


class AmazonAdapter(PlatformAdapter):
    """Amazon SP-API adapter with real API integration"""
    
    def __init__(self, api_config: Optional[Dict[str, Any]] = None):
        """
        Initialize Amazon adapter.
        
        Args:
            api_config: Platform API configuration dictionary. If None, will use mock data.
        """
        self.api_config = api_config
        self._spapi_client = None
        
        if api_config:
            try:
                config = AmazonSPAPIConfig.from_platform_config(api_config)
                self._spapi_client = AmazonSPAPIClient(config)
                logger.info("Amazon SP-API client initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Amazon SP-API client: {e}. Using mock data.")
                self._spapi_client = None
    
    @property
    def platform_name(self) -> str:
        return "amazon"
    
    def fetch_recent_orders(
        self,
        created_after: Optional[datetime] = None,
        days_back: int = 7,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Fetch recent orders from Amazon SP-API.
        
        Args:
            created_after: Get orders created after this date
            days_back: Number of days to look back (if created_after not provided)
            **kwargs: Additional parameters for SP-API
            
        Returns:
            List of normalized order dictionaries
        """
        # If SP-API client is available, use real API
        if self._spapi_client:
            try:
                # Default to last N days if no date specified
                if not created_after:
                    created_after = datetime.utcnow() - timedelta(days=days_back)
                
                # Fetch orders
                orders = self._spapi_client.get_orders(
                    created_after=created_after,
                    max_results=kwargs.get("max_results", 100)
                )
                
                # Fetch order items for each order
                for order in orders:
                    try:
                        order_id = order["platform_metadata"].get("AmazonOrderId")
                        if order_id:
                            items = self._spapi_client.get_order_items(order_id)
                            order["items"] = items
                    except Exception as e:
                        logger.warning(f"Failed to fetch items for order {order_id}: {e}")
                        order["items"] = []
                
                return orders
                
            except Exception as e:
                logger.error(f"Error fetching orders from Amazon SP-API: {e}")
                # Fall back to mock data on error
                logger.warning("Falling back to mock data")
                return self._get_mock_orders()
        else:
            # Use mock data if SP-API not configured
            logger.info("Amazon SP-API not configured, using mock data")
            return self._get_mock_orders()
    
    def fetch_inventory_snapshot(
        self,
        sku: Optional[str] = None,
        seller_skus: Optional[List[str]] = None,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Fetch inventory snapshot from Amazon FBA Inventory API.
        
        Args:
            sku: Single SKU to query
            seller_skus: List of SKUs to query
            **kwargs: Additional parameters
            
        Returns:
            List of normalized inventory dictionaries
        """
        # If SP-API client is available, use real API
        if self._spapi_client:
            try:
                inventory = self._spapi_client.get_inventory_summaries(
                    sku=sku,
                    seller_skus=seller_skus
                )
                return inventory
                
            except Exception as e:
                logger.error(f"Error fetching inventory from Amazon SP-API: {e}")
                # Fall back to mock data on error
                logger.warning("Falling back to mock data")
                return self._get_mock_inventory()
        else:
            # Use mock data if SP-API not configured
            logger.info("Amazon SP-API not configured, using mock data")
            return self._get_mock_inventory()
    
    def _get_mock_orders(self) -> List[Dict[str, Any]]:
        """Get mock orders for testing/fallback"""
        base_time = datetime.utcnow()
        return [
            {
                "platform_order_id": "AMZ-ORDER123",
                "order_status": "Shipped",
                "purchase_date": (base_time - timedelta(days=1)).isoformat(),
                "last_update_date": base_time.isoformat(),
                "order_total": "150.00",
                "currency": "USD",
                "marketplace_id": "ATVPDKIKX0DER",
                "customer_name": "John Doe",
                "customer_email": "john@example.com",
                "shipping_address": "123 Main St, City, State",
                "items": [
                    {
                        "product_id": "B000TEST1",
                        "sku": "SKU-RED-01",
                        "product_name": "Red Product",
                        "quantity": 2,
                        "item_price": "50.00",
                    },
                ],
                "platform_metadata": {
                    "AmazonOrderId": "ORDER123",
                    "ASIN": "B000TEST1",
                }
            },
        ]
    
    def _get_mock_inventory(self) -> List[Dict[str, Any]]:
        """Get mock inventory for testing/fallback"""
        return [
            {
                "sku": "SKU-RED-01",
                "product_id": "B000TEST1",
                "product_name": "Red Product",
                "total_quantity": 120,
                "available_quantity": 80,
                "reserved_quantity": 40,
                "platform_metadata": {
                    "ASIN": "B000TEST1",
                    "FbaQuantity": 80,
                }
            },
        ]

