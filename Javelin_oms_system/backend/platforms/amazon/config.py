"""Amazon SP-API configuration helper"""
from typing import Dict, Any, Optional


class AmazonSPAPIConfig:
    """Helper class to extract and validate Amazon SP-API configuration"""
    
    REQUIRED_KEYS = [
        "client_id",
        "client_secret",
        "refresh_token",
        "marketplace_id",  # Primary marketplace ID
    ]
    
    OPTIONAL_KEYS = [
        "region",  # NA, EU, FE, or SANDBOX (default: NA)
        "access_key_id",  # For IAM role (if using)
        "secret_access_key",  # For IAM role (if using)
        "role_arn",  # For IAM role (if using)
    ]
    
    @staticmethod
    def from_platform_config(api_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract and validate Amazon SP-API configuration from platform api_config.
        
        Args:
            api_config: Dictionary containing API configuration from Platform model
            
        Returns:
            Dictionary with validated configuration
            
        Raises:
            ValueError: If required configuration is missing
        """
        if not api_config:
            raise ValueError("Amazon SP-API configuration is missing")
        
        # Check required keys
        missing_keys = [key for key in AmazonSPAPIConfig.REQUIRED_KEYS if key not in api_config]
        if missing_keys:
            raise ValueError(f"Missing required Amazon SP-API configuration keys: {', '.join(missing_keys)}")
        
        # Build config with defaults
        config = {
            "client_id": api_config["client_id"],
            "client_secret": api_config["client_secret"],
            "refresh_token": api_config["refresh_token"],
            "marketplace_id": api_config["marketplace_id"],
            "region": api_config.get("region", "NA"),  # Default to North America
        }
        
        # Add optional IAM role credentials if provided
        if "access_key_id" in api_config:
            config["access_key_id"] = api_config["access_key_id"]
            config["secret_access_key"] = api_config["secret_access_key"]
            config["role_arn"] = api_config.get("role_arn")
        
        return config

