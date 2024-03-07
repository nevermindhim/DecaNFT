# SpheraHead

## Deploy Setup

1. Add a `.env` file (to the root project directory) with your `MNEMONIC="your mnemonic"` and fund your wallet in order to deploy!
2. Follow the steps

# SpheraHead (ONFT721)

This ONFT contract allows minting of `nftId`s on separate chains. To ensure two chains can not mint the same `nftId` each contract on each chain is only allowed to mint `nftIds` in certain ranges.

1. Deploy two contracts:

```shell
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
npx hardhat --network ethereum-sepolia setMinDstGas --target-network manta-testnet --contract SpheraHead --packet-type 1 --min-gas 100000
npx hardhat --network manta-testnet setMinDstGas --target-network ethereum-sepolia --contract SpheraHead --packet-type 1 --min-gas 100000
```

4. Mint an NFT on each chain!

```shell
npx hardhat --network ethereum-sepolia SpheraHeadMint --contract SpheraHead --token-id 201
npx hardhat --network manta-testnet SpheraHeadMint --contract SpheraHead --token-id 200
```

6. Send ONFT across chains

```shell
npx hardhat --network ethereum-sepolia SpheraHeadSend --target-network manta-testnet --token-id 201 --contract SpheraHead
npx hardhat --network manta-testnet SpheraHeadSend --target-network ethereum-sepolia --token-id 200 --contract SpheraHead
```
