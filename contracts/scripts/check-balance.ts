import { ethers } from "hardhat";

const USDC_MAINNET = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Wallet:", signer.address);

  const celoBalance = await ethers.provider.getBalance(signer.address);
  console.log("CELO:", ethers.formatEther(celoBalance));

  const usdc = new ethers.Contract(USDC_MAINNET, ERC20_ABI, signer);
  const usdcBalance = await usdc.balanceOf(signer.address);
  const decimals = await usdc.decimals();
  const symbol = await usdc.symbol();
  console.log(`${symbol}:`, ethers.formatUnits(usdcBalance, decimals));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
