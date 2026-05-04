import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private matchQueues;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
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
    handleChatMessage(data: {
        roomId: string;
        sender: string;
        message: string;
        timestamp: string;
    }, client: Socket): void;
    handleQuickPlayJoin(data: {
        gameId: string;
        uid: string;
    }, client: Socket): void;
    handleQuickPlayCancel(data: {
        uid: string;
    }, client: Socket): void;
    handleQuickPlaySessionReady(data: {
        oppId: string;
        sessionId: string;
    }, client: Socket): void;
}
