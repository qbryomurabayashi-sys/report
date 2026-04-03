import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    const { hasError, error } = (this as any).state;
    const { children } = (this as any).props;

    if (hasError) {
      let errorMessage = "申し訳ありません。エラーが発生しました。";
      try {
        const firestoreError = JSON.parse(error?.message || "");
        if (firestoreError.error) {
          errorMessage = `Firestoreエラー: ${firestoreError.error} (${firestoreError.operationType} at ${firestoreError.path})`;
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
          <div className="glass-card p-8 rounded-2xl border-l-4 border-neon-red max-w-md w-full">
            <h2 className="text-2xl font-bold text-neon-red mb-4 font-display">エラーが発生しました</h2>
            <p className="text-gray-400 mb-6 font-digital uppercase tracking-widest text-sm">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-neon-blue/10 border border-neon-blue/30 rounded-xl text-neon-blue font-digital uppercase tracking-widest hover:bg-neon-blue hover:text-black transition-all"
            >
              再読み込み
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
