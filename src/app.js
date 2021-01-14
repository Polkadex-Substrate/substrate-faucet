// Copyright 2020 OAX Foundation Limited

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Telegram API client
const { Telegraf } = require("telegraf");
// this is for address format verification
const UtilCrypto = require("@polkadot/util-crypto");
// connect to the node
const { ApiPromise, WsProvider, Keyring } = require("@polkadot/api");
const { BN } = require("bn.js");
const fs = require("fs");
// this is .json additional types file
const ADDITIONAL_TYPES = require("./types/types.json");
const UNIT = new BN(1000000000000, 10);
const PolkadexFaucet = "spoil sponsor actor crash trap peace inject produce armed maid relax initial";
const USDFaucet = "donor endless angry below gate magic thrive orange apology fold defense outer";
const BTCFaucet = "movie buzz address salon soul sand advice slow install subject vicious total";

// this is the Generic Faucet Interface
class GenericFaucetInterface {
  constructor(config) {
    this.types = config.types;
    // pjs api
    this.api = undefined;
    this.mnemonic = config.mnemonic;
    this.keyRing = undefined;
    this.providerUrl = config.providerUrl;
    this.amount = config.amount;
    this.tokenName = config.tokenName;
    this.addressType = config.addressType;
    this.timeLimitHours = config.timeLimitHours;
    this.decimals = new BN(config.decimals);
    // Help message when user first starts or types help command
    this.helpMessage = `Welcome to the ${process.env.FAUCET_NAME}! 
    To request for tokens send the message: 
    "/request ADDRESS" 
    with your correct ${this.tokenName} address`;
    // Error Messages
    this.timeLimitMessage = `Sorry please wait for ${this.timeLimitHours} hours, between token requests from the same telegram account!`;
    this.invalidAddressMessage = `Invalid address! Plese use the generic substrate format with address type ${this.addressType}!`;
    // record storage (for time limit)
    this.polkadexrecords = {};
    this.btcrecords = {};
    this.usdrecords = {};
  }

  // tries to get valid address from message, if fails, returns undefined
  getAddressFromMessage(message) {
    const address = message.text.substring(12);
    const check = UtilCrypto.checkAddress(address, this.addressType);
    console.log("Address Check: ",check[0], " Reason: ",check[1])
    if (check[0]) {
      // Address match
      return address;
    } else {
      // Not a valid address
      return undefined;
    }
  }

  // tries to get valid address from message, if fails, returns undefined
  // /requestpolkadex
  getAddressFromPolkadexMessage(message) {
    const address = message.text.substring(17);
    const check = UtilCrypto.checkAddress(address, this.addressType);
    console.log("Address Check: ",check[0], " Reason: ",check[1])
    if (check[0]) {
      // Address match
      return address;
    } else {
      // Not a valid address
      return undefined;
    }
  }

  // returns the help message
  getHelpMessage() {
    return this.helpMessage;
  }

  // loads json file and inits keyring
  initPolkadexKeyring() {
    const keyring = new Keyring({ type: "sr25519" });
    // // TODO: better error handling
    this.keyRing = keyring.addFromMnemonic(PolkadexFaucet);
  }
  // loads json file and inits keyring
  initBTCKeyring() {
    const keyring = new Keyring({ type: "sr25519" });
    // // TODO: better error handling
    this.keyRing = keyring.addFromMnemonic(BTCFaucet);
  }
  // loads json file and inits keyring
  initUSDKeyring() {
    const keyring = new Keyring({ type: "sr25519" });
    // // TODO: better error handling
    this.keyRing = keyring.addFromMnemonic(USDFaucet);
  }
  // This initializes api
  async initApi() {
    const ws = new WsProvider(this.providerUrl);
    // Instantiate the API
    this.api = await ApiPromise.create({ types: this.types, provider: ws });
    // Retrieve the chain & node information information via rpc calls
    const [chain, nodeName, nodeVersion] = await Promise.all([
      this.api.rpc.system.chain(),
      this.api.rpc.system.name(),
      this.api.rpc.system.version(),
    ]);
    // Log these stats
    console.log(
      `You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`
    );
  }
  async sendPolkadexToken(address) {
    const api = await this.initApi();
    this.initPolkadexKeyring();
    let PolkadexReward =  new BN((10*UNIT).toString(), 10);

    console.log(`Sending ${this.amount} ${this.tokenName} to ${address}`);

    // Polkadex Transfer
    const nativetransfer = this.api.tx.genericAsset.transfer(0,address, PolkadexReward);
    const nativehash = await nativetransfer.signAndSend(this.keyRing);
    console.log("Polkadex Transfer sent with hash", nativehash.toHex());
  }

  async sendUSDToken(address) {
    const api = await this.initApi();
    this.initUSDKeyring();
    let USDReward = new BN((10000*UNIT).toString(), 10);

    console.log(`Sending ${this.amount} ${this.tokenName} to ${address}`);

    // USD Transfer
    const usdtransfer = this.api.tx.genericAsset.transfer(1,address, USDReward);
    const usdhash = await usdtransfer.signAndSend(this.keyRing);
    console.log("Polkadex Transfer sent with hash", usdhash.toHex());
  }

  async sendBTCToken(address) {
    const api = await this.initApi();
    this.initBTCKeyring();
    let BTCReward = new BN((1*UNIT).toString(), 10);

    console.log(`Sending ${this.amount} ${this.tokenName} to ${address}`);
    // BTC Transfer
    const btctransfer = this.api.tx.genericAsset.transfer(2,address, BTCReward);
    const btchash = await btctransfer.signAndSend(this.keyRing);
    console.log("Polkadex Transfer sent with hash", btchash.toHex());
  }

  // function that telgram bot calls
  async requestPolkadexToken(message) {
    let response;
    const now = Date.now();
    //   const username = message["from"]["username"];
    const senderId = message["from"]["id"];
    // Get the senders record
    const senderRecords = this.polkadexrecords[senderId];

    const address = this.getAddressFromPolkadexMessage(message);
    if (address) {
      response = `Sending 10 Polkadex to ${address}!`;
      // if exists
      if (senderRecords) {
        // make sure last request was long time ago
        const last = senderRecords.slice(-1)[0];
        // check if now - last > timeLimitHours * 60 * 60 * 1000
        if (now - last > this.timeLimitHours * 1000 * 60 * 60) {
          // yes limit has passed
          await this.sendPolkadexToken(address);
          // update the records to show this
          this.polkadexrecords[senderId].push(now);
        } else {
          // this means user requested tokens already
          response = this.timeLimitMessage;
        }
      } else {
        // this is users first request
        // yes limit has passed
        await this.sendPolkadexToken(address);
        // create the record
        this.polkadexrecords[senderId] = [];
        // update the records to show this
        this.polkadexrecords[senderId].push(now);
      }
    } else {
      response = this.invalidAddressMessage;
    }
    return response;
  }

  // function that telgram bot calls
  async requestBTCToken(message) {
    let response;
    const now = Date.now();
    //   const username = message["from"]["username"];
    const senderId = message["from"]["id"];
    // Get the senders record
    const senderRecords = this.btcrecords[senderId];

    const address = this.getAddressFromMessage(message);
    if (address) {
      response = `Sending 1 PBTC to ${address}!`;
      // if exists
      if (senderRecords) {
        // make sure last request was long time ago
        const last = senderRecords.slice(-1)[0];
        // check if now - last > timeLimitHours * 60 * 60 * 1000
        if (now - last > this.timeLimitHours * 1000 * 60 * 60) {
          // yes limit has passed
          await this.sendBTCToken(address);
          // update the records to show this
          this.btcrecords[senderId].push(now);
        } else {
          // this means user requested tokens already
          response = this.timeLimitMessage;
        }
      } else {
        // this is users first request
        // yes limit has passed
        await this.sendBTCToken(address);
        // create the record
        this.btcrecords[senderId] = [];
        // update the records to show this
        this.btcrecords[senderId].push(now);
      }
    } else {
      response = this.invalidAddressMessage;
    }
    return response;
  }

  // function that telgram bot calls
  async requestUSDToken(message) {
    let response;
    const now = Date.now();
    //   const username = message["from"]["username"];
    const senderId = message["from"]["id"];
    // Get the senders record
    const senderRecords = this.usdrecords[senderId];

    const address = this.getAddressFromMessage(message);
    if (address) {
      response = `Sending 10000 PUSD to ${address}!`;
      // if exists
      if (senderRecords) {
        // make sure last request was long time ago
        const last = senderRecords.slice(-1)[0];
        // check if now - last > timeLimitHours * 60 * 60 * 1000
        if (now - last > this.timeLimitHours * 1000 * 60 * 60) {
          // yes limit has passed
          await this.sendUSDToken(address);
          // update the records to show this
          this.usdrecords[senderId].push(now);
        } else {
          // this means user requested tokens already
          response = this.timeLimitMessage;
        }
      } else {
        // this is users first request
        // yes limit has passed
        await this.sendUSDToken(address);
        // create the record
        this.usdrecords[senderId] = [];
        // update the records to show this
        this.usdrecords[senderId].push(now);
      }
    } else {
      response = this.invalidAddressMessage;
    }
    return response;
  }
}


// load env vars
require("dotenv").config();

const config = {
  types: ADDITIONAL_TYPES,
  providerUrl: process.env.NODE_WS_URL,
  amount: parseFloat(process.env.AMOUNT),
  tokenName: process.env.TOKEN_NAME,
  addressType: parseInt(process.env.ADDRESS_TYPE),
  timeLimitHours: parseFloat(process.env.TIME_LIMIT_HOURS),
  decimals: parseInt(process.env.DECIMALS),
  mnemonic: process.env.MNEMONIC,
};

const faucet = new GenericFaucetInterface(config);

// Initialize telegram bot
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
// Initialize the faucet

// On user starting convo
bot.start(async (ctx) => {
  await ctx.reply(faucet.getHelpMessage());
});

// On user types help
bot.help(async (ctx) => {
  await ctx.reply(faucet.getHelpMessage());
});

// On request token command
bot.command("requestbtc", async (ctx) => {
  const resp = await faucet.requestBTCToken(ctx.message);
  await ctx.reply(resp);
});

// On request token command
bot.command("requestpolkadex", async (ctx) => {
  const resp = await faucet.requestPolkadexToken(ctx.message);
  await ctx.reply(resp);
});

// On request token command
bot.command("requestusd", async (ctx) => {
  const resp = await faucet.requestUSDToken(ctx.message);
  await ctx.reply(resp);
});
// Run the bot
bot.launch();
