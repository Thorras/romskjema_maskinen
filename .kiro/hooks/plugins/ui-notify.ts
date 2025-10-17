import { HookPlugin, KiroEvent } from '../core/types.js';

export interface NotificationConfig {
  showSuccess: boolean;
  showWarnings: boolean;
  showErrors: boolean;
  autoHideMs: number;
  maxNotifications: number;
}

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: number;
  autoHide: boolean;
  actions?: Array<{ label: string; action: () => void }>;
}

export class UINotifyPlugin implements HookPlugin {
  name = 'ui-notify';
  enabled = true;
  
  private notifications: Notification[] = [];
  private listeners: Array<(notifications: Notification[]) => void> = [];

  constructor(private config: NotificationConfig = {
    showSuccess: true,
    showWarnings: true,
    showErrors: true,
    autoHideMs: 5000,
    maxNotifications: 10
  }) {}

  handle(event: KiroEvent): void {
    const notification = this.createNotification(event);
    if (!notification) return;

    this.addNotification(notification);
  }

  private createNotification(event: KiroEvent): Notification | null {
    const type = this.getNotificationType(event);
    
    // Check if we should show this type
    if (type === 'success' && !this.config.showSuccess) return null;
    if (type === 'warning' && !this.config.showWarnings) return null;
    if (type === 'error' && !this.config.showErrors) return null;

    const { title, message } = this.getNotificationContent(event);

    return {
      id: `${event.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: event.timestamp,
      autoHide: type !== 'error', // Errors require manual dismissal
      actions: this.getNotificationActions(event)
    };
  }

  private getNotificationType(event: KiroEvent): 'success' | 'warning' | 'error' | 'info' {
    if (event.error || event.name.includes('.error')) return 'error';
    if (event.name.includes('.empty') || event.name.includes('.missing')) return 'warning';
    if (event.name.includes('.after') || event.name.includes('.completed')) return 'success';
    return 'info';
  }

  private getNotificationContent(event: KiroEvent): { title: string; message: string } {
    // Norwegian messages for user-facing notifications
    const eventMap: Record<string, { title: string; message: string }> = {
      'kiro.planview.load.after': {
        title: 'Planview lastet',
        message: 'Planview er lastet og klar for bruk'
      },
      'kiro.planview.load.error': {
        title: 'Feil ved lasting av planview',
        message: event.error?.message || 'Ukjent feil oppstod'
      },
      'kiro.planview.slice.empty': {
        title: 'Tomt snitt',
        message: 'Snittet ga ingen elementer. Prøv en annen høyde.'
      },
      'kiro.ui.export.completed': {
        title: 'Eksport fullført',
        message: 'Filen er eksportert og klar for nedlasting'
      },
      'kiro.ui.export.error': {
        title: 'Eksport feilet',
        message: event.error?.message || 'Kunne ikke eksportere filen'
      },
      'kiro.planview.performance.slow': {
        title: 'Treg ytelse',
        message: 'Operasjonen tok lengre tid enn forventet'
      }
    };

    return eventMap[event.name] || {
      title: this.formatEventName(event.name),
      message: event.error?.message || 'Operasjon utført'
    };
  }

  private getNotificationActions(event: KiroEvent): Array<{ label: string; action: () => void }> | undefined {
    const actions: Array<{ label: string; action: () => void }> = [];

    // Add retry action for failed operations
    if (event.error && event.context?.retryable) {
      actions.push({
        label: 'Prøv igjen',
        action: () => {
          // Emit retry event
          console.log('Retry requested for', event.name);
        }
      });
    }

    // Add details action for errors
    if (event.error) {
      actions.push({
        label: 'Detaljer',
        action: () => {
          console.error('Error details:', event.error);
        }
      });
    }

    return actions.length > 0 ? actions : undefined;
  }

  private formatEventName(eventName: string): string {
    return eventName
      .split('.')
      .slice(-2)
      .join(' ')
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  private addNotification(notification: Notification): void {
    this.notifications.unshift(notification);

    // Limit number of notifications
    if (this.notifications.length > this.config.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.config.maxNotifications);
    }

    // Auto-hide if configured
    if (notification.autoHide) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, this.config.autoHideMs);
    }

    this.notifyListeners();
  }

  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  clearAll(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  onNotificationsChange(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener([...this.notifications]);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }
}