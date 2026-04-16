import { Component, ErrorInfo } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-rose-50">
          <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Ops! Algo deu errado.</h1>
          <p className="text-gray-600 mb-6">Ocorreu um erro inesperado ao carregar as informações.</p>
          <button
            onClick={() => { window.location.reload(); }}
            className="px-6 py-3 bg-rose-500 text-white rounded-xl font-bold shadow-lg hover:bg-rose-600 transition-colors flex items-center gap-2"
          >
            <RefreshCcw className="w-5 h-5" /> Recarregar Aplicativo
          </button>
          <p className="mt-4 text-xs text-gray-400">Seus dados estão seguros. Se o problema persistir, exporte seus dados pela tela principal.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
