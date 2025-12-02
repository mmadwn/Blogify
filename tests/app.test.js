const request = require('supertest');
const app = require('../server');
const { readData, writeData } = require('../utils/db');

jest.mock('../utils/db');

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/articles', () => {
    it('should return all articles', async () => {
      const mockArticles = [
        { id: '1', title: 'Test Article 1', content: 'Content 1', createdAt: new Date().toISOString() },
        { id: '2', title: 'Test Article 2', content: 'Content 2', createdAt: new Date().toISOString() }
      ];
      readData.mockReturnValue(mockArticles);

      const res = await request(app).get('/api/articles');
      expect(res.statusCode).toEqual(200);
      expect(res.body.articles.length).toEqual(2);
      expect(res.body.articles[0].title).toEqual('Test Article 1');
    });

    it('should filter articles by search query', async () => {
        const mockArticles = [
            { id: '1', title: 'Apple Pie', content: 'Yummy', createdAt: new Date().toISOString() },
            { id: '2', title: 'Banana Split', content: 'Tasty', createdAt: new Date().toISOString() }
        ];
        readData.mockReturnValue(mockArticles);

        const res = await request(app).get('/api/articles?q=Apple');
        expect(res.statusCode).toEqual(200);
        expect(res.body.articles.length).toEqual(1);
        expect(res.body.articles[0].title).toEqual('Apple Pie');
    });
  });

  describe('POST /api/articles', () => {
    it('should create a new article', async () => {
      const mockArticles = [];
      readData.mockReturnValue(mockArticles);
      writeData.mockReturnValue(true);

      const newArticle = {
        title: 'New Article',
        author: 'Tester',
        category: 'Test',
        content: 'Test content'
      };

      const res = await request(app).post('/api/articles').send(newArticle);
      expect(res.statusCode).toEqual(201);
      expect(res.body.title).toEqual('New Article');
      expect(writeData).toHaveBeenCalled();
    });
  });

  describe('GET /api/articles/:id', () => {
      it('should return 404 if article not found', async () => {
          readData.mockReturnValue([]);
          const res = await request(app).get('/api/articles/999');
          expect(res.statusCode).toEqual(404);
      });

      it('should return the article if found', async () => {
          const mockArticle = { id: '1', title: 'Found', createdAt: new Date().toISOString() };
          readData.mockReturnValue([mockArticle]);
          const res = await request(app).get('/api/articles/1');
          expect(res.statusCode).toEqual(200);
          expect(res.body.title).toEqual('Found');
      });
  });
});
