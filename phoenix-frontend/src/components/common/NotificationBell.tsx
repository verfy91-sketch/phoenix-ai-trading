import React from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '@/lib/store/useNotificationStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const NotificationBell: React.FC = () => {
  const { notifications, removeNotification, clearNotifications, unreadCount } = useNotificationStore();

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown for notifications */}
      {notifications.length > 0 && (
        <Card className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearNotifications}
              >
                Clear all
              </Button>
            </div>
          </div>
          
          <div className="divide-y">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => removeNotification(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {notifications.length > 5 && (
            <div className="p-4 text-center">
              <Button variant="ghost" size="sm">
                View all notifications
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export { NotificationBell };
