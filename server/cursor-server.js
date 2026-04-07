const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const users = {}; // Store user profile data (name, color)
const pairs = {}; // maps socket.id to partner.id
let waitingUser = null;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('profile', (data) => {
    users[socket.id] = data;
    
    // Check if we can pair now that we have profile data
    if (waitingUser && waitingUser !== socket.id) {
        const partnerId = waitingUser;
        pairs[socket.id] = partnerId;
        pairs[partnerId] = socket.id;
        waitingUser = null;

        // Immediately send partner profiles to both
        io.to(socket.id).emit('paired', { 
            id: partnerId, 
            ...users[partnerId] 
        });
        io.to(partnerId).emit('paired', { 
            id: socket.id, 
            ...users[socket.id] 
        });
        console.log(`Matched ${socket.id} with ${partnerId}`);
    } else {
        waitingUser = socket.id;
        socket.emit('waiting', true);
    }
  });

  socket.on('move', (data) => {
    const partnerId = pairs[socket.id];
    if (partnerId) {
      io.to(partnerId).emit('user-moved', { ...data, id: socket.id });
    }
  });

  socket.on('chat', (message) => {
    const partnerId = pairs[socket.id];
    if (partnerId) {
      // Direct message to partner
      io.to(partnerId).emit('user-chat', { id: socket.id, message });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const partnerId = pairs[socket.id];
    
    if (partnerId) {
      io.to(partnerId).emit('user-left', socket.id);
      delete pairs[partnerId];
      waitingUser = partnerId;
      io.to(partnerId).emit('waiting', true);
    }
    
    if (waitingUser === socket.id) {
      waitingUser = null;
    }

    delete pairs[socket.id];
    delete users[socket.id];
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Live 1-to-1 Sync Server running on port ${PORT}`);
});
