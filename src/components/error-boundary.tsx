import React, { Component, ErrorInfo } from 'react';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
} from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw, ArrowLeft } from 'lucide-react';
import i18n from '@/i18n';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoBack = () => {
    // Attempt to go back, or fallback to reloading
    if (window.history.length > 1) {
      window.history.back();
      // Reset error state after a short delay to allow navigation
      setTimeout(() => {
        this.setState({ hasError: false, error: null });
      }, 100);
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <BottomSheet open={true} onOpenChange={() => {}}>
          {/* We render a background div to ensure the sheet has something to sit over if the app is blank */}
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
          
          <BottomSheetContent className="z-[100]">
            <BottomSheetHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
              </div>
              <BottomSheetTitle className="text-center">
                {i18n.t('error.title', 'Something went wrong')}
              </BottomSheetTitle>
              <BottomSheetDescription className="text-center">
                {i18n.t('error.description', 'An unexpected error occurred. Please try again.')}
              </BottomSheetDescription>
            </BottomSheetHeader>

            <div className="p-4 space-y-4">
              {/* Optional: Show error details in development */}
              {import.meta.env.DEV && this.state.error && (
                <div className="p-3 bg-muted rounded-md text-xs font-mono break-all overflow-auto max-h-[100px]">
                  {this.state.error.message}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={this.handleGoBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {i18n.t('common.back', 'Back')}
                </Button>
                <Button onClick={this.handleReload}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {i18n.t('common.reload', 'Reload')}
                </Button>
              </div>
            </div>
          </BottomSheetContent>
        </BottomSheet>
      );
    }

    return this.props.children;
  }
}
