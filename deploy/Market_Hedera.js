module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`>>> your address: ${deployer}`)

    await deploy("Market_Hedera", {
        from: deployer,
        log: true,
        waitConfirmations: 3,
    })
    await hre.run("verifyContract", { contract: "Market_Hedera" })
}

module.exports.tags = ["Market_Hedera"]
