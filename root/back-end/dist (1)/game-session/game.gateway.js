"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const broadcast_1 = require("../data/broadcast");
let GameGateway = class GameGateway {
    constructor() {
        this.matchQueues = new Map();
        this.identityToSockets = new Map();
    }
    afterInit(server) {
        (0, broadcast_1.registerBroadcastServer)(server);
    }
    handleConnection(client) {
        console.log(`[Socket] Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        console.log(`[Socket] Client disconnected: ${client.id}`);
        for (const [gameId, queue] of this.matchQueues.entries()) {
            const filtered = queue.filter(q => q.clientId !== client.id);
            if (filtered.length !== queue.length) {
                this.matchQueues.set(gameId, filtered);
            }
        }
        for (const [userId, sockets] of this.identityToSockets.entries()) {
            sockets.delete(client.id);
            if (sockets.size === 0)
                this.identityToSockets.delete(userId);
        }
    }
    handleRegisterIdentity(data, client) {
        const userId = String(data.userId);
        if (!this.identityToSockets.has(userId))
            this.identityToSockets.set(userId, new Set());
        this.identityToSockets.get(userId).add(client.id);
    }
    handleDeviceLoginRequest(data, client) {
        const userId = String(data.userId);
        const sockets = this.identityToSockets.get(userId);
        const live = sockets
            ? [...sockets].filter((id) => this.server.sockets.sockets.has(id))
            : [];
        if (sockets) {
            for (const id of [...sockets]) {
                if (!this.server.sockets.sockets.has(id))
                    sockets.delete(id);
            }
            if (sockets.size === 0)
                this.identityToSockets.delete(userId);
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
    handleDeviceLoginAck(data, _client) {
        this.server.to(data.requesterClientId).emit('device_login_ack', {
            requestId: data.requestId,
        });
    }
    handleDeviceLoginResponse(data, _client) {
        this.server.to(data.requesterClientId).emit('device_login_response', {
            requestId: data.requestId,
            approved: !!data.approved,
        });
    }
    handleJoinRoom(data, client) {
        client.join(data.roomId);
        console.log(`[Socket] Client ${client.id} joined room: ${data.roomId}`);
        return { event: 'joined', data: { roomId: data.roomId } };
    }
    handleLeaveRoom(data, client) {
        client.leave(data.roomId);
        console.log(`[Socket] Client ${client.id} left room: ${data.roomId}`);
    }
    handleSessionAction(data, client) {
        client.to(data.roomId).emit('session_updated', data.action);
    }
    handleGameAction(data, client) {
        client.to(data.roomId).emit('game_action_received', data);
    }
    handleGlobalDbUpdate(client) {
        client.broadcast.emit('global_db_update_received');
    }
    handleChatMessage(data, _client) {
        this.server.to(data.roomId).emit('chat_message_received', data);
    }
    handleQuickPlayJoin(data, client) {
        const gameId = String(data.gameId);
        if (!this.matchQueues.has(gameId)) {
            this.matchQueues.set(gameId, []);
        }
        const queue = this.matchQueues.get(gameId);
        const existingIndex = queue.findIndex(p => String(p.uid) === String(data.uid) || p.clientId === client.id);
        if (existingIndex !== -1) {
            queue.splice(existingIndex, 1);
        }
        const opponentIndex = queue.findIndex(q => String(q.uid) !== String(data.uid) && q.clientId !== client.id);
        if (opponentIndex !== -1) {
            const opponent = queue[opponentIndex];
            queue.splice(opponentIndex, 1);
            this.matchQueues.set(gameId, queue);
            const isHost = client.id > opponent.clientId;
            const host = isHost ? { uid: data.uid, clientId: client.id } : opponent;
            const guest = isHost ? opponent : { uid: data.uid, clientId: client.id };
            this.server.to(host.clientId).emit('quick_play_match_found', {
                role: 'host',
                oppId: guest.uid,
                gameId: gameId
            });
            this.server.to(guest.clientId).emit('quick_play_match_found', {
                role: 'guest',
                oppId: host.uid,
                gameId: gameId
            });
            console.log(`[Quick Play] Match found for Game ${gameId}! Host: ${host.uid}, Guest: ${guest.uid}`);
        }
        else {
            queue.push({ uid: String(data.uid), clientId: client.id });
            this.matchQueues.set(gameId, queue);
            console.log(`[Quick Play] Player ${data.uid} joined queue for Game ${gameId}`);
        }
    }
    handleQuickPlayCancel(_data, client) {
        for (const [gameId, queue] of this.matchQueues.entries()) {
            const filtered = queue.filter(q => q.clientId !== client.id);
            this.matchQueues.set(gameId, filtered);
        }
        console.log(`[Quick Play] Socket ${client.id} left queue`);
    }
    handleQuickPlaySessionReady(data, _client) {
        this.server.emit('quick_play_session_ready_broadcast', data);
    }
};
exports.GameGateway = GameGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], GameGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('register_identity'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleRegisterIdentity", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('device_login_request'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleDeviceLoginRequest", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('device_login_ack'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleDeviceLoginAck", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('device_login_response'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleDeviceLoginResponse", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_room'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_room'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleLeaveRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('session_action'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleSessionAction", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('game_action'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleGameAction", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('global_db_update'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleGlobalDbUpdate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat_message'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleChatMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('quick_play_join'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleQuickPlayJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('quick_play_cancel'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleQuickPlayCancel", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('quick_play_session_ready'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleQuickPlaySessionReady", null);
exports.GameGateway = GameGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: { origin: '*' } })
], GameGateway);
//# sourceMappingURL=game.gateway.js.map