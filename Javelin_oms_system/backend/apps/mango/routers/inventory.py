from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from ...common.dependencies import get_db, AppAccessChecker
from ...common import models
from .. import schemas

# Require 'mango' app access for all endpoints in this router
require_mango = AppAccessChecker("mango")
router = APIRouter(dependencies=[Depends(require_mango)])

# --- Vendor Endpoints ---
@router.post("/vendors", response_model=schemas.VendorResponse)
def create_vendor(vendor: schemas.VendorCreate, current_user: models.User = Depends(require_mango), db: Session = Depends(get_db)):
    db_vendor = models.Vendor(**vendor.dict(), company_id=current_user.company_id)
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

@router.get("/vendors", response_model=List[schemas.VendorResponse])
def get_vendors(current_user: models.User = Depends(require_mango), db: Session = Depends(get_db)):
    return db.query(models.Vendor).filter(models.Vendor.company_id == current_user.company_id).all()

# --- Warehouse Endpoints ---
@router.post("/warehouses", response_model=schemas.WarehouseResponse)
def create_warehouse(wh: schemas.WarehouseCreate, current_user: models.User = Depends(require_mango), db: Session = Depends(get_db)):
    db_wh = models.Warehouse(**wh.dict(), company_id=current_user.company_id)
    db.add(db_wh)
    db.commit()
    db.refresh(db_wh)
    return db_wh

@router.get("/warehouses", response_model=List[schemas.WarehouseResponse])
def get_warehouses(current_user: models.User = Depends(require_mango), db: Session = Depends(get_db)):
    return db.query(models.Warehouse).filter(models.Warehouse.company_id == current_user.company_id).all()

# --- Product Endpoints ---
@router.post("/products", response_model=schemas.ProductResponse)
def create_product(prod: schemas.ProductCreate, current_user: models.User = Depends(require_mango), db: Session = Depends(get_db)):
    db_prod = models.Product(**prod.dict(), company_id=current_user.company_id)
    db.add(db_prod)
    db.commit()
    db.refresh(db_prod)
    return db_prod

@router.get("/products", response_model=List[schemas.ProductResponse])
def get_products(current_user: models.User = Depends(require_mango), db: Session = Depends(get_db)):
    return db.query(models.Product).filter(models.Product.company_id == current_user.company_id).all()

@router.delete("/products/{product_id}")
def delete_product(product_id: int, current_user: models.User = Depends(require_mango), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.company_id == current_user.company_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    return {"success": True, "message": "Product deleted successfully"}


# --- Purchase Order Endpoints ---
# (Assuming POs exist in schema but not shown in view_file fully)
# I will output the file up to Product for now as I can't confirm PO schema details fully from previous views?
# Wait, PO endpoint was at line 50. I should verify if PO endpoint exists.
# Previous view only showed up to line 50.
# I will keep the rest of the file if possible or just rewrite up to what I know.
# But replacing 1-150 effectively wipes PO implementation if I don't include it.
# I'll check if there were PO endpoints.

@router.post("/purchase-orders", response_model=schemas.POResponse)
def create_po(po: schemas.POCreate, current_user: models.User = Depends(require_mango), db: Session = Depends(get_db)):
    # 1. Create Header
    db_po = models.PurchaseOrder(
        company_id=current_user.company_id,
        po_number=po.po_number,
        vendor_id=po.vendor_id,
        warehouse_id=po.warehouse_id,
        order_date=po.order_date,
        expected_delivery_date=po.expected_delivery_date,
        notes=po.notes,
        status="SENT", # Direct to SENT for simplicity in Phase 1
        total_amount=0 # Calc below
    )
    db.add(db_po)
    db.commit()
    db.refresh(db_po)
    
    # 2. Create Items
    total_amt = 0
    for item in po.items:
        # Fetch product to get SKU/Name if needed, or just link
        # Calculate line total
        line_total = item.quantity_ordered * item.unit_price # Simplified tax logic
        total_amt += line_total
        
        db_item = models.PurchaseOrderItem(
            po_id=db_po.id,
            product_id=item.product_id,
            quantity_ordered=item.quantity_ordered,
            unit_price=item.unit_price,
            tax_rate=item.tax_rate,
            total_price=line_total,
            sku="lookup" # TODO: Fetch SKU from product model
        )
        db.add(db_item)
    
    # Update Total
    db_po.total_amount = total_amt
    db.commit()
    db.refresh(db_po)
    return db_po

# --- Excel Import/Export Endpoints ---

@router.get("/products/export")
def export_products(current_user: models.User = Depends(require_mango), db: Session = Depends(get_db)):
    """Export all products to Excel file"""
    import pandas as pd
    from io import BytesIO
    
    products = db.query(models.Product).filter(models.Product.company_id == current_user.company_id).all()
    
    # Convert to DataFrame
    data = []
    for p in products:
        data.append({
            'SKU': p.sku,
            'Name': p.name,
            'Description': p.description,
            'Category': p.category,
            'Brand': p.brand,
            'HSN/SAC': p.hsn_sac,
            'Purchase Rate': float(p.purchase_rate) if p.purchase_rate else 0,
            'Sales Rate': float(p.sales_rate) if p.sales_rate else 0,
            'Weight (kg)': float(p.weight_kg) if p.weight_kg else 0,
            'Length (cm)': float(p.length_cm) if p.length_cm else 0,
            'Width (cm)': float(p.width_cm) if p.width_cm else 0,
            'Height (cm)': float(p.height_cm) if p.height_cm else 0,
            'Base UOM': p.base_uom,
            'Item Type': p.item_type,
            'Item Status': p.item_status,
        })
    
    df = pd.DataFrame(data)
    
    # Create Excel file in memory
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Items')
        
        # Auto-adjust column widths
        worksheet = writer.sheets['Items']
        for idx, col in enumerate(df.columns):
            max_length = max(df[col].astype(str).map(len).max(), len(col)) + 2
            worksheet.column_dimensions[chr(65 + idx)].width = min(max_length, 50)
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': 'attachment; filename=items_export.xlsx'}
    )


@router.get("/products/template")
def download_template():
    """Download sample Excel template for importing products"""
    import pandas as pd
    from io import BytesIO
    
    # Sample data
    sample_data = {
        'SKU': ['PROD-001', 'PROD-002'],
        'Name': ['Sample Product 1', 'Sample Product 2'],
        'Description': ['Description for product 1', 'Description for product 2'],
        'Category': ['Electronics', 'Furniture'],
        'Brand': ['Brand A', 'Brand B'],
        'HSN/SAC': ['12345678', '87654321'],
        'Purchase Rate': [100.00, 150.00],
        'Sales Rate': [150.00, 225.00],
        'Weight (kg)': [0.5, 2.0],
        'Length (cm)': [10.0, 50.0],
        'Width (cm)': [5.0, 30.0],
        'Height (cm)': [3.0, 20.0],
        'Base UOM': ['PC', 'PC'],
        'Item Type': ['Finished Goods', 'Finished Goods'],
        'Item Status': ['Active', 'Active'],
    }
    
    df = pd.DataFrame(sample_data)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Items')
        
        # Add instructions sheet
        instructions = pd.DataFrame({
            'Instructions': [
                '1. Fill in the Items sheet with your product data',
                '2. SKU and Name are mandatory fields',
                '3. Keep the column headers exactly as they are',
                '4. Remove the sample rows before uploading',
                '5. Supported Item Types: Raw Material, WIP, Finished Goods, Service',
                '6. Supported Item Status: Active, Inactive, Discontinued',
                '7. Base UOM examples: PC, KG, LTR, MTR, etc.',
                '8. Leave numeric fields blank or use 0 if not applicable',
                '9. Upload the file using "Import Items" button',
                '10. Maximum 1000 rows per upload'
            ]
        })
        instructions.to_excel(writer, index=False, sheet_name='Instructions')
        
        # Format cells
        for sheet_name in writer.sheets:
            worksheet = writer.sheets[sheet_name]
            for idx, col in enumerate(writer.sheets[sheet_name].columns):
                max_length = max(len(str(cell.value or '')) for cell in col) + 2
                worksheet.column_dimensions[col[0].column_letter].width = min(max_length, 60)
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': 'attachment; filename=items_import_template.xlsx'}
    )


@router.post("/products/import")
async def import_products(
    file: UploadFile = File(...),
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Import products from Excel file"""
    import pandas as pd
    from io import BytesIO
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are supported")
    
    contents = await file.read()
    
    try:
        df = pd.read_excel(BytesIO(contents), sheet_name='Items')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read Excel file: {str(e)}")
    
    # Validate required columns
    required_cols = ['SKU', 'Name']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(missing_cols)}")
    
    # Process each row
    created = 0
    updated = 0
    errors = []
    
    for idx, row in df.iterrows():
        try:
            sku = str(row.get('SKU', '')).strip()
            name = str(row.get('Name', '')).strip()
            
            if not sku or not name:
                errors.append(f"Row {idx+2}: SKU and Name are required")
                continue
            
            # Check if product exists
            existing = db.query(models.Product).filter(
                models.Product.company_id == current_user.company_id,
                models.Product.sku == sku
            ).first()
            
            product_data = {
                'sku': sku,
                'name': name,
                'description': str(row.get('Description', '') or ''),
                'category': str(row.get('Category', '') or ''),
                'brand': str(row.get('Brand', '') or ''),
                'hsn_sac': str(row.get('HSN/SAC', '') or ''),
                'purchase_rate': float(row.get('Purchase Rate', 0) or 0),
                'sales_rate': float(row.get('Sales Rate', 0) or 0),
                'weight_kg': float(row.get('Weight (kg)', 0) or 0),
                'length_cm': float(row.get('Length (cm)', 0) or 0),
                'width_cm': float(row.get('Width (cm)', 0) or 0),
                'height_cm': float(row.get('Height (cm)', 0) or 0),
                'base_uom': str(row.get('Base UOM', '') or ''),
                'item_type': str(row.get('Item Type', '') or ''),
                'item_status': str(row.get('Item Status', 'Active') or 'Active'),
                'company_id': current_user.company_id
            }
            
            if existing:
                # Update existing
                for key, value in product_data.items():
                    if key != 'company_id':
                        setattr(existing, key, value)
                updated += 1
            else:
                # Create new
                new_product = models.Product(**product_data)
                db.add(new_product)
                created += 1
                
        except Exception as e:
            errors.append(f"Row {idx+2}: {str(e)}")
    
    db.commit()
    
    return {
        'success': True,
        'created': created,
        'updated': updated,
        'errors': errors[:10] if errors else [],  # Limit to first 10 errors
        'total_errors': len(errors)
    }


# --- Platform Item Mapping Endpoints ---

@router.get("/platforms")
def get_supported_platforms():
    """Get list of supported e-commerce platforms"""
    platforms = [
        {"value": "Amazon", "label": "Amazon", "code_label": "ASIN/SKU"},
        {"value": "Flipkart", "label": "Flipkart", "code_label": "FSN/Product ID"},
        {"value": "Meesho", "label": "Meesho", "code_label": "Meesho SKU"},
        {"value": "Myntra", "label": "Myntra", "code_label": "Style ID"},
        {"value": "Shopify", "label": "Shopify", "code_label": "Product ID"},
        {"value": "WooCommerce", "label": "WooCommerce", "code_label": "Product ID"},
        {"value": "Magento", "label": "Magento", "code_label": "SKU"},
        {"value": "Others", "label": "Others", "code_label": "Custom Code"},
    ]
    return platforms


@router.post("/mappings", response_model=schemas.PlatformMappingResponse)
def create_platform_mapping(
    mapping: schemas.PlatformMappingCreate,
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Create a new platform item mapping"""
    # Verify product exists and belongs to company
    product = db.query(models.Product).filter(
        models.Product.id == mapping.product_id,
        models.Product.company_id == current_user.company_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check for duplicate mapping - one product can only have ONE mapping per platform
    existing = db.query(models.PlatformItemMapping).filter(
        models.PlatformItemMapping.product_id == mapping.product_id,
        models.PlatformItemMapping.platform_name == mapping.platform_name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"A mapping already exists for this product on {mapping.platform_name}. Please edit the existing mapping or delete it first."
        )
    
    # Create mapping
    db_mapping = models.PlatformItemMapping(
        **mapping.dict(),
        company_id=current_user.company_id
    )
    db.add(db_mapping)
    db.commit()
    db.refresh(db_mapping)
    return db_mapping


@router.get("/mappings", response_model=List[schemas.PlatformMappingWithProduct])
def get_platform_mappings(
    platform_name: Optional[str] = None,
    product_id: Optional[int] = None,
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Get all platform mappings with optional filters"""
    query = db.query(
        models.PlatformItemMapping,
        models.Product.sku,
        models.Product.name
    ).join(
        models.Product,
        models.PlatformItemMapping.product_id == models.Product.id
    ).filter(
        models.PlatformItemMapping.company_id == current_user.company_id
    )
    
    if platform_name:
        query = query.filter(models.PlatformItemMapping.platform_name == platform_name)
    
    if product_id:
        query = query.filter(models.PlatformItemMapping.product_id == product_id)
    
    results = query.all()
    
    # Format response
    mappings = []
    for mapping, sku, name in results:
        mapping_dict = {
            **mapping.__dict__,
            "product_sku": sku,
            "product_name": name
        }
        mappings.append(mapping_dict)
    
    return mappings


@router.get("/products/{product_id}/mappings", response_model=List[schemas.PlatformMappingResponse])
def get_product_mappings(
    product_id: int,
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Get all platform mappings for a specific product"""
    # Verify product exists and belongs to company
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.company_id == current_user.company_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    mappings = db.query(models.PlatformItemMapping).filter(
        models.PlatformItemMapping.product_id == product_id
    ).all()
    
    return mappings


@router.put("/mappings/{mapping_id}", response_model=schemas.PlatformMappingResponse)
def update_platform_mapping(
    mapping_id: int,
    mapping_update: schemas.PlatformMappingUpdate,
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Update a platform mapping"""
    db_mapping = db.query(models.PlatformItemMapping).filter(
        models.PlatformItemMapping.id == mapping_id,
        models.PlatformItemMapping.company_id == current_user.company_id
    ).first()
    
    if not db_mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    
    # Update fields
    for key, value in mapping_update.dict(exclude_unset=True).items():
        setattr(db_mapping, key, value)
    
    db.commit()
    db.refresh(db_mapping)
    return db_mapping


@router.delete("/mappings/{mapping_id}")
def delete_platform_mapping(
    mapping_id: int,
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Delete a platform mapping"""
    db_mapping = db.query(models.PlatformItemMapping).filter(
        models.PlatformItemMapping.id == mapping_id,
        models.PlatformItemMapping.company_id == current_user.company_id
    ).first()
    
    if not db_mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    
    db.delete(db_mapping)
    db.commit()
    return {"success": True, "message": "Mapping deleted successfully"}


@router.get("/mappings/export")
def export_mappings(
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Export all channel mappings to Excel"""
    # Fetch all mappings with product info
    mappings = db.query(
        models.PlatformItemMapping,
        models.Product.sku,
        models.Product.name
    ).join(
        models.Product,
        models.PlatformItemMapping.product_id == models.Product.id
    ).filter(
        models.PlatformItemMapping.company_id == current_user.company_id
    ).all()
    
    # Create DataFrame
    data = []
    for mapping, sku, name in mappings:
        data.append({
            'Internal SKU': sku,
            'Internal Item Name': name,
            'Platform': mapping.platform_name,
            'Platform Item Code': mapping.platform_item_code,
            'Platform Variant Code': mapping.platform_variant_code or '',
            'Platform Listing URL': mapping.platform_listing_url or '',
            'Status': 'Active' if mapping.is_active else 'Inactive',
            'Notes': mapping.notes or ''
        })
    
    df = pd.DataFrame(data)
    
    # Create Excel file
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Channel Mappings', index=False)
        
        # Auto-adjust column widths
        worksheet = writer.sheets['Channel Mappings']
        for idx, col in enumerate(df.columns):
            max_length = max(df[col].astype(str).apply(len).max(), len(col)) + 2
            worksheet.column_dimensions[chr(65 + idx)].width = min(max_length, 50)
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': 'attachment; filename=channel_mappings.xlsx'}
    )


@router.get("/mappings/template")
def download_template(current_user: models.User = Depends(require_mango)):
    """Download Excel template for bulk mapping import"""
    # Create sample template
    data = {
        'Internal SKU': ['PROD-001', 'PROD-002'],
        'Platform': ['Amazon', 'Flipkart'],
        'Platform Item Code': ['B08XYZ123', 'FLIPKART123'],
        'Platform Variant Code': ['', 'SIZE-M'],
        'Platform Listing URL': ['https://amazon.com/...', ''],
        'Status': ['Active', 'Active'],
        'Notes': ['Sample mapping', '']
    }
    
    df = pd.DataFrame(data)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Mappings Template', index=False)
        
        # Add instructions sheet
        instructions = pd.DataFrame({
            'Instructions': [
                '1. Fill in the Internal SKU (must exist in your item master)',
                '2. Select Platform: Amazon, Flipkart, Meesho, Myntra, Shopify, WooCommerce, Magento, Others',
                '3. Enter the Platform Item Code (required)',
                '4. Optionally add Platform Variant Code, Listing URL, and Notes',
                '5. Status can be: Active or Inactive',
                '6. Save the file and upload it using the Import button',
                '',
                'IMPORTANT:',
                '- One product can be mapped to multiple platforms',
                '- One product can only have ONE mapping per platform',
                '- Duplicate mappings will be rejected'
            ]
        })
        instructions.to_excel(writer, sheet_name='Instructions', index=False)
        
        # Format columns
        for sheet_name in writer.sheets:
            worksheet = writer.sheets[sheet_name]
            for column in worksheet.columns:
                max_length = max(len(str(cell.value or '')) for cell in column)
                worksheet.column_dimensions[column[0].column_letter].width = min(max_length + 2, 60)
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': 'attachment; filename=channel_mapping_template.xlsx'}
    )


@router.post("/mappings/import")
async def import_mappings(
    file: UploadFile = File(...),
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Import channel mappings from Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")
    
    try:
        # Read Excel file
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        # Validate required columns
        required_cols = ['Internal SKU', 'Platform', 'Platform Item Code']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_cols)}"
            )
        
        # Process results
        success_count = 0
        error_count = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Find product by SKU
                product = db.query(models.Product).filter(
                    models.Product.sku == str(row['Internal SKU']).strip(),
                    models.Product.company_id == current_user.company_id
                ).first()
                
                if not product:
                    errors.append({
                        'row': idx + 2,
                        'sku': row['Internal SKU'],
                        'error': f"Product with SKU '{row['Internal SKU']}' not found"
                    })
                    error_count += 1
                    continue
                
                # Check for existing mapping
                existing = db.query(models.PlatformItemMapping).filter(
                    models.PlatformItemMapping.product_id == product.id,
                    models.PlatformItemMapping.platform_name == str(row['Platform']).strip()
                ).first()
                
                if existing:
                    errors.append({
                        'row': idx + 2,
                        'sku': row['Internal SKU'],
                        'error': f"Mapping already exists for {row['Platform']}"
                    })
                    error_count += 1
                    continue
                
                # Create mapping
                mapping = models.PlatformItemMapping(
                    company_id=current_user.company_id,
                    product_id=product.id,
                    platform_name=str(row['Platform']).strip(),
                    platform_item_code=str(row['Platform Item Code']).strip(),
                    platform_variant_code=str(row.get('Platform Variant Code', '')).strip() or None,
                    platform_listing_url=str(row.get('Platform Listing URL', '')).strip() or None,
                    is_active=str(row.get('Status', 'Active')).strip().lower() == 'active',
                    notes=str(row.get('Notes', '')).strip() or None
                )
                
                db.add(mapping)
                success_count += 1
                
            except Exception as e:
                errors.append({
                    'row': idx + 2,
                    'sku': row.get('Internal SKU', 'N/A'),
                    'error': str(e)
                })
                error_count += 1
        
        # Commit all successful mappings
        if success_count > 0:
            db.commit()
        
        return {
            'success': True,
            'total_rows': len(df),
            'success_count': success_count,
            'error_count': error_count,
            'errors': errors[:20]  # Limit to first 20 errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")



@router.get("/purchase-orders", response_model=List[schemas.POResponse])
def get_pos(db: Session = Depends(get_db)):
    return db.query(models.PurchaseOrder).all()


# --- Stock Transfer Endpoints ---
@router.post("/stock-transfers", response_model=schemas.StockTransferResponse)
async def create_stock_transfer(
    transfer: schemas.StockTransferCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_mango)
):
    """Create a new stock transfer between warehouses (draft or pending approval)"""
    
    # Validate warehouses are different
    if transfer.source_warehouse_id == transfer.destination_warehouse_id:
        raise HTTPException(
            status_code=400,
            detail="Source and destination warehouse cannot be the same"
        )
    
    # Validate warehouses exist and belong to company
    source_wh = db.query(models.Warehouse).filter(
        models.Warehouse.id == transfer.source_warehouse_id,
        models.Warehouse.company_id == current_user.company_id
    ).first()
    
    destination_wh = db.query(models.Warehouse).filter(
        models.Warehouse.id == transfer.destination_warehouse_id,
        models.Warehouse.company_id == current_user.company_id
    ).first()
    
    if not source_wh:
        raise HTTPException(status_code=404, detail="Source warehouse not found")
    if not destination_wh:
        raise HTTPException(status_code=404, detail="Destination warehouse not found")
    if source_wh.id == dest_wh.id:
        raise HTTPException(status_code=400, detail="Source and destination warehouse cannot be the same")
    
    # Determine status based on is_draft flag
    if transfer.is_draft:
        status = "DRAFT"
        approval_status = "draft"
    else:
        status = "PENDING_APPROVAL"
        approval_status = "pending_approval"
    
    # Create transfer header
    db_transfer = models.StockTransfer(
        transfer_number=transfer.transfer_number,
        source_warehouse_id=transfer.source_warehouse_id,
        destination_warehouse_id=transfer.destination_warehouse_id,
        status=status,
        approval_status=approval_status,
        notes=transfer.notes,
        created_by_user_id=current_user.id
    )
    db.add(db_transfer)
    db.commit()
    db.refresh(db_transfer)
    
    # Create transfer items (if provided)
    if transfer.items:
        for item in transfer.items:
            # Validate product exists
            product = db.query(models.Product).filter(
                models.Product.id == item.product_id,
                models.Product.company_id == current_user.company_id
            ).first()
            
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
            
            db_item = models.StockTransferItem(
                transfer_id=db_transfer.id,
                product_id=item.product_id,
                quantity_sent=item.quantity_sent,
                quantity_received=0
            )
            db.add(db_item)
    
    db.commit()
    db.refresh(db_transfer)
    
    # Enrich response with additional data
    response = schemas.StockTransferResponse.from_orm(db_transfer)
    response.source_warehouse_name = source_wh.name
    response.destination_warehouse_name = dest_wh.name
    response.created_by_user_name = current_user.full_name
    
    return response


@router.get("/stock-transfers", response_model=List[schemas.StockTransferResponse])
def get_stock_transfers(
    status: Optional[str] = None,
    source_warehouse_id: Optional[int] = None,
    destination_warehouse_id: Optional[int] = None,
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Get all stock transfers with optional filters"""
    # Base query - filter by warehouses that belong to user's company
    query = db.query(models.StockTransfer).join(
        models.Warehouse,
        models.StockTransfer.source_warehouse_id == models.Warehouse.id
    ).filter(
        models.Warehouse.company_id == current_user.company_id
    )
    
    if status:
        query = query.filter(models.StockTransfer.status == status)
    if source_warehouse_id:
        query = query.filter(models.StockTransfer.source_warehouse_id == source_warehouse_id)
    if destination_warehouse_id:
        query = query.filter(models.StockTransfer.destination_warehouse_id == destination_warehouse_id)
    
    return query.all()


@router.get("/stock-transfers/{transfer_id}", response_model=schemas.StockTransferResponse)
def get_stock_transfer(
    transfer_id: int,
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Get a specific stock transfer by ID"""
    transfer = db.query(models.StockTransfer).join(
        models.Warehouse,
        models.StockTransfer.source_warehouse_id == models.Warehouse.id
    ).filter(
        models.StockTransfer.id == transfer_id,
        models.Warehouse.company_id == current_user.company_id
    ).first()
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found")
    
    return transfer


@router.put("/stock-transfers/{transfer_id}/status")
def update_transfer_status(
    transfer_id: int,
    status: str,
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Update stock transfer status"""
    # Validate status
    valid_statuses = ["DRAFT", "IN_TRANSIT", "COMPLETED", "CANCELLED"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    # Get transfer
    transfer = db.query(models.StockTransfer).join(
        models.Warehouse,
        models.StockTransfer.source_warehouse_id == models.Warehouse.id
    ).filter(
        models.StockTransfer.id == transfer_id,
        models.Warehouse.company_id == current_user.company_id
    ).first()
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found")
    
    # Update status
    transfer.status = status
    
    if status == "COMPLETED":
        from datetime import datetime
        transfer.completed_date = datetime.now()
    
    db.commit()
    db.refresh(transfer)
    
    return {"success": True, "message": f"Transfer status updated to {status}", "transfer": transfer}


@router.post("/stock-transfers/{transfer_id}/complete")
def complete_stock_transfer(
    transfer_id: int,
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Complete a stock transfer and update stock ledger (only for approved transfers)"""
    from datetime import datetime
    
    # Get transfer with items
    transfer = db.query(models.StockTransfer).join(
        models.Warehouse,
        models.StockTransfer.source_warehouse_id == models.Warehouse.id
    ).filter(
        models.StockTransfer.id == transfer_id,
        models.Warehouse.company_id == current_user.company_id
    ).first()
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found")
    
    if transfer.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="Transfer is already completed")
    
    if transfer.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Cannot complete a cancelled transfer")
    
    # Check approval status
    if transfer.approval_status != "approved":
        raise HTTPException(
            status_code=400, 
            detail="Transfer must be approved before it can be completed"
        )
    
    # Process each item and create stock ledger entries
    for item in transfer.items:
        # Set quantity received to quantity sent (assuming full receipt)
        item.quantity_received = item.quantity_sent
        
        # Create stock ledger entry for source warehouse (OUT)
        source_ledger = models.StockLedger(
            product_id=item.product_id,
            warehouse_id=transfer.source_warehouse_id,
            transaction_type="OUT_TRANSFER",
            quantity=-item.quantity_sent,  # Negative for outbound
            reference_model="STOCK_TRANSFER",
            reference_id=transfer.transfer_number,
            balance_after=0  # TODO: Calculate actual balance
        )
        db.add(source_ledger)
        
        # Create stock ledger entry for destination warehouse (IN)
        dest_ledger = models.StockLedger(
            product_id=item.product_id,
            warehouse_id=transfer.destination_warehouse_id,
            transaction_type="IN_TRANSFER",
            quantity=item.quantity_received,  # Positive for inbound
            reference_model="STOCK_TRANSFER",
            reference_id=transfer.transfer_number,
            balance_after=0  # TODO: Calculate actual balance
        )
        db.add(dest_ledger)
    
    # Update transfer status
    transfer.status = "COMPLETED"
    transfer.completed_date = datetime.now()
    
    db.commit()
    db.refresh(transfer)
    
    return {
        "success": True,
        "message": "Stock transfer completed successfully",
        "transfer": transfer
    }


@router.delete("/stock-transfers/{transfer_id}")
def cancel_stock_transfer(
    transfer_id: int,
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Cancel a stock transfer (only if not completed)"""
    transfer = db.query(models.StockTransfer).join(
        models.Warehouse,
        models.StockTransfer.source_warehouse_id == models.Warehouse.id
    ).filter(
        models.StockTransfer.id == transfer_id,
        models.Warehouse.company_id == current_user.company_id
    ).first()
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found")
    
    if transfer.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="Cannot cancel a completed transfer")
    
    transfer.status = "CANCELLED"
    db.commit()
    
    return {"success": True, "message": "Stock transfer cancelled successfully"}


@router.put("/stock-transfers/{transfer_id}", response_model=schemas.StockTransferResponse)
async def update_stock_transfer(
    transfer_id: int,
    transfer_update: schemas.StockTransferUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_mango) # Keeping original dependency for consistency
):
    """Update a draft stock transfer"""
    
    # Get existing transfer
    transfer = db.query(models.StockTransfer).filter(
        models.StockTransfer.id == transfer_id,
        models.StockTransfer.created_by_user_id == current_user.id,
        models.StockTransfer.status == "DRAFT"
    ).first()
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Draft transfer not found or cannot be edited")
    
    # If updating warehouses, validate they are different
    source_id = transfer_update.source_warehouse_id if transfer_update.source_warehouse_id is not None else transfer.source_warehouse_id
    dest_id = transfer_update.destination_warehouse_id if transfer_update.destination_warehouse_id is not None else transfer.destination_warehouse_id
    
    if source_id == dest_id:
        raise HTTPException(
            status_code=400,
            detail="Source and destination warehouse cannot be the same"
        )
    
    # Update fields
    if transfer_update.source_warehouse_id:
        # Validate warehouse
        source_wh = db.query(models.Warehouse).filter(
            models.Warehouse.id == transfer_update.source_warehouse_id,
            models.Warehouse.company_id == current_user.company_id
        ).first()
        if not source_wh:
            raise HTTPException(status_code=404, detail="Source warehouse not found")
        transfer.source_warehouse_id = transfer_update.source_warehouse_id
    
    if transfer_update.destination_warehouse_id:
        # Validate warehouse
        dest_wh = db.query(models.Warehouse).filter(
            models.Warehouse.id == transfer_update.destination_warehouse_id,
            models.Warehouse.company_id == current_user.company_id
        ).first()
        if not dest_wh:
            raise HTTPException(status_code=404, detail="Destination warehouse not found")
        transfer.destination_warehouse_id = transfer_update.destination_warehouse_id
    
    if transfer_update.notes is not None:
        transfer.notes = transfer_update.notes
    
    # Update items if provided
    if transfer_update.items is not None:
        # Delete existing items
        db.query(models.StockTransferItem).filter(
            models.StockTransferItem.transfer_id == transfer_id
        ).delete()
        
        # Add new items
        for item in transfer_update.items:
            product = db.query(models.Product).filter(
                models.Product.id == item.product_id,
                models.Product.company_id == current_user.company_id
            ).first()
            
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
            
            db_item = models.StockTransferItem(
                transfer_id=transfer.id,
                product_id=item.product_id,
                quantity_sent=item.quantity_sent,
                quantity_received=0
            )
            db.add(db_item)
    
    db.commit()
    db.refresh(transfer)
    return transfer


@router.post("/stock-transfers/{transfer_id}/submit-for-approval")
def submit_for_approval(
    transfer_id: int,
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Submit a draft transfer for approval"""
    transfer = db.query(models.StockTransfer).join(
        models.Warehouse,
        models.StockTransfer.source_warehouse_id == models.Warehouse.id
    ).filter(
        models.StockTransfer.id == transfer_id,
        models.Warehouse.company_id == current_user.company_id
    ).first()
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found")
    
    if transfer.status != "DRAFT":
        raise HTTPException(status_code=400, detail="Only draft transfers can be submitted for approval")
    
    # Validate transfer has items
    if not transfer.items or len(transfer.items) == 0:
        raise HTTPException(status_code=400, detail="Transfer must have at least one item")
    
    transfer.status = "PENDING_APPROVAL"
    transfer.approval_status = "pending_approval"
    db.commit()
    db.refresh(transfer)
    
    return {"success": True, "message": "Transfer submitted for approval", "transfer": transfer}


@router.post("/stock-transfers/{transfer_id}/approve")
def approve_transfer(
    transfer_id: int,
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Approve a pending stock transfer"""
    from datetime import datetime
    
    transfer = db.query(models.StockTransfer).join(
        models.Warehouse,
        models.StockTransfer.source_warehouse_id == models.Warehouse.id
    ).filter(
        models.StockTransfer.id == transfer_id,
        models.Warehouse.company_id == current_user.company_id
    ).first()
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found")
    
    if transfer.approval_status != "pending_approval":
        raise HTTPException(status_code=400, detail="Only pending transfers can be approved")
    
    # Update approval fields
    transfer.approval_status = "approved"
    transfer.status = "APPROVED"
    transfer.approved_by_user_id = current_user.id
    transfer.approved_at = datetime.now()
    
    db.commit()
    db.refresh(transfer)
    
    return {"success": True, "message": "Transfer approved successfully", "transfer": transfer}


@router.post("/stock-transfers/{transfer_id}/reject")
def reject_transfer(
    transfer_id: int,
    rejection: schemas.TransferApprovalRequest,
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Reject a pending stock transfer"""
    from datetime import datetime
    
    transfer = db.query(models.StockTransfer).join(
        models.Warehouse,
        models.StockTransfer.source_warehouse_id == models.Warehouse.id
    ).filter(
        models.StockTransfer.id == transfer_id,
        models.Warehouse.company_id == current_user.company_id
    ).first()
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found")
    
    if transfer.approval_status != "pending_approval":
        raise HTTPException(status_code=400, detail="Only pending transfers can be rejected")
    
    # Update rejection fields
    transfer.approval_status = "rejected"
    transfer.status = "REJECTED"
    transfer.approved_by_user_id = current_user.id
    transfer.approved_at = datetime.now()
    transfer.rejection_reason = rejection.rejection_reason
    
    db.commit()
    db.refresh(transfer)
    
    return {"success": True, "message": "Transfer rejected", "transfer": transfer}


@router.get("/stock-transfers/pending-approval", response_model=List[schemas.StockTransferResponse])
def get_pending_approvals(
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Get all transfers pending approval for the user's company"""
    transfers = db.query(models.StockTransfer).join(
        models.Warehouse,
        models.StockTransfer.source_warehouse_id == models.Warehouse.id
    ).filter(
        models.Warehouse.company_id == current_user.company_id,
        models.StockTransfer.approval_status == "pending_approval"
    ).all()
    
    return transfers


@router.get("/stock-transfers/my-drafts", response_model=List[schemas.StockTransferResponse])
def get_my_drafts(
    current_user: models.User = Depends(require_mango),
    db: Session = Depends(get_db)
):
    """Get all draft transfers created by current user"""
    transfers = db.query(models.StockTransfer).join(
        models.Warehouse,
        models.StockTransfer.source_warehouse_id == models.Warehouse.id
    ).filter(
        models.Warehouse.company_id == current_user.company_id,
        models.StockTransfer.created_by_user_id == current_user.id,
        models.StockTransfer.status == "DRAFT"
    ).all()
    
    return transfers


# --- GRN Endpoints ---
@router.post("/grn", response_model=schemas.GRNResponse)
def create_grn(grn: schemas.GRNCreate, db: Session = Depends(get_db)):
    # 1. Create GRN Head
    db_grn = models.GRN(
        grn_number=grn.grn_number,
        po_id=grn.po_id,
        vendor_invoice_no=grn.vendor_invoice_no,
        status="COMPLETED" # Auto-complete for Phase 1
    )
    db.add(db_grn)
    db.commit()
    db.refresh(db_grn)
    
    # 2. Process Items & Update Stock
    for item in grn.items:
        # A. Create GRN Line
        db_item = models.GRNItem(
            grn_id=db_grn.id,
            po_item_id=item.po_item_id,
            product_id=item.product_id,
            quantity_received=item.quantity_received,
            quantity_accepted=item.quantity_accepted,
            quantity_rejected=item.quantity_rejected,
            batch_number=item.batch_number,
            expiry_date=item.expiry_date,
            rejection_reason=item.rejection_reason
        )
        db.add(db_item)
        
        # B. Update PO Line Received Qty
        po_item = db.query(models.PurchaseOrderItem).filter(models.PurchaseOrderItem.id == item.po_item_id).first()
        if po_item:
            po_item.quantity_received += item.quantity_received
            
        # C. Update Stock Ledger (IN) if Accepted > 0
        if item.quantity_accepted > 0:
            po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == grn.po_id).first()
            
            ledger_entry = models.StockLedger(
                product_id=item.product_id,
                warehouse_id=po.warehouse_id,
                transaction_type="IN_PO",
                quantity=item.quantity_accepted,
                reference_model="GRN",
                reference_id=db_grn.grn_number,
                balance_after=0 # TODO: Calculate actual balance
            )
            db.add(ledger_entry)

    db.commit()
    db.refresh(db_grn)
    return db_grn
