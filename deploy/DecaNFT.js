const LZ_ENDPOINTS = require("../constants/layerzeroEndpoints.json")
const CHAIN_IDS = require("../constants/chainIds.json");

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    console.log(`>>> your address: ${deployer}`)

    const lzEndpointAddress = LZ_ENDPOINTS[hre.network.name]
    console.log(`[${hre.network.name}] Endpoint Address: ${lzEndpointAddress}`)

    await deploy("DecaNFT", {
        from: deployer,
        args: ["", "DecaNFT", "DNFT", 150000, lzEndpointAddress], // mainnet
        log: true,
        waitConfirmations: 3,
        skipIfAlreadyDeployed: true
    })

    let onft = await ethers.getContract("DecaNFT")

    //let enabledChains = ["ethereum", "bsc", "arbitrum", "polygon"] // mainnet
    let enabledChains = ["ethereum-goerli", "manta-testnet"] // testnet

    if (enabledChains.includes(hre.network.name)) {
        if (hre.network.name == "arbitrum" || hre.network.name == "arbitrum-goerli") {
            await(await onft.setMinGasToTransferAndStore(500000)).wait()
        }

        for (let n of enabledChains) {
            if (n != hre.network.name) {
                await(await onft.setDstChainIdToTransferGas(CHAIN_IDS[n], 50000)).wait()
                await(await onft.setDstChainIdToBatchLimit(CHAIN_IDS[n], 25)).wait()
                await(await onft.setMinDstGas(CHAIN_IDS[n], 1, 150000)).wait()
            }
        }
    }

    await hre.run("verifyContract", { contract: "DecaNFT" })
}

module.exports.tags = ["DecaNFT"]
