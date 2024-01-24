// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@layerzerolabs/solidity-examples/contracts/token/oft/v1/OFT.sol";

// @dev example implementation inheriting a OFT
contract DecaFT is OFT {
    constructor(address _layerZeroEndpoint) OFT("DecaFT", "DFT", _layerZeroEndpoint) {}

    // @dev WARNING public mint function, do not use this in production
    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }
}