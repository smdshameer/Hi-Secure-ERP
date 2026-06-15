import { NotificationRepository } from '../repositories/NotificationRepository';

export class NotificationService {
  private static noticeRepo = new NotificationRepository();

  /**
   * Dispatches a notification to a specific user or a general role.
   */
  static async createNotification(data: {
    user_id?: number | null;
    role_id?: number | null;
    type: string;
    message: string;
    priority?: string;
  }) {
    try {
      const notice = await this.noticeRepo.create({
        user_id: data.user_id || null,
        role_id: data.role_id || null,
        type: data.type,
        message: data.message,
        priority: data.priority || 'medium'
      });
      console.log(`[Notification] Created alert type: ${data.type}`);
      return notice;
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  }

  /**
   * Fetches unread or recent notifications belonging to a specific user and their role.
   */
  static async getUserNotifications(userId: number, roleId?: number) {
    const where: any = {
      OR: [
        { user_id: userId }
      ]
    };
    if (roleId) {
      where.OR.push({ role_id: roleId });
    }
    
    return this.noticeRepo.findMany(where, 50);
  }

  /**
   * Marks a specific notification as read.
   */
  static async markAsRead(notificationId: number) {
    return this.noticeRepo.update(notificationId, { read_status: true });
  }

  /**
   * Marks all notifications for a specific user as read.
   */
  static async markAllAsRead(userId: number, roleId?: number) {
    const where: any = {
      read_status: false,
      OR: [
        { user_id: userId }
      ]
    };
    if (roleId) {
      where.OR.push({ role_id: roleId });
    }

    return this.noticeRepo.updateMany(where, { read_status: true });
  }
}