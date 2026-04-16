import { Link } from "react-router-dom";
import { formatUnits } from "viem";
import type { RequestData } from "../hooks/usePoolData";
import { USDC_DECIMALS, CATEGORIES } from "../constants";

function getStatus(req: RequestData): { label: string; color: string; icon: string } {
  if (req.executed) return { label: "Pagado", color: "bg-brand-100 text-brand-800", icon: "\u2705" };
  if (req.closed) return { label: "Rechazado", color: "bg-red-100 text-red-700", icon: "\u274C" };
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now < req.votingDeadline) return { label: "Votando", color: "bg-blue-100 text-blue-700", icon: "\u{1F5F3}" };
  return { label: "Por ejecutar", color: "bg-amber-100 text-amber-700", icon: "\u23F3" };
}

function timeLeft(deadline: bigint): string {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now >= deadline) return "Cerrado";
  const diff = Number(deadline - now);
  const hours = Math.floor(diff / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function RequestCard({ request }: { request: RequestData }) {
  const status = getStatus(request);
  const amount = formatUnits(request.amount, USDC_DECIMALS);
  const cat = CATEGORIES[request.category] ?? CATEGORIES["otro"]!;
  const totalVotes = Number(request.yesVotes) + Number(request.noVotes);
  const yesPct = totalVotes > 0 ? (Number(request.yesVotes) / totalVotes) * 100 : 50;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const isActive = now < request.votingDeadline && !request.executed && !request.closed;

  return (
    <Link
      to={`/request/${request.id.toString()}`}
      className="block bg-white rounded-xl shadow-sm overflow-hidden active:shadow-md transition-shadow"
    >
      <div className="p-4 space-y-3">
        {/* Top row: category + status */}
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cat.color}`}>
            {cat.icon} {cat.label}
          </span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${status.color}`}>
            {status.icon} {status.label}
          </span>
        </div>

        {/* Title + amount */}
        <div className="flex justify-between items-start gap-3">
          <p className="font-semibold text-sm text-gray-800 leading-snug flex-1 line-clamp-2">
            {request.title}
          </p>
          <p className="text-sm font-bold text-brand-700 whitespace-nowrap">
            ${amount}
          </p>
        </div>

        {/* Vote progress bar */}
        {totalVotes > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
              <div
                className="bg-brand-400 rounded-full transition-all duration-500"
                style={{ width: `${yesPct}%` }}
              />
              <div
                className="bg-red-300 rounded-full transition-all duration-500"
                style={{ width: `${100 - yesPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{Number(request.yesVotes)} a favor</span>
              <span>{Number(request.noVotes)} en contra</span>
            </div>
          </div>
        )}

        {/* Time remaining for active */}
        {isActive && (
          <p className="text-[10px] text-gray-400">
            &#9200; {timeLeft(request.votingDeadline)} restantes para votar
          </p>
        )}
      </div>
    </Link>
  );
}
