"""
Import Validation Helpers - Phase 4
Validates imported data against channel field configurations
"""

import re
from typing import Dict, List, Tuple, Any, Optional
from decimal import Decimal
from .channel_master_models import ChannelTableSchema


# Validation patterns
VALIDATION_PATTERNS = {
    'email': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    'phone': r'^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$',
    'url': r'^https?://[^\s/$.?#].[^\s]*$'
}


def validate_email(value: str) -> Tuple[bool, Optional[str]]:
    """Validate email address"""
    if not value:
        return True, None
    if re.match(VALIDATION_PATTERNS['email'], str(value)):
        return True, None
    return False, f"Invalid email format: {value}"


def validate_phone(value: str) -> Tuple[bool, Optional[str]]:
    """Validate phone number"""
    if not value:
        return True, None
    if re.match(VALIDATION_PATTERNS['phone'], str(value)):
        return True, None
    return False, f"Invalid phone number format: {value}"


def validate_url(value: str) -> Tuple[bool, Optional[str]]:
    """Validate URL"""
    if not value:
        return True, None
    if re.match(VALIDATION_PATTERNS['url'], str(value)):
        return True, None
    return False, f"Invalid URL format: {value}"


def validate_regex(value: str, pattern: str) -> Tuple[bool, Optional[str]]:
    """Validate against custom regex pattern"""
    if not value:
        return True, None
    try:
        if re.match(pattern, str(value)):
            return True, None
        return False, f"Value '{value}' does not match pattern '{pattern}'"
    except re.error as e:
        return False, f"Invalid regex pattern: {str(e)}"


def validate_range(value: Any, min_val: Optional[float], max_val: Optional[float]) -> Tuple[bool, Optional[str]]:
    """Validate number is within range"""
    if value is None or value == '':
        return True, None
    
    try:
        num_value = float(value)
        if min_val is not None and num_value < float(min_val):
            return False, f"Value {num_value} is less than minimum {min_val}"
        if max_val is not None and num_value > float(max_val):
            return False, f"Value {num_value} is greater than maximum {max_val}"
        return True, None
    except (ValueError, TypeError):
        return False, f"Value '{value}' is not a valid number"


def validate_length(value: str, min_len: Optional[int], max_len: Optional[int]) -> Tuple[bool, Optional[str]]:
    """Validate text length"""
    if not value:
        return True, None
    
    str_value = str(value)
    length = len(str_value)
    
    if min_len is not None and length < min_len:
        return False, f"Text length {length} is less than minimum {min_len}"
    if max_len is not None and length > max_len:
        return False, f"Text length {length} is greater than maximum {max_len}"
    return True, None


def validate_field_value(
    field_name: str,
    value: Any,
    field_schema: ChannelTableSchema
) -> Tuple[bool, Optional[str]]:
    """
    Validate a single field value against its schema configuration
    Returns: (is_valid, error_message)
    """
    # Check required
    if field_schema.is_required and (value is None or value == ''):
        return False, f"Field '{field_name}' is required"
    
    # Skip validation if value is empty and not required
    if value is None or value == '':
        return True, None
    
    # Apply validation based on validation_rule
    validation_rule = field_schema.validation_rule or 'none'
    
    if validation_rule == 'email':
        return validate_email(str(value))
    
    elif validation_rule == 'phone':
        return validate_phone(str(value))
    
    elif validation_rule == 'url':
        return validate_url(str(value))
    
    elif validation_rule == 'regex' and field_schema.validation_pattern:
        return validate_regex(str(value), field_schema.validation_pattern)
    
    elif validation_rule == 'range':
        return validate_range(value, field_schema.min_value, field_schema.max_value)
    
    elif validation_rule == 'length':
        return validate_length(str(value), field_schema.min_length, field_schema.max_length)
    
    return True, None


def validate_row(
    row_data: Dict[str, Any],
    field_schemas: Dict[str, ChannelTableSchema]
) -> Tuple[bool, List[str]]:
    """
    Validate entire row of data
    Returns: (is_valid, list_of_errors)
    """
    errors = []
    
    for field_name, field_schema in field_schemas.items():
        value = row_data.get(field_name)
        is_valid, error_msg = validate_field_value(field_name, value, field_schema)
        
        if not is_valid:
            errors.append(error_msg)
    
    return len(errors) == 0, errors


def check_duplicates(
    new_data: List[Dict[str, Any]],
    unique_fields: List[str],
    existing_data_query_func
) -> Tuple[List[Dict], List[Dict]]:
    """
    Check for duplicates in new data against existing data
    
    Args:
        new_data: List of new records to import
        unique_fields: List of field names that must be unique
        existing_data_query_func: Function to query existing data
    
    Returns:
        (new_records, duplicate_records)
    """
    if not unique_fields:
        return new_data, []
    
    new_records = []
    duplicate_records = []
    
    for row in new_data:
        # Build query to check if record exists
        is_duplicate = False
        
        for unique_field in unique_fields:
            if unique_field in row:
                # Query existing data for this unique field value
                existing = existing_data_query_func(unique_field, row[unique_field])
                if existing:
                    is_duplicate = True
                    row['_duplicate_reason'] = f"Duplicate {unique_field}: {row[unique_field]}"
                    break
        
        if is_duplicate:
            duplicate_records.append(row)
        else:
            new_records.append(row)
    
    return new_records, duplicate_records


def validate_import_batch(
    data_rows: List[Dict[str, Any]],
    channel_id: int,
    db
) -> Dict[str, Any]:
    """
    Validate entire batch of import data
    
    Returns:
        {
            "valid_count": int,
            "error_count": int,
            "duplicate_count": int,
            "validated_rows": List[Dict],
            "error_rows": List[Dict],
            "duplicate_rows": List[Dict],
            "summary": str
        }
    """
    from sqlalchemy.orm import Session
    
    # Get field schemas for this channel
    field_schemas_list = db.query(ChannelTableSchema).filter_by(channel_id=channel_id).all()
    field_schemas = {fs.field_name: fs for fs in field_schemas_list}
    
    # Get unique fields
    unique_fields = [fs.field_name for fs in field_schemas_list if fs.is_unique or fs.is_primary_key]
    
    valid_rows = []
    error_rows = []
    
    # Validate each row
    for idx, row in enumerate(data_rows):
        is_valid, errors = validate_row(row, field_schemas)
        
        if is_valid:
            valid_rows.append(row)
        else:
            error_row = row.copy()
            error_row['_row_number'] = idx + 1
            error_row['_errors'] = errors
            error_rows.append(error_row)
    
    # Check for duplicates in valid rows
    # TODO: Implement duplicate checking against existing data
    duplicate_rows = []
    
    return {
        "valid_count": len(valid_rows),
        "error_count": len(error_rows),
        "duplicate_count": len(duplicate_rows),
        "validated_rows": valid_rows,
        "error_rows": error_rows,
        "duplicate_rows": duplicate_rows,
        "summary": f"Validated {len(data_rows)} rows: {len(valid_rows)} valid, {len(error_rows)} errors, {len(duplicate_rows)} duplicates"
    }
