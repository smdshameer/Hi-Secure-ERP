import { prisma } from '../index';

export class BusinessEventService {
  static async logEvent(data: {
    event_type: string;
    entity_type: string;
    entity_id: number;
    user_id?: number | null;
    description: string;
  }, tx?: any) {
    const client = tx || prisma;
    try {
      const event = await client.businessEvent.create({
        data: {
          event_type: data.event_type,
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          user_id: data.user_id || null,
          description: data.description
        }
      });
      console.log(`[BusinessEvent] Logged: ${data.event_type} on ${data.entity_type} ID ${data.entity_id}`);
      return event;
    } catch (err: any) {
      console.error('[BusinessEventService] Failed to log event:', err.message);
      throw err;
    }
  }
}
