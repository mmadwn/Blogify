const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const multer = require('multer');

const app = express();
const port = 3000;
const apiUrl = 'http://localhost:4000/api';

const upload = multer({ dest: 'public/uploads/' });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get('/', async (req, res) => {
  try {
    const response = await axios.get(`${apiUrl}/articles`);
    const posts = response.data;
    const trendingPosts = posts.slice(0, 3); // Ambil 3 post pertama sebagai trending
    res.render('index', { posts, trendingPosts });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.render('index', { posts: [], trendingPosts: [] });
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

app.post('/create', upload.single('image'), async (req, res) => {
  try {
    const articleData = {
      ...req.body,
      image: req.file ? `/uploads/${req.file.filename}` : null
    };
    await axios.post(`${apiUrl}/articles`, articleData);
    res.redirect('/');
  } catch (error) {
    console.error('Error creating article:', error);
    res.redirect('/');
  }
});

app.get('/edit/:id', async (req, res) => {
  try {
    const [postResponse, trendingResponse] = await Promise.all([
      axios.get(`${apiUrl}/articles/${req.params.id}`),
      axios.get(`${apiUrl}/articles`)
    ]);
    const post = postResponse.data;
    const trendingPosts = trendingResponse.data.slice(0, 3);
    res.render('edit', { post, trendingPosts });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.redirect('/');
  }
});

app.post('/edit/:id', upload.single('image'), async (req, res) => {
  try {
    const articleData = {
      ...req.body,
      image: req.file ? `/uploads/${req.file.filename}` : req.body.currentImage
    };
    await axios.put(`${apiUrl}/articles/${req.params.id}`, articleData);
    res.redirect('/');
  } catch (error) {
    console.error('Error updating article:', error);
    res.redirect('/');
  }
});

app.post('/delete/:id', async (req, res) => {
  try {
    await axios.delete(`${apiUrl}/articles/${req.params.id}`);
    res.redirect('/');
  } catch (error) {
    console.error('Error deleting article:', error);
    res.redirect('/');
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});