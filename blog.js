// Blog posts data - loaded from posts.json
let posts = [];

// Load posts from JSON file
async function loadPosts() {
    try {
        // Use absolute path for GitHub Pages compatibility
        const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        const jsonPath = basePath ? `${basePath}/posts.json` : 'posts.json';
        const response = await fetch(jsonPath);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        posts = await response.json();
        initBlog();
    } catch (error) {
        console.error('Error loading posts:', error);
        document.getElementById('blogPosts').innerHTML = 
            '<p>Error loading posts. Please check that posts.json exists and that GitHub Pages has finished building.</p>';
    }
}

// Function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Function to render blog posts list
function renderPostsList() {
    const postsContainer = document.getElementById('blogPosts');
    
    if (posts.length === 0) {
        postsContainer.innerHTML = '<p>No posts yet. Check back soon!</p>';
        return;
    }

    // Sort posts by date (newest first)
    const sortedPosts = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));

    postsContainer.innerHTML = sortedPosts.map(post => `
        <article class="post-card" onclick="window.location.href='?post=${post.id}'">
            <div class="post-meta">
                <span class="post-date">
                    📅 ${formatDate(post.date)}
                </span>
            </div>
            <h2><a href="?post=${post.id}">${post.title}</a></h2>
            <div class="post-tags">
                ${post.tags.map(tag => `<span class="tag ${tag}">${tag}</span>`).join('')}
            </div>
            <p class="post-excerpt">${post.excerpt}</p>
            <a href="?post=${post.id}" class="read-more">Read more</a>
        </article>
    `).join('');
}

// Function to render single post
function renderPost(postId) {
    const post = posts.find(p => p.id === postId);
    
    if (!post) {
        document.getElementById('blogPosts').innerHTML = `
            <div class="post-content">
                <h1>Post Not Found</h1>
                <p>The post you're looking for doesn't exist.</p>
                <a href="index.html" class="back-link">Back to home</a>
            </div>
        `;
        return;
    }

    const mainContent = document.querySelector('.main-content .container');
    mainContent.innerHTML = `
        <a href="index.html" class="back-link">Back to all posts</a>
        <article class="post-content">
            <div class="post-meta">
                <span class="post-date">📅 ${formatDate(post.date)}</span>
            </div>
            <h1>${post.title}</h1>
            <div class="post-tags">
                ${post.tags.map(tag => `<span class="tag ${tag}">${tag}</span>`).join('')}
            </div>
            <div class="post-body">
                ${markdownToHTML(post.content)}
            </div>
        </article>
    `;
}

// Simple markdown to HTML converter
function markdownToHTML(markdown) {
    let html = markdown;
    
    // Code blocks (process first to avoid processing code content)
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
    });
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Links (process before bold/italic to avoid conflicts)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Bold (before italic to handle **bold** correctly)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Italic (only if not part of bold)
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
    
    // Lists (unordered)
    html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
    // Wrap consecutive list items in ul tags
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
        return '<ul>' + match + '</ul>';
    });
    
    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');
    // This is a simplified approach - for better handling, you'd need more sophisticated parsing
    
    // Paragraphs (split by double newlines, but preserve HTML blocks)
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs.map(para => {
        para = para.trim();
        if (!para) return '';
        // Don't wrap if it's already a block-level HTML element
        if (/^<(h[1-6]|p|pre|ul|ol|blockquote|div)/i.test(para)) {
            return para;
        }
        return `<p>${para}</p>`;
    }).join('\n\n');
    
    return html;
}

// Helper function to escape HTML in code blocks
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize blog
function initBlog() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    
    if (postId) {
        renderPost(postId);
    } else {
        renderPostsList();
    }
}

// Run when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPosts);
} else {
    loadPosts();
}

