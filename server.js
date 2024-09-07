const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const articles = require('./data/dummyData');

const app = express();
const port = 4000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API routes
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

app.get('/api/articles/:id', (req, res) => {
  const article = articles.find(a => a.id === req.params.id);
  if (article) {
    res.json(article);
  } else {
    res.status(404).json({ message: 'Article not found' });
  }
});

app.put('/api/articles/:id', (req, res) => {
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    articles[index] = { ...articles[index], ...req.body };
    res.json(articles[index]);
  } else {
    res.status(404).json({ message: 'Article not found' });
  }
});

app.delete('/api/articles/:id', (req, res) => {
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    articles.splice(index, 1);
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'Article not found' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Terjadi kesalahan pada server' });
});

app.listen(port, () => {
  console.log(`API server berjalan di http://localhost:${port}`);
});