const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

const streams = new Map();

io.on('connection', (socket) => {
  console.log('A user connected', socket.id);

  socket.on('create', (streamId) => {
    if (streams.has(streamId)) {
      socket.emit('error', 'Stream ID already exists');
    } else {
      streams.set(streamId, socket.id);
      socket.join(streamId);
      console.log(`Stream created: ${streamId}`);
      socket.emit('created', streamId);
    }
  });

  socket.on('join', (streamId) => {
    if (streams.has(streamId)) {
      socket.join(streamId);
      socket.to(streams.get(streamId)).emit('viewer', socket.id);
      console.log(`User joined stream: ${streamId}`);
    } else {
      socket.emit('error', 'Stream not found');
    }
  });

  socket.on('offer', (to, offer) => {
    socket.to(to).emit('offer', socket.id, offer);
  });

  socket.on('answer', (to, answer) => {
    socket.to(to).emit('answer', socket.id, answer);
  });

  socket.on('icecandidate', (to, candidate) => {
    socket.to(to).emit('icecandidate', socket.id, candidate);
  });

  socket.on('disconnect', () => {
    streams.forEach((value, key) => {
      if (value === socket.id) {
        streams.delete(key);
        io.to(key).emit('broadcasterLeft');
      }
    });
    console.log('A user disconnected', socket.id);
  });
});

const PORT = 3000;
const IP = '0.0.0.0';  // This allows connections from any IP on the local network
http.listen(PORT, IP, () => {
  console.log(`Server is running on http://${IP}:${PORT}`);
});