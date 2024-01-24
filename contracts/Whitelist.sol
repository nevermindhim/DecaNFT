//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Whitelist is Ownable {
    bytes32 private merkleRoot;

    function setMerkleRoot(bytes32 newRoot) public onlyOwner() returns (bytes32) {
        merkleRoot = newRoot;
        return merkleRoot;
    }

    function validateAddress(
        bytes32[] memory _merkleProof,
        address addr
    ) public view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(addr));
        return MerkleProof.verify(_merkleProof, merkleRoot, leaf);
    }
}
