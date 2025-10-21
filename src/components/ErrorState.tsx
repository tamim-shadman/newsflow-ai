import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState = ({
  message = "Failed to load news. Please try again.",
  onRetry,
}: ErrorStateProps) => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="max-w-md w-full">
        <Alert className="bg-red-500/10 border-red-500/50 backdrop-blur-xl">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertTitle className="text-red-400 font-bold text-lg">
            Error Loading News
          </AlertTitle>
          <AlertDescription className="text-red-300 mt-2">
            {message}
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                className="mt-4 w-full bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export const EmptyState = ({
  message = "No news articles found.",
}: {
  message?: string;
}) => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="text-6xl mb-4">📰</div>
        <h3 className="text-2xl font-bold text-white mb-2">No Articles</h3>
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
};
