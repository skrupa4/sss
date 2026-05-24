import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // ВОТ ЭТА СТРОКА ПОДКЛЮЧАЕТ ТВОЙ CSS С ТЕЙЛВИНДОМ
// Подключаем бурмалдетский счетчик
import { YMInitializer } from 'react-yandex-metrika'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Метрика на базе, вебвизор включен */}
    <YMInitializer 
      accounts={[109397345]} 
      options={{ webvisor: true, clickmap: true, trackLinks: true, accurateTrackBounce: true }} 
    />
    <App />
  </React.StrictMode>,
)