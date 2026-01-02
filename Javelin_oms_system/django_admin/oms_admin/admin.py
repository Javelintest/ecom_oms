from django.contrib import admin
from .models import (
    Users, Companies, Platforms, Orders, OrderItems, Inventory,
    Products, Customers, CustomerLedger, CustomerAddresses, CustomerContacts,
    Warehouses, Vendors, PurchaseOrders, PurchaseOrderItems,
    StockTransfers, StockLedger, Grns, GrnItems,
    MangoChannelOrders, OmsSyncConfig, ChannelFieldDefinitions,
    DispatchScans, Applications, CompanyApps,
    StockAdjustments, StockAudits, StockAuditItems,
    CustomerReturns, CustomerReturnItems,
    SyncLogs, UserAppAccess, UserCompanies,
    PlatformItemMappings, ChannelDispatchMappings,
    CustomFieldDefinitions, StockTransferItems,
    Channels, ChannelTables, ChannelTableSchema
)


# ============ USER & COMPANY MANAGEMENT ============

@admin.register(Users)
class UsersAdmin(admin.ModelAdmin):
    list_display = ['id', 'email', 'full_name', 'company', 'is_admin', 'is_developer', 'is_active', 'last_login']
    list_filter = ['is_admin', 'is_developer', 'is_active', 'company']
    search_fields = ['email', 'full_name']
    list_editable = ['is_admin', 'is_developer', 'is_active']
    readonly_fields = ['created_at', 'updated_at', 'last_login']
    fieldsets = (
        ('Basic Info', {
            'fields': ('email', 'full_name', 'company')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_admin', 'is_developer', 'permissions')
        }),
        ('Timestamps', {
            'fields': ('last_login', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Companies)
class CompaniesAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'email', 'phone', 'city', 'country', 'created_at']
    search_fields = ['name', 'email', 'tax_id']
    list_filter = ['country', 'industry']
    readonly_fields = ['created_at', 'updated_at']


# ============ E-COMMERCE PLATFORMS ============

@admin.register(Platforms)
class PlatformsAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'display_name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'display_name']
    list_editable = ['is_active']


# ============ ORDERS ============

@admin.register(Orders)
class OrdersAdmin(admin.ModelAdmin):
    list_display = ['id', 'platform_order_id', 'platform', 'customer_name', 'order_status', 'order_total', 'purchase_date']
    list_filter = ['order_status', 'platform', 'purchase_date', 'is_dispatched']
    search_fields = ['platform_order_id', 'customer_name', 'customer_email']
    date_hierarchy = 'purchase_date'
    readonly_fields = ['created_at', 'dispatched_at']
    
    fieldsets = (
        ('Order Info', {
           'fields': ('platform', 'platform_order_id', 'order_status', 'purchase_date')
        }),
        ('Customer Details', {
            'fields': ('customer_name', 'customer_email', 'shipping_address')
        }),
        ('Financial', {
            'fields': ('order_total', 'currency')
        }),
        ('Dispatch', {
            'fields': ('is_dispatched', 'dispatched_at')
        }),
    )


@admin.register(OrderItems)
class OrderItemsAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'product_name', 'sku', 'quantity', 'item_price']
    search_fields = ['product_name', 'sku', 'platform_order_id']
    list_filter = ['order__platform']


@admin.register(MangoChannelOrders)
class MangoChannelOrdersAdmin(admin.ModelAdmin):
    list_display = ['id', 'company_id', 'platform', 'platform_order_id', 'customer_name', 'order_status', 'order_total', 'created_at']
    list_filter = ['platform', 'order_status', 'created_at']
    search_fields = ['platform_order_id', 'customer_name', 'customer_email']
    date_hierarchy = 'created_at'


# ============ INVENTORY & PRODUCTS ============

@admin.register(Products)
class ProductsAdmin(admin.ModelAdmin):
    list_display = ['id', 'sku', 'name', 'company_id', 'category', 'brand', 'item_status']
    search_fields = ['sku', 'name', 'item_code']
    list_filter = ['item_status', 'item_type', 'category', 'brand']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'platform', 'sku', 'product_name', 'total_quantity', 'available_quantity', 'reserved_quantity']
    search_fields = ['sku', 'product_name', 'product_id']
    list_filter = ['platform']


# ============ CUSTOMERS ============

@admin.register(Customers)
class CustomersAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer_code', 'name', 'email', 'phone', 'company', 'is_active', 'current_balance']
    search_fields = ['customer_code', 'name', 'email', 'phone']
    list_filter = ['company', 'is_active', 'customer_type']
    list_editable = ['is_active']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CustomerLedger)
class CustomerLedgerAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'transaction_date', 'transaction_type', 'debit_amount', 'credit_amount', 'balance']
    list_filter = ['transaction_type', 'is_reconciled', 'transaction_date']
    search_fields = ['customer__name', 'reference_number']
    date_hierarchy = 'transaction_date'


# ============ WAREHOUSES & STOCK ============

@admin.register(Warehouses)
class WarehousesAdmin(admin.ModelAdmin):
    list_display = ['id', 'code', 'name', 'company_id', 'is_active']
    search_fields = ['code', 'name']
    list_filter = ['is_active', 'company_id']
    list_editable = ['is_active']


@admin.register(StockLedger)
class StockLedgerAdmin(admin.ModelAdmin):
    list_display = ['id', 'product', 'warehouse', 'transaction_type', 'quantity', 'balance_after', 'created_at']
    list_filter = ['transaction_type', 'warehouse', 'created_at']
    search_fields = ['product__sku', 'product__name']
    date_hierarchy = 'created_at'


@admin.register(StockTransfers)
class StockTransfersAdmin(admin.ModelAdmin):
    list_display = ['id', 'transfer_number', 'source_warehouse', 'destination_warehouse', 'status', 'transfer_date']
    list_filter = ['status', 'approval_status']
    search_fields = ['transfer_number']
    date_hierarchy = 'transfer_date'


# ============ PURCHASE ORDERS ============

@admin.register(Vendors)
class VendorsAdmin(admin.ModelAdmin):
    list_display = ['id', 'code', 'name', 'contact_person', 'email', 'phone', 'is_active']
    search_fields = ['code', 'name', 'email']
    list_filter = ['is_active', 'company_id']
    list_editable = ['is_active']


@admin.register(PurchaseOrders)
class PurchaseOrdersAdmin(admin.ModelAdmin):
    list_display = ['id', 'po_number', 'vendor', 'warehouse', 'status', 'order_date', 'total_amount']
    list_filter = ['status', 'order_date']
    search_fields = ['po_number']
    date_hierarchy = 'order_date'


@admin.register(Grns)
class GrnsAdmin(admin.ModelAdmin):
    list_display = ['id', 'grn_number', 'po', 'vendor_invoice_no', 'received_date', 'status']
    list_filter = ['status', 'received_date']
    search_fields = ['grn_number', 'vendor_invoice_no']


# ============ MANGO / CHANNEL CONFIGURATION ============

@admin.register(ChannelFieldDefinitions)
class ChannelFieldDefinitionsAdmin(admin.ModelAdmin):
    list_display = ['id', 'company', 'platform', 'field_name', 'field_type', 'is_required', 'display_order']
    list_filter = ['platform', 'field_type', 'is_required', 'company']
    search_fields = ['field_name', 'field_key']
    list_editable = ['is_required', 'display_order']


# ============ MULTI-CHANNEL MANAGEMENT ============

@admin.register(Channels)
class ChannelsAdmin(admin.ModelAdmin):
    list_display = ['id', 'channel_name', 'channel_type', 'company_id', 'is_active', 'created_at']
    list_filter = ['channel_type', 'is_active', 'company_id']
    search_fields = ['channel_name', 'channel_type']
    list_editable = ['is_active']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Info', {
            'fields': ('channel_name', 'channel_type', 'company_id', 'is_active')
        }),
        ('Configuration', {
            'fields': ('api_config', 'sync_config'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ChannelTables)
class ChannelTablesAdmin(admin.ModelAdmin):
    list_display = ['id', 'table_name', 'display_name', 'channel', 'table_type', 'is_active', 'is_system', 'record_count']
    list_filter = ['table_type', 'is_active', 'is_system', 'channel']
    search_fields = ['table_name', 'display_name', 'description']
    list_editable = ['is_active']
    readonly_fields = ['created_at', 'updated_at', 'record_count']
    fieldsets = (
        ('Table Info', {
            'fields': ('channel', 'table_name', 'display_name', 'table_type', 'description')
        }),
        ('Status', {
            'fields': ('is_active', 'is_system', 'record_count')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ChannelTableSchema)
class ChannelTableSchemaAdmin(admin.ModelAdmin):
    list_display = ['id', 'field_name', 'column_name', 'channel_table', 'column_type', 'is_required', 'is_primary_key', 'is_unique', 'is_indexed']
    list_filter = ['column_type', 'is_required', 'is_primary_key', 'is_unique', 'is_indexed', 'channel_table', 'channel']
    search_fields = ['field_name', 'column_name', 'channel_table__table_name']
    list_editable = ['is_required', 'is_unique', 'is_indexed']
    readonly_fields = ['created_at']
    fieldsets = (
        ('Field Info', {
            'fields': ('channel', 'channel_table', 'field_name', 'column_name', 'column_type', 'column_length')
        }),
        ('Constraints', {
            'fields': ('is_required', 'is_nullable', 'is_primary_key', 'is_unique', 'is_indexed', 'on_duplicate_action')
        }),
        ('Defaults', {
            'fields': ('default_value', 'column_order'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(OmsSyncConfig)
class OmsSyncConfigAdmin(admin.ModelAdmin):
    list_display = ['id', 'company_id', 'platform', 'is_oms_connected', 'sync_enabled', 'last_sync_at']
    list_filter = ['is_oms_connected', 'sync_enabled', 'platform']
    list_editable = ['is_oms_connected', 'sync_enabled']


# ============ DISPATCH ============

@admin.register(DispatchScans)
class DispatchScansAdmin(admin.ModelAdmin):
    list_display = ['id', 'company', 'platform_order_id', 'awb_number', 'courier_partner', 'dispatch_status', 'scanned_at']
    list_filter = ['dispatch_status', 'scan_action', 'platform', 'scanned_at']
    search_fields = ['platform_order_id', 'awb_number', 'courier_partner']
    date_hierarchy = 'scanned_at'


# ============ APPLICATIONS ============

@admin.register(Applications)
class ApplicationsAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'code', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'code']
    list_editable = ['is_active']


# ============ OTHER MODELS (Simple Registration) ============

admin.site.register(CustomerAddresses)
admin.site.register(CustomerContacts)
admin.site.register(CustomerReturns)
admin.site.register(CustomerReturnItems)
admin.site.register(PurchaseOrderItems)
admin.site.register(GrnItems)
admin.site.register(StockAdjustments)
admin.site.register(StockAudits)
admin.site.register(StockAuditItems)
admin.site.register(StockTransferItems)
admin.site.register(SyncLogs)
admin.site.register(CompanyApps)
admin.site.register(UserAppAccess)
admin.site.register(UserCompanies)
admin.site.register(PlatformItemMappings)
admin.site.register(ChannelDispatchMappings)
admin.site.register(CustomFieldDefinitions)


# Customize Admin Site
admin.site.site_header = "Javelin OMS Admin"
admin.site.site_title = "Javelin OMS"
admin.site.index_title = "Database Management"
