# SpheraHead (ONFT721)

## Deploy Setup

Add a `.env` file (to the root project directory) with your `MNEMONIC="your mnemonic"` and fund your wallet in order to deploy!

1. Deploy two contracts:

```shell
npx hardhat --network ethereum-sepolia deploy --tags SpheraKitBag
npx hardhat --network ethereum-sepolia deploy --tags SpheraHead
npx hardhat --network manta-testnet deploy --tags SpheraHead
```

2. Set the "trusted remotes", so each contract can send & receive messages from one another, and **only** one another.

```shell
npx hardhat --network ethereum-sepolia setTrustedRemote --target-network manta-testnet --contract SpheraHead
npx hardhat --network manta-testnet setTrustedRemote --target-network ethereum-sepolia --contract SpheraHead
```

3. Set the min gas required on the destination

```shell
npx hardhat --network ethereum-sepolia setMinDstGas --target-network manta-testnet --contract SpheraHead --packet-type 1 --min-gas 240000
npx hardhat --network manta-testnet setMinDstGas --target-network ethereum-sepolia --contract SpheraHead --packet-type 1 --min-gas 240000
```

4. Send ONFT across chains

```shell
npx hardhat --network ethereum-sepolia SpheraHeadSend --target-network manta-testnet --token-id 201 --contract SpheraHead
npx hardhat --network manta-testnet SpheraHeadSend --target-network ethereum-sepolia --token-id 200 --contract SpheraHead
```
