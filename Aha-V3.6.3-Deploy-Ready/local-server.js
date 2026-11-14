import app from './server.js';
const port = Number(process.env.PORT || process.env.API_PORT || 3001);
app.listen(port, '0.0.0.0', () => {
  console.log(`Aha! ${process.env.NODE_ENV === 'production' ? 'website + API' : 'API'} listening on port ${port}`);
});
