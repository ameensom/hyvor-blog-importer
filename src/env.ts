/* eslint-disable node/no-process-env */
import dotenv from 'dotenv';

export const { NODE_ENV } = process.env;
dotenv.config({ path: '.env' });
export const {
    BLOG_SUDOMAIN, HYVOR_API_KEY, OLD_IMAGE_DIRECTORY_URL, FOLDER_PATH, XML_FILE_PATH, LANGUAGE_CODE
} = process.env;