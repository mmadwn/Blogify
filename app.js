require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const multer = require('multer');

const app = express();
const port = 3000;
const apiUrl = 'http://localhost:4000/api';

// Konfigurasi penyimpanan dan filter file
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
  // Cek tipe file
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diizinkan!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Batasi ukuran file menjadi 5MB
  }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Hapus middleware untuk memeriksa localStorage karena tidak diperlukan di sisi server
app.use((req, res, next) => {
  res.locals.TINYMCE_API_KEY = process.env.TINYMCE_API_KEY;
  next();
});

app.get('/', async (req, page, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Jumlah artikel per halaman
    const response = await axios.get(`${apiUrl}/articles?page=${page}&limit=${limit}`);
    const { articles, totalPages, currentPage } = response.data;
    res.render('index', { 
      posts: articles, 
      currentPage,
      totalPages,
      title: 'Blogify - Inspirasi Tanpa Batas'
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    renderErrorWithSweetAlert(res, 'Terjadi kesalahan saat mengambil artikel');
  }
});

app.get('/create', async (req, res) => {
  try {
    const response = await axios.get(`${apiUrl}/articles`);
    const trendingPosts = response.data.slice(0, 3);
    res.render('create', { trendingPosts });
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    res.render('create', { trendingPosts: [] });
  }
});

// Modifikasi route untuk membuat artikel baru
app.post('/create', upload.single('image'), async (req, res) => {
  console.log('Received form data:', req.body);
  console.log('Received file:', req.file);
  console.log('Received content:', req.body.content); // Log konten dari TinyMCE

  try {
    if (req.file) {
      // Validasi ukuran gambar
      const sizeOf = require('image-size');
      const dimensions = sizeOf(req.file.path);
      if (dimensions.width < 800 || dimensions.height < 600) {
        fs.unlinkSync(req.file.path); // Hapus file jika tidak memenuhi syarat
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
    res.redirect('/'); // Ganti dengan redirect ke halaman utama

  } catch (error) {
    console.error('Error creating article:', error);
    renderErrorWithSweetAlert(res, 'Terjadi kesalahan saat membuat artikel');
  }
});

app.get('/edit/:id', async (req, res) => {
  try {
    const response = await axios.get(`${apiUrl}/articles/${req.params.id}`);
    const post = response.data;
    res.render('edit', { post, trendingPosts: [] }); // Tambahkan trendingPosts jika diperlukan
  } catch (error) {
    console.error('Error fetching article for edit:', error);
    res.redirect('/');
  }
});

app.post('/edit/:id', upload.single('image'), async (req, res) => {
  console.log('Received form data for edit:', req.body);
  console.log('Received file for edit:', req.file);

  try {
    // Validasi gambar jika ada
    if (req.file) {
      const sizeOf = require('image-size');
      const dimensions = sizeOf(req.file.path);
      if (dimensions.width < 800 || dimensions.height < 600) {
        fs.unlinkSync(req.file.path);
        throw new Error('Ukuran gambar minimal harus 800x600 piksel');
      }
    }

    // Hapus gambar lama jika ada gambar baru
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
    renderErrorWithSweetAlert(res, 'Terjadi kesalahan saat memperbarui artikel');
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
      res.status(500).send('Tidak dapat terhubung ke server API');
    } else {
      res.status(500).send('Terjadi kesalahan saat menghapus artikel');
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
    const trendingPosts = trendingResponse.data.articles.slice(0, 3);
    
    if (!article) {
      throw new Error('Article not found');
    }
    
    res.render('article', { article, trendingPosts, title: article.title });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(404).render('error', { message: 'Artikel tidak ditemukan' });
  }
});

app.listen(port, () => {
  console.log(`Blogify berjalan di http://localhost:${port}`);
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