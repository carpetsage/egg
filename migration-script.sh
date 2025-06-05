#!/bin/bash

# Function to perform safe class name replacement
replace_class() {
    local old_class=$1
    local new_class=$2

    echo "Replacing '$old_class' with '$new_class'..."

    # Find files containing the class, excluding node_modules and .git
    find . -type f \( -name "*.vue" -o -name "*.html" -o -name "*.jsx" -o -name "*.tsx" \) -not -path "*/node_modules/*" -not -path "*/.git/*" | while read -r file; do
        # Use sed for the replacement with word boundaries
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS version
            sed -i '' "s/\([[:space:]\"\':(\{]\)${old_class}\([[:space:]\"\':)\}]\)/\1${new_class}\2/g" "$file"
        else
            # Linux version
            sed -i "s/\([[:space:]\"\':(\{]\)${old_class}\([[:space:]\"\':)\}]\)/\1${new_class}\2/g" "$file"
        fi
    done
}

echo "Starting Tailwind v4 class migration..."

# Shadow utilities
replace_class "shadow-sm" "shadow-xs"
replace_class "shadow " "shadow-sm "
replace_class "shadow\"" "shadow-sm\""
replace_class "shadow'" "shadow-sm'"

# Drop shadow utilities
replace_class "drop-shadow-sm" "drop-shadow-xs"
replace_class "drop-shadow " "drop-shadow-sm "
replace_class "drop-shadow\"" "drop-shadow-sm\""
replace_class "drop-shadow'" "drop-shadow-sm'"

# Blur utilities
replace_class "blur-sm" "blur-xs"
replace_class "blur " "blur-sm "
replace_class "blur\"" "blur-sm\""
replace_class "blur'" "blur-sm'"

# Backdrop blur utilities
replace_class "backdrop-blur-sm" "backdrop-blur-xs"
replace_class "backdrop-blur " "backdrop-blur-sm "
replace_class "backdrop-blur\"" "backdrop-blur-sm\""
replace_class "backdrop-blur'" "backdrop-blur-sm'"

# Rounded utilities
replace_class "rounded-sm" "rounded-xs"
replace_class "rounded " "rounded-sm "
replace_class "rounded\"" "rounded-sm\""
replace_class "rounded'" "rounded-sm'"

# Outline and ring utilities
replace_class "outline-none" "outline-hidden"
replace_class "ring " "ring-3 "
replace_class "ring\"" "ring-3\""
replace_class "ring'" "ring-3'"

echo "Migration complete!"
