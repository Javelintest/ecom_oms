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
        max_results: int = 100,
        next_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch orders from Amazon SP-API with pagination support.
        
        Args:
            created_after: Get orders created after this date
            created_before: Get orders created before this date
            last_updated_after: Get orders updated after this date
            order_statuses: List of order statuses to filter
            fulfillment_channels: List of fulfillment channels (MFN, AFN)
            max_results: Maximum number of results to return per page
            next_token: Token for pagination (to get next page)
            
        Returns:
            Dictionary with 'orders' list and 'next_token' for pagination
        """
        if not self.orders_api:
            raise RuntimeError("Orders API not initialized")
        
        try:
            # Default to last 7 days if no date specified
            if not created_after and not last_updated_after and not next_token:
                created_after = datetime.utcnow() - timedelta(days=7)
            
            # Prepare parameters
            params = {
                "MarketplaceIds": [self.config["marketplace_id"]],
                "MaxResultsPerPage": min(max_results, 100),  # SP-API max is 100
            }
            
            # Add NextToken if provided (for pagination)
            if next_token:
                params["NextToken"] = next_token
            else:
                # Only add date filters if not using NextToken
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
            response_next_token = None
            
            if hasattr(response, 'payload'):
                # Extract orders
                if hasattr(response.payload, 'Orders'):
                    for order in response.payload.Orders:
                        normalized_order = self._normalize_order(order)
                        orders.append(normalized_order)
                
                # Extract NextToken for pagination
                if hasattr(response.payload, 'NextToken'):
                    response_next_token = response.payload.NextToken
            
            logger.info(f"Fetched {len(orders)} orders from Amazon SP-API (NextToken: {response_next_token is not None})")
            
            return {
                "orders": orders,
                "next_token": response_next_token
            }
            
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching orders: {e}")
            raise
    
    def get_order_items(self, order_id: str, next_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Get items for a specific order with pagination support.
        
        Args:
            order_id: Amazon order ID
            next_token: Token for pagination (to get next page)
            
        Returns:
            Dictionary with 'items' list and 'next_token' for pagination
        """
        if not self.orders_api:
            raise RuntimeError("Orders API not initialized")
        
        try:
            # Prepare parameters
            params = {}
            if next_token:
                params["NextToken"] = next_token
            
            # Fetch order items
            response = self.orders_api.get_order_items(order_id, **params)
            
            items = []
            response_next_token = None
            
            if hasattr(response, 'payload'):
                # Extract items
                if hasattr(response.payload, 'OrderItems'):
                    for item in response.payload.OrderItems:
                        normalized_item = self._normalize_order_item(item)
                        items.append(normalized_item)
                
                # Extract NextToken for pagination
                if hasattr(response.payload, 'NextToken'):
                    response_next_token = response.payload.NextToken
            
            logger.info(f"Fetched {len(items)} items for order {order_id} (NextToken: {response_next_token is not None})")
            
            return {
                "items": items,
                "next_token": response_next_token
            }
            
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error fetching items for order {order_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching items for order {order_id}: {e}")
            raise
    
    def get_order(self, order_id: str) -> Dict[str, Any]:
        """
        Get details for a specific order.
        
        Args:
            order_id: Amazon order ID
            
        Returns:
            Normalized order dictionary
        """
        if not self.orders_api:
            raise RuntimeError("Orders API not initialized")
        
        try:
            response = self.orders_api.get_order(order_id)
            
            if hasattr(response, 'payload') and hasattr(response.payload, 'Order'):
                order = response.payload.Order
                normalized_order = self._normalize_order(order)
                logger.info(f"Fetched order {order_id} from Amazon SP-API")
                return normalized_order
            else:
                raise RuntimeError(f"Order {order_id} not found in response")
                
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error fetching order {order_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching order {order_id}: {e}")
            raise
    
    def get_order_buyer_info(self, order_id: str) -> Dict[str, Any]:
        """
        Get buyer information for a specific order (PII data).
        
        Args:
            order_id: Amazon order ID
            
        Returns:
            Dictionary with buyer information
        """
        if not self.orders_api:
            raise RuntimeError("Orders API not initialized")
        
        try:
            response = self.orders_api.get_order_buyer_info(order_id)
            
            buyer_info = {}
            if hasattr(response, 'payload'):
                payload = response.payload
                buyer_info = {
                    "buyer_email": payload.BuyerEmail if hasattr(payload, 'BuyerEmail') else "",
                    "buyer_name": payload.BuyerName if hasattr(payload, 'BuyerName') else "",
                    "buyer_county": payload.BuyerCounty if hasattr(payload, 'BuyerCounty') else "",
                    "buyer_tax_info": payload.BuyerTaxInfo if hasattr(payload, 'BuyerTaxInfo') else {},
                    "purchase_order_number": payload.PurchaseOrderNumber if hasattr(payload, 'PurchaseOrderNumber') else "",
                }
            
            logger.info(f"Fetched buyer info for order {order_id}")
            return buyer_info
            
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error fetching buyer info for order {order_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching buyer info for order {order_id}: {e}")
            raise
    
    def get_order_address(self, order_id: str) -> Dict[str, Any]:
        """
        Get shipping address for a specific order.
        
        Args:
            order_id: Amazon order ID
            
        Returns:
            Dictionary with shipping address
        """
        if not self.orders_api:
            raise RuntimeError("Orders API not initialized")
        
        try:
            response = self.orders_api.get_order_address(order_id)
            
            address_info = {}
            if hasattr(response, 'payload') and hasattr(response.payload, 'ShippingAddress'):
                addr = response.payload.ShippingAddress
                address_info = {
                    "name": addr.Name if hasattr(addr, 'Name') else "",
                    "address_line1": addr.AddressLine1 if hasattr(addr, 'AddressLine1') else "",
                    "address_line2": addr.AddressLine2 if hasattr(addr, 'AddressLine2') else "",
                    "address_line3": addr.AddressLine3 if hasattr(addr, 'AddressLine3') else "",
                    "city": addr.City if hasattr(addr, 'City') else "",
                    "county": addr.County if hasattr(addr, 'County') else "",
                    "district": addr.District if hasattr(addr, 'District') else "",
                    "state_or_region": addr.StateOrRegion if hasattr(addr, 'StateOrRegion') else "",
                    "postal_code": addr.PostalCode if hasattr(addr, 'PostalCode') else "",
                    "country_code": addr.CountryCode if hasattr(addr, 'CountryCode') else "",
                    "phone": addr.Phone if hasattr(addr, 'Phone') else "",
                    "address_type": addr.AddressType if hasattr(addr, 'AddressType') else "",
                }
            
            logger.info(f"Fetched address for order {order_id}")
            return address_info
            
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error fetching address for order {order_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching address for order {order_id}: {e}")
            raise
    
    def update_shipment_status(self, order_id: str, shipment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update shipment status for an order.
        
        Args:
            order_id: Amazon order ID
            shipment_data: Dictionary containing shipment information
                - marketplace_id: Marketplace identifier
                - shipment_status: Status (e.g., 'ReadyForPickup', 'PickedUp', 'RefusedPickup')
                - order_items: List of order items with quantities
                - shipment_date: Optional shipment date (ISO format)
                
        Returns:
            Response from API
        """
        if not self.orders_api:
            raise RuntimeError("Orders API not initialized")
        
        try:
            # Prepare shipment update payload
            marketplace_id = shipment_data.get("marketplace_id", self.config["marketplace_id"])
            
            response = self.orders_api.update_shipment_status(
                orderId=order_id,
                marketplaceId=marketplace_id,
                shipmentStatus=shipment_data.get("shipment_status"),
                orderItems=shipment_data.get("order_items", []),
                shipmentDate=shipment_data.get("shipment_date")
            )
            
            logger.info(f"Updated shipment status for order {order_id}")
            return {"success": True, "order_id": order_id, "message": "Shipment status updated"}
            
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error updating shipment status for order {order_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error updating shipment status for order {order_id}: {e}")
            raise
    
    def confirm_shipment(self, order_id: str, confirmation_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Confirm shipment for a Seller Fulfilled Prime order.
        
        Args:
            order_id: Amazon order ID
            confirmation_data: Dictionary containing confirmation information
                - marketplace_id: Marketplace identifier
                - package_detail: Package tracking details
                    - package_reference_id: Package reference ID
                    - carrier_code: Shipping carrier code
                    - carrier_name: Shipping carrier name (if carrier_code is 'Other')
                    - shipping_method: Shipping method
                    - tracking_number: Tracking number
                    - ship_date: Ship date (ISO format)
                    - order_items: List of items in package
                
        Returns:
            Response from API
        """
        if not self.orders_api:
            raise RuntimeError("Orders API not initialized")
        
        try:
            marketplace_id = confirmation_data.get("marketplace_id", self.config["marketplace_id"])
            package_detail = confirmation_data.get("package_detail", {})
            
            response = self.orders_api.confirm_shipment(
                orderId=order_id,
                marketplaceId=marketplace_id,
                packageDetail=package_detail
            )
            
            logger.info(f"Confirmed shipment for order {order_id}")
            return {"success": True, "order_id": order_id, "message": "Shipment confirmed"}
            
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error confirming shipment for order {order_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error confirming shipment for order {order_id}: {e}")
            raise
    
    def get_order_items_buyer_info(self, order_id: str) -> List[Dict[str, Any]]:
        """
        Get buyer information for order items (PII data).
        
        Args:
            order_id: Amazon order ID
            
        Returns:
            List of order items with buyer information
        """
        if not self.orders_api:
            raise RuntimeError("Orders API not initialized")
        
        try:
            response = self.orders_api.get_order_items_buyer_info(order_id)
            
            items_buyer_info = []
            if hasattr(response, 'payload') and hasattr(response.payload, 'OrderItems'):
                for item in response.payload.OrderItems:
                    item_info = {
                        "order_item_id": item.OrderItemId if hasattr(item, 'OrderItemId') else "",
                        "buyer_customized_info": {},
                        "gift_wrap_price": {},
                        "gift_wrap_tax": {},
                        "gift_message_text": item.GiftMessageText if hasattr(item, 'GiftMessageText') else "",
                        "gift_wrap_level": item.GiftWrapLevel if hasattr(item, 'GiftWrapLevel') else "",
                    }
                    
                    if hasattr(item, 'BuyerCustomizedInfo'):
                        item_info["buyer_customized_info"] = {
                            "customized_url": item.BuyerCustomizedInfo.CustomizedURL if hasattr(item.BuyerCustomizedInfo, 'CustomizedURL') else ""
                        }
                    
                    if hasattr(item, 'GiftWrapPrice'):
                        item_info["gift_wrap_price"] = {
                            "amount": item.GiftWrapPrice.Amount if hasattr(item.GiftWrapPrice, 'Amount') else "0.00",
                            "currency_code": item.GiftWrapPrice.CurrencyCode if hasattr(item.GiftWrapPrice, 'CurrencyCode') else "USD"
                        }
                    
                    items_buyer_info.append(item_info)
            
            logger.info(f"Fetched buyer info for order items of order {order_id}")
            return items_buyer_info
            
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error fetching order items buyer info for order {order_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching order items buyer info for order {order_id}: {e}")
            raise
    
    def get_order_regulated_info(self, order_id: str) -> Dict[str, Any]:
        """
        Get regulated information for an order (for regulated products).
        
        Args:
            order_id: Amazon order ID
            
        Returns:
            Dictionary with regulated order information
        """
        if not self.orders_api:
            raise RuntimeError("Orders API not initialized")
        
        try:
            response = self.orders_api.get_order_regulated_info(order_id)
            
            regulated_info = {}
            if hasattr(response, 'payload'):
                payload = response.payload
                regulated_info = {
                    "amazon_order_id": payload.AmazonOrderId if hasattr(payload, 'AmazonOrderId') else "",
                    "regulated_information": {},
                    "requires_dosage_label": payload.RequiresDosageLabel if hasattr(payload, 'RequiresDosageLabel') else False,
                    "regulated_order_verification_status": {}
                }
                
                if hasattr(payload, 'RegulatedInformation'):
                    reg_info = payload.RegulatedInformation
                    regulated_info["regulated_information"] = {
                        "fields": []
                    }
                    if hasattr(reg_info, 'Fields'):
                        for field in reg_info.Fields:
                            regulated_info["regulated_information"]["fields"].append({
                                "field_id": field.FieldId if hasattr(field, 'FieldId') else "",
                                "field_label": field.FieldLabel if hasattr(field, 'FieldLabel') else "",
                                "field_type": field.FieldType if hasattr(field, 'FieldType') else "",
                                "field_value": field.FieldValue if hasattr(field, 'FieldValue') else "",
                            })
                
                if hasattr(payload, 'RegulatedOrderVerificationStatus'):
                    status = payload.RegulatedOrderVerificationStatus
                    regulated_info["regulated_order_verification_status"] = {
                        "status": status.Status if hasattr(status, 'Status') else "",
                        "requires_merchant_action": status.RequiresMerchantAction if hasattr(status, 'RequiresMerchantAction') else False,
                        "valid_rejection_reasons": status.ValidRejectionReasons if hasattr(status, 'ValidRejectionReasons') else [],
                        "rejection_reason": status.RejectionReason if hasattr(status, 'RejectionReason') else "",
                        "review_date": status.ReviewDate if hasattr(status, 'ReviewDate') else "",
                        "external_reviewer_id": status.ExternalReviewerId if hasattr(status, 'ExternalReviewerId') else "",
                    }
            
            logger.info(f"Fetched regulated info for order {order_id}")
            return regulated_info
            
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error fetching regulated info for order {order_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching regulated info for order {order_id}: {e}")
            raise
    
    def update_verification_status(self, order_id: str, verification_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update verification status for a regulated order.
        
        Args:
            order_id: Amazon order ID
            verification_data: Dictionary containing verification information
                - status: Verification status (e.g., 'Approved', 'Rejected', 'Pending')
                - external_reviewer_id: ID of external reviewer
                - rejection_reason_id: Reason ID if rejected
                
        Returns:
            Response from API
        """
        if not self.orders_api:
            raise RuntimeError("Orders API not initialized")
        
        try:
            response = self.orders_api.update_verification_status(
                orderId=order_id,
                regulatedOrderVerificationStatus={
                    "Status": verification_data.get("status"),
                    "ExternalReviewerId": verification_data.get("external_reviewer_id", ""),
                    "RejectionReasonId": verification_data.get("rejection_reason_id", "")
                }
            )
            
            logger.info(f"Updated verification status for order {order_id}")
            return {"success": True, "order_id": order_id, "message": "Verification status updated"}
            
        except SellingApiException as e:
            logger.error(f"Amazon SP-API error updating verification status for order {order_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error updating verification status for order {order_id}: {e}")
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
        """Normalize Amazon order to unified format with complete field capture"""
        # Extract shipping address
        shipping_address = ""
        shipping_address_dict = {}
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
            
            # Store complete address structure
            shipping_address_dict = {
                "Name": addr.Name if hasattr(addr, 'Name') else "",
                "AddressLine1": addr.AddressLine1 if hasattr(addr, 'AddressLine1') else "",
                "AddressLine2": addr.AddressLine2 if hasattr(addr, 'AddressLine2') else "",
                "AddressLine3": addr.AddressLine3 if hasattr(addr, 'AddressLine3') else "",
                "City": addr.City if hasattr(addr, 'City') else "",
                "County": addr.County if hasattr(addr, 'County') else "",
                "District": addr.District if hasattr(addr, 'District') else "",
                "StateOrRegion": addr.StateOrRegion if hasattr(addr, 'StateOrRegion') else "",
                "PostalCode": addr.PostalCode if hasattr(addr, 'PostalCode') else "",
                "CountryCode": addr.CountryCode if hasattr(addr, 'CountryCode') else "",
                "Phone": addr.Phone if hasattr(addr, 'Phone') else "",
                "AddressType": addr.AddressType if hasattr(addr, 'AddressType') else "",
            }
        
        # Extract order total
        order_total = "0.00"
        currency = "USD"
        order_total_dict = {}
        if hasattr(order, 'OrderTotal') and order.OrderTotal:
            if hasattr(order.OrderTotal, 'Amount'):
                order_total = str(order.OrderTotal.Amount)
            if hasattr(order.OrderTotal, 'CurrencyCode'):
                currency = order.OrderTotal.CurrencyCode
            order_total_dict = {
                "Amount": order_total,
                "CurrencyCode": currency
            }
        
        # Extract buyer info if available (sometimes included in Orders response)
        buyer_info = {}
        if hasattr(order, 'BuyerInfo') and order.BuyerInfo:
            buyer = order.BuyerInfo
            buyer_info = {
                "BuyerEmail": buyer.BuyerEmail if hasattr(buyer, 'BuyerEmail') else "",
                "BuyerName": buyer.BuyerName if hasattr(buyer, 'BuyerName') else "",
                "BuyerCounty": buyer.BuyerCounty if hasattr(buyer, 'BuyerCounty') else "",
                "BuyerTaxInfo": {},
                "PurchaseOrderNumber": buyer.PurchaseOrderNumber if hasattr(buyer, 'PurchaseOrderNumber') else "",
            }
            if hasattr(buyer, 'BuyerTaxInfo') and buyer.BuyerTaxInfo:
                buyer_info["BuyerTaxInfo"] = {
                    "CompanyLegalName": buyer.BuyerTaxInfo.CompanyLegalName if hasattr(buyer.BuyerTaxInfo, 'CompanyLegalName') else "",
                    "TaxingRegion": buyer.BuyerTaxInfo.TaxingRegion if hasattr(buyer.BuyerTaxInfo, 'TaxingRegion') else "",
                    "TaxClassifications": buyer.BuyerTaxInfo.TaxClassifications if hasattr(buyer.BuyerTaxInfo, 'TaxClassifications') else [],
                }
        
        # Extract payment method details
        payment_method_details = []
        if hasattr(order, 'PaymentMethodDetails') and order.PaymentMethodDetails:
            payment_method_details = list(order.PaymentMethodDetails)
        
        # Build comprehensive platform_metadata with ALL Amazon fields
        platform_metadata = {
            # Core order identifiers
            "AmazonOrderId": order.AmazonOrderId if hasattr(order, 'AmazonOrderId') else "",
            "SellerOrderId": order.SellerOrderId if hasattr(order, 'SellerOrderId') else "",
            
            # Order status and type
            "OrderStatus": order.OrderStatus if hasattr(order, 'OrderStatus') else "",
            "OrderType": order.OrderType if hasattr(order, 'OrderType') else "",
            
            # Fulfillment details
            "FulfillmentChannel": order.FulfillmentChannel if hasattr(order, 'FulfillmentChannel') else "",
            "SalesChannel": order.SalesChannel if hasattr(order, 'SalesChannel') else "",
            "ShipServiceLevel": order.ShipServiceLevel if hasattr(order, 'ShipServiceLevel') else "",
            "ShipmentServiceLevelCategory": order.ShipmentServiceLevelCategory if hasattr(order, 'ShipmentServiceLevelCategory') else "",
            
            # Item counts
            "NumberOfItemsShipped": order.NumberOfItemsShipped if hasattr(order, 'NumberOfItemsShipped') else 0,
            "NumberOfItemsUnshipped": order.NumberOfItemsUnshipped if hasattr(order, 'NumberOfItemsUnshipped') else 0,
            
            # Payment information
            "PaymentMethod": order.PaymentMethod if hasattr(order, 'PaymentMethod') else "",
            "PaymentMethodDetails": payment_method_details,
            "PaymentExecutionDetail": order.PaymentExecutionDetail if hasattr(order, 'PaymentExecutionDetail') else [],
            
            # Shipment dates
            "EarliestShipDate": order.EarliestShipDate.isoformat() if hasattr(order, 'EarliestShipDate') and order.EarliestShipDate else None,
            "LatestShipDate": order.LatestShipDate.isoformat() if hasattr(order, 'LatestShipDate') and order.LatestShipDate else None,
            "EarliestDeliveryDate": order.EarliestDeliveryDate.isoformat() if hasattr(order, 'EarliestDeliveryDate') and order.EarliestDeliveryDate else None,
            "LatestDeliveryDate": order.LatestDeliveryDate.isoformat() if hasattr(order, 'LatestDeliveryDate') and order.LatestDeliveryDate else None,
            
            # Order flags
            "IsBusinessOrder": order.IsBusinessOrder if hasattr(order, 'IsBusinessOrder') else False,
            "IsPrime": order.IsPrime if hasattr(order, 'IsPrime') else False,
            "IsPremiumOrder": order.IsPremiumOrder if hasattr(order, 'IsPremiumOrder') else False,
            "IsGlobalExpressEnabled": order.IsGlobalExpressEnabled if hasattr(order, 'IsGlobalExpressEnabled') else False,
            "IsReplacementOrder": order.IsReplacementOrder if hasattr(order, 'IsReplacementOrder') else False,
            "IsSoldByAB": order.IsSoldByAB if hasattr(order, 'IsSoldByAB') else False,
            "IsIBA": order.IsIBA if hasattr(order, 'IsIBA') else False,
            "IsISPU": order.IsISPU if hasattr(order, 'IsISPU') else False,
            "IsAccessPointOrder": order.IsAccessPointOrder if hasattr(order, 'IsAccessPointOrder') else False,
            
            # Address details
            "ShippingAddress": shipping_address_dict,
            "DefaultShipFromLocationAddress": order.DefaultShipFromLocationAddress if hasattr(order, 'DefaultShipFromLocationAddress') else {},
            
            # Buyer information
            "BuyerInfo": buyer_info,
            
            # Order totals and pricing
            "OrderTotal": order_total_dict,
            
            # Marketplace and fulfillment
            "MarketplaceId": order.MarketplaceId if hasattr(order, 'MarketplaceId') else "",
            "FulfillmentInstruction": order.FulfillmentInstruction if hasattr(order, 'FulfillmentInstruction') else {},
            
            # Additional fields
            "PromiseResponseDueDate": order.PromiseResponseDueDate.isoformat() if hasattr(order, 'PromiseResponseDueDate') and order.PromiseResponseDueDate else None,
            "IsEstimatedShipDateSet": order.IsEstimatedShipDateSet if hasattr(order, 'IsEstimatedShipDateSet') else False,
            "AutomatedShippingSettings": order.AutomatedShippingSettings if hasattr(order, 'AutomatedShippingSettings') else {},
            "HasRegulatedItems": order.HasRegulatedItems if hasattr(order, 'HasRegulatedItems') else False,
        }
        
        # Extract customer name from buyer info or shipping address
        customer_name = ""
        customer_email = ""
        if buyer_info.get("BuyerName"):
            customer_name = buyer_info["BuyerName"]
        elif shipping_address:
            customer_name = shipping_address.split(",")[0]
        
        if buyer_info.get("BuyerEmail"):
            customer_email = buyer_info["BuyerEmail"]
        
        normalized = {
            "platform_order_id": order.AmazonOrderId if hasattr(order, 'AmazonOrderId') else "",
            "order_status": order.OrderStatus if hasattr(order, 'OrderStatus') else "Unknown",
            "purchase_date": order.PurchaseDate.isoformat() if hasattr(order, 'PurchaseDate') and order.PurchaseDate else None,
            "last_update_date": order.LastUpdateDate.isoformat() if hasattr(order, 'LastUpdateDate') and order.LastUpdateDate else None,
            "order_total": order_total,
            "currency": currency,
            "marketplace_id": order.MarketplaceId if hasattr(order, 'MarketplaceId') else self.config["marketplace_id"],
            "customer_name": customer_name,
            "customer_email": customer_email,
            "shipping_address": shipping_address,
            "items": [],  # Will be fetched separately
            "platform_metadata": platform_metadata
        }
        
        return normalized
    
    def _normalize_order_item(self, item) -> Dict[str, Any]:
        """Normalize Amazon order item to unified format with complete field capture"""
        # Extract pricing information
        item_price = "0.00"
        item_price_dict = {}
        if hasattr(item, 'ItemPrice') and item.ItemPrice:
            if hasattr(item.ItemPrice, 'Amount'):
                item_price = str(item.ItemPrice.Amount)
            item_price_dict = {
                "Amount": item_price,
                "CurrencyCode": item.ItemPrice.CurrencyCode if hasattr(item.ItemPrice, 'CurrencyCode') else "USD"
            }
        
        # Extract shipping price
        shipping_price_dict = {}
        if hasattr(item, 'ShippingPrice') and item.ShippingPrice:
            shipping_price_dict = {
                "Amount": str(item.ShippingPrice.Amount) if hasattr(item.ShippingPrice, 'Amount') else "0.00",
                "CurrencyCode": item.ShippingPrice.CurrencyCode if hasattr(item.ShippingPrice, 'CurrencyCode') else "USD"
            }
        
        # Extract gift wrap price
        gift_wrap_price_dict = {}
        if hasattr(item, 'GiftWrapPrice') and item.GiftWrapPrice:
            gift_wrap_price_dict = {
                "Amount": str(item.GiftWrapPrice.Amount) if hasattr(item.GiftWrapPrice, 'Amount') else "0.00",
                "CurrencyCode": item.GiftWrapPrice.CurrencyCode if hasattr(item.GiftWrapPrice, 'CurrencyCode') else "USD"
            }
        
        # Extract points granted
        points_granted = {}
        if hasattr(item, 'PointsGranted') and item.PointsGranted:
            points_granted = {
                "PointsNumber": item.PointsGranted.PointsNumber if hasattr(item.PointsGranted, 'PointsNumber') else 0,
                "PointsMonetaryValue": {}
            }
            if hasattr(item.PointsGranted, 'PointsMonetaryValue') and item.PointsGranted.PointsMonetaryValue:
                points_granted["PointsMonetaryValue"] = {
                    "Amount": str(item.PointsGranted.PointsMonetaryValue.Amount) if hasattr(item.PointsGranted.PointsMonetaryValue, 'Amount') else "0.00",
                    "CurrencyCode": item.PointsGranted.PointsMonetaryValue.CurrencyCode if hasattr(item.PointsGranted.PointsMonetaryValue, 'CurrencyCode') else "USD"
                }
        
        # Extract COD fees
        cod_fee_dict = {}
        if hasattr(item, 'CODFee') and item.CODFee:
            cod_fee_dict = {
                "Amount": str(item.CODFee.Amount) if hasattr(item.CODFee, 'Amount') else "0.00",
                "CurrencyCode": item.CODFee.CurrencyCode if hasattr(item.CODFee, 'CurrencyCode') else "USD"
            }
        
        cod_fee_discount_dict = {}
        if hasattr(item, 'CODFeeDiscount') and item.CODFeeDiscount:
            cod_fee_discount_dict = {
                "Amount": str(item.CODFeeDiscount.Amount) if hasattr(item.CODFeeDiscount, 'Amount') else "0.00",
                "CurrencyCode": item.CODFeeDiscount.CurrencyCode if hasattr(item.CODFeeDiscount, 'CurrencyCode') else "USD"
            }
        
        # Extract buyer info (from item level)
        buyer_info = {}
        if hasattr(item, 'BuyerInfo') and item.BuyerInfo:
            buyer = item.BuyerInfo
            buyer_info = {
                "BuyerCustomizedInfo": {},
                "GiftMessageText": buyer.GiftMessageText if hasattr(buyer, 'GiftMessageText') else "",
                "GiftWrapPrice": {},
                "GiftWrapLevel": buyer.GiftWrapLevel if hasattr(buyer, 'GiftWrapLevel') else ""
            }
            if hasattr(buyer, 'BuyerCustomizedInfo') and buyer.BuyerCustomizedInfo:
                buyer_info["BuyerCustomizedInfo"] = {
                    "CustomizedURL": buyer.BuyerCustomizedInfo.CustomizedURL if hasattr(buyer.BuyerCustomizedInfo, 'CustomizedURL') else ""
                }
            if hasattr(buyer, 'GiftWrapPrice') and buyer.GiftWrapPrice:
                buyer_info["GiftWrapPrice"] = {
                    "Amount": str(buyer.GiftWrapPrice.Amount) if hasattr(buyer.GiftWrapPrice, 'Amount') else "0.00",
                    "CurrencyCode": buyer.GiftWrapPrice.CurrencyCode if hasattr(buyer.GiftWrapPrice, 'CurrencyCode') else "USD"
                }
        
        # Extract buyer requested cancel
        buyer_requested_cancel = {}
        if hasattr(item, 'BuyerRequestedCancel') and item.BuyerRequestedCancel:
            cancel = item.BuyerRequestedCancel
            buyer_requested_cancel = {
                "IsBuyerRequestedCancel": cancel.IsBuyerRequestedCancel if hasattr(cancel, 'IsBuyerRequestedCancel') else False,
                "BuyerCancelReason": cancel.BuyerCancelReason if hasattr(cancel, 'BuyerCancelReason') else ""
            }
        
        # Extract serial numbers and promotion IDs
        serial_numbers = []
        if hasattr(item, 'SerialNumbers') and item.SerialNumbers:
            serial_numbers = list(item.SerialNumbers)
        
        promotion_ids = []
        if hasattr(item, 'PromotionIds') and item.PromotionIds:
            promotion_ids = list(item.PromotionIds)
        
        # Build comprehensive platform_metadata
        platform_metadata = {
            "ASIN": item.ASIN if hasattr(item, 'ASIN') else "",
            "OrderItemId": item.OrderItemId if hasattr(item, 'OrderItemId') else "",
            "SellerSKU": item.SellerSKU if hasattr(item, 'SellerSKU') else "",
            "Title": item.Title if hasattr(item, 'Title') else "",
            
            # Quantities
            "QuantityOrdered": item.QuantityOrdered if hasattr(item, 'QuantityOrdered') else 0,
            "QuantityShipped": item.QuantityShipped if hasattr(item, 'QuantityShipped') else 0,
            
            # Pricing
            "ItemPrice": item_price_dict,
            "ShippingPrice": shipping_price_dict,
            "GiftWrapPrice": gift_wrap_price_dict,
            "ItemTax": {
                "Amount": str(item.ItemTax.Amount) if hasattr(item, 'ItemTax') and hasattr(item.ItemTax, 'Amount') else "0.00",
                "CurrencyCode": item.ItemTax.CurrencyCode if hasattr(item, 'ItemTax') and hasattr(item.ItemTax, 'CurrencyCode') else "USD"
            } if hasattr(item, 'ItemTax') else {},
            "ShippingTax": {
                "Amount": str(item.ShippingTax.Amount) if hasattr(item, 'ShippingTax') and hasattr(item.ShippingTax, 'Amount') else "0.00",
                "CurrencyCode": item.ShippingTax.CurrencyCode if hasattr(item, 'ShippingTax') and hasattr(item.ShippingTax, 'CurrencyCode') else "USD"
            } if hasattr(item, 'ShippingTax') else {},
            "GiftWrapTax": {
                "Amount": str(item.GiftWrapTax.Amount) if hasattr(item, 'GiftWrapTax') and hasattr(item.GiftWrapTax, 'Amount') else "0.00",
                "CurrencyCode": item.GiftWrapTax.CurrencyCode if hasattr(item, 'GiftWrapTax') and hasattr(item.GiftWrapTax, 'CurrencyCode') else "USD"
            } if hasattr(item, 'GiftWrapTax') else {},
            "ShippingDiscount": {
                "Amount": str(item.ShippingDiscount.Amount) if hasattr(item, 'ShippingDiscount') and hasattr(item.ShippingDiscount, 'Amount') else "0.00",
                "CurrencyCode": item.ShippingDiscount.CurrencyCode if hasattr(item, 'ShippingDiscount') and hasattr(item.ShippingDiscount, 'CurrencyCode') else "USD"
            } if hasattr(item, 'ShippingDiscount') else {},
            "PromotionDiscount": {
                "Amount": str(item.PromotionDiscount.Amount) if hasattr(item, 'PromotionDiscount') and hasattr(item.PromotionDiscount, 'Amount') else "0.00",
                "CurrencyCode": item.PromotionDiscount.CurrencyCode if hasattr(item, 'PromotionDiscount') and hasattr(item.PromotionDiscount, 'CurrencyCode') else "USD"
            } if hasattr(item, 'PromotionDiscount') else {},
            
            # Points and COD
            "PointsGranted": points_granted,
            "CODFee": cod_fee_dict,
            "CODFeeDiscount": cod_fee_discount_dict,
            
            # Delivery dates
            "ScheduledDeliveryStartDate": item.ScheduledDeliveryStartDate.isoformat() if hasattr(item, 'ScheduledDeliveryStartDate') and item.ScheduledDeliveryStartDate else None,
            "ScheduledDeliveryEndDate": item.ScheduledDeliveryEndDate.isoformat() if hasattr(item, 'ScheduledDeliveryEndDate') and item.ScheduledDeliveryEndDate else None,
            
            # Price designation
            "PriceDesignation": item.PriceDesignation if hasattr(item, 'PriceDesignation') else "",
            
            # Buyer information
            "BuyerInfo": buyer_info,
            
            # Buyer requested cancel
            "BuyerRequestedCancel": buyer_requested_cancel,
            
            # Serial numbers and promotions
            "SerialNumbers": serial_numbers,
            "PromotionIds": promotion_ids,
            
            # Condition
            "ConditionId": item.ConditionId if hasattr(item, 'ConditionId') else "",
            "ConditionSubtypeId": item.ConditionSubtypeId if hasattr(item, 'ConditionSubtypeId') else "",
            "ConditionNote": item.ConditionNote if hasattr(item, 'ConditionNote') else "",
            
            # Additional fields
            "IsGift": item.IsGift if hasattr(item, 'IsGift') else False,
            "IsTransparency": item.IsTransparency if hasattr(item, 'IsTransparency') else False,
        }
        
        return {
            "product_id": item.ASIN if hasattr(item, 'ASIN') else "",
            "sku": item.SellerSKU if hasattr(item, 'SellerSKU') else "",
            "product_name": item.Title if hasattr(item, 'Title') else "",
            "quantity": item.QuantityOrdered if hasattr(item, 'QuantityOrdered') else 0,
            "item_price": item_price,
            "platform_metadata": platform_metadata
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

