"""Base class for platform adapters"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any


class PlatformAdapter(ABC):
    """Abstract base class for all platform adapters"""
    
    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Return the platform name"""
        pass
    
    @abstractmethod
    def fetch_recent_orders(self, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch recent orders from the platform.
        Returns a list of orders in a standardized format.
        """
        pass
    
    @abstractmethod
    def fetch_inventory_snapshot(self, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch inventory snapshot from the platform.
        Returns a list of inventory items in a standardized format.
        """
        pass
    
    def normalize_order(self, raw_order: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize platform-specific order data to unified format.
        Override in subclasses if needed.
        """
        return raw_order
    
    def normalize_inventory(self, raw_inventory: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize platform-specific inventory data to unified format.
        Override in subclasses if needed.
        """
        return raw_inventory
