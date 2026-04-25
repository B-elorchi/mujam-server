export type NotificationPayload = {
  userId: string;
  title: string;
  body: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'PROMO';
  actionUrl?: string;
};
