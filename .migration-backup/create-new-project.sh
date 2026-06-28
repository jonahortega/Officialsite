#!/bin/bash

# React App Template - Project Creator
# Usage: ./create-new-project.sh "Your Project Name"

if [ $# -eq 0 ]; then
    echo "Usage: ./create-new-project.sh \"Your Project Name\""
    echo "Example: ./create-new-project.sh \"My Awesome App\""
    exit 1
fi

PROJECT_NAME="$1"
PROJECT_DIR="${PROJECT_NAME// /-}"  # Replace spaces with hyphens
PROJECT_DIR=$(echo "$PROJECT_DIR" | tr '[:upper:]' '[:lower:]')  # Convert to lowercase

echo "🚀 Creating new project: $PROJECT_NAME"
echo "📁 Project directory: $PROJECT_DIR"

# Get the template directory (current directory)
TEMPLATE_DIR="$(pwd)"

# Create new project directory
if [ -d "../$PROJECT_DIR" ]; then
    echo "❌ Project directory already exists: ../$PROJECT_DIR"
    echo "Please choose a different name or remove the existing directory."
    exit 1
fi

echo "📋 Copying template files..."
cp -r "$TEMPLATE_DIR" "../$PROJECT_DIR"

# Navigate to new project
cd "../$PROJECT_DIR"

# Remove git history and create new one
rm -rf .git
git init

# Update package.json
echo "🔧 Updating package.json..."
sed -i '' "s/\"name\": \"react-app-template\"/\"name\": \"$PROJECT_DIR\"/" package.json
sed -i '' "s/\"description\": \"React App Template - Clone and customize for your projects\"/\"description\": \"$PROJECT_NAME\"/" package.json

# Update README
echo "📝 Updating README..."
sed -i '' "s/# React App Template/# $PROJECT_NAME/" README.md
sed -i '' "s/A comprehensive React application template with modern UI components, routing, and state management. Perfect for creating mock apps and prototypes quickly./$PROJECT_NAME - A React application built with modern UI components and state management./" README.md

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Project created successfully!"
echo ""
echo "🎯 Next steps:"
echo "   cd $PROJECT_DIR"
echo "   npm start"
echo ""
echo "🔧 Customize your project:"
echo "   - Update src/App.js for your navigation"
echo "   - Replace content in src/screens/"
echo "   - Modify styling in CSS files"
echo "   - Update data in src/data/"
echo ""
echo "🚀 Happy coding!" 