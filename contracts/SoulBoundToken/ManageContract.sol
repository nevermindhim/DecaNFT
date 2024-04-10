// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface ISBT {
    function safeMint(address to, bytes memory signature) external;
}

contract ManageContract {
    address public owner;
    mapping(uint => address) addressById;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    function registerSBTContract(uint contractId, address contractAddress) public onlyOwner {
        addressById[contractId] = contractAddress;
    }

    function getSBTContract(uint contractId) public view returns (address) {
        return addressById[contractId];
    }

    function mint(uint contractId, bytes memory signature) public {
        ISBT(addressById[contractId]).safeMint(msg.sender, signature);
    }
}
