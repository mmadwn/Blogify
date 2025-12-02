/**
 * Blogify API Server
 * This server provides RESTful API endpoints for managing blog articles.
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, 'data', 'articles.json');

// Helper function to read articles from JSON file
const readArticles = () => {
  try {
    const data = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading articles file:', err);
    return [];
  }
};

// Helper function to write articles to JSON file
const writeArticles = (articles) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(articles, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to articles file:', err);
  }
};

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
  const articles = readArticles();
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

  // Search feature
  const searchQuery = req.query.search;
  let filteredArticles = articles;
  if (searchQuery) {
    const lowerCaseQuery = searchQuery.toLowerCase();
    filteredArticles = articles.filter(article =>
      article.title.toLowerCase().includes(lowerCaseQuery) ||
      article.content.toLowerCase().includes(lowerCaseQuery)
    );
  }

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
app.post('/api/articles', (req, res) => {
  const articles = readArticles();
  const newArticle = {
    id: (articles.length > 0 ? Math.max(...articles.map(a => parseInt(a.id))) + 1 : 1).toString(),
    ...req.body,
    createdAt: new Date().toISOString(),
    views: 0,
    comments: []
  };
  articles.push(newArticle);
  writeArticles(articles);
  res.status(201).json(newArticle);
});

/**
 * GET /api/articles/:id
 * Retrieves a specific article by ID
 * @param {string} id - The article ID
 * @returns {Object} The requested article or 404 if not found
 */
app.get('/api/articles/:id', (req, res) => {
  const articles = readArticles();
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
  const articles = readArticles();
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    articles[index] = { ...articles[index], ...req.body };
    writeArticles(articles);
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
  const articles = readArticles();
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    articles.splice(index, 1);
    writeArticles(articles);
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'Article not found' });
  }
});

/**
 * POST /api/articles/:id/comments
 * Adds a comment to an article
 * @param {string} id - The article ID
 * @param {Object} req.body - The comment data { name, email, content }
 * @returns {Object} The added comment
 */
app.post('/api/articles/:id/comments', (req, res) => {
  const articles = readArticles();
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    const comment = {
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      content: req.body.content,
      createdAt: new Date().toISOString()
    };
    if (!articles[index].comments) {
      articles[index].comments = [];
    }
    articles[index].comments.push(comment);
    writeArticles(articles);
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
app.listen(port, () => {
  console.log(`API server berjalan di http://localhost:${port}`);
});