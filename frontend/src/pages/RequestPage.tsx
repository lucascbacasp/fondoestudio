import { useParams, Link } from "react-router-dom";
import { usePoolData } from "../hooks/usePoolData";
import RequestDetail from "../components/RequestDetail";

export default function RequestPage() {
  const { id } = useParams<{ id: string }>();
  const { requests, isLoading } = usePoolData();

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-6 h-6 border-2 border-brand-300 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 mt-2">Cargando...</p>
      </div>
    );
  }

  const request = requests.find((r) => r.id.toString() === id);

  if (!request) {
    return (
      <div className="text-center py-12 space-y-3">
        <span className="text-4xl block">&#128533;</span>
        <p className="font-semibold text-gray-700">Pedido no encontrado</p>
        <Link to="/" className="inline-block text-brand-600 text-sm font-medium">
          &#8592; Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-brand-600 font-medium">
        &#8592; Volver
      </Link>
      <RequestDetail request={request} />
    </div>
  );
}
