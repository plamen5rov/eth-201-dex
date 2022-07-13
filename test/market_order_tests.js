const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const truffleAssert = require('truffle-assertions');

contract.skip("Dex", accounts => {
    //When creating a SELL market order, the seller needs to have enough tokens for the trade
    it("Should throw an error when creating a SELL market order with no adequate balance",
        async () => {
            let dex = await Dex.deployed()
            let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));

            assert.equal(balance.toNumber(), 0, "Initial LINK balance is not 0");

            await truffleAssert.reverts(
                dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 10)
            )


        })

    //When creating a BUY market order, the seller needs to have enough ETH for the trade
    it("Should throw an error when creating a BUY market order with no adequate ETH balance",
        async () => {
            let dex = await Dex.deployed()
            let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));

            assert.equal(balance.toNumber(), 0, "Initial ETH balance is not 0");

            await truffleAssert.reverts(
                dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 10)
            )


        })

    //Market orders can be submitted even when the order book is empty
    it("Market orders can be submitted even when the order book is empty", async () => {
        let dex = await Dex.deployed();

        await dex.depositEth({ value: 10000 });

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0); //Get buy side orderbook

        assert(orderbook.length == 0, "Buy side orderbook is not 0");

        await truffleAssert.passes(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10)
        )


    })
    //Market orders should be filled untill the orderbook is empty or the order is 100% filled 
    it("Market orders should not fill more limit orders than the market order ammount", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side orderbook should be empty at the start of the test");

        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address);

        //Send LINK tokens to accounts 1, 2 and 3 from account 0
        await link.transfer(accounts[1], 50);
        await link.transfer(accounts[2], 50);
        await link.transfer(accounts[3], 50);

        // let balance = await link.balanceOf(accounts[1]);
        // console.log(balance.toNumber());

        //Approve DEX for accounts 1, 2 and 3
        await link.approve(dex.address, 50, { from: accounts[1] });
        await link.approve(dex.address, 50, { from: accounts[2] });
        await link.approve(dex.address, 50, { from: accounts[3] });

        //Deposit LINK into DEX for accounts 1, 2 and 3
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), { from: accounts[1] });
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), { from: accounts[2] });
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), { from: accounts[3] });

        //Fill up the SELL order book
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, { from: accounts[1] });
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 400, { from: accounts[2] });
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 500, { from: accounts[3] });

        //Create market order that should fill 2/3 orders in the book
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10);

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 1, "Sell side orderbook should have only 1 order left");
        assert(orderbook[0].filled == 0, "Sell side orderbook should have 0 filled");

    })


    //Market orders should be filled untill the orderbook is empty or the order is 100% filled
    it("Market orders should be filled untill the orderbook is empty", async () => {
        let dex = await Dex.deployed();

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 1, "Sell side orderbook should have only 1 order left");

        //Fill up the sell book order again
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 400, { from: accounts[1] });
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 500, { from: accounts[2] });

        //Check buyer balance before link purchase
        let balanceBefore = await link.balanceOf(accounts[0], web3.utils.fromUtf8("LINK"));

        //Create market order that can buy more than the entire order book (15 LINK)
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 50);

        //Check buyer balance after link purchase
        let balanceAfter = await link.balanceOf(accounts[0], web3.utils.fromUtf8("LINK"));

        //Buyer should have 15 more LINK, even thoug the order was for 50 LINK
        assert.equal(balanceBefore + 15, balanceAfter);

    })

    //The ETH balance of the buyer should decrease with the filled amount
    it("The ETH balance of the buyer should decrease with the filled amount", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();

        //Seller deposits LINK and creates a sell limit order for 1 LINK for 100 Wei 
        await link.approve(dex.address, 500, { from: accounts[1] });
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300, { from: accounts[1] });


        //Check buyer ETH balance before trade
        let balanceBefore = await link.balanceOf(accounts[0], web3.utils.fromUtf8("ETH"));
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 1);
        let balanceAfter = await link.balanceOf(accounts[0], web3.utils.fromUtf8("ETH"));

        assert.equal(balanceBefore - 300, balanceAfter);

    })

    //The token balances of the limit order sellers should decrease with the filled ammounts
    it("The token balances of the limit order sellers should decrease with the filled ammounts", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side orderbook should be empty at the start of the test");

        //Seller Account[1] has already approved and deposited LINK

        //Seller Account[2] deposits LINK
        await link.approve(dex.address, 500, { from: accounts[2] });
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), { from: accounts[2] });

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300, { from: accounts[1] });
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 400, { from: accounts[2] });

        //Check sellers LINK balances before trade
        let account1balanceBefore = await link.balanceOf(accounts[1], web3.utils.fromUtf8("LINK"));
        let account2balanceBefore = await link.balanceOf(accounts[2], web3.utils.fromUtf8("LINK"));

        //Account[0] creates market order to buy up both sell orders
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 2);

        //Check sellers LINK balances after trade
        let account1balanceAfter = await link.balanceOf(accounts[1], web3.utils.fromUtf8("LINK"));
        let account2balanceAfter = await link.balanceOf(accounts[2], web3.utils.fromUtf8("LINK"));

        assert.equal(account1balanceBefore - 1, account1balanceAfter);
        assert.equal(account2balanceBefore - 1, account2balanceAfter);

    })
})