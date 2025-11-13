#!/bin/bash

# Script to show where offline data is stored and view it

APP_NAME="com.timegrid.app"

# Determine the app data directory based on OS
case "$(uname -s)" in
    Darwin)
        # macOS
        OFFLINE_DIR="$HOME/Library/Application Support/$APP_NAME/offline_data"
        ;;
    Linux)
        # Linux
        OFFLINE_DIR="$HOME/.local/share/$APP_NAME/offline_data"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        # Windows (Git Bash/MSYS)
        OFFLINE_DIR="$APPDATA/$APP_NAME/offline_data"
        ;;
    *)
        echo "Unsupported OS"
        exit 1
        ;;
esac

echo "📁 Offline Data Location:"
echo "   $OFFLINE_DIR"
echo ""

# Check if directory exists
if [ -d "$OFFLINE_DIR" ]; then
    echo "✅ Directory exists!"
    echo ""
    
    # List files
    echo "📄 Files:"
    ls -lh "$OFFLINE_DIR"
    echo ""
    
    # Show contents of each file
    for file in "$OFFLINE_DIR"/*.json; do
        if [ -f "$file" ]; then
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "📝 $(basename "$file"):"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            cat "$file" | python3 -m json.tool 2>/dev/null || cat "$file"
            echo ""
        fi
    done
else
    echo "⚠️  Directory doesn't exist yet"
    echo "   It will be created when you save offline data"
fi

echo ""
echo "🔍 To open in Finder/Explorer:"
case "$(uname -s)" in
    Darwin)
        echo "   open \"$OFFLINE_DIR\""
        ;;
    Linux)
        echo "   xdg-open \"$OFFLINE_DIR\""
        ;;
    MINGW*|MSYS*|CYGWIN*)
        echo "   explorer \"$OFFLINE_DIR\""
        ;;
esac
