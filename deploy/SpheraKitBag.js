const LZ_ENDPOINTS = require("../constants/layerzeroEndpoints.json")
const CHAIN_IDS = require("../constants/chainIds.json");

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`>>> your address: ${deployer}`)
    
    const lzEndpointAddress = LZ_ENDPOINTS[hre.network.name]
    console.log(`[${hre.network.name}] Endpoint Address: ${lzEndpointAddress}`)

    // get the Endpoint address
    const _maxSupply = 3000;
    const _withdrawAddress = "0x43b1DB0EC2167C8811cA0216A35B3bEfc339689c";
    await deploy("SpheraKitBag", {
        from: deployer,
        args: [_maxSupply, _withdrawAddress, 100000, lzEndpointAddress],
        log: true,
        waitConfirmations: 3,
        //skipIfAlreadyDeployed: true
    })
    await hre.run("verifyContract", { contract: "SpheraKitBag" })
}

module.exports.tags = ["SpheraKitBag"]