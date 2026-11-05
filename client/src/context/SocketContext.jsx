import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ user, children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user?.username) return;

    const newSocket = io(API_BASE_URL, {
      query: { username: user.username },
      transports: ['websocket', 'polling'], 
      secure: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user?.username]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);