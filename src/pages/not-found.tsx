import { Link, useRouteError } from "react-router-dom";

export default function NotFound() {
  const err = useRouteError() as any;
  const status = err?.status || 404;
  const message = err?.statusText || "Página não encontrada";

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl font-bold mb-2">{status}</div>
      <div className="text-xl mb-6">{message}</div>
      <Link to="/" className="underline text-primary">Voltar ao início</Link>
    </div>
  );
}
