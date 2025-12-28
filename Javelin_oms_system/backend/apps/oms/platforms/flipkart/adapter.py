"""Flipkart API adapter"""
from datetime import datetime, timedelta
from typing import List, Dict, Any
from ..base import PlatformAdapter


class FlipkartAdapter(PlatformAdapter):
    """Flipkart Seller API adapter"""
    
    @property
    def platform_name(self) -> str:
        return "flipkart"
    
    def fetch_recent_orders(self, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch recent orders from Flipkart Seller API.
        Replace with actual Flipkart API calls.
        """
        base_time = datetime.utcnow()
        return [
            {
                "platform_order_id": "FK-ORD-001",
                "order_status": "Shipped",
                "purchase_date": (base_time - timedelta(days=2)).isoformat(),
                "last_update_date": base_time.isoformat(),
                "order_total": "2500.00",
                "currency": "INR",
                "marketplace_id": "FLIPKART",
                "customer_name": "Raj Kumar",
                "customer_email": "raj@example.com",
                "shipping_address": "789 MG Road, Bangalore, Karnataka",
                "items": [
                    {
                        "product_id": "FSN123456",  # FSN (Flipkart Serial Number)
                        "sku": "SKU-FK-001",
                        "product_name": "Flipkart Product A",
                        "quantity": 1,
                        "item_price": "2500.00",
                    }
                ],
                "platform_metadata": {
                    "orderId": "FK-ORD-001",
                    "fsn": "FSN123456",
                }
            },
            {
                "platform_order_id": "FK-ORD-002",
                "order_status": "Pending",
                "purchase_date": (base_time - timedelta(hours=3)).isoformat(),
                "last_update_date": base_time.isoformat(),
                "order_total": "1800.00",
                "currency": "INR",
                "marketplace_id": "FLIPKART",
                "customer_name": "Priya Sharma",
                "customer_email": "priya@example.com",
                "shipping_address": "321 Park Street, Mumbai, Maharashtra",
                "items": [
                    {
                        "product_id": "FSN789012",
                        "sku": "SKU-FK-002",
                        "product_name": "Flipkart Product B",
                        "quantity": 2,
                        "item_price": "900.00",
                    }
                ],
                "platform_metadata": {
                    "orderId": "FK-ORD-002",
                    "fsn": "FSN789012",
                }
            },
        ]
    
    def fetch_inventory_snapshot(self, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch inventory snapshot from Flipkart.
        Replace with actual Flipkart Inventory API calls.
        """
        return [
            {
                "sku": "SKU-FK-001",
                "product_id": "FSN123456",
                "product_name": "Flipkart Product A",
                "total_quantity": 50,
                "available_quantity": 45,
                "reserved_quantity": 5,
                "platform_metadata": {
                    "fsn": "FSN123456",
                    "listingId": "LIST001",
                }
            },
            {
                "sku": "SKU-FK-002",
                "product_id": "FSN789012",
                "product_name": "Flipkart Product B",
                "total_quantity": 30,
                "available_quantity": 25,
                "reserved_quantity": 5,
                "platform_metadata": {
                    "fsn": "FSN789012",
                    "listingId": "LIST002",
                }
            },
        ]

