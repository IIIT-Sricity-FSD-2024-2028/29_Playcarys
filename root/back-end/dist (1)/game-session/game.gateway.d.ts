import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    afterInit(server: Server): void;
    private matchQueues;
    private identityToSockets;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleRegisterIdentity(data: {
        userId: string;
    }, client: Socket): void;
    handleDeviceLoginRequest(data: {
        userId: string;
        requestId: string;
        deviceLabel: string;
    }, client: Socket): void;
    handleDeviceLoginAck(data: {
        requestId: string;
        requesterClientId: string;
    }, _client: Socket): void;
    handleDeviceLoginResponse(data: {
        requestId: string;
        approved: boolean;
        requesterClientId: string;
    }, _client: Socket): void;
    handleJoinRoom(data: {
        roomId: string;
    }, client: Socket): {
        event: string;
        data: {
            roomId: string;
        };
    };
    handleLeaveRoom(data: {
        roomId: string;
    }, client: Socket): void;
    handleSessionAction(data: {
        roomId: string;
        action: any;
    }, client: Socket): void;
    handleGameAction(data: {
        roomId: string;
        key: string;
        value: string;
    }, client: Socket): void;
    handleGlobalDbUpdate(client: Socket): void;
    handleChatMessage(data: {
        roomId: string;
        sender: string;
        message: string;
        timestamp: string;
    }, _client: Socket): void;
    handleQuickPlayJoin(data: {
        gameId: string;
        uid: string;
    }, client: Socket): void;
    handleQuickPlayCancel(_data: {
        uid: string;
    }, client: Socket): void;
    handleQuickPlaySessionReady(data: {
        oppId: string;
        sessionId: string;
    }, _client: Socket): void;
}
