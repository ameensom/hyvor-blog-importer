import fs from 'fs-extra';
import fetch from 'node-fetch';
import { default as slugify } from 'slugify';
import { JSDOM } from 'jsdom';
import { DOMParser } from 'prosemirror-model';
import { XMLParser } from 'fast-xml-parser';
import schema from './schema.js';
import { BLOG_SUDOMAIN, HYVOR_API_KEY, OLD_IMAGE_DIRECTORY_URL, FOLDER_PATH, XML_FILE_PATH, LANGUAGE_CODE } from './env.js';

async function run () {

[BLOG_SUDOMAIN, HYVOR_API_KEY, OLD_IMAGE_DIRECTORY_URL, FOLDER_PATH, XML_FILE_PATH, LANGUAGE_CODE]
.forEach((env, i) => {
    validateEnv(env, [
      'BLOG_SUDOMAIN',
      'HYVOR_API_KEY',
      'OLD_IMAGE_DIRECTORY_URL',
      'FOLDER_PATH',
      'XML_FILE_PATH',
      'LANGUAGE_CODE'
    ][i]);
});
  const xmlFile = await fs.readFile(XML_FILE_PATH, 'utf8');
  const parser = new XMLParser();
  const xml = parser.parse(xmlFile);
  const posts = xml.rss.channel.item.filter((item: any) => item.wppost_type === 'post');


  let tagsResponse = await fetch(`https://blogs.hyvor.com/api/console/v0/blog/${BLOG_SUDOMAIN}/tags`, {
    method: 'GET',
    headers: {
      'X-API-KEY': HYVOR_API_KEY
    }
  });

  if (!tagsResponse.ok) {
    console.error(`Failed to fetch tags. Status: ${tagsResponse.status} - ${tagsResponse.statusText}`);
    throw new Error(`Failed to fetch tags. Status: ${tagsResponse.status}`);
  }

  let tags = await tagsResponse.json() as Tag[];
  if (!tags.length) {
    await addDefaultTags(posts);
    tagsResponse = await fetch(`https://blogs.hyvor.com/api/console/v0/blog/${BLOG_SUDOMAIN}/tags`, {
      method: 'GET',
      headers: {
        'X-API-KEY': HYVOR_API_KEY
      }
    });
    tags = await tagsResponse.json() as Tag[];
  }

  tags.forEach(tag => {
    posts.forEach((post: any) => {
      // Ensure post.tags is initialized as an array
      post.tags = post.tags || [];

      // Handle when post.category is an object
      if (typeof post.category === 'object' && !Array.isArray(post.category)) {
        if (post.category['_'] === tag.variants[0].name) {
          if (!post.tags.includes(tag.id)) {
            post.tags.push(tag.id);
          }
        }
      }

      // Handle when post.category is an array
      if (Array.isArray(post.category)) {
        const match = post.category.some(
          (category: any) => category['_'] === tag.variants[0].name
        );
        if (match && !post.tags.includes(tag.id)) {
          post.tags.push(tag.id);
        }
      }
    });
  });

  const i = 0;
  for (const post of posts) {
    const postTitle = post.title;
    const slug = slugify.default(postTitle, { lower: true });


    const createPostResponse = await fetch(`https://blogs.hyvor.com/api/console/v0/blog/${BLOG_SUDOMAIN}/post`, {
      method: 'POST',
      headers: {
        'X-API-KEY': HYVOR_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_page: false
      })
    });

    if (!createPostResponse.ok) {
      console.error(`Failed to create post. Status: ${createPostResponse.status} - ${createPostResponse.statusText}`);
      throw new Error(`Failed to create post. Status: ${createPostResponse.status}`);
    }

    const createPost = await createPostResponse.json() as Post;
    const post_id = createPost.id;

    let html = post.contentencoded;

    const updatedImages: { oldSRC: string;newSRC: string }[] = [];
    const images = extractImagesAndCaptions(html);

    for (const image of images) {
      const imagePath = image.src?.replace(OLD_IMAGE_DIRECTORY_URL, FOLDER_PATH);
      const imageFile = await fs.readFile(imagePath);
      if (!imageFile) {
        continue;
      }
      const blob = new Blob([imageFile], { type: 'image/jpeg' });
      const form = new FormData();
      form.append('file', blob);
      form.append('post_id', post_id.toString());

      const uploadedImageResponse = await fetch(`https://blogs.hyvor.com/api/console/v0/blog/${BLOG_SUDOMAIN}/media`, {
        method: 'POST',
        headers: {
          'X-API-KEY': HYVOR_API_KEY
        },
        body: form // FormData is automatically handled by fetch
      });

      if (!uploadedImageResponse.ok) {
        console.error(`Failed to upload image. Status: ${uploadedImageResponse.status} - ${uploadedImageResponse.statusText}`);
        throw new Error(`Failed to upload image. Status: ${uploadedImageResponse.status}`);
      }

      const uploadedImage = await uploadedImageResponse.json() as Media;

      updatedImages.push({
        oldSRC: image.src,
        newSRC: uploadedImage.url
      });
    }

    updatedImages.forEach((updatedImage) => {
      html = html.replace(updatedImage.oldSRC, updatedImage.newSRC);
    });


    html = preprocessLineBreakHTML(html);
    html = preprocessCaptions(html);

    const dom = new JSDOM(html);
    const { document } = dom.window;

    const doc = DOMParser.fromSchema(schema).parse(document.body);
    const jsonDOC = doc.toJSON();
    const cleanParagraph = cleanParagraphs(jsonDOC);
    const removeHardBreaks = removeHardBreaksFromBulletLists(cleanParagraph);
    const finalJSON = removeParagraphsWithNoContent(removeHardBreaks);
    const description = (() => {
      const text = finalJSON
        .content.find((node: any) => node.type === 'paragraph')?.content?.find(
          (node: any) => node.type === 'text'
        ).text;

      if (!text) {
        return '';
      }

      return text.slice(0, 200).replace(/\s\S*$/, '');
    })();

    const published_at = Math.floor(
      new Date(new Date().getTime() + i * 24 * 60 * 60 * 1000).getTime() / 1000
    );

    const updateVariantResponse = await fetch(
      `https://blogs.hyvor.com/api/console/v0/blog/${BLOG_SUDOMAIN}/post/${post_id}/variant`,
      {
        method: 'PATCH',
        headers: {
          'X-API-KEY': HYVOR_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          language_id: LANGUAGE_CODE,
          title: postTitle,
          content: JSON.stringify(doc.toJSON()),
          slug,
          description,
          status: published_at ? 'published' : 'draft'
        })
      }
    );

    if (!updateVariantResponse.ok) {
      console.error(
        `Failed to update variant. Status: ${updateVariantResponse.status} - ${updateVariantResponse.statusText}`
      );
      throw new Error(
        `Failed to update variant. Status: ${updateVariantResponse.status}`
      );
    }

    const updateVariant = await updateVariantResponse.json() as Post;
    console.log('updated variant with id:', updateVariant.id, ' and response was ', updateVariant);
    if (updatedImages.length) {
      const updatePostResponse = await fetch(`https://blogs.hyvor.com/api/console/v0/blog/${BLOG_SUDOMAIN}/post/${post_id}`, {
        method: 'PATCH',
        headers: {
          'X-API-KEY': HYVOR_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          featured_image_url: updatedImages[0].newSRC,
          published_at
        })
      });

      if (!updatePostResponse.ok) {
        console.error(`Failed to update post. Status: ${updatePostResponse.status} - ${updatePostResponse.statusText}`);
        throw new Error(`Failed to update post. Status: ${updatePostResponse.status}`);
      }
    }

    if (post.tags?.length) {
      const updateTagsResponse = await fetch(`https://blogs.hyvor.com/api/console/v0/blog/${BLOG_SUDOMAIN}/post/${post_id}/tags`, {
        method: 'PATCH',
        headers: {
          'X-API-KEY': HYVOR_API_KEY,
          'Content-Type': 'application/json' // Ensure the body is sent as JSON
        },
        body: JSON.stringify({
          ids: post.tags // Convert the body object to a JSON string
        })
      });

      if (!updateTagsResponse.ok) {
        console.error(`Failed to update tags. Status: ${updateTagsResponse.status} - ${updateTagsResponse.statusText}`);
        throw new Error(`Failed to update tags. Status: ${updateTagsResponse.status}`);
      }
    }
    console.log(`imported post with id: ${post_id} and word press id: ${post['wppost_id']}`);
  }
  console.log('imported all posts');


}

function cleanParagraphs (json: any): any {

  json.content = json.content.map((node: any) => {
    if (node.type === 'paragraph' && node.content) {
      if (node.content.length > 1 && node.content[0].type === 'hard_break') {
        node.content = node.content.slice(1);
      }
    }
    return node;
  });

  return json;
}

function preprocessLineBreakHTML (html: string) {

  return html.replace(/(\r\n|\n|\r|&nbsp;)+/g, '<br>');
}
function preprocessCaptions (html: string) {
  return html.replace(
    /\[caption[^\]]*](.*?)\[\/caption\]/gs,
    (_, innerHTML) => {

      const dom = new JSDOM(innerHTML);
      const img = dom.window.document.querySelector('img');
      const textContent = dom.window.document.body.textContent?.replace(/<img.*?>/g, '')
        .trim();

      let result = '';
      if (img) {
        if (textContent) {

          result += `<figure>${img.outerHTML}<figcaption>${textContent}</figcaption></figure>`;
        } else {

          result += img.outerHTML;
        }
      }

      return result;
    }
  );
}

function extractImagesAndCaptions (text: string) {
  const imgTagRegex = /<img[^>]*\bsrc=["']([^"']+)["'][^>]*\balt=["']([^"']*)["'][^>]*>/g;
  const images: { src: string, alt?: string }[] = [];
  let match;

  while ((match = imgTagRegex.exec(text)) !== null) {
    images.push({
      src: match[1],
      alt: match[2]
    });
  }

  return images;
}


function removeHardBreaksFromBulletLists (doc: any) {
  const content = doc.content.map((node: any) => {
    if (node.type === 'bullet_list') {
      const bulletListContent = node.content
        .map((listItem: any) => {
          const filteredContent = listItem.content
            .filter((item: any) => item.type === 'paragraph')
            .map((paragraph: any) => {
              if (!paragraph.content) {
                return null;
              }

              const validItems = paragraph.content
                .filter((item: any) => item.type === 'text' && item.text.trim()) // Keep only valid text
                .map((textItem: any) => ({
                  type: 'list_item',
                  content: [{ type: 'paragraph', content: [textItem] }]
                }));

              return validItems.length ? validItems : null;
            })
            .flat()
            .filter(Boolean); // Remove null or empty items

          return filteredContent.length > 0
            ? { ...listItem, content: filteredContent }
            : null; // Remove empty list items
        })
        .filter(Boolean); // Remove null listItems

      return { ...node, content: bulletListContent };
    }

    return node; // Preserve non-bullet_list nodes
  });

  return { ...doc, content };
}

function removeParagraphsWithNoContent (doc: any) {

  const content = doc.content.filter((node: any) => {
    if (node.type === 'paragraph') {
      if (!node.content?.length) {
        return false;
      }

    }
    return true;
  });


  return { ...doc, content };
}
async function addDefaultTags (posts: any[]) {
  const categories: string[] = Array.from(
    new Set(
      posts
        .flatMap((post) =>
          (post.category as any[])
            ?.filter((cat) => cat._.trim()) // Filter relevant domains
            .map((cat) => cat._) // Extract the category name
        )
        .filter(Boolean) // Remove null/undefined values
    )
  ); // Extract unique category names

  for (const category of categories) {
    // Add tag to Hyvor
    const response = await fetch(
      `https://blogs.hyvor.com/api/console/v0/blog/${BLOG_SUDOMAIN}/tag`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': HYVOR_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: category
        })
      }
    );
    const tag = await response.json() as Tag;

    // Update the tag's slug
    const updatedSlug = slugify.default(category, { lower: true });
    await fetch(
      `https://blogs.hyvor.com/api/console/v0/blog/${BLOG_SUDOMAIN}/tag/${tag.id}`,
      {
        method: 'PATCH',
        headers: {
          'X-API-KEY': HYVOR_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slug: updatedSlug
        })
      }
    );

    console.log(`Tag added and slug updated: ${category} -> ${updatedSlug}`);
  }
}

run();


function validateEnv (env: string, key: string) {
  if (!env) {
    console.error(`Environment variable ${key} is required`);
    process.exit(1);
  }
}
interface Tag {
  id: number,
  created_at: number,
  updated_at: number,
is_private: boolean,
  slug: string,
  posts_count: number,
  code_head: string | null,
  code_foot: string | null,

  variants: TagVariant[]
}

interface TagVariant {
  language_id: number,
  url: string | null,
  name: string | null,
  description: string | null,
}

interface Post {
  id: number,
  preview_id: string,
  created_at: number,
  updated_at: number,
  published_at: number | null,

  is_featured: boolean,
  is_page: boolean,

  featured_image_url: string | null,
  canonical_url: string | null,
  code_head: string | null,
  code_foot: string | null,

  variants: PostVariant[],

  tags: Tag[],
  authors: User[]
}

interface PostVariant {
  language_id: number,

  slug: string | null,
  status: 'draft' | 'published' | 'scheduled',
  url: string,

  content: string | null,
  content_unsaved: string | null,
  title: string | null,
  description: string | null,
}

interface User {
  id: number,
  created_at: number,
  updated_at: number,

  hyvor_user_id: number | null,

  status: 'invited' | 'active' | 'blocked',
  role: 'owner' | 'admin' | 'editor' | 'writer' | 'contributor' | 'finance',
  slug: string,
  posts_count: number,
  email: string,

  picture_url: string | null,
  website_url: string | null,

  social_facebook: string | null,
  social_twitter: string | null,
  social_linkedin: string | null,
  social_youtube: string | null,
  social_tiktok: string | null,
  social_instagram: string | null,
  social_github: string | null,

  variants: UserVariant[]
}

interface UserVariant {
  language_id: number,
  url: string,
  name: string | null,
  bio: string | null,
  location: string | null,
}

interface Media {
  id: number,
  uploaded_at: number,
  name: string,
  url: string,
  original_name: string,
  extension: string
}