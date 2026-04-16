import { Link } from "react-router-dom";
import { usePoolData } from "../hooks/usePoolData";
import RequestCard from "./RequestCard";

export default function RequestFeed() {
  const { requests, isLoading } = usePoolData();

  if (isLoading) {
    return (
      <div className="text-center py-6">
        <div className="inline-block w-5 h-5 border-2 border-brand-300 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-400 mt-1.5">Cargando pedidos...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-5 text-center space-y-3">
        <span className="text-3xl">&#127793;</span>
        <div>
          <p className="font-semibold text-sm text-gray-700">Todavia no hay pedidos</p>
          <p className="text-xs text-gray-400 leading-relaxed mt-1">
            Necesitas ayuda para estudiar? Pedi una beca,<br />
            utiles o lo que necesites. La comunidad te apoya.
          </p>
        </div>
        <Link
          to="/new"
          className="inline-block text-xs font-semibold text-brand-600 bg-brand-50 px-4 py-2 rounded-full active:bg-brand-100 transition-colors"
        >
          Crear mi primer pedido &#8594;
        </Link>
      </div>
    );
  }

  const sorted = [...requests].reverse();

  return (
    <div className="space-y-2.5">
      <h2 className="font-bold text-sm text-gray-700">
        Pedidos <span className="text-gray-400 font-normal">({requests.length})</span>
      </h2>
      {sorted.map((req) => (
        <RequestCard key={req.id.toString()} request={req} />
      ))}
    </div>
  );
}
