import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { registerBroadcastServer } from '../data/broadcast';
import { bearerFrom, verifyToken } from '../auth/token.util';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Hand the socket server to the broadcaster so REST writes can announce
  // themselves too. Before this, only a browser calling DB.save() ever told
  // anyone that data had changed - see data/broadcast.ts.
  afterInit(server: Server) {
    registerBroadcastServer(server);

    // ── WebSocket Auth Middleware ────────────────────────────────
    // Runs once per connection at the Socket.IO handshake, BEFORE any
    // message event fires. The client must supply the signed JWT in
    // socket.handshake.auth.token (standard Socket.IO auth field) OR
    // in an Authorization: Bearer <token> handshake header.
    //
    // On failure the connection is rejected with a 'Unauthorized' error
    // that socket.io surfaces as a connect_error on the client.
    // On success socket.data.auth holds the verified TokenPayload so
    // event handlers can optionally read the caller's identity.
    //
    // Why here and not in handleConnection?
    //   handleConnection fires AFTER the socket is accepted by socket.io.
    //   server.use() is evaluated at handshake time — rejection here
    //   means no socket object is ever created for the caller, so there
    //   is no open connection to leak or abuse.
    server.use((socket, next) => {
      const authToken   = socket.handshake.auth?.token as string | undefined;
      const headerToken = bearerFrom(socket.handshake.headers?.authorization);
      const payload     = verifyToken(authToken ?? headerToken);

      if (!payload) {
        next(new Error('Unauthorized: a valid signed token is required to connect.'));
        return;
      }

      // Attach verified identity for use by event handlers.
      socket.data.auth = payload;
      next();
    });
  }

  // Matchmaking Data Structure: Map of gameId to array of players in queue
  private matchQueues: Map<string, { uid: string; clientId: string }[]> = new Map();

  // Which socket(s) are currently signed in as which user — lets a new-device
  // login find the OLD device's live tab to ask for approval. A user can have
  // more than one live socket (multiple tabs of the same browser), so this is
  // a set, not a single id.
  private identityToSockets: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    const auth = client.data?.auth;
    const who  = auth ? `user#${auth.sub} (${auth.role})` : 'unknown';
    console.log(`[Socket] Client connected: ${client.id} — ${who}`);
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
    // ...and from the identity registry, or a closed tab would keep looking
    // "reachable" for handoff requests forever.
    for (const [userId, sockets] of this.identityToSockets.entries()) {
      sockets.delete(client.id);
      if (sockets.size === 0) this.identityToSockets.delete(userId);
    }
  }

  // ── Device Handoff (single-session-per-account) ──

  @SubscribeMessage('register_identity')
  handleRegisterIdentity(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = String(data.userId);
    if (!this.identityToSockets.has(userId)) this.identityToSockets.set(userId, new Set());
    this.identityToSockets.get(userId).add(client.id);
  }

  @SubscribeMessage('device_login_request')
  handleDeviceLoginRequest(
    @MessageBody() data: { userId: string; requestId: string; deviceLabel: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = String(data.userId);
    const sockets = this.identityToSockets.get(userId);

    // Only count sockets that are STILL genuinely connected. A registry entry
    // outlives its tab whenever socket.io has not yet processed the disconnect
    // (closed laptop, killed tab, dropped wifi), and that zombie made the
    // request look deliverable — the requester then sat through the full 15s
    // timeout and was told "no response", locking a user out of their own
    // account with nobody on the other end. Prune here so "nobody is listening"
    // is answered immediately and honestly.
    const live = sockets
      ? [...sockets].filter((id) => this.server.sockets.sockets.has(id))
      : [];
    if (sockets) {
      for (const id of [...sockets]) {
        if (!this.server.sockets.sockets.has(id)) sockets.delete(id);
      }
      if (sockets.size === 0) this.identityToSockets.delete(userId);
    }

    if (live.length === 0) {
      this.server.to(client.id).emit('device_login_response', {
        requestId: data.requestId,
        approved: false,
        reason: 'unreachable',
      });
      return;
    }
    for (const socketId of live) {
      this.server.to(socketId).emit('device_login_incoming', {
        requestId: data.requestId,
        deviceLabel: data.deviceLabel,
        requesterClientId: client.id,
      });
    }
  }

  // Sent by the old device the moment it actually renders the prompt. This is
  // what separates "a human saw it and ignored it" (real refusal) from "the
  // socket is registered but the page can't answer" (stale build, crashed
  // script) — without it, both look identical to the requester after 15s.
  @SubscribeMessage('device_login_ack')
  handleDeviceLoginAck(
    @MessageBody() data: { requestId: string; requesterClientId: string },
    @ConnectedSocket() _client: Socket,
  ) {
    this.server.to(data.requesterClientId).emit('device_login_ack', {
      requestId: data.requestId,
    });
  }

  @SubscribeMessage('device_login_response')
  handleDeviceLoginResponse(
    @MessageBody() data: { requestId: string; approved: boolean; requesterClientId: string },
    @ConnectedSocket() _client: Socket,
  ) {
    this.server.to(data.requesterClientId).emit('device_login_response', {
      requestId: data.requestId,
      approved: !!data.approved,
    });
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

  // REMOVED: leave_room and session_action.
  //
  // `session_action` relayed lobby state — someone joined, someone was kicked,
  // the host pressed Start — to everyone sitting in a room. Its only listener
  // was room-lobby.html. `leave_room` was already dead before that.
  //
  // `join_room` and `game_action` below are KEPT and are load-bearing: they
  // carry every chess move. They key on a plain string room name
  // ('chess_room_<matchId>'), never on a session ROW, which is why chess's
  // networking survived the rooms being removed untouched.

  @SubscribeMessage('game_action')
  handleGameAction(
    @MessageBody() data: { roomId: string; key: string; value: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.roomId).emit('game_action_received', data);
  }

  @SubscribeMessage('global_db_update')
  handleGlobalDbUpdate(@ConnectedSocket() client: Socket) {
    client.broadcast.emit('global_db_update_received');
  }

  // REMOVED: chat_message — the in-room chat relay, listened to only by
  // room-lobby.html. Player-to-player chat is being rebuilt properly in the
  // friends work, where messages are STORED rather than relayed and forgotten.

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
    
    const queue = this.matchQueues.get(gameId);

    // Prevent self-matching if user double clicks or is already in queue
    const existingIndex = queue.findIndex(p => String(p.uid) === String(data.uid) || p.clientId === client.id);
    if (existingIndex !== -1) {
      queue.splice(existingIndex, 1);
    }
    
    const opponentIndex = queue.findIndex(q => String(q.uid) !== String(data.uid) && q.clientId !== client.id);
    
    if (opponentIndex !== -1) {
      // Match found!
      const opponent = queue[opponentIndex];
      queue.splice(opponentIndex, 1); // Remove from queue
      this.matchQueues.set(gameId, queue);

      // Determine Host and Guest to avoid race condition (use clientId for guaranteed unique tie-breaker)
      const isHost = client.id > opponent.clientId;
      const host = isHost ? { uid: data.uid, clientId: client.id } : opponent;
      const guest = isHost ? opponent : { uid: data.uid, clientId: client.id };

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
    @MessageBody() _data: { uid: string },
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
    @ConnectedSocket() _client: Socket,
  ) {
    // Determine the socket ID of the opponent and send them the session ID
    // Note: since Socket.io might have multiple tabs per user, we broadcast if needed,
    // but the opponent should still be connected. We can either broadcast to everyone with that UID 
    // or we just broadcast system wide and let the client filter by `oppId`.
    // Broadcasting to everyone is easier here since we don't strictly track all valid sockets per UID.
    this.server.emit('quick_play_session_ready_broadcast', data);
  }
}
