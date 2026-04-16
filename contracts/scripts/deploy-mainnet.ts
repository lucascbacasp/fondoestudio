import { ethers } from "hardhat";

// USDC oficial de Circle en Celo mainnet
const USDC_MAINNET = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "CELO\n");

  console.log("Deploying FondoEstudio (USDC =", USDC_MAINNET, ")...");
  const FondoEstudio = await ethers.getContractFactory("FondoEstudio");
  const fondo = await FondoEstudio.deploy(USDC_MAINNET);
  await fondo.waitForDeployment();
  const fondoAddr = await fondo.getAddress();

  console.log("\n=== MAINNET DEPLOY ===");
  console.log("Network: celo mainnet (chainId 42220)");
  console.log("USDC:", USDC_MAINNET);
  console.log("FondoEstudio:", fondoAddr);
  console.log("======================");
  console.log("\nTo verify:");
  console.log(`pnpm hardhat verify --network celo ${fondoAddr} ${USDC_MAINNET}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
