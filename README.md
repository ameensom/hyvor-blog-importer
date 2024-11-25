# Hyvor Blog Importer

A Node.js script to import WordPress posts into a Hyvor Blog, complete with tag management, content processing, and media handling.

## Features

- Imports posts from a WordPress XML export.
- Manages tags dynamically based on post categories.
- Processes images and captions.
- Updates the Hyvor Blog with properly structured content.

## Prerequisites

- Export your wordpress posts to an XML file. [Here's how](https://wordpress.com/support/export/#export-content-to-another-word-press-site)
- Download your wp-content into your local machine through FTP, SFTP or any other method.

## Configuration

The setup script will create a `.env` file with the following variables:

- `BLOG_SUDOMAIN`: Your Hyvor Blog subdomain.
- `HYVOR_API_KEY`: Your Hyvor API key.
- `OLD_IMAGE_DIRECTORY_URL`: The URL of the old image directory.
- `FOLDER_PATH`: The local folder path for images.
- `XML_FILE_PATH`: The path to your WordPress XML export file.
- `LANGUAGE_CODE`: The language code for your primary blog language.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/ameensom/hyvor-blog-importer.git
   cd hyvor-blog-importer
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Run the setup script:

   ```bash
   npm run setup
   ```

## Usage

1.Build the script:

   ```bash
   npm run build
   ```

2. Run the script:

```bash
npm start
```

3. The script will import the posts from the WordPress XML export file and update the Hyvor Blog with the processed content.

## Known Issues

- The script does not handle post comments.
- The script does not handle post authors.
- The script assumes that all images are in JPEG format. If your images are in a different format, you may need to modify the script.
- The script does not handle pagination in the WordPress XML export file. If you have a large number of posts, you may need to split the XML file into smaller parts.
- Content converted from HTML to ProseMirror may not be perfect. You may need to manually edit the content in the Hyvor Blog editor.

## Disclaimer

Use this script at your own risk. The authors are not responsible for any damage or data loss that may occur as a result of using this script.
