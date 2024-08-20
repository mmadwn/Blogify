const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 4000;

app.use(cors());
app.use(bodyParser.json());

let articles = [
  {
    id: '1',
    title: 'Perkembangan Terbaru dalam Teknologi AI',
    author: 'John Doe',
    category: 'teknologi',
    image: 'https://images.unsplash.com/photo-1625314868143-20e93ce3ff33?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    content: 'Artificial Intelligence (AI) terus berkembang pesat dalam beberapa tahun terakhir. Artikel ini membahas inovasi terbaru dalam bidang AI dan dampaknya terhadap berbagai industri.',
    createdAt: '2023-06-01T10:00:00Z'
  },
  {
    id: '2',
    title: 'Tips Hidup Sehat di Era Digital',
    author: 'Jane Smith',
    category: 'kesehatan',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    content: 'Di era digital ini, menjaga kesehatan menjadi tantangan tersendiri. Simak tips-tips praktis untuk tetap sehat dan bugar di tengah gempuran teknologi.',
    createdAt: '2023-06-02T14:30:00Z'
  },
  {
    id: '3',
    title: 'Tren Fashion Musim Panas 2023',
    author: 'Alice Johnson',
    category: 'gaya-hidup',
    image: 'https://images.unsplash.com/photo-1623288516140-47a0a17cec7c?q=80&w=1360&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    content: 'Musim panas sudah di depan mata. Ketahui tren fashion terbaru untuk musim panas 2023 dan tampil stylish sepanjang musim.',
    createdAt: '2023-06-03T09:15:00Z'
  },
  {
    id: '4',
    title: 'Strategi Bisnis di Era Post-Pandemic',
    author: 'Bob Williams',
    category: 'bisnis',
    image: 'https://images.unsplash.com/photo-1665686308827-eb62e4f6604d?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    content: 'Pandemi telah mengubah lanskap bisnis secara signifikan. Pelajari strategi-strategi baru untuk mengembangkan bisnis Anda di era pasca pandemi.',
    createdAt: '2023-06-04T11:45:00Z'
  }
];

app.get('/api/articles', (req, res) => {
  res.json(articles);
});

app.post('/api/articles', (req, res) => {
  const newArticle = {
    id: Date.now().toString(),
    ...req.body
  };
  articles.push(newArticle);
  res.status(201).json(newArticle);
});

app.get('/api/articles/:id', (req, res) => {
  const article = articles.find(a => a.id === req.params.id);
  if (article) {
    res.json(article);
  } else {
    res.status(404).json({ message: 'Artikel tidak ditemukan' });
  }
});

app.put('/api/articles/:id', (req, res) => {
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    articles[index] = { ...articles[index], ...req.body };
    res.json(articles[index]);
  } else {
    res.status(404).json({ message: 'Artikel tidak ditemukan' });
  }
});

app.delete('/api/articles/:id', (req, res) => {
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    articles.splice(index, 1);
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'Artikel tidak ditemukan' });
  }
});

app.listen(port, () => {
  console.log(`API server berjalan di http://localhost:${port}`);
});