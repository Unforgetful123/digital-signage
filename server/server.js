// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app    = express();
const httpSv = http.createServer(app);
const io     = new Server(httpSv, {
  cors: { origin: '*' }
});

// when a client connects
io.on('connection', socket => {
  console.log('Client connected');

 // 1. 🤝 Event: Player tells server its location (area)
  socket.on('playerConnected', (playerConfig) => {
    // playerConfig = { id: 'displayId', location: 'opd' }
    const area = (playerConfig.location || 'default').toLowerCase();
    
    // Join the Room named after the location/area
    socket.join(area);
    console.log(`Player ${playerConfig.id} joined room: ${area}`);
  });


  // 2. 🚨 Event: Relay trigger, now with Area targeting
  socket.on('triggerEmergency', data => {
    // data = { type, message, area }
    const targetArea = (data.area || 'all').toLowerCase();
    
    if (targetArea === 'all') {
        // Global broadcast to all connected sockets
        io.emit('triggerEmergency', data);
        console.log(`Global alert triggered: ${data.message}`);
    } else {
        // Broadcast only to sockets in the target Room
        io.to(targetArea).emit('triggerEmergency', data);
        console.log(`Alert sent to Room "${targetArea}": ${data.message}`);
    }
  });

  // 3. ❌ Event: Relay clear, now with Area targeting
  socket.on('clearEmergency', (data) => {
    // data = { area }
    const targetArea = (data.area || 'all').toLowerCase();
    
    if (targetArea === 'all') {
        // Global clear
        io.emit('emergencyCleared');
        console.log('Global alert cleared.');
    } else {
        // Clear only for the target Room
        io.to(targetArea).emit('emergencyCleared');
        console.log(`Alert cleared for Room "${targetArea}".`);
    }
  });
  
  // Log client disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

httpSv.listen(4000, () => {
  console.log('Socket.IO server running on port 4000');
});