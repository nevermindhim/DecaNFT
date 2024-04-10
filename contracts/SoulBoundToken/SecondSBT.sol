// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract SecondSBT is ERC721 {
    address public owner;
    address public manager;
    address public backend;

    uint private _tokenIdCounter;
    mapping(address => uint) public nonces;

    event SafeMint(address indexed to);

    constructor(address _manager, address _backend) ERC721("SecondSBT", "SSBT") {
        owner = msg.sender;
        manager = _manager;
        backend = _backend;
    }

    modifier onlyManager() {
        require(msg.sender == manager, "Only the manager can call this function");
        _;
    }

    function _beforeTokenTransfer(address from, address to, uint tokenId, uint batchSize) internal override {
        require(from == address(0), "SoulBoundToken not transferable");
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function safeMint(address to, bytes memory signature) external onlyManager {
        permit(backend, to, signature);
        _tokenIdCounter += 1;
        _safeMint(to, _tokenIdCounter);
        emit SafeMint(to);
    }

    function permit(address signer, address to, bytes memory signature) internal {
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        address recoveredAddress = ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encode(to, name(), nonces[to]++)))), v, r, s);

        require(recoveredAddress != address(0) && recoveredAddress == signer, "INVALID_SIGNER");
    }
}
