import { useState } from "react";

const STEPS = [
  {
    icon: "\u{1F4B0}",
    title: "Dona",
    desc: "Aporta al fondo",
    detail:
      "Cualquier persona puede donar USDC al fondo comunitario. Con solo 1 USDC te convertis en miembro y ganas voz y voto para decidir a quien se ayuda. Tu aporte queda protegido en un contrato inteligente en Celo: nadie puede moverlo sin aprobacion colectiva.",
  },
  {
    icon: "\u{1F64B}",
    title: "Pedido",
    desc: "Pedi tu beca",
    detail:
      "Si necesitas ayuda para estudiar, no importa tu situacion: podes pedir financiamiento. Becas universitarias, utiles escolares, uniformes, cuotas o infraestructura para tu escuela. Describis que necesitas, cuanto y a donde van los fondos. No necesitas ser miembro para pedir.",
  },
  {
    icon: "\u{1F5F3}\u{FE0F}",
    title: "Vota",
    desc: "La comunidad decide",
    detail:
      "Los miembros del fondo tienen 48 horas para votar a favor o en contra de cada pedido. Se necesita que al menos el 30% participe y que la mayoria apruebe. Un miembro = un voto, sin importar cuanto dono. Democracia directa.",
  },
  {
    icon: "\u{1F4AB}",
    title: "Pago",
    desc: "Directo y sin trabas",
    detail:
      "Si se aprueba, el contrato transfiere los USDC directo a la wallet del beneficiario. No hay intermediarios, no hay burocracia, no hay demoras. Todo queda registrado en la blockchain y cualquiera puede verificarlo.",
  },
];

export default function HowItWorks() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Steps row */}
      <div className="flex items-stretch px-2 py-2.5">
        {STEPS.map((step, i) => (
          <button
            key={i}
            onClick={() => setActive(active === i ? null : i)}
            className={`flex-1 text-center relative transition-colors rounded-lg py-1 ${
              active === i ? "bg-brand-50" : "active:bg-gray-50"
            }`}
          >
            {i < STEPS.length - 1 && (
              <div className="absolute top-3.5 right-0 w-full h-px bg-brand-200 -z-0" />
            )}
            <span className="text-xl relative z-10 bg-white px-1">{step.icon}</span>
            <p className={`text-[10px] font-bold mt-0.5 ${active === i ? "text-brand-700" : "text-gray-700"}`}>
              {step.title}
            </p>
            <p className="text-[9px] text-gray-400 leading-tight">{step.desc}</p>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {active !== null && (
        <div className="border-t border-brand-100 bg-brand-50/50 px-4 py-3 flex gap-3 items-start animate-fade-in">
          <span className="text-2xl shrink-0 mt-0.5">{STEPS[active]!.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-brand-800">{STEPS[active]!.title}</p>
            <p className="text-[11px] text-gray-600 leading-relaxed mt-1">
              {STEPS[active]!.detail}
            </p>
          </div>
          <button
            onClick={() => setActive(null)}
            className="text-gray-300 text-lg leading-none shrink-0 active:text-gray-500"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
