/**
 * socket.js — Socket.IO client singleton for the live support chat.
 *
 * The socket server runs on the same origin as the REST API (minus the `/api`
 * path). Auth is the same JWT stored in localStorage. One shared connection is
 * reused across the app; call getSocket() to lazily connect with the current
 * token and disconnectSocket() on logout.
 */
import { io } from 'socket.io-client'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
// Strip the trailing /api to get the socket origin.
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '')

let socket = null

export function getSocket() {
  const token = localStorage.getItem('ifoa_token')
  if (!token) return null

  if (socket && socket.connected) return socket

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      autoConnect: true,
    })
  } else {
    // Token may have changed (re-login) — refresh and reconnect.
    socket.auth = { token }
    if (!socket.connected) socket.connect()
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
