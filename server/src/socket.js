const { Server } = require('socket.io');
const { userFromToken } = require('./middleware/auth');

let io = null;

// Каждый пользователь сидит в своей комнате user:<id>. Id не меняется при смене ника.
function initSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, { cors: { origin: corsOrigin } });

  io.use(async (socket, next) => {
    const user = await userFromToken(socket.handshake.auth?.token);
    if (!user) return next(new Error('unauthorized'));
    socket.data.user = user;
    next();
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.user.id}`);
  });

  return io;
}

const getIO = () => io;

module.exports = { initSocket, getIO };
