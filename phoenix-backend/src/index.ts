import App from './app';

// Global error safety - prevent unhandled promise crashes
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
  // Don't exit - log and continue
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  // Don't exit immediately - try graceful shutdown
  process.exit(1);
});

const app = new App();

// Start the server
app.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
