/**
 * Blogify API Server
 * This server provides RESTful API endpoints for managing blog articles.
 */

import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 4000;
const dataFile = path.join(__dirname, 'data', 'articles.json');

// Interface for Article
interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

interface Article {
  id: string;
  title: string;
  author: string;
  category: string;
  excerpt?: string;
  content: string;
  image?: string | null;
  createdAt: string;
  views: number;
  comments: Comment[];
}

// Middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Helper function to read articles from file
const readArticles = (): Article[] => {
  try {
    const data = fs.readFileSync(dataFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading data file:', err);
    return [];
  }
};

// Helper function to write articles to file
const writeArticles = (articles: Article[]) => {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(articles, null, 2));
  } catch (err) {
    console.error('Error writing data file:', err);
  }
};

/**
 * GET /api/articles
 * Retrieves a paginated list of articles
 */
app.get('/api/articles', (req: Request, res: Response) => {
  let articles = readArticles();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search ? (req.query.search as string).toLowerCase() : null;

  if (search) {
    articles = articles.filter(article =>
      article.title.toLowerCase().includes(search) ||
      article.content.toLowerCase().includes(search) ||
      (article.category && article.category.toLowerCase().includes(search))
    );
  }

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const results: any = {};
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
app.post('/api/articles', (req: Request, res: Response) => {
  const articles = readArticles();
  const newArticle: Article = {
    id: (Date.now()).toString(), // Simple unique ID using timestamp
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
 * Retrieves a specific article by ID and increments view count
 */
app.get('/api/articles/:id', (req: Request, res: Response) => {
  const articles = readArticles();
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    articles[index].views = (articles[index].views || 0) + 1;
    writeArticles(articles);
    res.json(articles[index]);
  } else {
    res.status(404).json({ message: 'Article not found' });
  }
});

/**
 * PUT /api/articles/:id
 * Updates an existing article
 */
app.put('/api/articles/:id', (req: Request, res: Response) => {
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
 */
app.delete('/api/articles/:id', (req: Request, res: Response) => {
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
 */
app.post('/api/articles/:id/comments', (req: Request, res: Response) => {
  const articles = readArticles();
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    const newComment: Comment = {
      id: Date.now().toString(),
      author: req.body.author || 'Anonymous',
      content: req.body.content,
      createdAt: new Date().toISOString()
    };
    if (!articles[index].comments) {
      articles[index].comments = [];
    }
    articles[index].comments.push(newComment);
    writeArticles(articles);
    res.status(201).json(newComment);
  } else {
    res.status(404).json({ message: 'Article not found' });
  }
});

/**
 * Error handling middleware
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'An error occurred on the server' });
});

/**
 * Start the server
 */
app.listen(port, () => {
  console.log(`API server berjalan di http://localhost:${port}`);
});
