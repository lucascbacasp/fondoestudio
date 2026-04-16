import { celo, celoSepolia } from "wagmi/chains";
import type { Address } from "viem";

export const USDC_ADDRESS: Record<number, Address> = {
  [celo.id]: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  [celoSepolia.id]: "0x4c70B59a72E9D9408B8555Bc70a22a8341ADbf03",
};

export const FONDO_ADDRESS: Record<number, Address> = {
  [celo.id]: "0x0000000000000000000000000000000000000000",
  [celoSepolia.id]: "0x51b389ac394ecA85f1b421cE32038bb2673cF7E0",
};

export const FONDO_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "category", type: "string" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "evidenceUrl", type: "string" },
    ],
    name: "submitRequest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "requestId", type: "uint256" },
      { name: "support", type: "bool" },
    ],
    name: "vote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "requestId", type: "uint256" }],
    name: "execute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getRequests",
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "id", type: "uint256" },
          { name: "requester", type: "address" },
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "category", type: "string" },
          { name: "amount", type: "uint256" },
          { name: "beneficiary", type: "address" },
          { name: "evidenceUrl", type: "string" },
          { name: "votingDeadline", type: "uint256" },
          { name: "yesVotes", type: "uint256" },
          { name: "noVotes", type: "uint256" },
          { name: "executed", type: "bool" },
          { name: "closed", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMemberCount",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalPoolBalance",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "isMember",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "memberDeposits",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    name: "hasVoted",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const USDC_DECIMALS = 6;
export const MIN_DEPOSIT_USDC = 1;
export const VOTING_HOURS = 48;
export const QUORUM_PERCENT = 30;

export const CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  utiles: { label: "Utiles", icon: "\u{1F4DA}", color: "bg-blue-100 text-blue-700" },
  beca: { label: "Beca", icon: "\u{1F393}", color: "bg-purple-100 text-purple-700" },
  uniforme: { label: "Uniforme", icon: "\u{1F455}", color: "bg-pink-100 text-pink-700" },
  cuota: { label: "Cuota", icon: "\u{1F4B3}", color: "bg-amber-100 text-amber-700" },
  infraestructura: { label: "Infraestructura", icon: "\u{1F3EB}", color: "bg-teal-100 text-teal-700" },
  otro: { label: "Otro", icon: "\u{1F4E6}", color: "bg-gray-100 text-gray-700" },
};
