const LZ_ENDPOINTS = require("../../constants/layerzeroEndpoints.json")
const CHAIN_IDS = require("../../constants/chainIds.json");

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`>>> your address: ${deployer}`)
    
    const lzEndpointAddress = LZ_ENDPOINTS[hre.network.name]
    console.log(`[${hre.network.name}] Endpoint Address: ${lzEndpointAddress}`)

    // get the Endpoint address
    const _name = "SpheraHead";
    const _symbol = "SPH";
    const _maxSupply = 3000;
    await deploy("SpheraHead", {
        from: deployer,
        args: [_name, _symbol, _maxSupply, 100000, lzEndpointAddress],
        log: true,
        waitConfirmations: 3,
        //skipIfAlreadyDeployed: true
    })
    await hre.run("verifyContract", { contract: "SpheraHead" })
}

module.exports.tags = ["SpheraHead"]