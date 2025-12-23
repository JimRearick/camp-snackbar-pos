"""Input validation schemas using Marshmallow"""

from marshmallow import Schema, fields, validate, ValidationError, EXCLUDE
from functools import wraps
from flask import request, jsonify


# ============================================================================
# Validation Schemas
# ============================================================================

class AccountSchema(Schema):
    """Schema for account creation and updates"""
    account_name = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=100, error="Account name must be between 1 and 100 characters")
    )
    account_type = fields.Str(
        required=True,
        validate=validate.OneOf(['family', 'individual'], error="Account type must be 'family' or 'individual'")
    )
    notes = fields.Str(
        validate=validate.Length(max=500, error="Notes must not exceed 500 characters"),
        allow_none=True
    )
    family_members = fields.List(
        fields.Str(validate=validate.Length(max=100)),
        allow_none=True
    )
    active = fields.Boolean(allow_none=True)

    class Meta:
        unknown = EXCLUDE  # Ignore unknown fields


class ProductSchema(Schema):
    """Schema for product creation and updates"""
    name = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=100, error="Product name must be between 1 and 100 characters")
    )
    category_id = fields.Int(
        required=True,
        validate=validate.Range(min=1, error="Category ID must be a positive integer")
    )
    price = fields.Float(
        required=True,
        validate=validate.Range(min=0, max=10000, error="Price must be between 0 and 10000")
    )
    active = fields.Boolean(allow_none=True)
    requires_prep = fields.Boolean(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class CategorySchema(Schema):
    """Schema for category creation and updates"""
    name = fields.Str(
        validate=validate.Length(min=1, max=50, error="Category name must be between 1 and 50 characters"),
        allow_none=True
    )
    button_color = fields.Str(
        validate=validate.Length(min=4, max=20, error="Button color must be a valid color code"),
        allow_none=True
    )
    display_order = fields.Int(
        validate=validate.Range(min=0, max=1000, error="Display order must be between 0 and 1000"),
        allow_none=True
    )

    class Meta:
        unknown = EXCLUDE


class TransactionSchema(Schema):
    """Schema for transaction creation"""
    account_id = fields.Int(
        required=True,
        validate=validate.Range(min=1, error="Account ID must be a positive integer")
    )
    transaction_type = fields.Str(
        required=True,
        validate=validate.OneOf(['purchase', 'payment', 'adjustment'], error="Invalid transaction type")
    )
    items = fields.List(
        fields.Dict(),
        allow_none=True
    )
    notes = fields.Str(
        validate=validate.Length(max=500, error="Notes must not exceed 500 characters"),
        allow_none=True
    )
    amount = fields.Float(
        validate=validate.Range(min=-10000, max=10000, error="Amount must be between -10000 and 10000"),
        allow_none=True
    )

    class Meta:
        unknown = EXCLUDE


class TransactionItemSchema(Schema):
    """Schema for individual items in a transaction"""
    product_id = fields.Int(
        required=True,
        validate=validate.Range(min=1, error="Product ID must be a positive integer")
    )
    quantity = fields.Int(
        required=True,
        validate=validate.Range(min=1, max=100, error="Quantity must be between 1 and 100")
    )
    price = fields.Float(
        required=True,
        validate=validate.Range(min=0, max=10000, error="Price must be between 0 and 10000")
    )
    product_name = fields.Str(
        validate=validate.Length(max=100),
        allow_none=True
    )

    class Meta:
        unknown = EXCLUDE


class UserSchema(Schema):
    """Schema for user creation and updates"""
    username = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=50, error="Username must be between 3 and 50 characters")
    )
    password = fields.Str(
        validate=validate.Length(min=6, max=100, error="Password must be at least 6 characters"),
        allow_none=True  # Optional for updates
    )
    full_name = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=100, error="Full name must be between 1 and 100 characters")
    )
    role = fields.Str(
        required=True,
        validate=validate.OneOf(['admin', 'pos', 'prep'], error="Role must be 'admin', 'pos', or 'prep'")
    )

    class Meta:
        unknown = EXCLUDE


class LoginSchema(Schema):
    """Schema for login requests"""
    username = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=50, error="Username is required")
    )
    password = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=100, error="Password is required")
    )

    class Meta:
        unknown = EXCLUDE


class PaymentSchema(Schema):
    """Schema for payment transactions"""
    account_id = fields.Int(
        required=True,
        validate=validate.Range(min=1, error="Account ID must be a positive integer")
    )
    amount = fields.Float(
        required=True,
        validate=validate.Range(min=0.01, max=10000, error="Amount must be between 0.01 and 10000")
    )
    notes = fields.Str(
        validate=validate.Length(max=500, error="Notes must not exceed 500 characters"),
        allow_none=True
    )

    class Meta:
        unknown = EXCLUDE


class PrepItemUpdateSchema(Schema):
    """Schema for prep item status updates"""
    status = fields.Str(
        required=True,
        validate=validate.OneOf(['pending', 'in_progress', 'completed'], error="Invalid status")
    )

    class Meta:
        unknown = EXCLUDE


# ============================================================================
# Validation Decorator
# ============================================================================

def validate_json(schema_cls):
    """
    Decorator to validate JSON request data against a schema.

    Usage:
        @app.route('/api/accounts', methods=['POST'])
        @validate_json(AccountSchema)
        def create_account():
            data = request.get_json()
            # data is now validated
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                data = request.get_json()

                # Validate data
                schema = schema_cls()
                validated_data = schema.load(data)

                # Store validated data in request context
                request.validated_data = validated_data

                return f(*args, **kwargs)
            except ValidationError as err:
                return jsonify({
                    'error': 'Validation failed',
                    'details': err.messages
                }), 400
            except Exception as e:
                return jsonify({
                    'error': 'Invalid request data',
                    'message': str(e)
                }), 400
        return wrapper
    return decorator


# ============================================================================
# Manual Validation Helpers
# ============================================================================

def validate_data(schema_cls, data):
    """
    Manually validate data against a schema.
    Returns (validated_data, None) on success or (None, error_dict) on failure.
    """
    try:
        schema = schema_cls()
        validated_data = schema.load(data)
        return validated_data, None
    except ValidationError as err:
        return None, err.messages
