import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:4000/api/articles';
const TEST_FILE = path.join(__dirname, '../data/articles.json');

// Function to reset data before tests
function resetData() {
  const initialData = [
    {
      id: '1',
      title: 'Test Article 1',
      content: 'Content 1',
      category: 'test',
      author: 'Tester',
      createdAt: new Date().toISOString(),
      views: 0,
      comments: []
    }
  ];
  fs.writeFileSync(TEST_FILE, JSON.stringify(initialData, null, 2));
}

async function runTests() {
  console.log('Starting tests...');

  // Reset data
  resetData();

  try {
    // Test GET /articles
    console.log('Testing GET /articles...');
    let res = await axios.get(API_URL);
    if (res.data.articles.length !== 1) throw new Error('Expected 1 article');
    console.log('GET /articles passed');

    // Test POST /articles
    console.log('Testing POST /articles...');
    const newArticle = {
      title: 'New Article',
      content: 'New Content',
      category: 'test',
      author: 'Tester'
    };
    res = await axios.post(API_URL, newArticle);
    if (res.status !== 201) throw new Error('Expected 201 Created');
    if (res.data.title !== newArticle.title) throw new Error('Title mismatch');
    const newArticleId = res.data.id;
    console.log('POST /articles passed');

    // Test GET /articles?search=...
    console.log('Testing GET /articles?search=...');
    res = await axios.get(`${API_URL}?search=New`);
    if (res.data.articles.length !== 1) throw new Error('Expected 1 search result');
    if (res.data.articles[0].id !== newArticleId) throw new Error('Wrong search result');
    console.log('GET /articles?search=... passed');

    // Test POST /articles/:id/comments
    console.log('Testing POST /articles/:id/comments...');
    const comment = {
      author: 'Commenter',
      content: 'Nice post!'
    };
    res = await axios.post(`${API_URL}/${newArticleId}/comments`, comment);
    if (res.status !== 201) throw new Error('Expected 201 Created for comment');
    console.log('POST /articles/:id/comments passed');

    // Verify comment persistence AND view increment
    console.log('Testing view increment and comment persistence...');
    res = await axios.get(`${API_URL}/${newArticleId}`);
    if (res.data.comments.length !== 1) throw new Error('Expected 1 comment');
    if (res.data.comments[0].content !== comment.content) throw new Error('Comment content mismatch');

    // View count should be at least 1 (the current request)
    // Actually, each GET increments it.
    // When we created it, views was 0.
    // We just did a GET. So views should be 1.
    if (res.data.views < 1) throw new Error('Expected views to increment');

    console.log('Comment persistence and View increment passed');

    console.log('All tests passed!');
  } catch (error: any) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

runTests();
