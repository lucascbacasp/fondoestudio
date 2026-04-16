import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "CELO");

  // Deploy MockUSDC
  console.log("\nDeploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log("MockUSDC deployed at:", usdcAddr);

  // Deploy FondoEstudio
  console.log("\nDeploying FondoEstudio...");
  const FondoEstudio = await ethers.getContractFactory("FondoEstudio");
  const fondo = await FondoEstudio.deploy(usdcAddr);
  await fondo.waitForDeployment();
  const fondoAddr = await fondo.getAddress();
  console.log("FondoEstudio deployed at:", fondoAddr);

  // Mint some USDC to deployer for testing
  console.log("\nMinting 1000 USDC to deployer...");
  const tx = await usdc.mint(deployer.address, 1_000_000_000n); // 1000 USDC
  await tx.wait();
  console.log("Minted 1000 USDC to", deployer.address);

  console.log("\n=== DEPLOY SUMMARY ===");
  console.log("Network: celo-sepolia");
  console.log("MockUSDC:", usdcAddr);
  console.log("FondoEstudio:", fondoAddr);
  console.log("======================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
