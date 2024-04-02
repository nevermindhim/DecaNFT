module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`>>> your address: ${deployer}`)

    await deploy("Market", {
        from: deployer,
        log: true,
        waitConfirmations: 3,
    })
    await hre.run("verifyContract", { contract: "Market" })
}

module.exports.tags = ["Market"]
