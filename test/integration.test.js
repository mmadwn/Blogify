const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { exec } = require('child_process');

// Helper to reset data
const resetData = () => {
    const dummyData = require('../data/dummyData');
    const dataPath = path.join(__dirname, '../data', 'articles.json');
    const articles = dummyData.map(a => ({ ...a, comments: [] }));
    fs.writeFileSync(dataPath, JSON.stringify(articles, null, 2));
};

describe('Blogify API Integration Tests', () => {
    const apiUrl = 'http://localhost:4000/api';

    before(function(done) {
        // Ensure server is running. In a real CI, we might start it here.
        // For this env, we assume it's running via `npm run dev` in background.
        // We'll just reset data.
        resetData();
        setTimeout(done, 1000); // Wait for restart if nodemon triggers
    });

    after(function() {
         resetData();
    });

    it('should fetch all articles', async () => {
        const res = await axios.get(`${apiUrl}/articles`);
        expect(res.status).to.equal(200);
        expect(res.data.articles).to.be.an('array');
        expect(res.data.articles.length).to.be.at.least(4);
    });

    it('should search articles', async () => {
        const res = await axios.get(`${apiUrl}/articles?search=AI`);
        expect(res.status).to.equal(200);
        expect(res.data.articles).to.be.an('array');
        expect(res.data.articles[0].title).to.include('AI');
    });

    it('should create a new article', async () => {
        const newArticle = {
            title: 'Test Article',
            author: 'Tester',
            category: 'testing',
            content: 'This is a test article content that is long enough.',
            excerpt: 'Test excerpt',
            image: null
        };
        const res = await axios.post(`${apiUrl}/articles`, newArticle);
        expect(res.status).to.equal(201);
        expect(res.data.title).to.equal(newArticle.title);
        expect(res.data.id).to.exist;
    });

    it('should add a comment to an article', async () => {
        const comment = {
            name: 'Commenter',
            email: 'commenter@example.com',
            content: 'Nice post!'
        };
        const res = await axios.post(`${apiUrl}/articles/1/comments`, comment);
        expect(res.status).to.equal(201);
        expect(res.data.name).to.equal(comment.name);

        // Verify comment is in article
        const articleRes = await axios.get(`${apiUrl}/articles/1`);
        expect(articleRes.data.comments).to.be.an('array');
        const addedComment = articleRes.data.comments.find(c => c.content === comment.content);
        expect(addedComment).to.exist;
    });
});
