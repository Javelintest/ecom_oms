# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class Applications(models.Model):
    name = models.CharField(unique=True, max_length=100, blank=True, null=True)
    code = models.CharField(unique=True, max_length=50, blank=True, null=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'applications'


class ChannelDispatchMappings(models.Model):
    company = models.ForeignKey('Companies', models.DO_NOTHING)
    platform = models.CharField(max_length=50)
    channel_field_key = models.CharField(max_length=100)
    scan_field_key = models.CharField(max_length=100)
    transform_type = models.CharField(max_length=50, blank=True, null=True)
    is_bidirectional = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'channel_dispatch_mappings'


class ChannelFieldDefinitions(models.Model):
    company = models.ForeignKey('Companies', models.DO_NOTHING)
    platform = models.CharField(max_length=50)
    field_name = models.CharField(max_length=100)
    field_key = models.CharField(max_length=100)
    field_type = models.CharField(max_length=50)
    is_required = models.IntegerField(blank=True, null=True)
    default_value = models.CharField(max_length=255, blank=True, null=True)
    display_order = models.IntegerField(blank=True, null=True)
    validation_rules = models.JSONField(blank=True, null=True)
    help_text = models.CharField(max_length=500, blank=True, null=True)
    created_from_upload = models.IntegerField(blank=True, null=True)
    sample_value = models.CharField(max_length=255, blank=True, null=True)
    column_name = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    is_primary_key = models.IntegerField(blank=True, null=True)
    is_unique = models.IntegerField(blank=True, null=True)
    is_indexed = models.IntegerField(blank=True, null=True)
    foreign_key_table = models.CharField(max_length=100, blank=True, null=True)
    foreign_key_field = models.CharField(max_length=100, blank=True, null=True)
    on_duplicate = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'channel_field_definitions'


class Companies(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True, null=True)
    tax_id = models.CharField(max_length=50, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.CharField(max_length=200, blank=True, null=True)
    website = models.CharField(max_length=200, blank=True, null=True)
    logo_url = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    zip_code = models.CharField(max_length=20, blank=True, null=True)
    currency = models.CharField(max_length=10, blank=True, null=True)
    timezone = models.CharField(max_length=50, blank=True, null=True)
    industry = models.CharField(max_length=100, blank=True, null=True)
    fiscal_year = models.CharField(max_length=50, blank=True, null=True)
    report_basis = models.CharField(max_length=20, blank=True, null=True)
    language = models.CharField(max_length=50, blank=True, null=True)
    date_format = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'companies'


class CompanyApps(models.Model):
    company = models.ForeignKey(Companies, models.DO_NOTHING, blank=True, null=True)
    app = models.ForeignKey(Applications, models.DO_NOTHING, blank=True, null=True)
    is_active = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'company_apps'


class CustomFieldDefinitions(models.Model):
    company = models.ForeignKey(Companies, models.DO_NOTHING, blank=True, null=True)
    entity_type = models.CharField(max_length=50, blank=True, null=True)
    field_key = models.CharField(max_length=50, blank=True, null=True)
    field_label = models.CharField(max_length=100, blank=True, null=True)
    field_type = models.CharField(max_length=50, blank=True, null=True)
    options = models.JSONField(blank=True, null=True)
    default_value = models.CharField(max_length=255, blank=True, null=True)
    is_mandatory = models.IntegerField(blank=True, null=True)
    is_active = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'custom_field_definitions'


class CustomerAddresses(models.Model):
    customer = models.ForeignKey('Customers', models.DO_NOTHING)
    address_type = models.CharField(max_length=20, blank=True, null=True)
    is_default = models.IntegerField(blank=True, null=True)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    landmark = models.CharField(max_length=200, blank=True, null=True)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'customer_addresses'


class CustomerContacts(models.Model):
    customer = models.ForeignKey('Customers', models.DO_NOTHING)
    name = models.CharField(max_length=200)
    email = models.CharField(max_length=200, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    designation = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    role = models.CharField(max_length=50, blank=True, null=True)
    is_primary = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'customer_contacts'


class CustomerLedger(models.Model):
    customer = models.ForeignKey('Customers', models.DO_NOTHING)
    company = models.ForeignKey(Companies, models.DO_NOTHING, blank=True, null=True)
    transaction_date = models.DateTimeField()
    transaction_type = models.CharField(max_length=50)
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    reference_type = models.CharField(max_length=50, blank=True, null=True)
    reference_id = models.IntegerField(blank=True, null=True)
    debit_amount = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    credit_amount = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    balance = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    description = models.CharField(max_length=500, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    due_date = models.DateTimeField(blank=True, null=True)
    is_reconciled = models.IntegerField(blank=True, null=True)
    reconciled_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    created_by_user = models.ForeignKey('Users', models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'customer_ledger'


class CustomerReturnItems(models.Model):
    return_field = models.ForeignKey('CustomerReturns', models.DO_NOTHING, db_column='return_id', blank=True, null=True)  # Field renamed because it was a Python reserved word.
    product = models.ForeignKey('Products', models.DO_NOTHING, blank=True, null=True)
    quantity = models.IntegerField(blank=True, null=True)
    condition = models.CharField(max_length=50, blank=True, null=True)
    action = models.CharField(max_length=50, blank=True, null=True)
    reason = models.CharField(max_length=200, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'customer_return_items'


class CustomerReturns(models.Model):
    return_number = models.CharField(unique=True, max_length=50, blank=True, null=True)
    order = models.ForeignKey('Orders', models.DO_NOTHING, blank=True, null=True)
    warehouse = models.ForeignKey('Warehouses', models.DO_NOTHING, blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True)
    return_type = models.CharField(max_length=50, blank=True, null=True)
    carrier_tracking_ref = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'customer_returns'


class Customers(models.Model):
    company = models.ForeignKey(Companies, models.DO_NOTHING, blank=True, null=True)
    customer_code = models.CharField(unique=True, max_length=50, blank=True, null=True)
    name = models.CharField(max_length=200, blank=True, null=True)
    display_name = models.CharField(max_length=200, blank=True, null=True)
    email = models.CharField(max_length=200, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    website = models.CharField(max_length=200, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    gst_number = models.CharField(max_length=15, blank=True, null=True)
    pan_number = models.CharField(max_length=10, blank=True, null=True)
    customer_type = models.CharField(max_length=50, blank=True, null=True)
    tax_id = models.CharField(max_length=50, blank=True, null=True)
    tax_registration_number = models.CharField(max_length=50, blank=True, null=True)
    currency = models.CharField(max_length=10, blank=True, null=True)
    payment_terms = models.CharField(max_length=50, blank=True, null=True)
    credit_limit = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    opening_balance = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    opening_balance_date = models.DateTimeField(blank=True, null=True)
    current_balance = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    app_metadata = models.JSONField(blank=True, null=True)
    custom_fields = models.JSONField(blank=True, null=True)
    is_active = models.IntegerField(blank=True, null=True)
    is_credit_hold = models.IntegerField(blank=True, null=True)
    is_blacklisted = models.IntegerField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    tags = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    created_by_user_id = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'customers'


class DispatchScans(models.Model):
    company = models.ForeignKey(Companies, models.DO_NOTHING)
    order = models.ForeignKey('Orders', models.DO_NOTHING, blank=True, null=True)
    platform = models.ForeignKey('Platforms', models.DO_NOTHING, blank=True, null=True)
    platform_name = models.CharField(max_length=50, blank=True, null=True)
    platform_order_id = models.CharField(max_length=100, blank=True, null=True)
    barcode_data = models.TextField(blank=True, null=True)
    qr_code_data = models.TextField(blank=True, null=True)
    label_image_url = models.CharField(max_length=500, blank=True, null=True)
    scanned_at = models.DateTimeField()
    scanned_by_user = models.ForeignKey('Users', models.DO_NOTHING)
    warehouse = models.ForeignKey('Warehouses', models.DO_NOTHING, blank=True, null=True)
    awb_number = models.CharField(max_length=100, blank=True, null=True)
    courier_partner = models.CharField(max_length=100, blank=True, null=True)
    dispatch_status = models.CharField(max_length=50, blank=True, null=True)
    manifest_id = models.IntegerField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    scan_metadata = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    scan_action = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'dispatch_scans'


class GrnItems(models.Model):
    grn = models.ForeignKey('Grns', models.DO_NOTHING, blank=True, null=True)
    po_item = models.ForeignKey('PurchaseOrderItems', models.DO_NOTHING, blank=True, null=True)
    product = models.ForeignKey('Products', models.DO_NOTHING, blank=True, null=True)
    quantity_received = models.IntegerField(blank=True, null=True)
    quantity_accepted = models.IntegerField(blank=True, null=True)
    quantity_rejected = models.IntegerField(blank=True, null=True)
    batch_number = models.CharField(max_length=100, blank=True, null=True)
    expiry_date = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.CharField(max_length=200, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'grn_items'


class Grns(models.Model):
    grn_number = models.CharField(unique=True, max_length=50, blank=True, null=True)
    po = models.ForeignKey('PurchaseOrders', models.DO_NOTHING, blank=True, null=True)
    vendor_invoice_no = models.CharField(max_length=100, blank=True, null=True)
    received_date = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True)
    created_by_user = models.ForeignKey('Users', models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'grns'


class Inventory(models.Model):
    platform = models.ForeignKey('Platforms', models.DO_NOTHING, blank=True, null=True)
    sku = models.CharField(max_length=100, blank=True, null=True)
    product_id = models.CharField(max_length=100, blank=True, null=True)
    product_name = models.CharField(max_length=500, blank=True, null=True)
    total_quantity = models.IntegerField(blank=True, null=True)
    available_quantity = models.IntegerField(blank=True, null=True)
    reserved_quantity = models.IntegerField(blank=True, null=True)
    platform_metadata = models.JSONField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'inventory'


class MangoChannelOrders(models.Model):
    company_id = models.IntegerField()
    platform = models.CharField(max_length=50)
    platform_order_id = models.CharField(max_length=100, blank=True, null=True)
    customer_name = models.CharField(max_length=200, blank=True, null=True)
    customer_email = models.CharField(max_length=200, blank=True, null=True)
    order_status = models.CharField(max_length=50, blank=True, null=True)
    order_total = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    channel_data = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'mango_channel_orders'


class OmsSyncConfig(models.Model):
    company_id = models.IntegerField()
    platform = models.CharField(max_length=50)
    is_oms_connected = models.IntegerField(blank=True, null=True)
    sync_enabled = models.IntegerField(blank=True, null=True)
    last_sync_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'oms_sync_config'


class OrderItems(models.Model):
    order = models.ForeignKey('Orders', models.DO_NOTHING, blank=True, null=True)
    platform_order_id = models.CharField(max_length=100, blank=True, null=True)
    product_id = models.CharField(max_length=100, blank=True, null=True)
    sku = models.CharField(max_length=100, blank=True, null=True)
    product_name = models.CharField(max_length=500, blank=True, null=True)
    quantity = models.IntegerField(blank=True, null=True)
    item_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    platform_metadata = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'order_items'


class Orders(models.Model):
    platform = models.ForeignKey('Platforms', models.DO_NOTHING, blank=True, null=True)
    platform_order_id = models.CharField(max_length=100, blank=True, null=True)
    seller_id = models.IntegerField(blank=True, null=True)
    order_status = models.CharField(max_length=50, blank=True, null=True)
    purchase_date = models.DateTimeField(blank=True, null=True)
    last_update_date = models.DateTimeField(blank=True, null=True)
    order_total = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    currency = models.CharField(max_length=10, blank=True, null=True)
    marketplace_id = models.CharField(max_length=50, blank=True, null=True)
    customer_name = models.CharField(max_length=200, blank=True, null=True)
    customer_email = models.CharField(max_length=200, blank=True, null=True)
    shipping_address = models.TextField(blank=True, null=True)
    platform_metadata = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    is_dispatched = models.IntegerField(blank=True, null=True)
    dispatched_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'orders'


class PlatformItemMappings(models.Model):
    company = models.ForeignKey(Companies, models.DO_NOTHING)
    product = models.ForeignKey('Products', models.DO_NOTHING)
    platform_name = models.CharField(max_length=50)
    platform_item_code = models.CharField(max_length=255)
    platform_variant_code = models.CharField(max_length=255, blank=True, null=True)
    platform_listing_url = models.TextField(blank=True, null=True)
    is_active = models.IntegerField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'platform_item_mappings'
        unique_together = (('product', 'platform_name'),)


class Platforms(models.Model):
    name = models.CharField(unique=True, max_length=50, blank=True, null=True)
    display_name = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.IntegerField(blank=True, null=True)
    api_config = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'platforms'


class Products(models.Model):
    sku = models.CharField(unique=True, max_length=100, blank=True, null=True)
    name = models.CharField(max_length=500, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    brand = models.CharField(max_length=100, blank=True, null=True)
    weight_kg = models.DecimalField(max_digits=10, decimal_places=3, blank=True, null=True)
    length_cm = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    width_cm = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    height_cm = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    company_id = models.IntegerField(blank=True, null=True)
    hsn_sac = models.CharField(max_length=50, blank=True, null=True)
    purchase_description = models.TextField(blank=True, null=True)
    purchase_rate = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    sales_rate = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    intra_state_tax_rate = models.CharField(max_length=50, blank=True, null=True)
    inter_state_tax_rate = models.CharField(max_length=50, blank=True, null=True)
    item_code = models.CharField(max_length=100, blank=True, null=True)
    item_short_name = models.CharField(max_length=200, blank=True, null=True)
    item_type = models.CharField(max_length=50, blank=True, null=True)
    item_status = models.CharField(max_length=50, blank=True, null=True)
    parent_item_id = models.IntegerField(blank=True, null=True)
    item_level = models.IntegerField(blank=True, null=True)
    subcategory_id = models.IntegerField(blank=True, null=True)
    product_group = models.CharField(max_length=100, blank=True, null=True)
    brand_id = models.IntegerField(blank=True, null=True)
    model_no = models.CharField(max_length=100, blank=True, null=True)
    variant_group = models.CharField(max_length=100, blank=True, null=True)
    base_uom = models.CharField(max_length=20, blank=True, null=True)
    alternate_uom = models.CharField(max_length=20, blank=True, null=True)
    uom_conversion_factor = models.DecimalField(max_digits=10, decimal_places=4, blank=True, null=True)
    inventory_tracking_flag = models.IntegerField(blank=True, null=True)
    batch_tracking_flag = models.IntegerField(blank=True, null=True)
    serial_tracking_flag = models.IntegerField(blank=True, null=True)
    expiry_tracking_flag = models.IntegerField(blank=True, null=True)
    hsn_code = models.CharField(max_length=20, blank=True, null=True)
    gst_applicable_flag = models.IntegerField(blank=True, null=True)
    tax_category = models.CharField(max_length=50, blank=True, null=True)
    cess_applicable_flag = models.IntegerField(blank=True, null=True)
    country_of_origin = models.CharField(max_length=50, blank=True, null=True)
    weight_uom = models.CharField(max_length=20, blank=True, null=True)
    dimension_uom = models.CharField(max_length=20, blank=True, null=True)
    volume = models.DecimalField(max_digits=10, decimal_places=4, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True)
    size = models.CharField(max_length=50, blank=True, null=True)
    material = models.CharField(max_length=100, blank=True, null=True)
    quality_grade = models.CharField(max_length=50, blank=True, null=True)
    shelf_life_days = models.IntegerField(blank=True, null=True)
    storage_type = models.CharField(max_length=50, blank=True, null=True)
    temperature_range = models.CharField(max_length=50, blank=True, null=True)
    costing_method = models.CharField(max_length=50, blank=True, null=True)
    standard_cost = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    default_margin_percent = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    price_control_type = models.CharField(max_length=50, blank=True, null=True)
    hazardous_flag = models.IntegerField(blank=True, null=True)
    stackable_flag = models.IntegerField(blank=True, null=True)
    min_order_qty = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    max_order_qty = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    reorder_level = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    abc_classification = models.CharField(max_length=1, blank=True, null=True)
    demand_velocity = models.CharField(max_length=20, blank=True, null=True)
    forecast_enabled_flag = models.IntegerField(blank=True, null=True)
    lifecycle_stage = models.CharField(max_length=50, blank=True, null=True)
    ai_tags = models.TextField(blank=True, null=True)
    search_keywords = models.TextField(blank=True, null=True)
    custom_attributes_json = models.TextField(blank=True, null=True)
    approved_status = models.CharField(max_length=50, blank=True, null=True)
    approved_by = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'products'


class PurchaseOrderItems(models.Model):
    po = models.ForeignKey('PurchaseOrders', models.DO_NOTHING, blank=True, null=True)
    product = models.ForeignKey(Products, models.DO_NOTHING, blank=True, null=True)
    sku = models.CharField(max_length=100, blank=True, null=True)
    quantity_ordered = models.IntegerField()
    quantity_received = models.IntegerField(blank=True, null=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    total_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'purchase_order_items'


class PurchaseOrders(models.Model):
    po_number = models.CharField(unique=True, max_length=50, blank=True, null=True)
    vendor = models.ForeignKey('Vendors', models.DO_NOTHING, blank=True, null=True)
    warehouse = models.ForeignKey('Warehouses', models.DO_NOTHING, blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True)
    order_date = models.DateTimeField(blank=True, null=True)
    expected_delivery_date = models.DateTimeField(blank=True, null=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    currency = models.CharField(max_length=10, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    company_id = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'purchase_orders'


class StockAdjustments(models.Model):
    adjustment_number = models.CharField(unique=True, max_length=50, blank=True, null=True)
    warehouse = models.ForeignKey('Warehouses', models.DO_NOTHING, blank=True, null=True)
    product = models.ForeignKey(Products, models.DO_NOTHING, blank=True, null=True)
    quantity = models.IntegerField()
    reason = models.CharField(max_length=200, blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True)
    approved_by_user = models.ForeignKey('Users', models.DO_NOTHING, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'stock_adjustments'


class StockAuditItems(models.Model):
    audit = models.ForeignKey('StockAudits', models.DO_NOTHING, blank=True, null=True)
    product = models.ForeignKey(Products, models.DO_NOTHING, blank=True, null=True)
    system_quantity_snapshot = models.IntegerField(blank=True, null=True)
    counted_quantity = models.IntegerField(blank=True, null=True)
    discrepancy = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'stock_audit_items'


class StockAudits(models.Model):
    audit_number = models.CharField(unique=True, max_length=50, blank=True, null=True)
    warehouse = models.ForeignKey('Warehouses', models.DO_NOTHING, blank=True, null=True)
    scheduled_date = models.DateTimeField(blank=True, null=True)
    performed_date = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'stock_audits'


class StockLedger(models.Model):
    product = models.ForeignKey(Products, models.DO_NOTHING, blank=True, null=True)
    warehouse = models.ForeignKey('Warehouses', models.DO_NOTHING, blank=True, null=True)
    transaction_type = models.CharField(max_length=50, blank=True, null=True)
    quantity = models.IntegerField()
    reference_model = models.CharField(max_length=50, blank=True, null=True)
    reference_id = models.CharField(max_length=50, blank=True, null=True)
    balance_after = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'stock_ledger'


class StockTransferItems(models.Model):
    transfer = models.ForeignKey('StockTransfers', models.DO_NOTHING, blank=True, null=True)
    product = models.ForeignKey(Products, models.DO_NOTHING, blank=True, null=True)
    quantity_sent = models.IntegerField()
    quantity_received = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'stock_transfer_items'


class StockTransfers(models.Model):
    transfer_number = models.CharField(unique=True, max_length=50, blank=True, null=True)
    source_warehouse = models.ForeignKey('Warehouses', models.DO_NOTHING, blank=True, null=True)
    destination_warehouse = models.ForeignKey('Warehouses', models.DO_NOTHING, related_name='stocktransfers_destination_warehouse_set', blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True)
    approval_status = models.CharField(max_length=50, blank=True, null=True)
    approved_by_user = models.ForeignKey('Users', models.DO_NOTHING, blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    transfer_date = models.DateTimeField(blank=True, null=True)
    completed_date = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_by_user = models.ForeignKey('Users', models.DO_NOTHING, related_name='stocktransfers_created_by_user_set', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'stock_transfers'


class SyncLogs(models.Model):
    platform = models.ForeignKey(Platforms, models.DO_NOTHING, blank=True, null=True)
    job_type = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, blank=True, null=True)
    message = models.CharField(max_length=500, blank=True, null=True)
    records_processed = models.IntegerField(blank=True, null=True)
    error_details = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'sync_logs'


class UserAppAccess(models.Model):
    user = models.ForeignKey('Users', models.DO_NOTHING, blank=True, null=True)
    company = models.ForeignKey(Companies, models.DO_NOTHING, blank=True, null=True)
    app = models.ForeignKey(Applications, models.DO_NOTHING, blank=True, null=True)
    role = models.CharField(max_length=50, blank=True, null=True)
    permissions = models.JSONField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'user_app_access'


class UserCompanies(models.Model):
    user = models.ForeignKey('Users', models.DO_NOTHING, blank=True, null=True)
    company = models.ForeignKey(Companies, models.DO_NOTHING, blank=True, null=True)
    role = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'user_companies'


class Users(models.Model):
    email = models.CharField(unique=True, max_length=200)
    hashed_password = models.CharField(max_length=255)
    full_name = models.CharField(max_length=200, blank=True, null=True)
    is_active = models.IntegerField(blank=True, null=True)
    is_admin = models.IntegerField(blank=True, null=True)
    is_developer = models.IntegerField(blank=True, null=True)
    permissions = models.JSONField(blank=True, null=True)
    last_login = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    company = models.ForeignKey(Companies, models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'users'


class Vendors(models.Model):
    name = models.CharField(max_length=200, blank=True, null=True)
    code = models.CharField(unique=True, max_length=50, blank=True, null=True)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    email = models.CharField(max_length=200, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    tax_id = models.CharField(max_length=50, blank=True, null=True)
    payment_terms = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    company_id = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'vendors'


class Warehouses(models.Model):
    name = models.CharField(max_length=100, blank=True, null=True)
    code = models.CharField(unique=True, max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    is_active = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    company_id = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'warehouses'


