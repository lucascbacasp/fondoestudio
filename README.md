# FondoEstudio

> **Si necesitas ayuda para estudiar, la comunidad te respalda.**
> Becas, utiles, uniformes o cuotas — pedi financiamiento y la comunidad vota. Sin intermediarios, 100% transparente.

FondoEstudio es una **mini-app para MiniPay** (Opera Mini) deployada en **Celo**. Es un fondo comunitario de educacion gobernado on-chain: cualquiera dona USDC al pool, cualquiera puede pedir financiamiento para sus estudios, y los miembros votan para aprobar cada pedido. Si se aprueba, el contrato ejecuta el pago automaticamente.

**Problema que resuelve:** organizaciones comunitarias y estudiantes que dependen de colectas informales sin transparencia. Todo on-chain = nadie puede fugarse con los fondos, todos ven los votos, la ayuda llega directo al beneficiario.

## Live demo

- **App:** https://frontend-86q40j13r-lucascbacasps-projects.vercel.app
- **Network:** Celo Sepolia testnet (chainId 11142220)
- **FondoEstudio contract:** [`0x51b389ac394ecA85f1b421cE32038bb2673cF7E0`](https://repo.sourcify.dev/contracts/full_match/11142220/0x51b389ac394ecA85f1b421cE32038bb2673cF7E0/) (verified on Sourcify)
- **Mock USDC contract:** `0x4c70B59a72E9D9408B8555Bc70a22a8341ADbf03`

## Como funciona

| Paso | Accion |
|------|--------|
| **Dona** | Aporta USDC al fondo. Con 1 USDC te convertis en miembro con derecho a voto. |
| **Pedido** | Cualquiera pide financiamiento: beca, utiles, uniforme, cuota, infraestructura. |
| **Vota** | Los miembros votan 48hs. Se necesita 30% de quorum y mayoria simple. |
| **Pago** | Si se aprueba, el contrato transfiere los USDC directo al beneficiario. |

## Stack

### Contrato
- Solidity ^0.8.20
- OpenZeppelin (IERC20, Ownable, ReentrancyGuard)
- Hardhat 2 + Hardhat Ignition
- Deployado y verificado en **Celo Sepolia** via Sourcify

### Frontend
- **React 19** + **Vite** + **TypeScript**
- **Tailwind CSS v4** (mobile-first, max-w-lg)
- **wagmi v3** + **viem v2** + **@tanstack/react-query**
- Conector `injected()` — compatible con MiniPay y wallets estandar
- Deployado en **Vercel**

## Estructura

```
fondoestudio/
├── contracts/                    # Proyecto Hardhat
│   ├── contracts/
│   │   ├── FondoEstudio.sol      # Contrato principal
│   │   └── MockUSDC.sol          # USDC mock para testing
│   ├── test/
│   │   └── FondoEstudio.test.ts  # 27/27 tests passing
│   ├── ignition/modules/         # Deploy modules
│   └── scripts/deploy-testnet.ts # Deploy script
└── frontend/                     # Proyecto React + Vite
    └── src/
        ├── components/           # UI components (mobile-first)
        ├── hooks/                # wagmi hooks
        ├── pages/                # Home, RequestPage, NewRequest
        ├── wagmi.ts              # wagmi config
        └── constants.ts          # Addresses, ABI, categorias
```

## Correr localmente

### Contratos

```bash
cd contracts
pnpm install

# Compilar
pnpm hardhat compile

# Correr tests
pnpm hardhat test

# Deploy a Celo Sepolia (requiere PRIVATE_KEY en .env)
pnpm hardhat run scripts/deploy-testnet.ts --network celo-sepolia
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev        # localhost:5173
pnpm build      # produccion
```

## Decisiones de diseño

**¿Por que USDC y no cUSD?**
MiniPay deprecó cUSD en su documentacion. La recomendacion oficial es USDC, USDT, o USDm.

**¿Por que quorum por cantidad de miembros y no por monto depositado?**
Mas simple y mas justo para la comunidad. Un miembro = un voto, democracia directa.

**¿Por que `execute` es publico?**
Cualquiera puede llamarlo una vez cerrada la ventana de votacion. Asi la app no depende de un backend que dispare la ejecucion — cualquier usuario o bot puede hacerlo.

**Categorias de pedido soportadas:**
Utiles escolares · Beca · Uniforme · Cuota · Infraestructura · Otro

## Seguridad

- `ReentrancyGuard` en funciones que manejan USDC
- `Ownable` solo para retiro de excedente no comprometido
- Todos los pagos pasan por aprobacion comunitaria con quorum
- Tests cubren: deposits, membership, voting, execution, quorum, rejection
- Contrato verificado on-chain en [Sourcify](https://repo.sourcify.dev/contracts/full_match/11142220/0x51b389ac394ecA85f1b421cE32038bb2673cF7E0/)

## Roadmap

- [ ] Deploy a Celo mainnet (USDC real)
- [ ] Submit a MiniPay mini-app portal
- [ ] Retiro parcial para miembros (v2)
- [ ] Identidad verificada via Self Protocol (para anti-sybil)
- [ ] Notificaciones de resultado por email/push

## Licencia

MIT
