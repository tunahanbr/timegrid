#!/bin/bash
# Test script to verify data isolation fix

echo "🧪 Testing Data Isolation Fix"
echo "================================"
echo ""

API_URL="${API_URL:-http://localhost:3000}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
  local endpoint=$1
  local token=$2
  local expected_user_id=$3
  
  echo "Testing: GET /api/$endpoint"
  
  response=$(curl -s -H "Authorization: Bearer $token" "$API_URL/api/$endpoint")
  
  # Check if response contains data
  if echo "$response" | jq -e '.data' > /dev/null 2>&1; then
    # Check if all items have the correct user_id
    wrong_user_count=$(echo "$response" | jq -r ".data[] | select(.user_id != \"$expected_user_id\") | .user_id" | wc -l)
    total_count=$(echo "$response" | jq -r '.data | length')
    
    if [ "$wrong_user_count" -eq 0 ]; then
      echo -e "${GREEN}✅ PASS${NC}: All $total_count items belong to the correct user"
      return 0
    else
      echo -e "${RED}❌ FAIL${NC}: Found $wrong_user_count items from other users (out of $total_count total)"
      echo "$response" | jq -r ".data[] | select(.user_id != \"$expected_user_id\") | \"  - Item \(.id) belongs to user \(.user_id)\""
      return 1
    fi
  else
    echo -e "${YELLOW}⚠️  WARN${NC}: No data returned or error: $(echo "$response" | jq -r '.error // "Unknown error"')"
    return 0
  fi
}

# Main test
echo "Step 1: Creating two test users..."
echo ""

# Create User 1
user1_response=$(curl -s -X POST "$API_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser1@example.com",
    "password": "testpass123",
    "full_name": "Test User 1"
  }')

user1_token=$(echo "$user1_response" | jq -r '.token // empty')
user1_id=$(echo "$user1_response" | jq -r '.user.id // empty')

if [ -z "$user1_token" ]; then
  # User might already exist, try to login
  echo "User 1 might already exist, trying to login..."
  user1_response=$(curl -s -X POST "$API_URL/api/auth/signin" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "testuser1@example.com",
      "password": "testpass123"
    }')
  user1_token=$(echo "$user1_response" | jq -r '.token // empty')
  user1_id=$(echo "$user1_response" | jq -r '.user.id // empty')
fi

if [ -z "$user1_token" ]; then
  echo -e "${RED}❌ Failed to create/login User 1${NC}"
  echo "$user1_response" | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ User 1 ready${NC} (ID: $user1_id)"

# Create User 2
user2_response=$(curl -s -X POST "$API_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser2@example.com",
    "password": "testpass123",
    "full_name": "Test User 2"
  }')

user2_token=$(echo "$user2_response" | jq -r '.token // empty')
user2_id=$(echo "$user2_response" | jq -r '.user.id // empty')

if [ -z "$user2_token" ]; then
  # User might already exist, try to login
  echo "User 2 might already exist, trying to login..."
  user2_response=$(curl -s -X POST "$API_URL/api/auth/signin" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "testuser2@example.com",
      "password": "testpass123"
    }')
  user2_token=$(echo "$user2_response" | jq -r '.token // empty')
  user2_id=$(echo "$user2_response" | jq -r '.user.id // empty')
fi

if [ -z "$user2_token" ]; then
  echo -e "${RED}❌ Failed to create/login User 2${NC}"
  echo "$user2_response" | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ User 2 ready${NC} (ID: $user2_id)"
echo ""

# Create some test data for User 1
echo "Step 2: Creating test data for User 1..."
echo ""

curl -s -X POST "$API_URL/api/projects" \
  -H "Authorization: Bearer $user1_token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User 1 Project",
    "description": "This belongs to user 1",
    "color": "#FF6B6B"
  }' > /dev/null

curl -s -X POST "$API_URL/api/tags" \
  -H "Authorization: Bearer $user1_token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user1-tag"
  }' > /dev/null

echo -e "${GREEN}✅ Test data created for User 1${NC}"
echo ""

# Create some test data for User 2
echo "Step 3: Creating test data for User 2..."
echo ""

curl -s -X POST "$API_URL/api/projects" \
  -H "Authorization: Bearer $user2_token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User 2 Project",
    "description": "This belongs to user 2",
    "color": "#4ECDC4"
  }' > /dev/null

curl -s -X POST "$API_URL/api/tags" \
  -H "Authorization: Bearer $user2_token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user2-tag"
  }' > /dev/null

echo -e "${GREEN}✅ Test data created for User 2${NC}"
echo ""

# Test data isolation
echo "Step 4: Testing data isolation..."
echo "================================"
echo ""

failed_tests=0

# Test User 1 can only see their data
echo "Testing User 1's access:"
test_endpoint "projects" "$user1_token" "$user1_id" || ((failed_tests++))
test_endpoint "tags" "$user1_token" "$user1_id" || ((failed_tests++))
test_endpoint "clients" "$user1_token" "$user1_id" || ((failed_tests++))
echo ""

# Test User 2 can only see their data
echo "Testing User 2's access:"
test_endpoint "projects" "$user2_token" "$user2_id" || ((failed_tests++))
test_endpoint "tags" "$user2_token" "$user2_id" || ((failed_tests++))
test_endpoint "clients" "$user2_token" "$user2_id" || ((failed_tests++))
echo ""

# Summary
echo "================================"
echo "Test Summary"
echo "================================"
if [ $failed_tests -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC} Data isolation is working correctly."
  exit 0
else
  echo -e "${RED}❌ $failed_tests test(s) failed!${NC} Data isolation is NOT working correctly."
  exit 1
fi
