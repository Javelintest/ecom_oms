"""
Schema Validation Service
Validates field definitions for proper constraints and relationships
"""

from sqlalchemy.orm import Session
from typing import List, Dict
from apps.common.models import ChannelFieldDefinition

class SchemaValidationError(Exception):
    """Custom exception for schema validation errors"""
    pass

class SchemaValidator:
    """Validates channel field schema configurations"""
    
    def __init__(self, db: Session):
        self.db = db
        
    def validate_schema(self, platform: str, company_id: int) -> Dict:
        """
        Validate entire schema for a platform
        Returns dict with valid flag and any errors/warnings
        """
        errors = []
        warnings = []
        
        # Get all field definitions
        fields = self.db.query(ChannelFieldDefinition).filter(
            ChannelFieldDefinition.company_id == company_id,
            ChannelFieldDefinition.platform == platform
        ).all()
        
        # Validation 1: Check for at least one primary key
        pk_fields = [f for f in fields if f.is_primary_key]
        if len(pk_fields) == 0:
            errors.append("No primary key defined. At least one field must be marked as primary key.")
        elif len(pk_fields) > 3:
            errors.append(f"Too many primary key fields ({len(pk_fields)}). Maximum 3 fields for composite primary key.")
        
        # Validation 2: Check foreign key references
        fk_fields = [f for f in fields if f.foreign_key_table]
        for fk in fk_fields:
            if not fk.foreign_key_field:
                errors.append(f"Field '{fk.field_name}' has foreign key table but no field specified.")
            # Could also validate table exists in future
        
        # Validation 3: Check for unique fields
        unique_fields = [f for f in fields if f.is_unique]
        if len(unique_fields) == 0 and len(pk_fields) == 0:
            warnings.append("No unique or primary key fields. Data duplication may occur.")
        
        # Validation 4: Check for indexed fields
        indexed_fields = [f for f in fields if f.is_indexed or f.is_primary_key or f.is_unique]
        if len(indexed_fields) == 0:
            warnings.append("No indexed fields. Query performance may be slow.")
        
        # Validation 5: Validate duplicate handling
        for field in fields:
            if field.on_duplicate not in ['skip', 'update', 'error']:
                errors.append(f"Invalid on_duplicate value '{field.on_duplicate}' for field '{field.field_name}'.")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "primary_keys": [f.field_name for f in pk_fields],
            "unique_fields": [f.field_name for f in unique_fields],
            "indexed_fields": [f.field_name for f in indexed_fields],
            "foreign_keys": [(f.field_name, f.foreign_key_table, f.foreign_key_field) for f in fk_fields]
        }
    
    def get_primary_key_fields(self, platform: str, company_id: int) -> List[str]:
        """Get list of primary key field names"""
        fields = self.db.query(ChannelFieldDefinition).filter(
            ChannelFieldDefinition.company_id == company_id,
            ChannelFieldDefinition.platform == platform,
            ChannelFieldDefinition.is_primary_key == True
        ).all()
        return [f.field_key for f in fields]
    
    def get_unique_fields(self, platform: str, company_id: int) -> List[str]:
        """Get list of unique constraint field names"""
        fields = self.db.query(ChannelFieldDefinition).filter(
            ChannelFieldDefinition.company_id == company_id,
            ChannelFieldDefinition.platform == platform,
            ChannelFieldDefinition.is_unique == True
        ).all()
        return [f.field_key for f in fields]
