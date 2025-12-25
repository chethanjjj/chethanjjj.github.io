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
        
        // Initialize blog and navigation
        initBlog();
    } catch (error) {
        console.error('Error loading posts:', error);
        const blogPostsContainer = document.getElementById('blogPosts');
        if (blogPostsContainer) {
            blogPostsContainer.innerHTML = 
                '<p>Error loading posts. Please check that posts.json exists and that GitHub Pages has finished building.</p>';
        }
        // Still initialize navigation and pages even if posts fail to load
        initBlog();
    }
}

// Function to format date
function formatDate(dateString) {
    // Parse YYYY-MM-DD format as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
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
        <article class="post-card" data-post-id="${post.id}">
            <div class="post-meta">
                <span class="post-date">
                    📅 ${formatDate(post.date)}
                </span>
            </div>
            <h2><a href="?post=${post.id}" class="post-link" data-post-id="${post.id}">${post.title}</a></h2>
            <div class="post-tags">
                ${post.tags.map(tag => `<span class="tag ${tag}">${tag}</span>`).join('')}
            </div>
            <p class="post-excerpt">${post.excerpt}</p>
            <a href="?post=${post.id}" class="read-more post-link" data-post-id="${post.id}">Read more</a>
        </article>
    `).join('');

    // Add event listeners for post cards
    postsContainer.querySelectorAll('.post-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't navigate if clicking on a link (let the link handle it)
            if (e.target.tagName === 'A') return;
            const postId = card.getAttribute('data-post-id');
            renderPost(postId);
            window.history.pushState({ post: postId }, '', `?post=${postId}`);
        });
    });

    // Add event listeners for post links
    postsContainer.querySelectorAll('.post-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const postId = link.getAttribute('data-post-id');
            renderPost(postId);
            window.history.pushState({ post: postId }, '', `?post=${postId}`);
        });
    });
}

// Function to render single post
function renderPost(postId) {
    const post = posts.find(p => p.id === postId);
    const postsContainer = document.getElementById('blogPosts');
    
    if (!post) {
        postsContainer.innerHTML = `
            <div class="post-content">
                <h1>Post Not Found</h1>
                <p>The post you're looking for doesn't exist.</p>
                <a href="#" class="back-link" onclick="showPage('blog'); return false;">Back to all posts</a>
            </div>
        `;
        return;
    }

    // Make sure we're on the blog page
    showPage('blog');
    
    postsContainer.innerHTML = `
        <a href="#" class="back-link" id="backToBlogLink">← Back to all posts</a>
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

    // Add event listener for back link
    const backLink = document.getElementById('backToBlogLink');
    if (backLink) {
        backLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Update URL to remove post parameter
            const baseUrl = window.location.pathname.split('?')[0];
            const cleanUrl = baseUrl.endsWith('index.html') || baseUrl.endsWith('/') ? 'index.html' : 'index.html';
            window.history.pushState({ page: 'blog' }, '', cleanUrl);
            
            // Render the posts list
            renderPostsList();
            
            // Update nav link active state
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            const blogNavLink = document.querySelector('.nav-link[data-page="blog"]');
            if (blogNavLink) {
                blogNavLink.classList.add('active');
            }
        });
    }
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

// Navigation handling
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            showPage(page);
            
            // Update URL without reload
            const newUrl = page === 'blog' ? 'index.html' : `index.html?page=${page}`;
            window.history.pushState({ page }, '', newUrl);
        });
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('post');
        const page = postId ? 'blog' : (urlParams.get('page') || 'blog');
        
        if (postId) {
            showPage('blog');
            renderPost(postId);
        } else {
            showPage(page);
        }
    });
}

function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show selected page
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Activate corresponding nav link
    const activeLink = document.querySelector(`.nav-link[data-page="${pageName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Load page-specific content
    if (pageName === 'blog') {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('post');
        if (postId) {
            renderPost(postId);
        } else {
            renderPostsList();
        }
    } else if (pageName === 'about') {
        loadAbout();
    }
}

// Load about page content
function loadAbout() {
    const container = document.getElementById('aboutContent');
    container.innerHTML = `
        <div class="page-content">
            <h1>About</h1>
            
            <div class="about-intro">
                <div class="about-text">
                    <p>Welcome to my corner of the internet. I'm Chethan Jujjavarapu, a Senior Data Scientist in the healthcare technology space with a PhD from the University of Washington. I specialize in applied machine learning and the design of scalable AI systems. My academic research focused on leveraging multimodal data to predict clinical conditions using machine learning. Today, I work on developing and deploying models that identify at-risk patients and support data-driven decision-making in healthcare. I’m particularly interested in applying emerging machine learning techniques to build robust, real-world systems that meaningfully improve patient outcomes.</p>
                </div>
                <div class="about-image-container">
                    <img src="images/IMG_2580.JPG" alt="Chethan Jujjavarapu" class="about-image">
                </div>
            </div>
            
            <h2>Research Interests</h2>
            <ul>
                <li>Applied Machine Learning</li>
                <li>Deep Learning Systems</li>
                <li>ML Infrastructure</li>
                <li>AI Research</li>
                <li>Healthcare</li>
                <li>Motorsports</li>
            </ul>
            
            <h2>Contact</h2>
            <div class="contact-links">
                <a href="https://github.com/chethanjjj" target="_blank" rel="noopener noreferrer" class="contact-link">
                    GitHub
                </a>
                <a href="https://www.linkedin.com/in/chethanjjj/" target="_blank" rel="noopener noreferrer" class="contact-link">
                    LinkedIn
                </a>
            </div>
        </div>
    `;
}

// Initialize blog
function initBlog() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    const page = postId ? 'blog' : (urlParams.get('page') || 'blog');
    
    // Initialize navigation first
    initNavigation();
    
    // Show the appropriate page
    if (postId) {
        showPage('blog');
        renderPost(postId);
    } else {
        showPage(page);
    }
}

// Run when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPosts);
} else {
    loadPosts();
}

