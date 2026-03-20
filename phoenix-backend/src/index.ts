import App from './app';

const app = new App();

// Start the server
app.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
