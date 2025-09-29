// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app    = express();
const httpSv = http.createServer(app);
const io     = new Server(httpSv, {
  cors: { origin: '*' }
});

// when a client connects
io.on('connection', socket => {
  console.log('Client connected');

  // relay trigger
  socket.on('triggerEmergency', data => {
    // data = { type, message }
    io.emit('emergencyTriggered', data);
  });

  // relay clear
  socket.on('clearEmergency', () => {
    io.emit('emergencyCleared');
  });
});

httpSv.listen(4000, () => {
  console.log('Socket.IO server running on port 4000');
});
