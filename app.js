const dotenv = require('dotenv'); // Load environment variables from .env file
const express = require('express'); // Import Express framework
const bodyParser = require('body-parser'); // Middleware for parsing request bodies
const path = require('path'); // Node.js path module for handling file paths
const axios = require('axios'); // Promise-based HTTP client for making requests
const multer = require('multer'); // Middleware for handling multipart/form-data, used for file uploads

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
const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error('Only image files are allowed!'), false); // Reject the file
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

// Load environment variables from .env file
dotenv.config();

// Middleware to set TinyMCE API key in response locals
app.use((req, res, next) => {
  res.locals.TINYMCE_API_KEY = process.env.TINYMCE_API_KEY; // Set API key for TinyMCE
  // console.log('TinyMCE API Key:', res.locals.TINYMCE_API_KEY); // Debugging: Log the API key (remove in production)
  next();
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack trace
  renderErrorWithSweetAlert(res, 'An unexpected error occurred.'); // Render error page
});

// Fetch trending posts helper function
const fetchTrendingPosts = async () => {
  const response = await axios.get(`${apiUrl}/articles`); // Fetch articles from the API
  return response.data.articles.slice(0, 3); // Get top 3 articles
};

// Route to render the home page
app.get('/', async (req, res) => { // Remove 'page' from parameters
  try {
    const page = parseInt(req.query.page) || 1; // Get the current page from query parameters
    const limit = 10; // Number of articles per page
    const response = await axios.get(`${apiUrl}/articles?page=${page}&limit=${limit}`); // Fetch articles from the API
    
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
      trendingPosts // Add trendingPosts to render
    });
  } catch (error) {
    // console.error('Error fetching articles:', error.message); // Log error message (remove in production)
    renderErrorWithSweetAlert(res, 'An error occurred while fetching articles: ' + error.message); // Render error page
  }
});

// Route to render the create article page
app.get('/create', async (req, res) => {
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
app.post('/create', upload.single('image'), async (req, res) => {
  // console.log('Received form data:', req.body); // Log received form data (remove in production)
  // console.log('Received file:', req.file); // Log received file (remove in production)
  // console.log('Received content:', req.body.content); // Log content from TinyMCE (remove in production)

  try {
    if (req.file) {
      // Validate image size
      const sizeOf = require('image-size'); // Import image-size module
      const dimensions = sizeOf(req.file.path); // Get dimensions of the uploaded image
      if (dimensions.width < 800 || dimensions.height < 600) {
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
app.get('/edit/:id', async (req, res) => {
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
app.post('/edit/:id', upload.single('image'), async (req, res) => {
  // console.log('Received form data for edit:', req.body); // Log received form data (remove in production)
  // console.log('Received file for edit:', req.file); // Log received file (remove in production)

  try {
    // Validate image if present
    if (req.file) {
      const sizeOf = require('image-size'); // Import image-size module
      const dimensions = sizeOf(req.file.path); // Get dimensions of the uploaded image
      if (dimensions.width < 800 || dimensions.height < 600) {
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
app.post('/delete/:id', async (req, res) => {
  try {
    await axios.delete(`${apiUrl}/articles/${req.params.id}`); // Delete article via API
    res.redirect('/'); // Redirect to the main page
  } catch (error) {
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
app.get('/article/:id', async (req, res) => {
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

// Start the server
app.listen(port, () => {
  // console.log(`Blogify running at http://localhost:${port}`); // Log server start message (remove in production)
});

// Function to render error page with SweetAlert
function renderErrorWithSweetAlert(res, message) {
    res.render('error', { 
        message,
        sweetAlert: {
            icon: 'error',
            title: 'Oops...',
            text: message
        }
    });
}