import express from 'express';
import handleApiRequest from './api-handler.js';

const app = express();

app.use(express.json({ limit: '100kb' }));
app.use((req, res) => handleApiRequest(req, res));
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  return next(error);
});

export default app;
