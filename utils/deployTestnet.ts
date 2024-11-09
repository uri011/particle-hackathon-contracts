/* eslint-disable arrow-parens */
import hre from "hardhat";
import { ethers } from "ethers";
// import { ethers as hhEthers } from "hardhat";
import DeployHelper from "./deploys";
import { ether } from "./common";
import { ADDRESS_ZERO } from "./constants";
import { erc20Abi, setTokenAbi } from "./abi";

async function main() {
  console.log("Starting deployment script...");

  // Create a new random wallet and connect it with provider
  const [deploySigner] = await hre.ethers.getSigners();

  const deployer = new DeployHelper(deploySigner);

  console.log(`Protocol Owner & Fee Recipient: ${deploySigner.address}`);

  // Deploy Controller
  const controller = await deployer.core.deployController(deploySigner.address);
  console.log(`Controller deployed to address: ${controller.address}`);

  // Deploy SetTokenCreator
  const setTokenCreator = await deployer.core.deploySetTokenCreator(controller.address);
  console.log(`SetTokenCreator deployed to address: ${setTokenCreator.address}`);

  // Deploy BasicIssuanceModule
  const basicIssuanceModule = await deployer.modules.deployBasicIssuanceModule(controller.address);
  console.log(`BasicIssuanceModule deployed to address: ${basicIssuanceModule.address}`);

  // Deploy StreamingFeeModule
  const streamingFeeModule = await deployer.modules.deployStreamingFeeModule(controller.address);
  console.log(`StreamingFeeModule deployed to address: ${streamingFeeModule.address}`);

  // Initialize Controller with SetTokenCreator, BasicIssuanceModule, & StreamingFeeModule
  await controller
    .connect(deploySigner)
    .initialize(
      [setTokenCreator.address],
      [basicIssuanceModule.address, streamingFeeModule.address],
      [],
      [],
    );

  console.log("Deployment and initialization complete.");

  // SET TOKEN CREATION

  const tx = await setTokenCreator.create(
    ["0x8858bd3ca0677e85cb72aa8fe6780b9c037d73eb", "0x735461a1ce356c382396c45da35eff9a586282db"],
    [ether(1), ether(1)],
    [basicIssuanceModule.address],
    deploySigner.address,
    "The ETH-BTC Set",
    "EBS",
  );

  const receipt = await tx.wait();

  // START: EXTRACT DEPLOYED CONTRACT ADDRESS FROM EVENT

  const abi = [
    "event SetTokenCreated(address indexed _setToken, address _manager, string _name, string _symbol)",
  ];
  const iface = new ethers.utils.Interface(abi);

  const parsed = iface.parseLog(receipt.logs[receipt.logs.length - 1]);

  const setTokenAddress = parsed.args._setToken;

  // END: EXTRACT DEPLOYED CONTRACT ADDRESS FROM EVENT

  const setToken = new ethers.Contract(setTokenAddress, setTokenAbi);

  console.log(`Set Token Address: ${setToken.address}`);

  const isTokenEnabled = await controller.isSet(setToken.address);

  console.log(`Set Token Enabled Check: ${isTokenEnabled}`);

  await basicIssuanceModule.connect(deploySigner).initialize(setToken.address, ADDRESS_ZERO);

  const isModuleEnabled = await setToken
    .connect(deploySigner)
    .isInitializedModule(basicIssuanceModule.address);

  console.log(`Basic Issuance Module Enabled Check: ${isModuleEnabled}`);

  // ISSUE TOKEN

  const ethErc20 = new ethers.Contract("0x8858bd3ca0677e85cb72aa8fe6780b9c037d73eb", erc20Abi);
  const uniErc20 = new ethers.Contract("0x735461a1ce356c382396c45da35eff9a586282db", erc20Abi);

  await ethErc20.connect(deploySigner).approve(basicIssuanceModule.address, ether(1));
  await uniErc20.connect(deploySigner).approve(basicIssuanceModule.address, ether(1));

  await basicIssuanceModule
    .connect(deploySigner)
    .issue(setToken.address, ether(1), deploySigner.address);

  console.log("TOKEN ISSUED!!!!");

  const balance = await setToken.connect(deploySigner).balanceOf(deploySigner.address);
  console.log(`Owner Account Balance: ${balance}`);
}

main().catch((error) => {
  console.error("Error in deployment script", error);
  process.exit(1);
});
