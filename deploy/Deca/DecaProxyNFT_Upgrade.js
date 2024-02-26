const LZ_ENDPOINTS = require("../../constants/layerzeroEndpoints.json")
const CHAIN_IDS = require("../../constants/chainIds.json");
const { ethers, upgrades } = require("hardhat");
require('@openzeppelin/hardhat-upgrades');

const UPGRADEABLE_PROXY = "0xB543de6eB727205700a705e3F5069F752e25Da63";

module.exports = async function () {
    const DecaNFT = await ethers.getContractFactory("DecaNFT");
    console.log("Upgrading Contract...");
    const decaNFT = await upgrades.upgradeProxy(UPGRADEABLE_PROXY, DecaNFT);
    await decaNFT.deployed();
    console.log("DecaNFT upgraded to:", decaNFT.address);
}

module.exports.tags = ["DecaProxyNFT_Upgrade"]
