import { formatUnits } from "viem";
import type { RequestData } from "../hooks/usePoolData";
import { USDC_DECIMALS, CATEGORIES } from "../constants";
import VoteButtons from "./VoteButtons";
import ExecuteButton from "./ExecuteButton";

function timeLeft(deadline: bigint): { text: string; urgent: boolean } {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now >= deadline) return { text: "Votacion cerrada", urgent: false };
  const diff = Number(deadline - now);
  const hours = Math.floor(diff / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  const urgent = hours < 6;
  if (hours > 0) return { text: `${hours}h ${mins}m restantes`, urgent };
  return { text: `${mins}m restantes`, urgent };
}

export default function RequestDetail({ request }: { request: RequestData }) {
  const amount = formatUnits(request.amount, USDC_DECIMALS);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const isActive = now < request.votingDeadline && !request.executed && !request.closed;
  const isExpired = now >= request.votingDeadline && !request.executed && !request.closed;
  const cat = CATEGORIES[request.category] ?? CATEGORIES["otro"]!;
  const totalVotes = Number(request.yesVotes) + Number(request.noVotes);
  const yesPct = totalVotes > 0 ? Math.round((Number(request.yesVotes) / totalVotes) * 100) : 0;
  const timer = timeLeft(request.votingDeadline);

  return (
    <div className="space-y-4">
      {/* Main card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Status bar */}
        {request.executed && (
          <div className="bg-gradient-to-r from-brand-500 to-brand-400 px-4 py-2.5 text-white text-sm font-semibold text-center">
            &#9989; Aprobado y pagado
          </div>
        )}
        {request.closed && (
          <div className="bg-gradient-to-r from-red-500 to-red-400 px-4 py-2.5 text-white text-sm font-semibold text-center">
            &#10060; Rechazado / Sin quorum
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Category + timer */}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cat.color}`}>
              {cat.icon} {cat.label}
            </span>
            {isActive && (
              <span className={`text-xs font-medium ${timer.urgent ? "text-red-500" : "text-gray-400"}`}>
                &#9200; {timer.text}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-bold text-xl text-gray-900 leading-snug">
            {request.title}
          </h1>

          {/* Description */}
          {request.description && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {request.description}
            </p>
          )}

          {/* Amount — hero */}
          <div className="bg-brand-50 rounded-xl p-4 text-center">
            <p className="text-[11px] text-brand-600 uppercase tracking-wide font-medium">
              Monto solicitado
            </p>
            <p className="text-3xl font-extrabold text-brand-700 mt-1">
              ${amount}
              <span className="text-sm font-normal text-brand-400 ml-1">USDC</span>
            </p>
          </div>

          {/* Vote progress */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Votacion {totalVotes > 0 ? `(${totalVotes} votos)` : ""}
            </p>

            {/* Progress bar */}
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
              {totalVotes > 0 ? (
                <>
                  <div
                    className="bg-gradient-to-r from-brand-400 to-brand-500 rounded-l-full transition-all duration-700"
                    style={{ width: `${yesPct}%` }}
                  />
                  <div
                    className="bg-gradient-to-r from-red-300 to-red-400 rounded-r-full transition-all duration-700"
                    style={{ width: `${100 - yesPct}%` }}
                  />
                </>
              ) : (
                <div className="w-full bg-gray-100 rounded-full" />
              )}
            </div>

            {/* Vote counts */}
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-brand-400 rounded-full" />
                <span className="font-bold text-gray-700">{Number(request.yesVotes)}</span>
                <span className="text-gray-400">a favor</span>
                {totalVotes > 0 && (
                  <span className="text-xs text-gray-300">({yesPct}%)</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">en contra</span>
                <span className="font-bold text-gray-700">{Number(request.noVotes)}</span>
                <div className="w-2.5 h-2.5 bg-red-400 rounded-full" />
              </div>
            </div>
          </div>

          {/* Beneficiary */}
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 shrink-0">&#128100; Beneficiario:</span>
              <span className="font-mono text-gray-600 truncate">{request.beneficiary}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 shrink-0">&#128221; Solicitante:</span>
              <span className="font-mono text-gray-600 truncate">{request.requester}</span>
            </div>
          </div>

          {/* Evidence */}
          {request.evidenceUrl && (
            <a
              href={request.evidenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-blue-500 hover:text-blue-600 font-medium"
            >
              &#128279; Ver evidencia adjunta
            </a>
          )}
        </div>
      </div>

      {/* Actions */}
      {isActive && <VoteButtons requestId={request.id} isActive={isActive} />}
      {isExpired && <ExecuteButton requestId={request.id} />}
    </div>
  );
}
