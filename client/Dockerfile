FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Vite по умолчанию использует 5173
EXPOSE 5173
# Флаг --host нужен, чтобы Vite принимал запросы извне контейнера
CMD ["npm", "run", "dev", "--", "--host"]