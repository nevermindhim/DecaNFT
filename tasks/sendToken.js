const CHAIN_ID = require("../constants/chainIds.json")

module.exports = async function (taskArgs, hre) {
    const signers = await ethers.getSigners()
    const owner = signers[0]
    const toAddress = owner.address;
    const remoteChainId = CHAIN_ID[taskArgs.targetNetwork]
    const tokenIds = [
        // 13473, //  fe team
        // 80, // fe team
        // 16756, // fe team
        // 10017 // fe team
    ]

    console.log(`Owner: ${toAddress}`)

    let onft = hre.network.name == "ethereum" ? await ethers.getContract("LilPudgysProxyONFT") : await ethers.getContract("LilPudgysONFT")
    let minGasToTransferAndStore = await onft.minDstGasLookup(remoteChainId, 1)
    let transferGasPerToken = await onft.dstChainIdToTransferGas(remoteChainId)
    let adapterParams = ethers.utils.solidityPack(["uint16", "uint256"], [1, minGasToTransferAndStore.add(transferGasPerToken.mul(tokenIds.length))])
    console.log(`AdapterParams dstGas: ${minGasToTransferAndStore.add(transferGasPerToken.mul(tokenIds.length)).toString()}`)

    let fees = await onft.estimateSendBatchFee(remoteChainId, toAddress, tokenIds, false, adapterParams)
    console.log(`fees[0] (wei): ${fees[0]} / (eth): ${ethers.utils.formatEther(fees[0])}`)

    console.log("Number Of Tokens: ", tokenIds.length)

    try {
        let tx = await (
            await onft.sendBatchFrom(
                owner.address,                  // 'from' address to send tokens
                remoteChainId,                  // remote LayerZero chainId
                toAddress,                      // 'to' address to send tokens
                tokenIds,                       // tokenIds to send
                owner.address,                  // refund address (if too much message fee is sent, it gets refunded)
                ethers.constants.AddressZero,   // address(0x0) if not paying in ZRO (LayerZero Token)
                adapterParams,                  // flexible bytes array to indicate messaging adapter services
                { value: fees[0] }
            )
        ).wait()
        console.log(`✅ [${hre.network.name}] send(${remoteChainId}, ${tokenIds})`)
        console.log(` tx: ${tx.transactionHash}`)
    } catch (e) {
        if (e.error?.message.includes("Message sender must own the OmnichainNFT.")) {
            console.log("*Message sender must own the OmnichainNFT.*")
        } else if (e.error?.message.includes("This chain is not a trusted source source.")) {
            console.log("*This chain is not a trusted source source.*")
        } else {
            console.log(e)
        }
    }
}