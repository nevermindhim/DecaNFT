const LZ_ENDPOINTS = require("../constants/layerzeroEndpoints.json")
const CHAIN_IDS = require("../constants/chainIds.json");
const { ethers, upgrades } = require("hardhat");
require('@openzeppelin/hardhat-upgrades');

module.exports = async function ({ deployments, getNamedAccounts }) {
    // const { deploy } = deployments
    // const { deployer } = await getNamedAccounts()
    // console.log(`>>> your address: ${deployer}`)

    // await deployProxyImpl("DecaNFT", {
    //     from: deployer,
    //     args: ["", "DecaNFT", "DNFT"], // mainnet
    //     log: true,
    //     waitConfirmations: 3,
    //     skipIfAlreadyDeployed: true
    // })
    const Dnft = await ethers.getContractFactory("DecaNFT");
    const dnft = await upgrades.deployProxy(Dnft, ["", "DecaNFT", "DNFT"]);
    await dnft.deployed();
    await dnft.setMintState(true);
    console.log("DecaNFT deployed to:", dnft.address);

    await hre.run("verifyContract", { contract: "DecaNFT" })
}

module.exports.tags = ["DecaNFT"]
