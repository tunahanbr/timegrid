import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';

interface StorageNotification {
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  id: string;
}

export function StorageNotifications() {
  const [notifications, setNotifications] = useState<StorageNotification[]>([]);

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string; type: 'success' | 'info' | 'warning' | 'error' }>;
      const notification: StorageNotification = {
        ...customEvent.detail,
        id: Date.now().toString(),
      };

      setNotifications(prev => [...prev, notification]);

      // Auto-dismiss after 8 seconds (except errors)
      if (customEvent.detail.type !== 'error') {
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 8000);
      }
    };

    window.addEventListener('storage-notification', handleNotification);
    return () => window.removeEventListener('storage-notification', handleNotification);
  }, []);

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map(notification => {
        const Icon = 
          notification.type === 'success' ? CheckCircle2 :
          notification.type === 'info' ? Info :
          notification.type === 'warning' ? AlertTriangle :
          XCircle;

        const variant = 
          notification.type === 'error' ? 'destructive' :
          notification.type === 'warning' ? 'default' :
          'default';

        return (
          <Alert 
            key={notification.id} 
            variant={variant}
            className="shadow-lg"
          >
            <Icon className="h-4 w-4" />
            <AlertDescription className="flex items-start justify-between gap-2">
              <span className="flex-1">{notification.message}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => dismiss(notification.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
