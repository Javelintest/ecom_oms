# Reports Guide

This guide explains how to generate, view, and download reports from your connected e-commerce platforms in the Javelin OMS system.

## Accessing the Reports Page

1. From the main dashboard, click **"Reports"** in the left sidebar
2. Or navigate directly to `reports.html`

## Available Report Types

### Amazon Reports

The system supports the following Amazon SP-API report types:

#### Orders
- **All Orders**: Comprehensive order report with buyer and product information
- **Amazon Fulfilled Shipments**: Shipment tracking information for FBA orders
- **Returns Report**: Product return information

#### Inventory
- **Active Listings**: All active product listings
- **All Listings**: All product listings including inactive ones
- **FBA Inventory**: Current FBA inventory levels

#### Performance
- **Seller Feedback**: Customer feedback and ratings

#### Finance
- **Settlement Report**: Financial settlement details with transaction information

## How to Request a Report

### Step 1: Select a Platform
1. At the top of the page, click on the platform button (e.g., "Amazon")
2. Only connected and active platforms will be available

### Step 2: Choose a Report Type
1. Browse the "Available Reports" list on the left side
2. Filter by category using the dropdown (Orders, Inventory, Finance, etc.)
3. Click on a report type to select it
4. The selected report will be highlighted and its details will appear

### Step 3: Set Date Range (Optional)
1. **Start Date**: Beginning of the report period
   - Leave empty to use default (last 30 days)
2. **End Date**: End of the report period
   - Leave empty to use today's date

### Step 4: Request the Report
1. Click **"Request Report"** button
2. The system will submit your request to the platform
3. You'll receive a confirmation with the Report ID

## Viewing Recent Reports

The "Recent Reports" table shows all your requested reports with:
- **Report Type**: Name of the requested report
- **Status**: Current processing status
  - **Completed** (green): Report is ready to download
  - **Processing** (blue): Report is being generated
  - **Failed** (red): Report generation failed
- **Created**: When the report was requested
- **Actions**: Available actions for each report

## Downloading Reports

### For Completed Reports:
1. Look for reports with **"Completed"** status
2. Click the **"Download"** button
3. The report will be downloaded as a CSV file to your default downloads folder

### For Processing Reports:
1. Click **"Check Status"** to update the report's status
2. Once completed, the download button will appear
3. Reports typically take 1-5 minutes to generate

## Report Refresh

- Click the **"Refresh"** button at the top right to reload the recent reports list
- This is useful to check if processing reports have completed

## Tips and Best Practices

### Date Ranges
- Use shorter date ranges (e.g., 7-30 days) for faster report generation
- Some report types have maximum date range limitations (typically 90 days)
- Amazon reports are usually available within a few minutes

### Report Categories

**Orders Reports**: Best for:
- Analyzing sales trends
- Export order data for accounting
- Customer service inquiries

**Inventory Reports**: Best for:
- Stock level monitoring
- Product catalog management
- FBA inventory tracking

**Finance Reports**: Best for:
- Reconciliation with bank statements
- Tax preparation
- Revenue analysis

**Performance Reports**: Best for:
- Monitoring seller metrics
- Customer satisfaction tracking
- Account health monitoring

## Troubleshooting

### Report Request Fails
- **Check Connection**: Ensure the platform is properly connected
- **Verify Credentials**: Make sure API credentials are valid
- **Date Range**: Try a smaller date range

### Report Stuck in "Processing"
- Wait 5-10 minutes and click "Check Status"
- Some reports take longer depending on data volume
- If stuck for > 30 minutes, request a new report

### Download Fails
- Check your browser's download settings
- Ensure popup blockers aren't interfering
- Try refreshing the page and downloading again

### No Reports Available
- Connect at least one platform first (go to "Connect Platforms")
- Ensure the platform credentials are properly configured
- Check that the platform is marked as "Active"

## Technical Details

### Amazon SP-API Report Types

The system uses Amazon's Selling Partner API (SP-API) Reports API:

```
GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL
GET_AMAZON_FULFILLED_SHIPMENTS_DATA_GENERAL
GET_FLAT_FILE_OPEN_LISTINGS_DATA
GET_MERCHANT_LISTINGS_ALL_DATA
GET_FBA_FULFILLMENT_CURRENT_INVENTORY_DATA
GET_SELLER_FEEDBACK_DATA
GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE
GET_FLAT_FILE_RETURNS_DATA_BY_RETURN_DATE
```

### Report Processing Flow

1. **Request**: System sends request to platform API
2. **Queue**: Platform queues the report generation
3. **Processing**: Platform generates the report
4. **Completion**: Report document is created
5. **Download**: System fetches and provides download link

### API Endpoints

- `GET /reports/types` - List available report types
- `POST /reports/request` - Request a new report
- `GET /reports/status/{report_id}` - Check report status
- `GET /reports/download/{document_id}` - Download completed report
- `GET /reports/list` - List all reports for a platform

## Future Platform Support

The reports system is designed to support multiple platforms:
- **Amazon**: ✅ Fully supported
- **Flipkart**: 🔄 Coming soon
- **Meesho**: 🔄 Coming soon
- **Myntra**: 🔄 Coming soon

## Keyboard Shortcuts

- **Refresh**: `Ctrl/Cmd + R` (or click Refresh button)
- **Theme Toggle**: Click moon/sun icon in navbar
- **Back to Dashboard**: Click logo or "Back to Dashboard" button

## Need Help?

- Check the [Amazon SP-API Setup Guide](AMAZON_SPAPI_SETUP.md) for API credentials
- Review the [Connection Guide](CONNECTION_GUIDE.md) for platform setup
- Consult the [Database Setup](DATABASE_SETUP.md) for storage configuration

