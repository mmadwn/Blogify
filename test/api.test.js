const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { expect } = require('chai');

// We need to modify server.js to export the app, or we can just mock it here if we want to test the logic.
// However, since server.js starts the server immediately, importing it might be tricky.
// A better approach for now is to create a test version of the app or refactor server.js to export app.

// Let's assume we can refactor server.js slightly to be testable.
// But first, let's try to run the server in the background and test against the running port,
// OR we can refactor server.js to export app.

// Refactoring server.js to export app is the best practice.
// I will modify server.js to export app and only listen if require.main === module

const app = require('../server'); // This assumes we will refactor server.js

describe('API Endpoints', () => {
  let createdArticleId;
  const DATA_FILE = path.join(__dirname, '../data/articles.json');
  let originalData;

  // Backup data before tests
  before((done) => {
    try {
        originalData = fs.readFileSync(DATA_FILE, 'utf8');
    } catch (err) {
        originalData = '[]';
    }
    done();
  });

  // Restore data after tests
  after((done) => {
    fs.writeFileSync(DATA_FILE, originalData);
    done();
  });

  describe('GET /api/articles', () => {
    it('should return a list of articles', (done) => {
      request(app)
        .get('/api/articles')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('articles');
          expect(res.body.articles).to.be.an('array');
          done();
        });
    });
  });

  describe('POST /api/articles', () => {
    it('should create a new article', (done) => {
      const newArticle = {
        title: 'Test Article',
        author: 'Test Author',
        category: 'Test Category',
        excerpt: 'Test Excerpt',
        content: 'Test Content'
      };

      request(app)
        .post('/api/articles')
        .send(newArticle)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('id');
          createdArticleId = res.body.id;
          expect(res.body.title).to.equal(newArticle.title);
          done();
        });
    });
  });

  describe('GET /api/articles/:id', () => {
    it('should return the created article', (done) => {
      request(app)
        .get(`/api/articles/${createdArticleId}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.id).to.equal(createdArticleId);
          done();
        });
    });
  });

  describe('POST /api/articles/:id/comments', () => {
      it('should add a comment to the article', (done) => {
          const comment = {
              name: 'Test Commenter',
              text: 'This is a test comment'
          };

          request(app)
            .post(`/api/articles/${createdArticleId}/comments`)
            .send(comment)
            .expect(201)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body.name).to.equal(comment.name);
                expect(res.body.text).to.equal(comment.text);
                done();
            });
      });
  });

  describe('DELETE /api/articles/:id', () => {
    it('should delete the created article', (done) => {
      request(app)
        .delete(`/api/articles/${createdArticleId}`)
        .expect(204, done);
    });
  });
});
