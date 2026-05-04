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
let GameGateway = class GameGateway {
    constructor() {
        this.matchQueues = new Map();
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
    handleChatMessage(data, client) {
        this.server.to(data.roomId).emit('chat_message_received', data);
    }
    handleQuickPlayJoin(data, client) {
        const gameId = String(data.gameId);
        if (!this.matchQueues.has(gameId)) {
            this.matchQueues.set(gameId, []);
        }
        let queue = this.matchQueues.get(gameId);
        const opponentIndex = queue.findIndex(q => q.clientId !== client.id);
        if (opponentIndex !== -1) {
            const opponent = queue[opponentIndex];
            queue.splice(opponentIndex, 1);
            this.matchQueues.set(gameId, queue);
            const isHost = client.id > opponent.clientId;
            const host = isHost ? { ...data, clientId: client.id } : opponent;
            const guest = isHost ? opponent : { ...data, clientId: client.id };
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
    handleQuickPlayCancel(data, client) {
        for (const [gameId, queue] of this.matchQueues.entries()) {
            const filtered = queue.filter(q => q.clientId !== client.id);
            this.matchQueues.set(gameId, filtered);
        }
        console.log(`[Quick Play] Socket ${client.id} left queue`);
    }
    handleQuickPlaySessionReady(data, client) {
        this.server.emit('quick_play_session_ready_broadcast', data);
    }
};
exports.GameGateway = GameGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], GameGateway.prototype, "server", void 0);
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