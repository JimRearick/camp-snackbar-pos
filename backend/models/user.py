"""User model for Flask-Login authentication"""

from flask_login import UserMixin
import bcrypt


class User(UserMixin):
    """User model with role-based access control"""

    def __init__(self, id, username, password_hash, role, full_name, is_active, created_at, last_login):
        self.id = id
        self.username = username
        self.password_hash = password_hash
        self.role = role
        self.full_name = full_name
        self._is_active = is_active
        self.created_at = created_at
        self.last_login = last_login

    def check_password(self, password):
        """Verify password against hash"""
        return bcrypt.checkpw(
            password.encode('utf-8'),
            self.password_hash.encode('utf-8')
        )

    def has_role(self, role):
        """Check if user has specific role"""
        return self.role == role

    def has_any_role(self, *roles):
        """Check if user has any of the specified roles"""
        return self.role in roles

    @property
    def is_active(self):
        """Required by Flask-Login - return if user account is active"""
        return bool(self._is_active)

    @property
    def is_authenticated(self):
        """Required by Flask-Login - always True for User objects"""
        return True

    @property
    def is_anonymous(self):
        """Required by Flask-Login - always False for User objects"""
        return False

    @property
    def is_admin(self):
        """Convenience property to check if user is admin"""
        return self.role == 'admin'

    @property
    def is_pos(self):
        """Convenience property to check if user is POS"""
        return self.role == 'pos'

    @property
    def is_prep(self):
        """Convenience property to check if user is prep"""
        return self.role == 'prep'

    def get_id(self):
        """Required by Flask-Login - return user ID as string"""
        return str(self.id)

    @staticmethod
    def get_by_id(conn, user_id):
        """Load user by ID from database"""
        cursor = conn.execute(
            "SELECT * FROM users WHERE id = ? AND is_active = 1",
            (user_id,)
        )
        row = cursor.fetchone()
        if row:
            return User(**dict(row))
        return None

    @staticmethod
    def get_by_username(conn, username):
        """Load user by username from database"""
        cursor = conn.execute(
            "SELECT * FROM users WHERE username = ? AND is_active = 1",
            (username,)
        )
        row = cursor.fetchone()
        if row:
            return User(**dict(row))
        return None

    @staticmethod
    def authenticate(conn, username, password):
        """Authenticate user and return User object if valid"""
        user = User.get_by_username(conn, username)
        if user and user.check_password(password):
            # Update last login timestamp
            conn.execute(
                "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
                (user.id,)
            )
            conn.commit()
            return user
        return None

    def to_dict(self):
        """Convert user to dictionary (for JSON responses)"""
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'full_name': self.full_name,
            'is_active': self.is_active,
            'created_at': self.created_at,
            'last_login': self.last_login
        }

    def __repr__(self):
        return f'<User {self.username} ({self.role})>'
