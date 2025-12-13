"""Platform connection management router"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import urllib.parse
import logging
from ..common import get_db, models
from ..platforms import get_adapter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/connections", tags=["Connections"])


@router.get("/status/{platform_id}", response_model=dict)
def get_connection_status(platform_id: int, db: Session = Depends(get_db)):
    """Get connection status for a platform"""
    platform = db.query(models.Platform).filter_by(id=platform_id).first()
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    # Check if platform has API config
    has_config = bool(platform.api_config and len(platform.api_config) > 0)
    
    # Test connection if configured
    connection_status = "not_configured"
    error_message = None
    
    if has_config:
        try:
            adapter = get_adapter(platform.name, api_config=platform.api_config)
            # Try a simple operation to test connection
            if platform.name == "amazon":
                # For Amazon, we can't easily test without making an API call
                # Just check if credentials are present
                required_keys = ["client_id", "client_secret", "refresh_token", "marketplace_id"]
                if all(key in platform.api_config for key in required_keys):
                    connection_status = "configured"
                else:
                    connection_status = "incomplete"
                    error_message = "Missing required credentials"
            else:
                connection_status = "configured"
        except Exception as e:
            connection_status = "error"
            error_message = str(e)
            logger.error(f"Connection test failed for {platform.name}: {e}")
    
    return {
        "platform_id": platform.id,
        "platform_name": platform.name,
        "is_configured": has_config,
        "connection_status": connection_status,
        "error_message": error_message,
        "is_active": bool(platform.is_active),
    }


@router.post("/amazon/oauth/initiate", response_model=dict)
def initiate_amazon_oauth(
    client_id: str = Body(...),
    client_secret: str = Body(...),
    marketplace_id: str = Body(...),
    region: str = Body("NA"),
    db: Session = Depends(get_db)
):
    """
    Initiate Amazon OAuth flow.
    Returns the authorization URL where user should be redirected.
    """
    # Get or create Amazon platform
    platform = db.query(models.Platform).filter_by(name="amazon").first()
    if not platform:
        platform = models.Platform(
            name="amazon",
            display_name="Amazon",
            is_active=1,
            api_config={}
        )
        db.add(platform)
        db.commit()
        db.refresh(platform)
    
    # Store temporary credentials (client_id, client_secret) in api_config
    # We'll complete the flow when we get the refresh token
    platform.api_config = {
        "client_id": client_id,
        "client_secret": client_secret,
        "marketplace_id": marketplace_id,
        "region": region,
        "oauth_in_progress": True
    }
    db.commit()
    
    # Generate Amazon OAuth authorization URL
    # Note: This is a simplified version. In production, you'd need to:
    # 1. Generate a state parameter for security
    # 2. Store it temporarily
    # 3. Use proper OAuth 2.0 flow
    
    # Get redirect URI from environment or use default
    import os
    redirect_uri = os.getenv(
        "AMAZON_OAUTH_REDIRECT_URI",
        "http://localhost:8000/connections/amazon/oauth/callback"
    )
    scope = "sellingpartnerapi::migration sellingpartnerapi::notifications"
    
    auth_url = (
        f"https://sellercentral.amazon.com/apps/authorize/consent?"
        f"application_id={client_id}&"
        f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
        f"state={platform.id}&"
        f"version=beta"
    )
    
    return {
        "authorization_url": auth_url,
        "platform_id": platform.id,
        "message": "Redirect user to this URL to authorize the application"
    }


@router.get("/amazon/oauth/callback")
def amazon_oauth_callback(
    spapi_oauth_code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handle Amazon OAuth callback.
    Exchange authorization code for refresh token.
    """
    import os
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    if error:
        return RedirectResponse(
            url=f"{frontend_url}/connections?error={urllib.parse.quote(error)}"
        )
    
    if not spapi_oauth_code or not state:
        return RedirectResponse(
            url=f"{frontend_url}/connections?error=missing_parameters"
        )
    
    try:
        platform_id = int(state)
        platform = db.query(models.Platform).filter_by(id=platform_id).first()
        
        if not platform or platform.name != "amazon":
            return RedirectResponse(
                url=f"{frontend_url}/connections?error=invalid_platform"
            )
        
        # Exchange authorization code for refresh token
        # This requires making a POST request to Amazon's token endpoint
        import requests
        
        client_id = platform.api_config.get("client_id")
        client_secret = platform.api_config.get("client_secret")
        import os
        redirect_uri = os.getenv(
            "AMAZON_OAUTH_REDIRECT_URI",
            "http://localhost:8000/connections/amazon/oauth/callback"
        )
        
        token_url = "https://api.amazon.com/auth/o2/token"
        token_data = {
            "grant_type": "authorization_code",
            "code": spapi_oauth_code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri
        }
        
        response = requests.post(token_url, data=token_data)
        
        if response.status_code == 200:
            token_response = response.json()
            refresh_token = token_response.get("refresh_token")
            
            # Update platform with refresh token
            platform.api_config.update({
                "refresh_token": refresh_token,
                "oauth_in_progress": False
            })
            db.commit()
            
            # Redirect to frontend (adjust URL based on your frontend setup)
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
            return RedirectResponse(
                url=f"{frontend_url}/connections?success=true&platform=amazon"
            )
        else:
            error_msg = response.text
            logger.error(f"Failed to exchange token: {error_msg}")
            return RedirectResponse(
                url=f"{frontend_url}/connections?error={urllib.parse.quote(error_msg)}"
            )
            
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        return RedirectResponse(
            url=f"{frontend_url}/connections?error={urllib.parse.quote(str(e))}"
        )


@router.post("/amazon/manual", response_model=dict)
def connect_amazon_manual(
    client_id: str = Body(...),
    client_secret: str = Body(...),
    refresh_token: str = Body(...),
    marketplace_id: str = Body(...),
    region: str = Body("NA"),
    db: Session = Depends(get_db)
):
    """Manually connect Amazon with credentials"""
    # Get or create Amazon platform
    platform = db.query(models.Platform).filter_by(name="amazon").first()
    if not platform:
        platform = models.Platform(
            name="amazon",
            display_name="Amazon",
            is_active=1,
            api_config={}
        )
        db.add(platform)
    
    # Update API config
    platform.api_config = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "marketplace_id": marketplace_id,
        "region": region
    }
    platform.is_active = 1
    db.commit()
    db.refresh(platform)
    
    return {
        "status": "success",
        "message": "Amazon connection configured successfully",
        "platform_id": platform.id
    }


@router.post("/flipkart/manual", response_model=dict)
def connect_flipkart_manual(
    username: str = Body(...),
    password: str = Body(...),
    api_key: Optional[str] = Body(None),
    api_secret: Optional[str] = Body(None),
    db: Session = Depends(get_db)
):
    """Manually connect Flipkart with credentials"""
    platform = db.query(models.Platform).filter_by(name="flipkart").first()
    if not platform:
        platform = models.Platform(
            name="flipkart",
            display_name="Flipkart",
            is_active=1,
            api_config={}
        )
        db.add(platform)
    
    platform.api_config = {
        "username": username,
        "password": password,
        "api_key": api_key,
        "api_secret": api_secret
    }
    platform.is_active = 1
    db.commit()
    db.refresh(platform)
    
    return {
        "status": "success",
        "message": "Flipkart connection configured successfully",
        "platform_id": platform.id
    }


@router.post("/test/{platform_id}", response_model=dict)
def test_connection(platform_id: int, db: Session = Depends(get_db)):
    """Test platform connection"""
    platform = db.query(models.Platform).filter_by(id=platform_id).first()
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    if not platform.api_config:
        raise HTTPException(status_code=400, detail="Platform not configured")
    
    try:
        adapter = get_adapter(platform.name, api_config=platform.api_config)
        
        # Try to fetch a small amount of data
        if platform.name == "amazon":
            # For Amazon, try fetching recent orders (last 1 day)
            from datetime import datetime, timedelta
            orders = adapter.fetch_recent_orders(days_back=1)
            return {
                "status": "success",
                "message": f"Connection successful. Found {len(orders)} orders.",
                "platform": platform.name
            }
        else:
            # For other platforms, just check if adapter initializes
            return {
                "status": "success",
                "message": "Connection configured successfully",
                "platform": platform.name
            }
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        return {
            "status": "error",
            "message": str(e),
            "platform": platform.name
        }


@router.delete("/{platform_id}", response_model=dict)
def disconnect_platform(platform_id: int, db: Session = Depends(get_db)):
    """Disconnect platform (clear credentials)"""
    platform = db.query(models.Platform).filter_by(id=platform_id).first()
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    platform.api_config = {}
    platform.is_active = 0
    db.commit()
    
    return {
        "status": "success",
        "message": f"{platform.display_name} disconnected successfully"
    }

