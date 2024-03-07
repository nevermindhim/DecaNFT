//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;


import '@openzeppelin/contracts/access/Ownable.sol';

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Whitelist is Ownable {
    bytes32 private gtdMerkleRoot;
    bytes32 private fcfsMerkleRoot;

    function setGtdMerkleRoot(bytes32 _gtdMerkleRoot) public onlyOwner() returns (bytes32) {
        gtdMerkleRoot = _gtdMerkleRoot;
        return gtdMerkleRoot;
    }
    function setFcfsMerkleRoot(bytes32 _fcfsMerkleRoot) public onlyOwner() returns (bytes32) {
        fcfsMerkleRoot = _fcfsMerkleRoot;
        return fcfsMerkleRoot;
    }

    function gtd_validateAddress(
        bytes32[] memory _merkleProof,
        address addr
    ) public view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(addr));
        return MerkleProof.verify(_merkleProof, gtdMerkleRoot, leaf);
    }
    function fcfs_validateAddress(
        bytes32[] memory _merkleProof,
        address addr
    ) public view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(addr));
        return MerkleProof.verify(_merkleProof, fcfsMerkleRoot, leaf);
    }
}
