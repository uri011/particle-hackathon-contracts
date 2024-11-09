/* eslint-disable arrow-parens */
import hre from "hardhat";
import DeployHelper from "./deploys";

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
}

main().catch((error) => {
  console.error("Error in deployment script", error);
  process.exit(1);
});
