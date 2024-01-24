const LZ_ENDPOINTS = require("../constants/layerzeroEndpoints.json")

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`>>> your address: ${deployer}`)

    // get the Endpoint address
    const endpointAddr = LZ_ENDPOINTS[hre.network.name]
    console.log(`[${hre.network.name}] LayerZero Endpoint address: ${endpointAddr}`)

    await deploy("DecaFT", {
        from: deployer,
        args: [endpointAddr],
        log: true,
        waitConfirmations: 1,
        skipIfAlreadyDeployed: true
    })
    await hre.run("verifyContract", { contract: "DecaFT" })
}

module.exports.tags = ["DecaFT"]