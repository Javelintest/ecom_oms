# Amazon SP-API Integration Setup Guide

This guide explains how to configure and use the Amazon Selling Partner API (SP-API) integration in the OMS system.

## Prerequisites

1. **Amazon Seller Central Account**: You need an active Amazon seller account
2. **SP-API Application**: Register your application in Amazon Developer Central
3. **API Credentials**: Obtain the following from Amazon:
   - Client ID (LWA Client Identifier)
   - Client Secret (LWA Client Secret)
   - Refresh Token
   - Marketplace ID (e.g., `ATVPDKIKX0DER` for US)

## Installation

Install the required Python package:

```bash
pip install python-amazon-sp-api
```

Or install all requirements:

```bash
pip install -r requirements.txt
```

## Configuration

### Step 1: Register Your Application

1. Go to [Amazon Developer Central](https://developer.amazon.com/)
2. Register as a developer (if not already)
3. Create a new SP-API application
4. Note down your **Client ID** and **Client Secret**

### Step 2: Authorize Your Application

1. Follow Amazon's authorization flow to get a **Refresh Token**
2. This typically involves:
   - Creating an authorization URL
   - Having the seller authorize your app
   - Exchanging the authorization code for a refresh token

### Step 3: Get Marketplace ID

Common Marketplace IDs:
- **US**: `ATVPDKIKX0DER`
- **UK**: `A1F83G8C2ARO7P`
- **Germany**: `A1PA6795UKMFR9`
- **India**: `A19VAU5U5O7RUS`
- **Canada**: `A2EUQ1WTGCTBG2`

### Step 4: Configure in Database

Update the `platforms` table in your database with the API configuration:

```sql
UPDATE platforms 
SET api_config = JSON_OBJECT(
    'client_id', 'YOUR_CLIENT_ID',
    'client_secret', 'YOUR_CLIENT_SECRET',
    'refresh_token', 'YOUR_REFRESH_TOKEN',
    'marketplace_id', 'ATVPDKIKX0DER',
    'region', 'NA'
)
WHERE name = 'amazon';
```

Or via the API:

```python
import requests

response = requests.put(
    "http://localhost:8000/platforms/1",
    json={
        "api_config": {
            "client_id": "YOUR_CLIENT_ID",
            "client_secret": "YOUR_CLIENT_SECRET",
            "refresh_token": "YOUR_REFRESH_TOKEN",
            "marketplace_id": "ATVPDKIKX0DER",
            "region": "NA"  # NA, EU, FE, or SANDBOX
        }
    }
)
```

## API Configuration Structure

The `api_config` JSON field should contain:

```json
{
    "client_id": "amzn1.application-oa2-client.xxxxx",
    "client_secret": "xxxxx",
    "refresh_token": "Atzr|xxxxx",
    "marketplace_id": "ATVPDKIKX0DER",
    "region": "NA"
}
```

### Required Fields:
- `client_id`: Your LWA Client Identifier
- `client_secret`: Your LWA Client Secret
- `refresh_token`: OAuth refresh token
- `marketplace_id`: Amazon marketplace identifier

### Optional Fields:
- `region`: API region (`NA`, `EU`, `FE`, or `SANDBOX`). Defaults to `NA`

## Usage

Once configured, the Amazon adapter will automatically:

1. **Authenticate** using your credentials
2. **Fetch orders** from the Orders API
3. **Fetch inventory** from the FBA Inventory API
4. **Normalize data** to the unified format

### Sync Orders

```bash
curl -X POST "http://localhost:8000/orders/sync?platform_name=amazon"
```

### Sync Inventory

```bash
curl -X POST "http://localhost:8000/inventory/sync?platform_name=amazon"
```

## Features

### Orders API
- Fetches orders created/updated within a date range
- Automatically fetches order items for each order
- Handles pagination automatically
- Normalizes Amazon order data to unified format

### Inventory API
- Fetches FBA inventory summaries
- Supports querying by SKU or list of SKUs
- Returns total, available, and reserved quantities

## Error Handling

The adapter includes robust error handling:

- **Authentication Errors**: Logged and falls back to mock data
- **Rate Limiting**: Handled by the underlying library
- **API Errors**: Logged with details, sync continues with other platforms
- **Missing Configuration**: Falls back to mock data for testing

## Testing

### Sandbox Mode

For testing, use the sandbox environment:

```json
{
    "region": "SANDBOX",
    "marketplace_id": "ATVPDKIKX0DER"
}
```

### Mock Data

If SP-API is not configured or fails, the adapter automatically uses mock data for testing purposes.

## Troubleshooting

### Common Issues

1. **Import Error**: `python-amazon-sp-api not installed`
   - Solution: `pip install python-amazon-sp-api`

2. **Authentication Failed**: Invalid credentials
   - Check: Client ID, Client Secret, and Refresh Token
   - Ensure refresh token hasn't expired

3. **Marketplace Not Found**: Invalid marketplace ID
   - Check: Marketplace ID matches your seller account's marketplace
   - Defaults to US marketplace if not found

4. **Rate Limiting**: Too many requests
   - The library handles rate limiting automatically
   - Consider reducing sync frequency

## Security Best Practices

1. **Never commit credentials** to version control
2. **Store credentials securely** in environment variables or encrypted storage
3. **Use IAM roles** when possible (if supported by your infrastructure)
4. **Rotate credentials** regularly
5. **Monitor API usage** to detect unauthorized access

## API Documentation

For detailed SP-API documentation, visit:
- [Amazon SP-API Documentation](https://developer-docs.amazon.com/sp-api/)
- [Orders API Reference](https://developer-docs.amazon.com/sp-api/docs/orders-api-v0-reference)
- [FBA Inventory API Reference](https://developer-docs.amazon.com/sp-api/docs/fba-inventory-api-v1-reference)

## Support

For issues with:
- **SP-API**: Contact Amazon Developer Support
- **This Integration**: Check logs in `sync_logs` table or application logs

