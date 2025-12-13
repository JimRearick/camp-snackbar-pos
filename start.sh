#!/bin/bash
# Start the Camp Snackbar POS backend server

cd "$(dirname "$0")"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo ""
fi

# Activate virtual environment
source venv/bin/activate

# Check if Flask is installed in venv
if ! python -c "import flask" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install -r backend/requirements.txt
    echo ""
fi

echo "Starting Camp Snackbar POS backend..."
echo "Server will be available at http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd backend
python app.py
