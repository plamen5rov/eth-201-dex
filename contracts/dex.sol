// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
pragma experimental ABIEncoderV2;

import "./wallet.sol";

contract Dex is Wallet {
    using SafeMath for uint256;

    enum Side {
        BUY,
        SELL
    }

    struct Order {
        uint256 id;
        address trader;
        Side side;
        bytes32 ticker;
        uint256 amount;
        uint256 price;
    }

    uint256 public nextOrderId = 0;

    mapping(bytes32 => mapping(uint256 => Order[])) public orderBook;

    function getOrderBook(bytes32 ticker, Side side)
        public
        view
        returns (Order[] memory)
    {
        return orderBook[ticker][uint256(side)];
    }

    function createLimitOrder(
        Side side,
        bytes32 ticker,
        uint256 amount,
        uint256 price
    ) public {
        if (side == Side.BUY) {
            require(balances[msg.sender]["ETH"] >= amount.mul(price));
        } else if (side == Side.SELL) {
            require(balances[msg.sender][ticker] >= amount);
        }

        Order[] storage orders = orderBook[ticker][uint256(side)];

        orders.push(
            Order(nextOrderId, msg.sender, side, ticker, amount, price)
        );

        //BUBBLE SORT

        uint256 i = orders.length > 0 ? orders.length - 1 : 0;

        if (side == Side.BUY) {
            while (i > 0) {
                if (orders[i - 1].price > orders[i].price) {
                    break;
                }
                Order memory orderToMove = orders[i - 1];
                orders[i - 1] = orders[1];
                orders[1] = orderToMove;
                i--;
            }
        } else if (side == Side.SELL) {
            while (i > 0) {
                if (orders[i - 1].price < orders[i].price) {
                    break;
                }
                Order memory orderToMove = orders[i - 1];
                orders[i - 1] = orders[1];
                orders[1] = orderToMove;
                i--;
            }
        }

        nextOrderId++;
    }

    function createMarketOrder(
        Side side,
        bytes32 ticker,
        uint256 amount
    ) public {
        uint256 orderBookSide;
        if (side == Side.BUY) {
            orderBookSide = 1;
        } else {
            orderBookSide = 0;
            require(
                balances[msg.sender][ticker] >= amount,
                "Insufficient balance!"
            );
        }

        Order[] storage orders = orderBook[ticker][orderBookSide];

        uint256 totalFilled = 0;

        for (uint256 i = 0; i < orders.length && totalFilled < amount; i++) {
            //How much we can fill from order[i]
            uint256 leftToFill = amount.sub(totalFilled);
            uint256 availableToFill = orders[i].amount.sub(orders[i].filled);
            uint256 filled = 0;
            if (availableToFill > leftToFill) {
                filled = leftToFill;
            } else {
                filled = availableToFill;
            }
            //Update totalFilled
            totalFilled = totalFilled.add(filled);
            orders[i].filled = orders[i].filled.add(filled);
            uint256 cost = filled.mul(orders[i].price);

            //Execute trade & shift balances between buyer and seller
            //Verify that the buyer has enough ETH to cover the trade

            if (side == Side.BUY) {
                require(
                    balances[msg.sender]["ETH"] >= filled.mul(orders[i].price)
                );
            } else {}
        }
        //Loop trough the order book and remove 100% filled orders
    }
}
