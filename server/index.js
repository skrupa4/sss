const http = require('http');
const config = require('./src/config');
const app = require('./src/app');
const { initDB } = require('./src/db');
const { initSocket } = require('./src/socket');

const server = http.createServer(app);
initSocket(server, config.corsOrigin);

initDB().finally(() => {
  server.listen(config.PORT, () => console.log(`СЕРВЕР ЗАПУЩЕН НА ПОРТУ ${config.PORT}`));
  // Старые сообщения шифруем в фоне: пока идёт работа, читаются оба формата.
  require('./src/services/messageCrypto').encryptExistingMessages().catch((err) => console.error('Шифрование старых сообщений:', err.message));
});

// Раз в час удаляем сторис, истёкшие больше суток назад.
setInterval(() => {
  require('./src/db').pool
    .query("DELETE FROM stories WHERE expires_at < NOW() - INTERVAL '1 day'")
    .catch((err) => console.error('Очистка сторис:', err.message));
}, 60 * 60 * 1000).unref();

process.on('unhandledRejection', (err) => console.error('Необработанная ошибка:', err));
