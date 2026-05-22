import 'dotenv/config';
import http from 'http';
import connectDB from './config/db';
import app from './app';
import { initSocket } from './socket';

const server = http.createServer(app);
initSocket(server);

connectDB().then(() => {
  const PORT = process.env.PORT ?? 5000;
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});
