const LZ_ENDPOINTS = require("../constants/layerzeroEndpoints.json")

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    console.log(`>>> your address: ${deployer}`)

    const lzEndpointAddress = LZ_ENDPOINTS[hre.network.name]
    console.log(`[${hre.network.name}] Endpoint Address: ${lzEndpointAddress}`)

    await deploy("LilPudgysProxyONFT", {
        from: deployer,
        args: [lzEndpointAddress, "0x524cAB2ec69124574082676e6F654a18df49A048"],
        log: true,
        waitConfirmations: 1,
    })

    await hre.run("verifyContract", { contract: "LilPudgysProxyONFT" })
}

module.exports.tags = ["LilPudgysProxyONFT"]
