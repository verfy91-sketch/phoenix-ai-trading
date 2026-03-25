import App from './app';

console.log("🚀 NEW BUILD DEPLOYED");

// Global error logging - catch ALL errors
process.on("uncaughtException", (err: Error) => {
  console.error("🔥 UNCAUGHT EXCEPTION:", err);
  console.error("🔥 EXCEPTION DETAILS:", {
    message: err?.message,
    stack: err?.stack,
    name: err?.name
  });
});

process.on("unhandledRejection", (err: any) => {
  console.error("🔥 UNHANDLED REJECTION:", err);
  if (err && typeof err === 'object') {
    console.error("🔥 REJECTION DETAILS:", {
      message: err.message || 'Unknown error',
      stack: err.stack || 'No stack trace',
      name: err.name || 'Unknown error type'
    });
  } else {
    console.error("🔥 REJECTION DETAILS:", err);
  }
});

const app = new App();

// Start the server
app.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
