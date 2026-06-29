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

// Function to load file content from posts directory
async function loadMarkdownFile(filename) {
    try {
        const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        const filePath = basePath ? `${basePath}/posts/${filename}` : `posts/${filename}`;
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(`Failed to load file: ${response.status}`);
        }

        return await response.text();
    } catch (error) {
        console.error('Error loading file:', error);
        return '<p>Error loading post content. Please check that the file exists.</p>';
    }
}

// Global notebook cell storage (populated by notebookToHTML, used by runNotebookCell)
window._notebookCells = [];

// Render a Jupyter notebook (nbformat 4) to HTML with interactive Run buttons
function notebookToHTML(jsonText) {
    let nb;
    try {
        nb = JSON.parse(jsonText);
    } catch (e) {
        return '<p>Error parsing notebook JSON.</p>';
    }

    // Reset cell store for this notebook
    window._notebookCells = [];

    const cells = nb.cells || [];
    let codeIndex = 0;
    let firstCell = true;

    const cellHtmls = cells.map(cell => {
        const source = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');

        if (cell.cell_type === 'markdown') {
            let src = source;
            if (firstCell) {
                // Strip the leading h1 title — it duplicates the post header
                src = src.replace(/^#\s+[^\n]+\n?/, '').replace(/^---\n?/, '').trimStart();
            }
            firstCell = false;
            if (!src.trim()) return '';
            return `<div class="nb-markdown">${markdownToHTML(src)}</div>`;
        }

        if (cell.cell_type === 'code') {
            firstCell = false;
            const idx = codeIndex++;
            window._notebookCells[idx] = source;

            const staticOutputHtml = (cell.outputs || []).map(out => {
                if (out.output_type === 'stream') {
                    const text = Array.isArray(out.text) ? out.text.join('') : (out.text || '');
                    return `<pre class="nb-output">${escapeHtml(text)}</pre>`;
                }
                return '';
            }).join('');

            return `<div class="nb-cell">
                <div class="nb-cell-toolbar">
                    <button class="nb-run-btn" id="nb-run-${idx}" onclick="runNotebookCell(${idx})">▶ Run</button>
                </div>
                <pre class="nb-code"><code>${escapeHtml(source)}</code></pre>
                <div class="nb-static-output" id="nb-static-${idx}">${staticOutputHtml}</div>
                <div class="nb-live-output" id="nb-live-${idx}" style="display:none"></div>
            </div>`;
        }

        return '';
    }).filter(Boolean).join('\n');

    const toolbar = `<div class="nb-global-toolbar">
        <button class="nb-run-all-btn" onclick="runAllNotebookCells()">▶▶ Run All Cells</button>
        <button class="nb-restart-btn" onclick="restartNotebook()">↺ Restart Kernel</button>
        <span class="nb-py-status" id="nb-py-status">Python not started</span>
    </div>`;

    return toolbar + cellHtmls;
}

// Function to render single post
async function renderPost(postId) {
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
    
    // Load content - either from file or use inline content
    let rawContent = '';
    let isNotebook = false;
    if (post.file) {
        rawContent = await loadMarkdownFile(post.file);
        isNotebook = post.file.endsWith('.ipynb');
    } else if (post.content) {
        rawContent = post.content;
    } else {
        rawContent = '<p>No content available.</p>';
    }

    const renderedContent = isNotebook ? notebookToHTML(rawContent) : markdownToHTML(rawContent);

    postsContainer.innerHTML = `
        <a href="#" class="back-link" id="backToBlogLink">Back to all posts</a>
        <article class="post-content">
            <div class="post-meta">
                <span class="post-date">📅 ${formatDate(post.date)}</span>
            </div>
            <h1>${post.title}</h1>
            <div class="post-tags">
                ${post.tags.map(tag => `<span class="tag ${tag}">${tag}</span>`).join('')}
            </div>
            <div class="post-body">
                ${renderedContent}
            </div>
        </article>
    `;

    // Render LaTeX (KaTeX auto-render), if available.
    // This runs AFTER the post HTML is injected, so equations in markdown become formatted math.
    const postBody = postsContainer.querySelector('.post-body');
    renderLatexInElement(postBody);

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

function renderLatexInElement(el, attempt = 0) {
    if (!el) return;
    // KaTeX auto-render exposes renderMathInElement on window.
    if (typeof window.renderMathInElement !== 'function') {
        // KaTeX scripts are loaded with `defer`; in case the user clicks quickly, retry briefly.
        if (attempt < 20) setTimeout(() => renderLatexInElement(el, attempt + 1), 50);
        return;
    }

    window.renderMathInElement(el, {
        delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false }
        ],
        // Don't try to render inside code.
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        throwOnError: false
    });
}

// Simple markdown to HTML converter
function markdownToHTML(markdown) {
    let html = markdown;

    // 1. Protect math blocks so bold/italic regex doesn't corrupt them.
    //    Replace with placeholders, restore at the end.
    const mathStore = [];
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (m) => { mathStore.push(m); return `\x00MATH${mathStore.length - 1}\x00`; });
    html = html.replace(/\$([^\$\n]+?)\$/g,     (m) => { mathStore.push(m); return `\x00MATH${mathStore.length - 1}\x00`; });

    // 2. Code blocks (before other processing to protect their content)
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
    });

    // 3. Horizontal rules
    html = html.replace(/^---+$/gm, '<hr>');

    // 4. Tables (must come before list/paragraph processing)
    html = parseMarkdownTables(html);

    // 5. Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 6. Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // 7. Bold then italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');

    // 8. Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 9. Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

    // 10. Lists
    html = parseMarkdownLists(html);

    // 11. Paragraphs
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs.map(para => {
        para = para.trim();
        if (!para) return '';
        if (/^<(h[1-6]|p|pre|ul|ol|blockquote|div|hr|table)/i.test(para)) return para;
        return `<p>${para}</p>`;
    }).join('\n\n');

    // 12. Restore math placeholders
    html = html.replace(/\x00MATH(\d+)\x00/g, (_, i) => mathStore[+i]);

    return html;
}

function parseMarkdownLists(input) {
    const lines = input.split('\n');
    let out = '';

    // Each stack entry represents an open <ul>/<ol> at a given indent.
    // liOpen tracks whether the current list level has an open <li>.
    const stack = []; // { type: 'ul' | 'ol', indent: number, liOpen: boolean }

    const closeTopLiIfOpen = () => {
        if (!stack.length) return;
        const top = stack[stack.length - 1];
        if (top.liOpen) {
            out += '</li>\n';
            top.liOpen = false;
        }
    };

    const closeAllLists = () => {
        while (stack.length) {
            closeTopLiIfOpen();
            const top = stack.pop();
            out += `</${top.type}>\n`;
        }
    };

    const closeListsUntilIndent = (targetIndent) => {
        while (stack.length && stack[stack.length - 1].indent > targetIndent) {
            closeTopLiIfOpen();
            const top = stack.pop();
            out += `</${top.type}>\n`;
        }
    };

    const openList = (type, indent) => {
        out += `<${type}>\n`;
        stack.push({ type, indent, liOpen: false });
    };

    const unorderedRe = /^(\s*)[-*+]\s+(.+)$/;
    const orderedRe = /^(\s*)\d+\.\s+(.+)$/;

    for (const rawLine of lines) {
        const line = rawLine.replace(/\t/g, '    '); // normalize tabs

        const unordered = line.match(unorderedRe);
        const ordered = line.match(orderedRe);
        const isListItem = Boolean(unordered || ordered);

        if (isListItem) {
            const [, indentStr, itemText] = unordered || ordered;
            const indent = indentStr.length;
            const type = unordered ? 'ul' : 'ol';

            if (!stack.length) {
                openList(type, indent);
            } else {
                let top = stack[stack.length - 1];

                if (indent > top.indent) {
                    // Nest inside current <li> of the parent list.
                    if (!top.liOpen) {
                        out += '<li>';
                        top.liOpen = true;
                    }
                    out += `\n<${type}>\n`;
                    stack.push({ type, indent, liOpen: false });
                    top = stack[stack.length - 1];
                } else if (indent < top.indent) {
                    closeListsUntilIndent(indent);
                    if (!stack.length) {
                        openList(type, indent);
                    }
                }

                // Same indent: possibly switch list type.
                if (stack.length) {
                    top = stack[stack.length - 1];
                    if (top.indent === indent && top.type !== type) {
                        closeTopLiIfOpen();
                        out += `</${top.type}>\n`;
                        stack.pop();
                        openList(type, indent);
                    }
                }
            }

            // Start a new list item at the current level.
            closeTopLiIfOpen();
            out += `<li>${itemText.trim()}`;
            stack[stack.length - 1].liOpen = true;
            continue;
        }

        // Non-list line handling
        if (stack.length) {
            // Blank line: end list blocks so new sections don't get glued into the last <li>.
            if (line.trim() === '') {
                closeAllLists();
                out += '\n';
                continue;
            }

            const leadingSpaces = (line.match(/^(\s*)/)?.[1] ?? '').length;
            const currentIndent = stack[stack.length - 1].indent;

            // Indented continuation line: treat as part of current list item.
            if (leadingSpaces > currentIndent) {
                out += ` ${line.trim()}`;
                continue;
            }

            // New non-indented content: close lists before emitting.
            closeAllLists();
        }

        out += `${rawLine}\n`;
    }

    closeAllLists();
    return out.trim();
}

// Markdown table parser
function parseMarkdownTables(input) {
    // Match: header row | separator row | one-or-more data rows
    return input.replace(
        /^(\|.+\|)\s*\n\|[-| :]+\|\s*\n((?:\|.+\|\s*\n?)*)/gm,
        (match, headerLine, bodyLines) => {
            const headers = headerLine.replace(/^\||\|$/g, '').split('|').map(h => h.trim());
            const headerHtml = headers.map(h => `<th>${h}</th>`).join('');

            const rows = bodyLines.trim().split('\n').filter(r => r.trim());
            const rowsHtml = rows.map(row => {
                const cells = row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
                return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
            }).join('');

            return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
        }
    );
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

            // Update URL without reload (do this BEFORE showPage so blog doesn't re-open a ?post=... view)
            const newUrl = page === 'blog' ? 'index.html' : `index.html?page=${page}`;
            window.history.pushState({ page }, '', newUrl);

            showPage(page);
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
                    <p>Welcome to my corner of the internet! I'm Chethan Jujjavarapu, a Senior Data Scientist in the healthcare technology space with a PhD from the University of Washington. I specialize in applied machine learning and the design of scalable AI systems. My academic research focused on leveraging multimodal data to predict clinical conditions using machine learning. Today, I work on developing and deploying models that identify at-risk patients and support data-driven decision-making in healthcare. I’m particularly interested in applying emerging machine learning techniques to build robust, real-world systems that meaningfully improve patient outcomes.</p>
                </div>
                <div class="about-image-container">
                    <img src="images/IMG_2580.JPG" alt="Chethan Jujjavarapu" class="about-image">
                </div>
            </div>
            
            <h2>Research Interests</h2>
            <ul>
                <li>Applied AI</li>
                <li>AI Infrastructure</li>
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

// Dark mode functionality
function initDarkMode() {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Update toggle button icon
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
        toggle.querySelector('.toggle-icon').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
        toggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            toggle.querySelector('.toggle-icon').textContent = newTheme === 'dark' ? '☀️' : '🌙';
        });
    }
}

// Run when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initDarkMode();
        loadPosts();
    });
} else {
    initDarkMode();
    loadPosts();
}

// ─── Pyodide / interactive notebook runtime ───────────────────────────────────

let _pyodideInstance = null;
let _pyodideLoadPromise = null;

function _setPyStatus(msg) {
    const el = document.getElementById('nb-py-status');
    if (el) el.textContent = msg;
}

async function _ensurePyodide() {
    if (_pyodideInstance) return _pyodideInstance;
    if (_pyodideLoadPromise) return _pyodideLoadPromise;

    _pyodideLoadPromise = (async () => {
        _setPyStatus('Loading Python runtime…');

        // Dynamically load pyodide.js the first time
        if (typeof loadPyodide === 'undefined') {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js';
                s.onload = resolve;
                s.onerror = () => reject(new Error('Failed to load Pyodide'));
                document.head.appendChild(s);
            });
        }

        const py = await loadPyodide();
        _setPyStatus('Loading packages…');
        await py.loadPackage(['numpy', 'pandas', 'matplotlib', 'micropip']);

        _setPyStatus('Installing scikit-learn…');
        try {
            await py.runPythonAsync(`import micropip; await micropip.install(['scikit-learn'])`);
        } catch (e) { console.warn('scikit-learn install failed:', e); }

        _setPyStatus('Installing xgboost…');
        try {
            await py.runPythonAsync(`import micropip; await micropip.install(['xgboost'])`);
        } catch (e) { console.warn('xgboost install failed:', e); }

        // Set up stdout capture and matplotlib non-interactive backend
        await py.runPythonAsync(`
import sys, io, base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

class _Capture:
    def __init__(self): self.value = ''
    def write(self, s): self.value += str(s)
    def flush(self): pass

_capture = _Capture()
sys.stdout = _capture
sys.stderr = _capture

def _plt_show(*a, **kw):
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
    buf.seek(0)
    img = base64.b64encode(buf.read()).decode()
    plt.close('all')
    _capture.value += f'__NBIMG__{img}__ENDIMG__'

plt.show = _plt_show
`);

        _pyodideInstance = py;
        _setPyStatus('Python ready');
        return py;
    })();

    return _pyodideLoadPromise;
}

function _renderNotebookOutput(container, output) {
    container.innerHTML = '';
    if (!output.trim()) { container.style.display = 'none'; return; }
    container.style.display = 'block';

    output.split('__NBIMG__').forEach((part, i) => {
        if (i === 0) {
            if (part) {
                const pre = document.createElement('pre');
                pre.className = 'nb-output';
                pre.textContent = part;
                container.appendChild(pre);
            }
        } else {
            const [imgData, rest] = part.split('__ENDIMG__');
            if (imgData) {
                const img = document.createElement('img');
                img.src = `data:image/png;base64,${imgData}`;
                img.className = 'nb-plot';
                container.appendChild(img);
            }
            if (rest && rest.trim()) {
                const pre = document.createElement('pre');
                pre.className = 'nb-output';
                pre.textContent = rest;
                container.appendChild(pre);
            }
        }
    });
}

async function runNotebookCell(idx) {
    const btn       = document.getElementById(`nb-run-${idx}`);
    const staticDiv = document.getElementById(`nb-static-${idx}`);
    const liveDiv   = document.getElementById(`nb-live-${idx}`);
    if (!btn || !liveDiv) return;

    btn.disabled = true;
    btn.textContent = '⌛';
    liveDiv.style.display = 'block';
    liveDiv.innerHTML = '<pre class="nb-output nb-loading">Starting Python runtime (first run takes ~30 s)…</pre>';
    if (staticDiv) staticDiv.style.display = 'none';

    try {
        const py = await _ensurePyodide();
        btn.textContent = '⌛ Running';
        await py.runPythonAsync(`_capture.value = ''`);

        try {
            await py.runPythonAsync(window._notebookCells[idx] || '');
        } catch (runErr) {
            liveDiv.innerHTML = `<pre class="nb-output nb-error">${escapeHtml(runErr.message)}</pre>`;
            btn.textContent = '▶ Run';
            btn.disabled = false;
            return;
        }

        const output = py.globals.get('_capture').value;
        _renderNotebookOutput(liveDiv, output);
    } catch (err) {
        liveDiv.innerHTML = `<pre class="nb-output nb-error">${escapeHtml(err.message)}</pre>`;
    }

    btn.textContent = '▶ Run';
    btn.disabled = false;
}

async function runAllNotebookCells() {
    for (let i = 0; i < window._notebookCells.length; i++) {
        await runNotebookCell(i);
    }
}

function restartNotebook() {
    _pyodideInstance = null;
    _pyodideLoadPromise = null;
    _setPyStatus('Python not started');
    window._notebookCells.forEach((_, i) => {
        const staticDiv = document.getElementById(`nb-static-${i}`);
        const liveDiv   = document.getElementById(`nb-live-${i}`);
        const btn       = document.getElementById(`nb-run-${i}`);
        if (staticDiv) staticDiv.style.display = '';
        if (liveDiv)   { liveDiv.style.display = 'none'; liveDiv.innerHTML = ''; }
        if (btn)       { btn.textContent = '▶ Run'; btn.disabled = false; }
    });
}

