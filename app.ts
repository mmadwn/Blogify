import dotenv from 'dotenv'; // Load environment variables from .env file
import express, { Request, Response, NextFunction } from 'express'; // Import Express framework
import bodyParser from 'body-parser'; // Middleware for parsing request bodies
import path from 'path'; // Node.js path module for handling file paths
import axios from 'axios'; // Promise-based HTTP client for making requests
import multer from 'multer'; // Middleware for handling multipart/form-data, used for file uploads
import session from 'express-session'; // Middleware for session management
import imageSize from 'image-size'; // Import image-size module
import fs from 'fs';

// Extend Session Data interface to include user
declare module 'express-session' {
  interface SessionData {
    user: { [key: string]: any };
  }
}

const app = express(); // Create an Express application
const port = 3000; // Define the port for the server
const apiUrl = 'http://localhost:4000/api'; // Base URL for the API

// Configure storage and file filter for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/'); // Set the destination for uploaded files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); // Create a unique filename
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)); // Set the filename
  }
});

// File filter to only accept image files
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error('Only image files are allowed!')); // Reject the file
  }
};

// Initialize multer with storage and file filter settings
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  }
});

// Middleware to parse URL-encoded and JSON request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from the public directory
app.set('view engine', 'ejs'); // Set EJS as the templating engine

// Session setup
app.use(session({
  secret: 'secret-key', // Change this in production
  resave: false,
  saveUninitialized: true
}));

// Middleware to make session available to views
app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.user = req.session.user;
  next();
});

// Authentication Middleware
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Validation function
function validateArticleData(data: any) {
  const errors: string[] = [];
  if (!data.title || data.title.trim() === '') {
    errors.push('Title is required');
  }
  if (!data.author || data.author.trim() === '') {
    errors.push('Author is required');
  }
  if (!data.category || data.category.trim() === '') {
    errors.push('Category is required');
  }
  if (!data.content || data.content.trim() === '') {
    errors.push('Content is required');
  }
  return errors;
}

// Load environment variables from .env file
dotenv.config();

// Middleware to set TinyMCE API key in response locals
app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.TINYMCE_API_KEY = process.env.TINYMCE_API_KEY; // Set API key for TinyMCE
  // console.log('TinyMCE API Key:', res.locals.TINYMCE_API_KEY); // Debugging: Log the API key (remove in production)
  next();
});

// Centralized error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack); // Log the error stack trace
  renderErrorWithSweetAlert(res, 'An unexpected error occurred.'); // Render error page
});

// Fetch trending posts helper function
const fetchTrendingPosts = async () => {
  const response = await axios.get(`${apiUrl}/articles`); // Fetch articles from the API
  return response.data.articles.slice(0, 3); // Get top 3 articles
};

// Route to render the home page
app.get('/', async (req: Request, res: Response) => { // Remove 'page' from parameters
  try {
    const page = parseInt(req.query.page as string) || 1; // Get the current page from query parameters
    const limit = 10; // Number of articles per page
    const search = req.query.search || '';
    const response = await axios.get(`${apiUrl}/articles?page=${page}&limit=${limit}&search=${search}`); // Fetch articles from the API
    
    // Check if response.data has the expected structure
    if (!response.data || !response.data.articles) {
      throw new Error('Articles data not found in API response'); // Throw error if data is not found
    }

    const { articles, totalPages, currentPage } = response.data; // Destructure articles and pagination info

    // Get trending posts
    const trendingPosts = await fetchTrendingPosts(); // Use helper function

    res.render('index', { 
      posts: articles, 
      currentPage,
      totalPages,
      title: 'Blogify - Inspiration Without Limits',
      trendingPosts, // Add trendingPosts to render
      search, // Pass search query to view
      currentCategory: null // No category selected
    });
  } catch (error: any) {
    // console.error('Error fetching articles:', error.message); // Log error message (remove in production)
    renderErrorWithSweetAlert(res, 'An error occurred while fetching articles: ' + error.message); // Render error page
  }
});

// Route to render posts by category
app.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const category = req.params.category;

    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;

    // We search by category using the existing search endpoint
    const response = await axios.get(`${apiUrl}/articles?page=${page}&limit=${limit}&search=${category}`);

    if (!response.data || !response.data.articles) {
       throw new Error('Articles data not found in API response');
    }

    const { articles, totalPages, currentPage } = response.data;
    const trendingPosts = await fetchTrendingPosts();

    res.render('index', {
      posts: articles,
      currentPage,
      totalPages,
      title: `Category: ${category} - Blogify`,
      trendingPosts,
      search: '',
      currentCategory: category
    });
  } catch (error: any) {
    renderErrorWithSweetAlert(res, 'An error occurred while fetching category articles: ' + error.message);
  }
});

app.get('/category/:category/:subcategory', async (req: Request, res: Response) => {
   const subcategory = req.params.subcategory;
   res.redirect(`/category/${subcategory}`);
});


// Login Route
app.get('/login', (req: Request, res: Response) => {
  res.render('login', { trendingPosts: [] });
});

app.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    req.session.user = { username: 'admin' };
    res.redirect('/');
  } else {
    res.render('login', { trendingPosts: [], error: 'Invalid credentials' });
  }
});

// Logout Route
app.get('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) console.error('Error destroying session:', err);
    res.redirect('/');
  });
});

// Route to render the create article page
app.get('/create', requireAuth, async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${apiUrl}/articles`); // Fetch articles for trending posts
    const trendingPosts = response.data.slice(0, 3); // Get top 3 trending posts
    res.render('create', { trendingPosts }); // Render create page with trending posts
  } catch (error) {
    console.error('Error fetching trending posts:', error); // Log error (remove in production)
    res.render('create', { trendingPosts: [] }); // Render create page with empty trending posts
  }
});

// Route to create a new article
app.post('/create', requireAuth, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (req.file) {
      // Validate image size
      const dimensions = imageSize(req.file.path); // Get dimensions of the uploaded image
      if (dimensions.width && dimensions.height && (dimensions.width < 800 || dimensions.height < 600)) {
        fs.unlinkSync(req.file.path); // Delete file if it doesn't meet requirements
        throw new Error('Image size must be at least 800x600 pixels'); // Throw error if size is invalid
      }
    }

    const articleData = {
      title: req.body.title,
      author: req.body.author,
      category: req.body.category,
      excerpt: req.body.excerpt,
      content: req.body.content,
      image: req.file ? `/uploads/${req.file.filename}` : null, // Set image path if file is uploaded
      createdAt: new Date().toISOString() // Set creation date
    };

    const errors = validateArticleData(articleData); // Validate article data
    if (errors.length > 0) {
      return res.status(400).render('error', { message: errors.join(', ') }); // Render error if validation fails
    }

    // console.log('Sending article data to API:', articleData); // Log article data being sent (remove in production)

    const response = await axios.post(`${apiUrl}/articles`, articleData); // Send article data to API
    // console.log('API response:', response.data); // Log API response (remove in production)
    res.redirect('/'); // Redirect to the main page

  } catch (error) {
    // console.error('Error creating article:', error); // Log error (remove in production)
    renderErrorWithSweetAlert(res, 'An error occurred while creating the article'); // Render error page
  }
});

// Route to render the edit article page
app.get('/edit/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${apiUrl}/articles/${req.params.id}`); // Fetch article by ID
    const post = response.data; // Get article data
    res.render('edit', { post, trendingPosts: [] }); // Render edit page with article data
  } catch (error) {
    console.error('Error fetching article for edit:', error); // Log error (remove in production)
    res.redirect('/'); // Redirect to home if error occurs
  }
});

// Route to update an existing article
app.post('/edit/:id', requireAuth, upload.single('image'), async (req: Request, res: Response) => {
  try {
    // Validate image if present
    if (req.file) {
      const dimensions = imageSize(req.file.path); // Get dimensions of the uploaded image
      if (dimensions.width && dimensions.height && (dimensions.width < 800 || dimensions.height < 600)) {
        fs.unlinkSync(req.file.path); // Delete file if it doesn't meet requirements
        throw new Error('Minimum image size must be 800x600 pixels'); // Throw error if size is invalid
      }
    }

    // Delete old image if a new image is uploaded
    if (req.file && req.body.currentImage) {
      const oldImagePath = path.join(__dirname, 'public', req.body.currentImage); // Get path of old image
      fs.unlink(oldImagePath, (err) => {
        if (err) console.error('Error deleting old image:', err); // Log error if deletion fails (remove in production)
      });
    }

    const articleData = {
      title: req.body.title,
      author: req.body.author,
      category: req.body.category,
      excerpt: req.body.excerpt,
      content: req.body.content,
      image: req.file ? `/uploads/${req.file.filename}` : req.body.currentImage, // Set image path
    };

    const errors = validateArticleData(articleData); // Validate article data
    if (errors.length > 0) {
      return res.status(400).render('error', { message: errors.join(', ') }); // Render error if validation fails
    }

    // console.log('Sending updated article data to API:', articleData); // Log updated article data (remove in production)

    const response = await axios.put(`${apiUrl}/articles/${req.params.id}`, articleData); // Update article via API
    // console.log('API response for edit:', response.data); // Log API response (remove in production)
    res.redirect('/'); // Redirect to the main page

  } catch (error) {
    // console.error('Error updating article:', error); // Log error (remove in production)
    renderErrorWithSweetAlert(res, 'An error occurred while updating the article'); // Render error page
  }
});

// Route to delete an article
app.post('/delete/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await axios.delete(`${apiUrl}/articles/${req.params.id}`); // Delete article via API
    res.redirect('/'); // Redirect to the main page
  } catch (error: any) {
    // console.error('Error deleting article:', error); // Log error (remove in production)
    if (error.response) {
      res.status(error.response.status).send(error.response.data); // Send error response if available
    } else if (error.request) {
      res.status(500).send('Unable to connect to the API server'); // Handle request error
    } else {
      res.status(500).send('An error occurred while deleting the article'); // Handle general error
    }
  }
});

// Route to fetch and render a single article
app.get('/article/:id', async (req: Request, res: Response) => {
  // console.log(`Attempting to fetch article with id: ${req.params.id}`); // Log article ID being fetched (remove in production)
  try {
    const articleResponse = await axios.get(`${apiUrl}/articles/${req.params.id}`); // Fetch article by ID
    const trendingResponse = await axios.get(`${apiUrl}/articles`); // Fetch trending articles
    
    // console.log('Article data:', articleResponse.data); // Log article data (remove in production)
    const article = articleResponse.data; // Get article data
    const trendingPosts = trendingResponse.data.articles.slice(0, 3); // Get top 3 trending posts
    
    if (!article) {
      throw new Error('Article not found'); // Throw error if article is not found
    }
    
    res.render('article', { article, trendingPosts, title: article.title }); // Render article page
  } catch (error) {
    // console.error('Error fetching article:', error); // Log error (remove in production)
    res.status(404).render('error', { message: 'Article not found' }); // Render error page if article not found
  }
});

// Route to add a comment
app.post('/article/:id/comment', async (req: Request, res: Response) => {
  try {
    const commentData = {
      author: req.body.author,
      content: req.body.content
    };
    await axios.post(`${apiUrl}/articles/${req.params.id}/comments`, commentData);
    res.redirect(`/article/${req.params.id}`);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.redirect(`/article/${req.params.id}`);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Blogify running at http://localhost:${port}`); // Log server start message (remove in production)
});

// Function to render error page with SweetAlert
function renderErrorWithSweetAlert(res: Response, message: string) {
    res.render('error', { 
        message,
        sweetAlert: {
            icon: 'error',
            title: 'Oops...',
            text: message
        }
    });
}
