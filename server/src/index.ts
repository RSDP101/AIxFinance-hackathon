import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import { setupOkxProxy } from './ws/okxProxy';
import { setupNewsServer } from './ws/newsServer';
import marketRoutes from './routes/market';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', marketRoutes);

const server = http.createServer(app);

const marketWss = new WebSocketServer({ noServer: true });
setupOkxProxy(marketWss);

const newsWss = new WebSocketServer({ noServer: true });
setupNewsServer(newsWss);

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;
  if (pathname === '/ws/market') {
    marketWss.handleUpgrade(request, socket, head, (ws) => {
      marketWss.emit('connection', ws, request);
    });
  } else if (pathname === '/ws/news') {
    newsWss.handleUpgrade(request, socket, head, (ws) => {
      newsWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`AIx Terminal server on http://localhost:${PORT}`);
});
