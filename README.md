# Chethan Jujjavarapu's AI Lab

A simple, elegant blog for sharing machine learning and AI-related posts, experiments, and notes.

## How to Add a New Post

### Using Markdown Files

1. Create a new markdown file in the `posts/` folder (e.g., `my-post.md`)
2. Write your post content in markdown format (no need for escaped newlines!)
3. Open `posts.json` and add a new post object:

```json
{
    "id": "unique-post-id",
    "title": "Your Post Title",
    "date": "YYYY-MM-DD",
    "tags": ["ml", "ai", "deep-learning"],
    "excerpt": "A short description that appears on the homepage",
    "file": "my-post.md"
}
```

### Post Fields Explained

- **id**: A unique identifier (use lowercase with hyphens, e.g., "my-first-experiment")
- **title**: The post title
- **date**: Publication date in YYYY-MM-DD format
- **tags**: Array of tags (common tags: "ml", "ai", "deep-learning", "research")
- **excerpt**: Short summary (1-2 sentences) shown on the homepage
- **content**: Full post content in Markdown format

### Markdown Support

The blog supports basic Markdown:

- **Headers**: `# H1`, `## H2`, `### H3`
- **Bold**: `**bold text**`
- **Italic**: `*italic text*`
- **Code blocks**: `` ```code``` ``
- **Inline code**: `` `code` ``
- **Lists**: `- item` for unordered lists
- **Blockquotes**: `> quote`
- **Links**: `[text](url)`
- **Paragraphs**: Separate with double newlines

### Example Post

```json
{
    "id": "understanding-transformer-attention",
    "title": "Understanding Transformer Attention Mechanisms",
    "date": "2024-01-20",
    "tags": ["ml", "deep-learning", "research"],
    "excerpt": "A deep dive into how attention mechanisms work in transformer architectures.",
    "content": "# Understanding Transformer Attention Mechanisms\n\nTransformers have revolutionized NLP. Let's explore how attention works...\n\n## Self-Attention\n\nThe key innovation is self-attention...\n\n```python\n# Example code\nattention = Q @ K.T / sqrt(d_k)\n```"
}
```

## Local Development

1. Serve the files using a local web server (required for JSON loading):
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server
   ```

2. Open `http://localhost:8000` in your browser

## GitHub Pages

This blog is designed to work with GitHub Pages. Just push your changes to the repository and GitHub Pages will serve the site automatically.

## Customization

- **Styling**: Edit `styles.css` to customize colors, fonts, and layout
- **Colors**: Change CSS variables in `:root` section of `styles.css`
- **Tags**: Add new tag styles in `styles.css` under `.tag` classes

## File Structure

```
.
├── index.html          # Homepage
├── styles.css          # Blog styling
├── blog.js             # Blog functionality
├── posts.json          # Blog posts metadata
├── posts/              # Markdown files for blog posts
│   └── *.md            # Individual post files
└── README.md           # This file
```

