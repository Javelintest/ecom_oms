# Platform Connection Guide

This guide explains how to connect your e-commerce platforms (Amazon, Flipkart, etc.) to the Javelin OMS system.

## Accessing the Connection Page

1. Navigate to the **"Connect Platforms"** section from the sidebar
2. You'll see cards for each supported platform
3. Each platform has connection status and connection options

## Amazon Connection

### Option 1: OAuth Flow (Recommended)

1. Click **"Connect via OAuth (Recommended)"** to expand the form
2. Enter your Amazon SP-API credentials:
   - **Client ID**: Your LWA Client Identifier from Amazon Developer Central
   - **Client Secret**: Your LWA Client Secret
   - **Marketplace ID**: Select your marketplace (e.g., US, UK, India)
   - **Region**: Select the API region (NA, EU, FE, or SANDBOX)
3. Click **"Start OAuth Flow"**
4. You'll be redirected to Amazon's authorization page
5. Log in with your seller account and authorize the application
6. You'll be redirected back to the connection page with a success message

### Option 2: Manual Connection

If you already have a refresh token:

1. Click **"Connect Manually (Enter Credentials)"** to expand the form
2. Enter all required credentials:
   - **Client ID**: Your LWA Client Identifier
   - **Client Secret**: Your LWA Client Secret
   - **Refresh Token**: Your OAuth refresh token
   - **Marketplace ID**: Select your marketplace
   - **Region**: Select the API region
3. Click **"Connect Amazon"**

### Amazon Credentials Setup

To get your Amazon SP-API credentials:

1. Go to [Amazon Developer Central](https://developer.amazon.com/)
2. Register as a developer (if not already)
3. Create an SP-API application
4. Note your **Client ID** and **Client Secret**
5. Follow the authorization flow to get a **Refresh Token**

**Important**: Make sure to configure the OAuth redirect URI in your Amazon application settings:
- Default: `http://localhost:8000/connections/amazon/oauth/callback`
- Or set `AMAZON_OAUTH_REDIRECT_URI` environment variable

## Flipkart Connection

1. Enter your Flipkart Seller Hub credentials:
   - **Username / Seller ID**: Your Flipkart seller username
   - **Password**: Your seller account password
   - **API Key** (Optional): If you have API credentials
   - **API Secret** (Optional): If you have API credentials
2. Click **"Connect Flipkart"**

## Connection Status

After connecting, you'll see:
- **Connected** (Green): Platform is connected and configured
- **Incomplete Configuration** (Yellow): Missing required credentials
- **Connection Error** (Red): Error connecting to the platform
- **Not Connected** (Gray): Platform not configured

## Testing Connections

1. Click **"Test Connection"** button next to any connected platform
2. The system will attempt to fetch data from the platform
3. You'll see a success or error message

## Disconnecting Platforms

1. Click **"Disconnect"** button next to a connected platform
2. Confirm the action
3. All stored credentials will be removed
4. The platform will be deactivated

## Environment Variables

For production, configure these environment variables:

```bash
# Frontend URL (for OAuth redirects)
FRONTEND_URL=https://yourdomain.com

# Amazon OAuth Redirect URI
AMAZON_OAUTH_REDIRECT_URI=https://yourdomain.com/connections/amazon/oauth/callback
```

## Security Notes

- **Never share your credentials** with anyone
- Credentials are stored encrypted in the database
- Use environment variables for sensitive configuration
- Regularly rotate your API credentials
- Use OAuth flow when possible (more secure than manual entry)

## Troubleshooting

### Amazon OAuth Issues

- **"Invalid redirect URI"**: Make sure the redirect URI in Amazon Developer Central matches your configuration
- **"Authorization failed"**: Check that your Client ID and Secret are correct
- **"Token exchange failed"**: Verify your credentials and try again

### Connection Test Failures

- Check that all required credentials are entered
- Verify your API credentials are valid and not expired
- Check network connectivity to the platform's API
- Review error messages for specific issues

### General Issues

- **Platform not appearing**: Make sure the platform is initialized in the database
- **Form not submitting**: Check browser console for JavaScript errors
- **Status not updating**: Refresh the page or check backend logs

## Next Steps

After connecting platforms:

1. Go to **Dashboard** to see aggregated data
2. Use **Orders** section to view and sync orders
3. Use **Inventory** section to view and sync inventory
4. Configure sync schedules (coming soon)

## Support

For platform-specific API issues:
- **Amazon**: [Amazon SP-API Documentation](https://developer-docs.amazon.com/sp-api/)
- **Flipkart**: Contact Flipkart Seller Support

For OMS system issues, check the application logs or contact support.

