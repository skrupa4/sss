const http = require('http');
const config = require('./src/config');
const app = require('./src/app');
const { initDB } = require('./src/db');
const { initSocket } = require('./src/socket');

const server = http.createServer(app);
initSocket(server, config.corsOrigin);

initDB().finally(() => {
  server.listen(config.PORT, () => console.log(`СЕРВЕР ЗАПУЩЕН НА ПОРТУ ${config.PORT}`));
});

process.on('unhandledRejection', (err) => console.error('Необработанная ошибка:', err));
