#!/bin/bash

echo "Welcome to the Hyvor Blog Importer Setup Script"

read -p "Enter your Hyvor Blog subdomain (BLOG_SUDOMAIN): " BLOG_SUDOMAIN
read -p "Enter your Hyvor API Key (HYVOR_API_KEY): " HYVOR_API_KEY
read -p "Enter the old image directory URL (OLD_IMAGE_DIRECTORY_URL): " OLD_IMAGE_DIRECTORY_URL
read -p "Enter the local folder path for images (FOLDER_PATH): " FOLDER_PATH
read -p "Enter the path to your WordPress XML export file (XML_FILE_PATH): " XML_FILE_PATH
read -p "Enter the language code for your blog (LANGUAGE_CODE): " LANGUAGE_CODE

cat > .env <<EOL
BLOG_SUDOMAIN=${BLOG_SUDOMAIN}
HYVOR_API_KEY=${HYVOR_API_KEY}
OLD_IMAGE_DIRECTORY_URL=${OLD_IMAGE_DIRECTORY_URL}
FOLDER_PATH=${FOLDER_PATH}
XML_FILE_PATH=${XML_FILE_PATH}
LANGUAGE_CODE=${LANGUAGE_CODE}
EOL

echo ".env file created successfully!"