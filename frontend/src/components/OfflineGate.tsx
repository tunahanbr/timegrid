import { useState, useEffect } from "react";
import { Cloud, CloudOff, AlertCircle, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { logger } from "@/lib/logger";

interface OfflineGateProps {
  onlineStatus: boolean;
  onContinueOffline?: () => void;
}

export function OfflineGate({ onlineStatus, onContinueOffline }: OfflineGateProps) {
  const [hasCachedSession, setHasCachedSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Check if there's a valid cached session
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        setHasCachedSession(!!token);
      } catch (error) {
        logger.error('Error checking cached session', error, { context: 'OfflineGate' });
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border border-primary border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Don't render anything if online
  if (onlineStatus) {
    return null;
  }

  // User is offline
  if (hasCachedSession) {
    // User has a cached session - they can use it offline
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-none">
        <Card className="w-full max-w-md pointer-events-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CloudOff className="h-5 w-5 text-yellow-600" />
              <CardTitle>You're Offline</CardTitle>
            </div>
            <CardDescription>
              Using cached session - changes will sync when back online
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Some features may be limited. Data will sync automatically when you reconnect.
              </AlertDescription>
            </Alert>
            <Button onClick={onContinueOffline} className="w-full" variant="default">
              Continue Offline
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is offline AND has no cached session - show limited mode or block login
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CloudOff className="h-5 w-5 text-red-600" />
            <CardTitle>Offline - No Cached Session</CardTitle>
          </div>
          <CardDescription>
            You need to be online to sign in for the first time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              We cannot verify your identity while offline. Please connect to the internet to sign in.
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-3 rounded space-y-2 text-sm">
            <p className="font-medium flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              How to proceed:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Connect to the internet</li>
              <li>Sign in with your email and password</li>
              <li>Your session will be saved locally</li>
              <li>Next time you can use the app offline</li>
            </ul>
          </div>

          <div className="bg-muted p-3 rounded space-y-2 text-sm">
            <p className="font-medium">What happens after first sign-in:</p>
            <p className="text-muted-foreground">
              Your encrypted session will be stored on this device. You'll be able to use the app offline 
              and all changes will sync when you go back online.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded text-sm">
            <Cloud className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-900 dark:text-blue-100">
              Waiting for internet connection...
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
