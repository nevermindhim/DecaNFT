const LZ_ENDPOINTS = require("../../constants/layerzeroEndpoints.json")
const deployArgs = require("../../constants/spheraHeadDeployArgs.json")

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`>>> your address: ${deployer}`)

    //Gets the Endpoint address
    const lzEndpointAddress = LZ_ENDPOINTS[hre.network.name]
    console.log(`[${hre.network.name}] Endpoint Address: ${lzEndpointAddress}`)
    await deploy("SpheraHead", {
        from: deployer,
        args: [deployArgs.name, deployArgs.symbol, deployArgs.maxSupply, 100000, lzEndpointAddress],
        log: true,
        waitConfirmations: 3,
    })
    console.log(`Contract was deployed with\n
        name: ${deployArgs.name}\n
        symbol: ${deployArgs.symbol}\n
        maxSupply: ${deployArgs.maxSupply}\n`)
    await hre.run("verifyContract", { contract: "SpheraHead" })
}

module.exports.tags = ["SpheraHead"]
