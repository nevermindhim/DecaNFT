// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SpheraToken is ERC20 {
    // Error Codes
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {
        _mint(msg.sender, 100000000);
    }

    function mint(uint _amount) public {
        _mint(msg.sender, _amount);
    }
}
