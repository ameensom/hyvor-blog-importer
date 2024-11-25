import { Schema, Fragment } from 'prosemirror-model';
const schema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { group: 'block', content: 'inline*', toDOM: () => ['p', 0] },
      heading: {
        group: 'block',
        content: 'inline*',
        attrs: { level: { default: 1 } },
        parseDOM: [
          { tag: 'h1', attrs: { level: 1 } },
          { tag: 'h2', attrs: { level: 2 } },
          { tag: 'h3', attrs: { level: 3 } }
        ],
        toDOM: (node) => [`h${node.attrs.level}`, 0]
      },
      blockquote: {
        group: 'block',
        content: 'block+',
        parseDOM: [{ tag: 'blockquote' }],
        toDOM: () => ['blockquote', 0]
      },
      bullet_list: {
        group: 'block',
        content: 'list_item+',
        parseDOM: [{ tag: 'ul' }],
        toDOM: () => ['ul', 0]
      },
      list_item: {
        content: 'paragraph+',
        parseDOM: [{ tag: 'li' }],
        toDOM: () => ['li', 0]
      },
      image: {
        group: 'block',
        attrs: {
          src: { default: null },
          alt: { default: null },
          width: { default: null },
          height: { default: null }
        },
        parseDOM: [
          {
            tag: 'img[src]',
            getAttrs: (dom) => ({
              src: dom.getAttribute('src'),
              alt: dom.getAttribute('alt') || null,
              width: dom.getAttribute('width') || null,
              height: dom.getAttribute('height') || null
            })
          }
        ],
        toDOM: (node) => ['img', node.attrs]
      },

      figcaption: {
        group: 'block',
        content: 'inline*',
        parseDOM: [{ tag: 'figcaption' }],
        toDOM: () => ['figcaption', 0]
      },
      figure: {
        group: 'block',
        content: '(image figcaption?)',
        parseDOM: [
          {
            tag: 'figure',
            getAttrs: () => null,
            getContent: (dom: HTMLElement, schema: Schema) => {
              const nodes: any[] = [];


              Array.from(dom.children).forEach((child) => {
                if (child.nodeName.toLowerCase() === 'img') {
                  nodes.push(
                    schema.nodes.image.create({
                      src: child.getAttribute('src'),
                      alt: child.getAttribute('alt'),
                      width: child.getAttribute('width'),
                      height: child.getAttribute('height')
                    })
                  );
                } else if (child.nodeName.toLowerCase() === 'figcaption') {
                  nodes.push(
                    schema.nodes.figcaption.create(
                      null,
                      schema.text(child.textContent?.trim() || '')
                    )
                  );
                }
              });


              return Fragment.fromArray(nodes);
            }
          }
        ],
        toDOM: () => ['figure', 0]
      },

      hard_break: {
        inline: true,
        group: 'inline',
        parseDOM: [{ tag: 'br' }],
        toDOM: () => ['br']
      },
      text: { group: 'inline' }
    },

    marks: {
      strong: {
        parseDOM: [
          { tag: 'strong' },
          { tag: 'b', getAttrs: () => null },
          {
            style: 'font-weight',
            getAttrs: (value) => {
              if (value === 'bold' || Number(value) > 400) {
                return {};
              }
              return false;
            }
          }
        ],
        toDOM: () => ['strong', 0]
      },
      emphasis: {
        parseDOM: [
          { tag: 'em' },
          { tag: 'i', getAttrs: () => null },
          {
            style: 'font-style',
            getAttrs: (value) => (value === 'italic' ? {} : false)
          }
        ],
        toDOM: () => ['em', 0]
      },
      underline: {
        parseDOM: [
          {
            tag: 'u',
            getAttrs: () => null
          },
          {
            style: 'text-decoration',
            getAttrs: (value) => (value === 'underline' ? {} : false)
          }
        ],
        toDOM: () => ['u', 0]
      },
      link: {
        attrs: {
          href: {},
          target: { default: null }
        },
        inclusive: false,
        parseDOM: [
          {
            tag: 'a[href]',
            getAttrs: (dom) => ({
              href: dom.getAttribute('href'),
              target: dom.getAttribute('target') || null
            })
          }
        ],
        toDOM: (mark) => ['a', { href: mark.attrs.href, target: mark.attrs.target }, 0]
      }
    }
  });

  export default schema;