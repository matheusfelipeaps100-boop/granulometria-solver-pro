import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PageErrorBoundary] Erro na página:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-destructive text-2xl font-bold">!</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Erro ao carregar a página</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <p className="text-xs text-destructive font-mono mt-2 max-w-md break-all">
              {error.message}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
          >
            Recarregar página
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
