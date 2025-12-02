/**
 * Blogify API Server
 * This server provides RESTful API endpoints for managing blog articles.
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { readData, writeData } = require('./utils/db');

const app = express();
const port = 4000;

// Middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * GET /api/articles
 * Retrieves a paginated list of articles
 * Search implemented via 'q' query param
 */
app.get('/api/articles', (req, res) => {
  let articles = readData();

  // Search
  const query = req.query.q;
  if (query) {
    const lowerQuery = query.toLowerCase();
    articles = articles.filter(article =>
      article.title.toLowerCase().includes(lowerQuery) ||
      article.content.toLowerCase().includes(lowerQuery)
    );
  }

  // Sort by date (newest first)
  articles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const results = {};
  results.totalPages = Math.ceil(articles.length / limit);
  results.currentPage = page;

  if (endIndex < articles.length) {
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

  results.articles = articles.slice(startIndex, endIndex);
  res.json(results);
});

/**
 * POST /api/articles
 * Creates a new article
 */
app.post('/api/articles', (req, res) => {
  const articles = readData();
  const newArticle = {
    id: Date.now().toString(), // Better ID generation
    ...req.body,
    createdAt: new Date().toISOString(),
    views: 0,
    comments: []
  };
  articles.push(newArticle);
  writeData(articles);
  res.status(201).json(newArticle);
});

/**
 * GET /api/articles/:id
 * Retrieves a specific article by ID
 */
app.get('/api/articles/:id', (req, res) => {
  const articles = readData();
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
 */
app.put('/api/articles/:id', (req, res) => {
  const articles = readData();
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    articles[index] = { ...articles[index], ...req.body };
    writeData(articles);
    res.json(articles[index]);
  } else {
    res.status(404).json({ message: 'Article not found' });
  }
});

/**
 * DELETE /api/articles/:id
 * Deletes an article
 */
app.delete('/api/articles/:id', (req, res) => {
  const articles = readData();
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    articles.splice(index, 1);
    writeData(articles);
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'Article not found' });
  }
});

/**
 * POST /api/articles/:id/comments
 * Adds a comment to an article
 */
app.post('/api/articles/:id/comments', (req, res) => {
  const articles = readData();
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    const comment = {
        id: Date.now().toString(),
        name: req.body.name,
        comment: req.body.comment,
        createdAt: new Date().toISOString()
    };
    if (!articles[index].comments) {
        articles[index].comments = [];
    }
    articles[index].comments.push(comment);
    writeData(articles);
    res.status(201).json(comment);
  } else {
    res.status(404).json({ message: 'Article not found' });
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
