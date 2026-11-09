import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initTheme } from './utils/theme'
// Подключаем бурмалдетский счетчик
import { YMInitializer } from 'react-yandex-metrika'

initTheme()

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