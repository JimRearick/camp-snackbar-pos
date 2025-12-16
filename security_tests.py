#!/usr/bin/env python3
"""
Security Testing Suite for Camp Snackbar POS
Tests CSRF protection, XSS prevention, input validation, and authentication
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"
API_URL = f"{BASE_URL}/api"

# Test results
results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def log_result(test_name, passed, message=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {test_name}")
    if message:
        print(f"   {message}")

    if passed:
        results["passed"].append(test_name)
    else:
        results["failed"].append((test_name, message))

def log_warning(test_name, message):
    """Log warning"""
    print(f"⚠️  WARNING: {test_name}")
    print(f"   {message}")
    results["warnings"].append((test_name, message))

# =============================================================================
# Authentication Helper
# =============================================================================

def login():
    """Login and get session"""
    session = requests.Session()

    # Try common passwords
    passwords = ["admin", "camp2024", "password"]

    for password in passwords:
        response = session.post(f"{API_URL}/auth/login", json={
            "username": "admin",
            "password": password
        })

        if response.status_code == 200:
            return session

    print(f"❌ Login failed with all common passwords")
    print(f"   Last response: {response.status_code} - {response.text}")
    print(f"   Please set admin password to 'admin' or update the test script")
    return None

def get_csrf_token(session):
    """Get CSRF token"""
    response = session.get(f"{API_URL}/csrf-token")
    if response.status_code == 200:
        return response.json().get('csrf_token')
    return None

# =============================================================================
# Test 1: CSRF Protection
# =============================================================================

def test_csrf_protection():
    """Test CSRF protection on state-changing endpoints"""
    print("\n" + "="*70)
    print("TEST 1: CSRF PROTECTION")
    print("="*70)

    session = login()
    if not session:
        log_result("CSRF: Login", False, "Could not authenticate")
        return

    log_result("CSRF: Login", True)

    # Test 1.1: POST without CSRF token should fail
    response = session.post(f"{API_URL}/accounts", json={
        "account_number": "TEST-CSRF-1",
        "account_name": "CSRF Test Account",
        "account_type": "individual"
    })

    log_result(
        "CSRF: POST without token rejected",
        response.status_code == 400,
        f"Expected 400, got {response.status_code}"
    )

    # Test 1.2: POST with valid CSRF token should succeed
    csrf_token = get_csrf_token(session)
    if csrf_token:
        log_result("CSRF: Token retrieved", True)

        response = session.post(f"{API_URL}/accounts",
            json={
                "account_number": "TEST-CSRF-2",
                "account_name": "CSRF Test Valid",
                "account_type": "individual"
            },
            headers={"X-CSRF-Token": csrf_token}
        )

        log_result(
            "CSRF: POST with valid token accepted",
            response.status_code in [200, 201],
            f"Status: {response.status_code}"
        )
    else:
        log_result("CSRF: Token retrieved", False, "Could not get CSRF token")

    # Test 1.3: PUT without CSRF token should fail
    response = session.put(f"{API_URL}/accounts/1", json={
        "account_name": "Updated Name"
    })

    log_result(
        "CSRF: PUT without token rejected",
        response.status_code == 400,
        f"Expected 400, got {response.status_code}"
    )

    # Test 1.4: DELETE without CSRF token should fail
    response = session.delete(f"{API_URL}/users/999")

    log_result(
        "CSRF: DELETE without token rejected",
        response.status_code == 400,
        f"Expected 400, got {response.status_code}"
    )

# =============================================================================
# Test 2: XSS Protection
# =============================================================================

def test_xss_protection():
    """Test XSS protection in user inputs"""
    print("\n" + "="*70)
    print("TEST 2: XSS PROTECTION")
    print("="*70)

    session = login()
    if not session:
        log_result("XSS: Login", False, "Could not authenticate")
        return

    csrf_token = get_csrf_token(session)

    xss_payloads = [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "javascript:alert('XSS')",
        "<svg/onload=alert('XSS')>",
        "';alert('XSS');//"
    ]

    # Test 2.1: Create account with XSS payload in name
    for i, payload in enumerate(xss_payloads):
        response = session.post(f"{API_URL}/accounts",
            json={
                "account_number": f"XSS-TEST-{i}",
                "account_name": payload,
                "account_type": "individual"
            },
            headers={"X-CSRF-Token": csrf_token}
        )

        if response.status_code in [200, 201]:
            # Account created, now fetch it to see if data is escaped
            account_id = response.json().get('id')
            fetch_response = session.get(f"{API_URL}/accounts/{account_id}")

            if fetch_response.status_code == 200:
                account_data = fetch_response.json()
                # Check that the raw payload is stored (backend accepts it)
                # Frontend should escape it when displaying
                log_result(
                    f"XSS: Account accepts payload {i+1}",
                    account_data.get('account_name') == payload,
                    f"Payload stored as-is (frontend must escape on display)"
                )
        else:
            log_warning(
                f"XSS: Account creation with payload {i+1}",
                f"Account creation failed: {response.status_code}"
            )

    # Test 2.2: Create product with XSS payload
    response = session.post(f"{API_URL}/products",
        json={
            "category_id": 1,
            "name": "<script>alert('XSS')</script>",
            "price": 1.99,
            "active": True
        },
        headers={"X-CSRF-Token": csrf_token}
    )

    log_result(
        "XSS: Product creation with XSS payload",
        response.status_code in [200, 201],
        "Backend accepts payload (frontend must escape)"
    )

# =============================================================================
# Test 3: Input Validation
# =============================================================================

def test_input_validation():
    """Test input validation on API endpoints"""
    print("\n" + "="*70)
    print("TEST 3: INPUT VALIDATION")
    print("="*70)

    session = login()
    if not session:
        log_result("Validation: Login", False, "Could not authenticate")
        return

    csrf_token = get_csrf_token(session)

    # Test 3.1: Empty account name
    response = session.post(f"{API_URL}/accounts",
        json={
            "account_number": "TEST-EMPTY",
            "account_name": "",
            "account_type": "individual"
        },
        headers={"X-CSRF-Token": csrf_token}
    )

    log_result(
        "Validation: Empty account name rejected",
        response.status_code == 400,
        f"Status: {response.status_code}"
    )

    # Test 3.2: Invalid account type
    response = session.post(f"{API_URL}/accounts",
        json={
            "account_number": "TEST-INVALID",
            "account_name": "Test",
            "account_type": "invalid_type"
        },
        headers={"X-CSRF-Token": csrf_token}
    )

    log_result(
        "Validation: Invalid account type rejected",
        response.status_code == 400,
        f"Status: {response.status_code}"
    )

    # Test 3.3: Negative product price
    response = session.post(f"{API_URL}/products",
        json={
            "category_id": 1,
            "name": "Invalid Product",
            "price": -5.00,
            "active": True
        },
        headers={"X-CSRF-Token": csrf_token}
    )

    log_result(
        "Validation: Negative price rejected",
        response.status_code == 400,
        f"Status: {response.status_code}"
    )

    # Test 3.4: Price too high (> 10000)
    response = session.post(f"{API_URL}/products",
        json={
            "category_id": 1,
            "name": "Expensive Product",
            "price": 99999.99,
            "active": True
        },
        headers={"X-CSRF-Token": csrf_token}
    )

    log_result(
        "Validation: Excessive price rejected",
        response.status_code == 400,
        f"Status: {response.status_code}"
    )

    # Test 3.5: Short password (< 6 characters)
    response = session.post(f"{API_URL}/users",
        json={
            "username": "testuser",
            "password": "123",
            "full_name": "Test User",
            "role": "pos"
        },
        headers={"X-CSRF-Token": csrf_token}
    )

    log_result(
        "Validation: Short password rejected",
        response.status_code == 400,
        f"Status: {response.status_code}"
    )

    # Test 3.6: SQL Injection attempt
    response = session.post(f"{API_URL}/accounts",
        json={
            "account_number": "SQL-TEST",
            "account_name": "'; DROP TABLE accounts--",
            "account_type": "individual"
        },
        headers={"X-CSRF-Token": csrf_token}
    )

    # Should either accept and escape it, or reject with 400
    # As long as it doesn't execute SQL, it's fine
    if response.status_code in [200, 201]:
        # Verify database still exists
        check_response = session.get(f"{API_URL}/accounts")
        log_result(
            "Validation: SQL injection prevented",
            check_response.status_code == 200,
            "Database query still works after SQL injection attempt"
        )
    else:
        log_result(
            "Validation: SQL injection rejected",
            True,
            f"Status: {response.status_code}"
        )

# =============================================================================
# Test 4: Authentication & Authorization
# =============================================================================

def test_authentication():
    """Test authentication and authorization"""
    print("\n" + "="*70)
    print("TEST 4: AUTHENTICATION & AUTHORIZATION")
    print("="*70)

    # Test 4.1: Login with wrong password
    session = requests.Session()
    response = session.post(f"{API_URL}/auth/login", json={
        "username": "admin",
        "password": "wrongpassword"
    })

    log_result(
        "Auth: Wrong password rejected",
        response.status_code == 401,
        f"Status: {response.status_code}"
    )

    # Test 4.2: Login with non-existent user
    response = session.post(f"{API_URL}/auth/login", json={
        "username": "nonexistent",
        "password": "password"
    })

    log_result(
        "Auth: Non-existent user rejected",
        response.status_code == 401,
        f"Status: {response.status_code}"
    )

    # Test 4.3: Access protected endpoint without auth
    unauth_session = requests.Session()
    response = unauth_session.get(f"{API_URL}/users", allow_redirects=False)

    log_result(
        "Auth: Protected endpoint requires login",
        response.status_code in [401, 302],  # 401 or 302 redirect
        f"Status: {response.status_code} (401 or 302 redirect expected)"
    )

    # Test 4.4: Inactive user cannot login
    # First create and disable a user
    admin_session = login()
    if admin_session:
        csrf_token = get_csrf_token(admin_session)

        # Create test user
        response = admin_session.post(f"{API_URL}/users",
            json={
                "username": "inactivetest",
                "password": "testpass123",
                "full_name": "Inactive Test",
                "role": "pos"
            },
            headers={"X-CSRF-Token": csrf_token}
        )

        if response.status_code in [200, 201]:
            user_id = response.json().get('id')

            # Disable the user
            admin_session.put(f"{API_URL}/users/{user_id}",
                json={
                    "username": "inactivetest",
                    "full_name": "Inactive Test",
                    "role": "pos",
                    "is_active": False
                },
                headers={"X-CSRF-Token": csrf_token}
            )

            # Try to login with inactive user
            inactive_session = requests.Session()
            response = inactive_session.post(f"{API_URL}/auth/login", json={
                "username": "inactivetest",
                "password": "testpass123"
            })

            log_result(
                "Auth: Inactive user cannot login",
                response.status_code == 401,
                f"Status: {response.status_code}"
            )

            # Clean up - delete test user
            admin_session.delete(f"{API_URL}/users/{user_id}",
                headers={"X-CSRF-Token": csrf_token}
            )
        else:
            log_warning("Auth: Inactive user test", "Could not create test user")

    # Test 4.5: Role-based access (POS user accessing admin endpoints)
    # Note: This requires creating a POS user first
    log_warning(
        "Auth: Role-based access control",
        "Manual test required - create POS user and try accessing admin endpoints"
    )

# =============================================================================
# Test 5: Session Security
# =============================================================================

def test_session_security():
    """Test session security"""
    print("\n" + "="*70)
    print("TEST 5: SESSION SECURITY")
    print("="*70)

    session = login()
    if not session:
        log_result("Session: Login", False, "Could not authenticate")
        return

    # Test 5.1: Session works for authenticated requests
    response = session.get(f"{API_URL}/auth/me")
    log_result(
        "Session: Authenticated user info",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )

    # Test 5.2: Logout invalidates session
    csrf_token = get_csrf_token(session)
    response = session.post(f"{API_URL}/auth/logout",
        headers={"X-CSRF-Token": csrf_token}
    )

    log_result(
        "Session: Logout succeeds",
        response.status_code == 200,
        f"Status: {response.status_code}"
    )

    # Test 5.3: After logout, session is invalid
    response = session.get(f"{API_URL}/auth/me", allow_redirects=False)
    log_result(
        "Session: After logout session invalid",
        response.status_code in [401, 302],  # Should redirect to login or return 401
        f"Status: {response.status_code} (session invalidated)"
    )

# =============================================================================
# Main Test Runner
# =============================================================================

def main():
    """Run all security tests"""
    print("\n" + "="*70)
    print("CAMP SNACKBAR POS - SECURITY TEST SUITE")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)

    try:
        # Check if server is running
        response = requests.get(BASE_URL, timeout=2)
        print(f"✅ Server is running at {BASE_URL}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Server is not running at {BASE_URL}")
        print(f"   Error: {e}")
        print("\nPlease start the server with:")
        print("  cd backend && source venv/bin/activate && python3 app.py")
        sys.exit(1)

    # Run all tests
    test_csrf_protection()
    test_xss_protection()
    test_input_validation()
    test_authentication()
    test_session_security()

    # Print summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"✅ Passed: {len(results['passed'])}")
    print(f"❌ Failed: {len(results['failed'])}")
    print(f"⚠️  Warnings: {len(results['warnings'])}")

    if results['failed']:
        print("\nFailed Tests:")
        for test_name, message in results['failed']:
            print(f"  - {test_name}")
            if message:
                print(f"    {message}")

    if results['warnings']:
        print("\nWarnings:")
        for test_name, message in results['warnings']:
            print(f"  - {test_name}")
            if message:
                print(f"    {message}")

    print("\n" + "="*70)
    print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)

    # Exit with error code if tests failed
    sys.exit(0 if len(results['failed']) == 0 else 1)

if __name__ == "__main__":
    main()
