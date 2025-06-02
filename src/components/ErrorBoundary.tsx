
"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
    // You could also log the error to an external service or localStorage here
    // For offline: localStorage.setItem('crash_log_' + Date.now(), JSON.stringify({ error: error.message, componentStack: errorInfo.componentStack }));
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
          <div className="text-center max-w-md p-8 border border-destructive/50 rounded-lg shadow-xl bg-destructive/10">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-destructive mb-2">Oops! Something went wrong.</h1>
            <p className="text-destructive-foreground mb-4">
              {this.props.fallbackMessage || "We encountered an unexpected issue. Please try reloading the page."}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-left text-xs bg-destructive/10 p-2 rounded">
                <summary className="cursor-pointer font-semibold">Error Details (Dev Mode)</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all">
                  {this.state.error.toString()}
                  {this.state.errorInfo && `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}`}
                </pre>
              </details>
            )}
            <Button onClick={this.handleReload} variant="destructive" size="lg">
              Reload Page
            </Button>
             <p className="text-xs text-muted-foreground mt-6">
              If the problem persists, please try restoring from a backup or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
