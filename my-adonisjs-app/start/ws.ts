import { Server } from 'socket.io'
import server from '@adonisjs/core/services/server'

export const io = new Server(server.getNodeServer(), {
  cors: { origin: true, credentials: true },
})

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id)

  socket.on('ping', () => {
    socket.emit('pong')
  })

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason)
  })
})
