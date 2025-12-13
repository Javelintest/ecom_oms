"""Amazon SP-API client wrapper"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging

try:
    from sp_api.api import Orders, Inventories, Reports
    from sp_api.base import Marketplaces, SellingApiException
    from sp_api.base import AccessTokenClient, Credentials
except ImportError:
    # Fallback if library not installed
    Orders = None
    Inventories = None
    Reports = None
    Marketplaces = None
    SellingApiException = None
    AccessTokenClient = None
    Credentials = None

logger = logging.getLogger(__name__)


class AmazonSPAPIClient:
    """Wrapper for Amazon SP-API client with error handling"""
    
    # Marketplace ID to region mapping
    MARKETPLACE_REGIONS = {
        # North America
        "ATVPDKIKX0DER": "us",  # US
        "A2EUQ1WTGCTBG2": "ca",  # Canada
        "A1AM78C64UM0Y8": "mx",  # Mexico
        
        # Europe
        "A1PA6795UKMFR9": "de",  # Germany
        "A1RKKUPIHCS9HS": "es",  # Spain
        "A13V1IB3VIYZZH": "fr",  # France
        "APJ6JRA9NG5V4": "it",  # Italy
        "A1F83G8C2ARO7P": "uk",  # UK
        "A1805IZSGTT6HS": "nl",  # Netherlands
        
        # Asia Pacific
        "A1VC38T7YXB528": "jp",  # Japan
        "A39IBJ37TRP1C6": "au",  # Australia
        "A19VAU5U5O7RUS": "in",  # India
        "A1QKKRKIE7KH5X": "sg",  # Singapore
    }
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Amazon SP-API client.
        
        Args:
            config: Configuration dictionary with client_id, client_secret, refresh_token, marketplace_id, region
        """
        if not Orders or not Credentials:
            raise ImportError(
                "python-amazon-sp-api library not installed. "
                "Install it with: pip install python-amazon-sp-api"
            )
        
        self.config = config
        self.credentials = None
        self.orders_api = None
        self.inventory_api = None
        self.reports_api = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize SP-API clients"""
        try:
            # Create credentials dictionary for SP-API
            # The API classes expect a dict with these specific keys
            self.credentials = {
                "refresh_token": self.config["refresh_token"],
                "lwa_app_id": self.config["client_id"],
                "lwa_client_secret": self.config["client_secret"]
            }
            
            # Determine marketplace
            marketplace_id = self.config["marketplace_id"]
            marketplace = self._get_marketplace(marketplace_id)
            
            # Initialize APIs
            self.orders_api = Orders(credentials=self.credentials, marketplace=marketplace)
            self.inventory_api = Inventories(credentials=self.credentials, marketplace=marketplace)
            self.reports_api = Reports(credentials=self.credentials, marketplace=marketplace)
            
            logger.info(f"Amazon SP-API client initialized for marketplace {marketplace_id}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Amazon SP-API client: {e}")
            raise
    
    def _get_marketplace(self, marketplace_id: str):
        """Get marketplace enum from marketplace ID"""
        if not Marketplaces:
            return None
        
        # Try to find marketplace by ID
        for marketplace in Marketplaces:
            if marketplace.marketplace_id == marketplace_id:
                return marketplace
        
        # Default to US if not found
        logger.warning(f"Marketplace {marketplace_id} not found, defaulting to US")
        return Marketplaces.US
    
    def get_orders(
        self,
        created_after: Optional[datetime] = None,
        created_before: Optional[datetime] = None,
        last_updated_after: Optional[datetime] = None,
        order_statuses: Optional[List[str]] = None,
        fulfillment_channels: Optional[List[str]] = None,
        max_results: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Fetch orders from Amazon SP-API.
        
        Args:
            created_after: Get orders created after this date
            created_before: Get orders created before this date
            last_updated_after: Get orders updated after this date
            order_statuses: List of order statuses to filter
            fulfillment_channels: List of fulfillment channels (MFN, AFN)
            max_results: Maximum number of results to return
            
        Returns:
            List of normalized order dictionaries
        """
        if not self.orders_api:
            raise RuntimeError("Orders API not initialized")
        
        try:
            # Default to last 7 days if no date specified
            if not created_after and not last_updated_after:
                created_after = datetime.utcnow() - timedelta(days=7)
            
            # Prepare parameters
            params = {
                "MarketplaceIds": [self.config["marketplace_id"]],
                "MaxResultsPerPage": min(max_results, 100),  # SP-API max is 100
            }
            
            if created_after:
                params["CreatedAfter"] = created_after.isoformat()
            if created_before:
                params["CreatedBefore"] = created_before.isoformat()
            if last_updated_after:
                params["LastUpdatedAfter"] = last_updated_after.isoformat()
            if order_statuses:
                params["OrderStatuses"] = order_statuses
            if fulfillment_channels:
                params["FulfillmentChannels"] = fulfillment_channels
            
            # Fetch orders
            response = self.orders_api.get_orders(**params)
            
            orders = []
            if hasattr(response, 'payload') and hasattr(response.payload, 'Orders'):
                for order in response.payload.Orders:
                    normalized_order = self._normalize_order(order)
                    orders.append(normalized_order)
            
            logger.info(f"Fetched {len(orders)} orders from Amazon SP-API")
            return orders
            
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching orders: {e}")
            raise
    
    def get_order_items(self, order_id: str) -> List[Dict[str, Any]]:
        """
        Get order items for a specific order.
        
        Args:
            order_id: Amazon order ID
            
        Returns:
            List of normalized order item dictionaries
        """
        if not self.orders_api:
            raise RuntimeError("Orders API not initialized")
        
        try:
            response = self.orders_api.get_order_items(order_id)
            
            items = []
            if hasattr(response, 'payload') and hasattr(response.payload, 'OrderItems'):
                for item in response.payload.OrderItems:
                    normalized_item = self._normalize_order_item(item)
                    items.append(normalized_item)
            
            return items
            
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error fetching order items: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching order items: {e}")
            raise
    
    def get_inventory_summaries(
        self,
        sku: Optional[str] = None,
        seller_skus: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get FBA inventory summaries.
        
        Args:
            sku: Single SKU to query
            seller_skus: List of SKUs to query
            
        Returns:
            List of normalized inventory dictionaries
        """
        if not self.inventory_api:
            raise RuntimeError("Inventory API not initialized")
        
        try:
            params = {}
            if sku:
                params["sellerSku"] = sku
            elif seller_skus:
                params["sellerSkus"] = seller_skus
            
            response = self.inventory_api.get_inventory_summaries(**params)
            
            inventory_items = []
            if hasattr(response, 'payload') and hasattr(response.payload, 'inventorySummaries'):
                for inv in response.payload.inventorySummaries:
                    normalized_inv = self._normalize_inventory(inv)
                    inventory_items.append(normalized_inv)
            
            logger.info(f"Fetched {len(inventory_items)} inventory items from Amazon SP-API")
            return inventory_items
            
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error fetching inventory: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching inventory: {e}")
            raise
    
    def _normalize_order(self, order) -> Dict[str, Any]:
        """Normalize Amazon order to unified format"""
        # Extract shipping address
        shipping_address = ""
        if hasattr(order, 'ShippingAddress') and order.ShippingAddress:
            addr = order.ShippingAddress
            parts = []
            if hasattr(addr, 'Name'):
                parts.append(addr.Name)
            if hasattr(addr, 'AddressLine1'):
                parts.append(addr.AddressLine1)
            if hasattr(addr, 'City'):
                parts.append(addr.City)
            if hasattr(addr, 'StateOrRegion'):
                parts.append(addr.StateOrRegion)
            if hasattr(addr, 'PostalCode'):
                parts.append(addr.PostalCode)
            if hasattr(addr, 'CountryCode'):
                parts.append(addr.CountryCode)
            shipping_address = ", ".join(parts)
        
        # Extract order total
        order_total = "0.00"
        currency = "USD"
        if hasattr(order, 'OrderTotal') and order.OrderTotal:
            if hasattr(order.OrderTotal, 'Amount'):
                order_total = str(order.OrderTotal.Amount)
            if hasattr(order.OrderTotal, 'CurrencyCode'):
                currency = order.OrderTotal.CurrencyCode
        
        normalized = {
            "platform_order_id": order.AmazonOrderId if hasattr(order, 'AmazonOrderId') else "",
            "order_status": order.OrderStatus if hasattr(order, 'OrderStatus') else "Unknown",
            "purchase_date": order.PurchaseDate.isoformat() if hasattr(order, 'PurchaseDate') and order.PurchaseDate else None,
            "last_update_date": order.LastUpdateDate.isoformat() if hasattr(order, 'LastUpdateDate') and order.LastUpdateDate else None,
            "order_total": order_total,
            "currency": currency,
            "marketplace_id": order.MarketplaceId if hasattr(order, 'MarketplaceId') else self.config["marketplace_id"],
            "customer_name": shipping_address.split(",")[0] if shipping_address else "",
            "customer_email": "",  # Not available in orders API
            "shipping_address": shipping_address,
            "items": [],  # Will be fetched separately
            "platform_metadata": {
                "AmazonOrderId": order.AmazonOrderId if hasattr(order, 'AmazonOrderId') else "",
                "OrderStatus": order.OrderStatus if hasattr(order, 'OrderStatus') else "",
                "FulfillmentChannel": order.FulfillmentChannel if hasattr(order, 'FulfillmentChannel') else "",
                "SalesChannel": order.SalesChannel if hasattr(order, 'SalesChannel') else "",
            }
        }
        
        return normalized
    
    def _normalize_order_item(self, item) -> Dict[str, Any]:
        """Normalize Amazon order item to unified format"""
        item_price = "0.00"
        if hasattr(item, 'ItemPrice') and item.ItemPrice:
            if hasattr(item.ItemPrice, 'Amount'):
                item_price = str(item.ItemPrice.Amount)
        
        return {
            "product_id": item.ASIN if hasattr(item, 'ASIN') else "",
            "sku": item.SellerSKU if hasattr(item, 'SellerSKU') else "",
            "product_name": item.Title if hasattr(item, 'Title') else "",
            "quantity": item.QuantityOrdered if hasattr(item, 'QuantityOrdered') else 0,
            "item_price": item_price,
            "platform_metadata": {
                "ASIN": item.ASIN if hasattr(item, 'ASIN') else "",
                "OrderItemId": item.OrderItemId if hasattr(item, 'OrderItemId') else "",
            }
        }
    
    def _normalize_inventory(self, inv) -> Dict[str, Any]:
        """Normalize Amazon inventory to unified format"""
        return {
            "sku": inv.sellerSku if hasattr(inv, 'sellerSku') else "",
            "product_id": inv.asin if hasattr(inv, 'asin') else "",
            "product_name": inv.productName if hasattr(inv, 'productName') else "",
            "total_quantity": inv.totalQuantity if hasattr(inv, 'totalQuantity') else 0,
            "available_quantity": inv.availableQuantity if hasattr(inv, 'availableQuantity') else 0,
            "reserved_quantity": inv.reservedQuantity if hasattr(inv, 'reservedQuantity') else 0,
            "platform_metadata": {
                "ASIN": inv.asin if hasattr(inv, 'asin') else "",
                "fnsku": inv.fnsku if hasattr(inv, 'fnsku') else "",
                "condition": inv.condition if hasattr(inv, 'condition') else "",
            }
        }
    
    async def request_report(
        self,
        report_type: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        marketplace_ids: Optional[List[str]] = None
    ) -> str:
        """
        Request a report from Amazon SP-API.
        
        Args:
            report_type: Type of report to request
            start_date: Start date for report data (ISO format)
            end_date: End date for report data (ISO format)
            marketplace_ids: List of marketplace IDs
            
        Returns:
            Report ID
        """
        if not self.reports_api:
            raise RuntimeError("Reports API not initialized")
        
        try:
            data_start_time = None
            data_end_time = None
            
            if start_date:
                data_start_time = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            else:
                # Default to last 30 days
                data_start_time = datetime.utcnow() - timedelta(days=30)
            
            if end_date:
                data_end_time = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            else:
                data_end_time = datetime.utcnow()
            
            if not marketplace_ids:
                marketplace_ids = [self.config["marketplace_id"]]
            
            # Request report
            response = self.reports_api.create_report(
                reportType=report_type,
                marketplaceIds=marketplace_ids,
                dataStartTime=data_start_time.isoformat(),
                dataEndTime=data_end_time.isoformat()
            )
            
            if hasattr(response, 'payload') and hasattr(response.payload, 'reportId'):
                report_id = response.payload.reportId
                logger.info(f"Report requested successfully: {report_id}")
                return report_id
            else:
                raise RuntimeError("Failed to get report ID from response")
                
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error requesting report: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error requesting report: {e}")
            raise
    
    async def get_report_status(self, report_id: str) -> Dict[str, Any]:
        """
        Get the status of a report request.
        
        Args:
            report_id: Report ID
            
        Returns:
            Report status information
        """
        if not self.reports_api:
            raise RuntimeError("Reports API not initialized")
        
        try:
            response = self.reports_api.get_report(report_id)
            
            if hasattr(response, 'payload'):
                payload = response.payload
                return {
                    "report_id": report_id,
                    "processing_status": payload.processingStatus if hasattr(payload, 'processingStatus') else "UNKNOWN",
                    "report_type": payload.reportType if hasattr(payload, 'reportType') else "",
                    "report_document_id": payload.reportDocumentId if hasattr(payload, 'reportDocumentId') else None,
                    "created_time": payload.createdTime if hasattr(payload, 'createdTime') else None,
                    "processing_end_time": payload.processingEndTime if hasattr(payload, 'processingEndTime') else None,
                }
            else:
                raise RuntimeError("Invalid response from API")
                
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error getting report status: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting report status: {e}")
            raise
    
    async def download_report(self, report_document_id: str) -> str:
        """
        Download a completed report document.
        
        Args:
            report_document_id: Report document ID
            
        Returns:
            Report data as string
        """
        if not self.reports_api:
            raise RuntimeError("Reports API not initialized")
        
        try:
            # Get report document info
            response = self.reports_api.get_report_document(report_document_id)
            
            if hasattr(response, 'payload'):
                payload = response.payload
                
                # Download report data
                import requests
                url = payload.url if hasattr(payload, 'url') else None
                if not url:
                    raise RuntimeError("No URL in report document response")
                
                doc_response = requests.get(url)
                doc_response.raise_for_status()
                
                return doc_response.text
            else:
                raise RuntimeError("Invalid response from API")
                
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error downloading report: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error downloading report: {e}")
            raise
    
    async def get_reports(
        self,
        report_types: Optional[List[str]] = None,
        processing_statuses: Optional[List[str]] = None,
        created_since: Optional[datetime] = None,
        created_until: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get a list of reports.
        
        Args:
            report_types: Filter by report types
            processing_statuses: Filter by processing status
            created_since: Filter by creation date (from)
            created_until: Filter by creation date (to)
            
        Returns:
            List of report information
        """
        if not self.reports_api:
            raise RuntimeError("Reports API not initialized")
        
        try:
            params = {
                "marketplaceIds": [self.config["marketplace_id"]]
            }
            
            if report_types:
                params["reportTypes"] = report_types
            if processing_statuses:
                params["processingStatuses"] = processing_statuses
            if created_since:
                params["createdSince"] = created_since.isoformat()
            if created_until:
                params["createdUntil"] = created_until.isoformat()
            
            response = self.reports_api.get_reports(**params)
            
            reports = []
            if hasattr(response, 'payload') and hasattr(response.payload, 'reports'):
                for report in response.payload.reports:
                    reports.append({
                        "report_id": report.reportId if hasattr(report, 'reportId') else "",
                        "report_type": report.reportType if hasattr(report, 'reportType') else "",
                        "processing_status": report.processingStatus if hasattr(report, 'processingStatus') else "",
                        "report_document_id": report.reportDocumentId if hasattr(report, 'reportDocumentId') else None,
                        "created_time": report.createdTime if hasattr(report, 'createdTime') else None,
                        "processing_end_time": report.processingEndTime if hasattr(report, 'processingEndTime') else None,
                    })
            
            logger.info(f"Fetched {len(reports)} reports from Amazon SP-API")
            return reports
            
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error fetching reports: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching reports: {e}")
            raise

