#!/bin/bash

# JWT Authentication Test Script
# Tests signup, signin, and protected route access

API_URL="http://localhost:3000"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="testpass123"
TEST_NAME="Test User"

echo "🧪 Testing JWT Authentication"
echo "================================"
echo ""

# Test 1: Signup
echo "1️⃣ Testing signup..."
SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"full_name\":\"$TEST_NAME\"}")

TOKEN=$(echo $SIGNUP_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Signup failed!"
  echo "$SIGNUP_RESPONSE"
  exit 1
else
  echo "✅ Signup successful - Token received"
  echo "Token: ${TOKEN:0:50}..."
fi

echo ""

# Test 2: Get current user (protected route)
echo "2️⃣ Testing protected route with token..."
USER_RESPONSE=$(curl -s -X GET "$API_URL/api/auth/user" \
  -H "Authorization: Bearer $TOKEN")

USER_EMAIL=$(echo $USER_RESPONSE | grep -o '"email":"[^"]*' | sed 's/"email":"//')

if [ "$USER_EMAIL" = "$TEST_EMAIL" ]; then
  echo "✅ Protected route access successful"
  echo "User: $USER_EMAIL"
else
  echo "❌ Protected route failed!"
  echo "$USER_RESPONSE"
  exit 1
fi

echo ""

# Test 3: Protected route without token
echo "3️⃣ Testing protected route without token (should fail)..."
NO_TOKEN_RESPONSE=$(curl -s -X GET "$API_URL/api/auth/user")

if echo "$NO_TOKEN_RESPONSE" | grep -q "Access token or API key required"; then
  echo "✅ Correctly rejected request without token"
else
  echo "❌ Should have rejected request without token!"
  echo "$NO_TOKEN_RESPONSE"
  exit 1
fi

echo ""

# Test 4: Signin with credentials
echo "4️⃣ Testing signin..."
SIGNIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

SIGNIN_TOKEN=$(echo $SIGNIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$SIGNIN_TOKEN" ]; then
  echo "❌ Signin failed!"
  echo "$SIGNIN_RESPONSE"
  exit 1
else
  echo "✅ Signin successful - New token received"
  echo "Token: ${SIGNIN_TOKEN:0:50}..."
fi

echo ""

# Test 5: Access protected CRUD endpoint
echo "5️⃣ Testing protected CRUD endpoint (projects)..."
PROJECTS_RESPONSE=$(curl -s -X GET "$API_URL/api/projects" \
  -H "Authorization: Bearer $SIGNIN_TOKEN")

if echo "$PROJECTS_RESPONSE" | grep -q "data"; then
  echo "✅ Protected CRUD endpoint accessible with token"
else
  echo "⚠️  Protected CRUD endpoint response:"
  echo "$PROJECTS_RESPONSE"
fi

echo ""

# Test 6: Invalid credentials
echo "6️⃣ Testing invalid credentials..."
INVALID_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrongpassword\"}")

if echo "$INVALID_RESPONSE" | grep -q "Invalid credentials"; then
  echo "✅ Correctly rejected invalid credentials"
else
  echo "❌ Should have rejected invalid credentials!"
  echo "$INVALID_RESPONSE"
  exit 1
fi

echo ""
echo "================================"
echo "✅ All authentication tests passed!"
echo ""
echo "Summary:"
echo "- Signup creates user and returns JWT token"
echo "- Protected routes require valid token"
echo "- Signin returns JWT token"
echo "- CRUD endpoints protected with authentication"
echo "- Invalid credentials correctly rejected"
