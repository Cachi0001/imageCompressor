import app from './app';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Image Optimization Service running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
