const LZ_ENDPOINTS = require("../constants/layerzeroEndpoints.json")
const CHAIN_IDS = require("../constants/chainIds.json");
const { ethers, upgrades } = require("hardhat");
require('@openzeppelin/hardhat-upgrades');

module.exports = async function () {
    const DecaNFT = await ethers.getContractFactory("DecaNFT");
    const decaNFT = await upgrades.deployProxy(DecaNFT, ["", "DecaNFT", "DNFT"]);
    console.log("Deploying Contract...");
    await decaNFT.deployed();
    console.log("DecaProxyNFT deployed to:", decaNFT.address);
}

module.exports.tags = ["DecaProxyNFT"]