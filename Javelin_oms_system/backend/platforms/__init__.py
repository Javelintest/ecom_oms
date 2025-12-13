"""Platform adapters for different e-commerce platforms"""
from typing import Optional, Dict, Any
from .base import PlatformAdapter
from .amazon import AmazonAdapter
from .flipkart import FlipkartAdapter
from .meesho import MeeshoAdapter
from .myntra import MyntraAdapter

__all__ = [
    "PlatformAdapter",
    "AmazonAdapter",
    "FlipkartAdapter",
    "MeeshoAdapter",
    "MyntraAdapter",
]

PLATFORM_ADAPTERS = {
    "amazon": AmazonAdapter,
    "flipkart": FlipkartAdapter,
    "meesho": MeeshoAdapter,
    "myntra": MyntraAdapter,
}

def get_adapter(platform_name: str, api_config: Optional[Dict[str, Any]] = None) -> PlatformAdapter:
    """
    Get adapter instance for a platform.
    
    Args:
        platform_name: Name of the platform (e.g., 'amazon', 'flipkart')
        api_config: Optional API configuration dictionary for the platform
        
    Returns:
        PlatformAdapter instance
    """
    adapter_class = PLATFORM_ADAPTERS.get(platform_name.lower())
    if not adapter_class:
        raise ValueError(f"Unsupported platform: {platform_name}")
    
    # Pass api_config to adapter if it accepts it (Amazon adapter does)
    if api_config and hasattr(adapter_class, '__init__'):
        # Check if adapter accepts api_config parameter
        import inspect
        sig = inspect.signature(adapter_class.__init__)
        if 'api_config' in sig.parameters:
            return adapter_class(api_config=api_config)
    
    return adapter_class()
