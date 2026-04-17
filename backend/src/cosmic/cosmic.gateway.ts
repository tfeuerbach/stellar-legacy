import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { CosmicService, StationUpdate } from './cosmic.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : '*',
  },
  namespace: '/cosmic',
})
export class CosmicGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CosmicGateway.name);

  constructor(private readonly cosmicService: CosmicService) {}

  afterInit() {
    this.cosmicService.onUpdate((update: StationUpdate) => {
      this.server.to(`station:${update.station}`).emit('reading', update);
      this.logger.debug(
        `Broadcast to station:${update.station} — normalized=${update.normalized}`,
      );
    });
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @MessageBody() data: { station: string },
    @ConnectedSocket() client: Socket,
  ) {
    const rooms = Array.from(client.rooms).filter((r) =>
      r.startsWith('station:'),
    );
    for (const room of rooms) {
      client.leave(room);
    }

    const room = `station:${data.station}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} subscribed to ${room}`);

    const latest = await this.cosmicService.getLatestReadingByCode(
      data.station,
    );
    if (latest) {
      client.emit('reading', {
        station: latest.station_code,
        stationName: latest.station_name,
        counts: latest.raw_counts,
        normalized: latest.normalized,
        fluxDelta: latest.flux_delta,
        timestamp: latest.timestamp,
        credit: latest.credit_text,
      });
    }
  }
}
