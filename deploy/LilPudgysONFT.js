const LZ_ENDPOINTS = require("../constants/layerzeroEndpoints.json")

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    console.log(`>>> your address: ${deployer}`)

    const lzEndpointAddress = LZ_ENDPOINTS[hre.network.name]
    console.log(`[${hre.network.name}] Endpoint Address: ${lzEndpointAddress}`)

    await deploy("LilPudgysONFT", {
        from: deployer,
        args: ["https://api.pudgypenguins.io/lil/", "LilPudgys", "LP", lzEndpointAddress], // mainnet
        // args: ["https://api.pudgypenguins.io/lil/", "LilPudgys", "LP", lzEndpointAddress], // testnet
        log: true,
        waitConfirmations: 3,
    })

    await hre.run("verifyContract", { contract: "LilPudgysONFT" })
}

module.exports.tags = ["LilPudgysONFT"]
