/**
 * Blogify API Server
 * This server provides RESTful API endpoints for managing blog articles.
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const AsyncLock = require('async-lock');

const app = express();
const port = 4000;
const DATA_FILE = path.join(__dirname, 'data', 'articles.json');
const lock = new AsyncLock();

// Middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Helper function to read articles from JSON file
const getArticles = async () => {
  return await lock.acquire('articles', async () => {
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading data file:', err);
      return [];
    }
  });
};

// Helper function to save articles to JSON file
const saveArticles = async (articles) => {
  // Lock is already acquired by the caller in the current design (POST/PUT/DELETE)
  // But since getArticles now locks, we need to be careful about deadlocks if we call getArticles inside a lock.
  // Actually, AsyncLock is not reentrant by default.
  // Strategy:
  // 1. Separate "read file" and "write file" primitives that don't lock.
  // 2. Wrap high-level operations in locks.

  try {
    const tempFile = `${DATA_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(articles, null, 2));
    await fs.rename(tempFile, DATA_FILE);
    return true;
  } catch (err) {
    console.error('Error writing to data file:', err);
    return false;
  }
};

// Primitives without locks
const _readArticles = async () => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') return [];
        console.error('Error reading data file:', err);
        return [];
    }
};

/**
 * GET /api/articles
 * Retrieves a paginated list of articles
 * @param {number} page - The page number (default: 1)
 * @param {number} limit - The number of articles per page (default: 10)
 * @returns {Object} Paginated articles data
 */
app.get('/api/articles', async (req, res) => {
    // For read-only, we can just read. Atomic rename ensures we get either old or new version, not partial.
    // So lock might not be strictly necessary for simple read if we use atomic write.
    // But to be safe and consistent with "Read-Modify-Write" logic elsewhere, let's use the lock if we want strong consistency,
    // OR just rely on atomic write for file integrity.
    // Given the previous review concern about "read while write", atomic write solves the "partial file" issue.
    // So _readArticles is safe to call without lock if we use atomic writes.

    const articles = await _readArticles();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search ? req.query.search.toLowerCase() : null;

    let filteredArticles = articles;

    if (search) {
        filteredArticles = articles.filter(article =>
            article.title.toLowerCase().includes(search) ||
            article.content.toLowerCase().includes(search)
        );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results = {};
    results.totalPages = Math.ceil(filteredArticles.length / limit);
    results.currentPage = page;

    if (endIndex < filteredArticles.length) {
        results.next = {
        page: page + 1,
        limit: limit
        };
    }

    if (startIndex > 0) {
        results.previous = {
        page: page - 1,
        limit: limit
        };
    }

    results.articles = filteredArticles.slice(startIndex, endIndex);
    res.json(results);
});

/**
 * POST /api/articles
 * Creates a new article
 * @param {Object} req.body - The article data
 * @returns {Object} The created article
 */
app.post('/api/articles', async (req, res) => {
  // Validate input
  if (!req.body.title || !req.body.content) {
      return res.status(400).json({ message: 'Title and content are required' });
  }

  try {
    await lock.acquire('articles', async () => {
      const articles = await _readArticles();

      const newArticle = {
        id: Date.now().toString(), // Standardized ID generation
        ...req.body,
        createdAt: new Date().toISOString(),
        views: 0
      };
      articles.push(newArticle);
      await saveArticles(articles);
      res.status(201).json(newArticle);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save article' });
  }
});

/**
 * GET /api/articles/:id
 * Retrieves a specific article by ID
 * @param {string} id - The article ID
 * @returns {Object} The requested article or 404 if not found
 */
app.get('/api/articles/:id', async (req, res) => {
  const articles = await _readArticles();
  const article = articles.find(a => a.id === req.params.id);
  if (article) {
    res.json(article);
  } else {
    res.status(404).json({ message: 'Article not found' });
  }
});

/**
 * PUT /api/articles/:id
 * Updates an existing article
 * @param {string} id - The article ID
 * @param {Object} req.body - The updated article data
 * @returns {Object} The updated article or 404 if not found
 */
app.put('/api/articles/:id', async (req, res) => {
  try {
    await lock.acquire('articles', async () => {
      const articles = await _readArticles();
      const index = articles.findIndex(a => a.id === req.params.id);
      if (index !== -1) {
        articles[index] = { ...articles[index], ...req.body };
        await saveArticles(articles);
        res.json(articles[index]);
      } else {
        res.status(404).json({ message: 'Article not found' });
      }
    });
  } catch (err) {
      res.status(500).json({ message: 'Failed to update article' });
  }
});

/**
 * DELETE /api/articles/:id
 * Deletes an article
 * @param {string} id - The article ID
 * @returns {undefined} 204 No Content on success, or 404 if not found
 */
app.delete('/api/articles/:id', async (req, res) => {
  try {
    await lock.acquire('articles', async () => {
      const articles = await _readArticles();
      const index = articles.findIndex(a => a.id === req.params.id);
      if (index !== -1) {
        articles.splice(index, 1);
        await saveArticles(articles);
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Article not found' });
      }
    });
  } catch (err) {
      res.status(500).json({ message: 'Failed to delete article' });
  }
});

/**
 * POST /api/articles/:id/comments
 * Adds a comment to an article
 * @param {string} id - The article ID
 * @param {Object} req.body - The comment data
 * @returns {Object} The updated article or 404 if not found
 */
app.post('/api/articles/:id/comments', async (req, res) => {
    // Validate comment input
    if (!req.body.name || !req.body.text) {
        return res.status(400).json({ message: 'Name and text are required for comments' });
    }

    try {
        await lock.acquire('articles', async () => {
            const articles = await _readArticles();
            const index = articles.findIndex(a => a.id === req.params.id);

            if (index !== -1) {
                if (!articles[index].comments) {
                    articles[index].comments = [];
                }

                const newComment = {
                    id: Date.now().toString(),
                    name: req.body.name,
                    text: req.body.text,
                    createdAt: new Date().toISOString()
                };

                articles[index].comments.push(newComment);

                await saveArticles(articles);
                res.status(201).json(newComment);
            } else {
                res.status(404).json({ message: 'Article not found' });
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to save comment' });
    }
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'An error occurred on the server' });
});

/**
 * Start the server
 */
if (require.main === module) {
  app.listen(port, () => {
    console.log(`API server berjalan di http://localhost:${port}`);
  });
}

module.exports = app;
