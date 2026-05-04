import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Matchmaking Data Structure: Map of gameId to array of players in queue
  private matchQueues: Map<string, { uid: string; clientId: string }[]> = new Map();

  handleConnection(client: Socket) {
    console.log(`[Socket] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[Socket] Client disconnected: ${client.id}`);
    // Clean up disconnected clients from all queues
    for (const [gameId, queue] of this.matchQueues.entries()) {
      const filtered = queue.filter(q => q.clientId !== client.id);
      if (filtered.length !== queue.length) {
        this.matchQueues.set(gameId, filtered);
      }
    }
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.roomId);
    console.log(`[Socket] Client ${client.id} joined room: ${data.roomId}`);
    return { event: 'joined', data: { roomId: data.roomId } };
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.roomId);
    console.log(`[Socket] Client ${client.id} left room: ${data.roomId}`);
  }

  @SubscribeMessage('session_action')
  handleSessionAction(
    @MessageBody() data: { roomId: string; action: any },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast action to everyone else in the room
    client.to(data.roomId).emit('session_updated', data.action);
  }

  @SubscribeMessage('chat_message')
  handleChatMessage(
    @MessageBody() data: { roomId: string; sender: string; message: string; timestamp: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(data.roomId).emit('chat_message_received', data);
  }

  // ── Quick Play Matchmaking ──

  @SubscribeMessage('quick_play_join')
  handleQuickPlayJoin(
    @MessageBody() data: { gameId: string; uid: string },
    @ConnectedSocket() client: Socket,
  ) {
    const gameId = String(data.gameId);
    if (!this.matchQueues.has(gameId)) {
      this.matchQueues.set(gameId, []);
    }
    
    let queue = this.matchQueues.get(gameId);

    // Look for an opponent
    const opponentIndex = queue.findIndex(q => q.clientId !== client.id);
    
    if (opponentIndex !== -1) {
      // Match found!
      const opponent = queue[opponentIndex];
      queue.splice(opponentIndex, 1); // Remove from queue
      this.matchQueues.set(gameId, queue);

      // Determine Host and Guest to avoid race condition (use clientId for guaranteed unique tie-breaker)
      const isHost = client.id > opponent.clientId;
      const host = isHost ? { ...data, clientId: client.id } : opponent;
      const guest = isHost ? opponent : { ...data, clientId: client.id };

      // Notify Host
      this.server.to(host.clientId).emit('quick_play_match_found', { 
        role: 'host', 
        oppId: guest.uid, 
        gameId: gameId 
      });

      // Notify Guest
      this.server.to(guest.clientId).emit('quick_play_match_found', { 
        role: 'guest', 
        oppId: host.uid, 
        gameId: gameId 
      });
      
      console.log(`[Quick Play] Match found for Game ${gameId}! Host: ${host.uid}, Guest: ${guest.uid}`);
    } else {
      // No match found, join queue
      queue.push({ uid: String(data.uid), clientId: client.id });
      this.matchQueues.set(gameId, queue);
      console.log(`[Quick Play] Player ${data.uid} joined queue for Game ${gameId}`);
    }
  }

  @SubscribeMessage('quick_play_cancel')
  handleQuickPlayCancel(
    @MessageBody() data: { uid: string },
    @ConnectedSocket() client: Socket,
  ) {
    for (const [gameId, queue] of this.matchQueues.entries()) {
      const filtered = queue.filter(q => q.clientId !== client.id);
      this.matchQueues.set(gameId, filtered);
    }
    console.log(`[Quick Play] Socket ${client.id} left queue`);
  }

  @SubscribeMessage('quick_play_session_ready')
  handleQuickPlaySessionReady(
    @MessageBody() data: { oppId: string; sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Determine the socket ID of the opponent and send them the session ID
    // Note: since Socket.io might have multiple tabs per user, we broadcast if needed,
    // but the opponent should still be connected. We can either broadcast to everyone with that UID 
    // or we just broadcast system wide and let the client filter by `oppId`.
    // Broadcasting to everyone is easier here since we don't strictly track all valid sockets per UID.
    this.server.emit('quick_play_session_ready_broadcast', data);
  }
}
