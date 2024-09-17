const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const multer = require('multer');

const app = express();
const port = 3000;
const apiUrl = 'http://localhost:4000/api';

// Configure storage and file filter
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Debugging: Check if the API key is loaded correctly
dotenv.config();

// Middleware to set TinyMCE API key
app.use((req, res, next) => {
  res.locals.TINYMCE_API_KEY = process.env.TINYMCE_API_KEY;
  console.log('TinyMCE API Key:', res.locals.TINYMCE_API_KEY); // Debugging
  next();
});

app.get('/', async (req, res) => { // Remove 'page' from parameters
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Number of articles per page
    const response = await axios.get(`${apiUrl}/articles?page=${page}&limit=${limit}`);
    
    // Check if response.data has the expected structure
    if (!response.data || !response.data.articles) {
      throw new Error('Articles data not found in API response');
    }

    const { articles, totalPages, currentPage } = response.data;

    // Get trending posts
    const trendingResponse = await axios.get(`${apiUrl}/articles`);
    if (!trendingResponse.data || !trendingResponse.data.articles) {
      throw new Error('Trending articles data not found in API response');
    }
    const trendingPosts = trendingResponse.data.articles.slice(0, 3); // Get top 3 articles

    res.render('index', { 
      posts: articles, 
      currentPage,
      totalPages,
      title: 'Blogify - Inspiration Without Limits',
      trendingPosts // Add trendingPosts to render
    });
  } catch (error) {
    console.error('Error fetching articles:', error.message); // Display error message
    renderErrorWithSweetAlert(res, 'An error occurred while fetching articles: ' + error.message); // Display error message
  }
});

app.get('/create', async (req, res) => {
  try {
    const response = await axios.get(`${apiUrl}/articles`);
    const trendingPosts = response.data.slice(0, 3);
    res.render('create', { trendingPosts }); // Ensure trendingPosts is defined
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    res.render('create', { trendingPosts: [] }); // Still send trendingPosts even if empty
  }
});

// Modify route to create a new article
app.post('/create', upload.single('image'), async (req, res) => {
  console.log('Received form data:', req.body);
  console.log('Received file:', req.file);
  console.log('Received content:', req.body.content); // Log content from TinyMCE

  try {
    if (req.file) {
      // Validate image size
      const sizeOf = require('image-size');
      const dimensions = sizeOf(req.file.path);
      if (dimensions.width < 800 || dimensions.height < 600) {
        fs.unlinkSync(req.file.path); // Delete file if it doesn't meet requirements
        throw new Error('Image size must be at least 800x600 pixels');
      }
    }

    const articleData = {
      title: req.body.title,
      author: req.body.author,
      category: req.body.category,
      excerpt: req.body.excerpt,
      content: req.body.content,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      createdAt: new Date().toISOString()
    };

    const errors = validateArticleData(articleData);
    if (errors.length > 0) {
      return res.status(400).render('error', { message: errors.join(', ') });
    }

    console.log('Sending article data to API:', articleData);

    const response = await axios.post(`${apiUrl}/articles`, articleData);
    console.log('API response:', response.data);
    res.redirect('/'); // Redirect to the main page

  } catch (error) {
    console.error('Error creating article:', error);
    renderErrorWithSweetAlert(res, 'An error occurred while creating the article');
  }
});

app.get('/edit/:id', async (req, res) => {
  try {
    const response = await axios.get(`${apiUrl}/articles/${req.params.id}`);
    const post = response.data;
    res.render('edit', { post, trendingPosts: [] }); // Add trendingPosts if needed
  } catch (error) {
    console.error('Error fetching article for edit:', error);
    res.redirect('/');
  }
});

app.post('/edit/:id', upload.single('image'), async (req, res) => {
  console.log('Received form data for edit:', req.body);
  console.log('Received file for edit:', req.file);

  try {
    // Validate image if present
    if (req.file) {
      const sizeOf = require('image-size');
      const dimensions = sizeOf(req.file.path);
      if (dimensions.width < 800 || dimensions.height < 600) {
        fs.unlinkSync(req.file.path);
        throw new Error('Minimum image size must be 800x600 pixels');
      }
    }

    // Delete old image if a new image is uploaded
    if (req.file && req.body.currentImage) {
      const oldImagePath = path.join(__dirname, 'public', req.body.currentImage);
      fs.unlink(oldImagePath, (err) => {
        if (err) console.error('Error deleting old image:', err);
      });
    }

    const articleData = {
      title: req.body.title,
      author: req.body.author,
      category: req.body.category,
      excerpt: req.body.excerpt,
      content: req.body.content,
      image: req.file ? `/uploads/${req.file.filename}` : req.body.currentImage,
    };

    const errors = validateArticleData(articleData);
    if (errors.length > 0) {
      return res.status(400).render('error', { message: errors.join(', ') });
    }

    console.log('Sending updated article data to API:', articleData);

    const response = await axios.put(`${apiUrl}/articles/${req.params.id}`, articleData);
    console.log('API response for edit:', response.data);
    res.redirect('/');

  } catch (error) {
    console.error('Error updating article:', error);
    renderErrorWithSweetAlert(res, 'An error occurred while updating the article');
  }
});

app.post('/delete/:id', async (req, res) => {
  try {
    await axios.delete(`${apiUrl}/articles/${req.params.id}`);
    res.redirect('/');
  } catch (error) {
    console.error('Error deleting article:', error);
    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
      res.status(500).send('Unable to connect to the API server');
    } else {
      res.status(500).send('An error occurred while deleting the article');
    }
  }
});

app.get('/article/:id', async (req, res) => {
  console.log(`Attempting to fetch article with id: ${req.params.id}`);
  try {
    const articleResponse = await axios.get(`${apiUrl}/articles/${req.params.id}`);
    const trendingResponse = await axios.get(`${apiUrl}/articles`);
    
    console.log('Article data:', articleResponse.data);
    const article = articleResponse.data;
    const trendingPosts = trendingResponse.data.articles.slice(0, 3); // Ensure trendingPosts is defined
    
    if (!article) {
      throw new Error('Article not found');
    }
    
    res.render('article', { article, trendingPosts, title: article.title });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(404).render('error', { message: 'Article not found' });
  }
});

app.listen(port, () => {
  console.log(`Blogify running at http://localhost:${port}`);
});

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