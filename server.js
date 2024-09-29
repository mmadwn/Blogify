/**
 * Blogify API Server
 * This server provides RESTful API endpoints for managing blog articles.
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const articles = require('./data/dummyData');

const app = express();
const port = 4000;

// Middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * GET /api/articles
 * Retrieves a paginated list of articles
 * @param {number} page - The page number (default: 1)
 * @param {number} limit - The number of articles per page (default: 10)
 * @returns {Object} Paginated articles data
 */
app.get('/api/articles', (req, res) => {
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
 * @param {Object} req.body - The article data
 * @returns {Object} The created article
 */
app.post('/api/articles', (req, res) => {
  const newArticle = {
    id: (articles.length + 1).toString(),
    ...req.body,
    createdAt: new Date().toISOString(),
    views: 0
  };
  articles.push(newArticle);
  res.status(201).json(newArticle);
});

/**
 * GET /api/articles/:id
 * Retrieves a specific article by ID
 * @param {string} id - The article ID
 * @returns {Object} The requested article or 404 if not found
 */
app.get('/api/articles/:id', (req, res) => {
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
app.put('/api/articles/:id', (req, res) => {
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    articles[index] = { ...articles[index], ...req.body };
    res.json(articles[index]);
  } else {
    res.status(404).json({ message: 'Article not found' });
  }
});

/**
 * DELETE /api/articles/:id
 * Deletes an article
 * @param {string} id - The article ID
 * @returns {undefined} 204 No Content on success, or 404 if not found
 */
app.delete('/api/articles/:id', (req, res) => {
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    articles.splice(index, 1);
    res.status(204).send();
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
app.listen(port, () => {
  console.log(`API server berjalan di http://localhost:${port}`);
});