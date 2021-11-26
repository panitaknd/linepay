
require("dotenv").config();
const rp = require("request-promise");
const { v4: uuidv4 } = require('uuid');
const crypto = require("crypto");

class LinePayService {
  /**
   * LinePayService constructor
   *
   * @param {productName, amount, orderId} payload
   */
  constructor(payload) {
    this._payload = payload;
    this._uri = "https://api-pay.line.me";
  }

  static encrypt(key, data) {
    const hash = crypto.createHmac("sha256", key).update(data);
    return hash.digest("base64");
  }

  static randomNonce() {
    const options = {
      random: [
        0x10,
        0x91,
        0x56,
        0xbe,
        0xc4,
        0xfb,
        0xc1,
        0xea,
        0x71,
        0xb4,
        0xef,
        0xe1,
        0x67,
        0x1c,
        0x58,
        0x36
      ]
    };
    return uuidv4(options);
  }

  async reservePayment() {
    try {
      // แต่ละ request nonce ต้องเป็นค่าใหม่เสมอ
      const nonce = LinePayService.randomNonce();
      const channelId = process.env.LINE_PAY_CHANNEL_ID;
      const channelSecret = process.env.LINE_PAY_CHANNEL_SECRET;
      const headerData = `${channelSecret}/v3/payments/request${JSON.stringify(
        this._payload
      )}${nonce}`;

      const headers = {
        "Content-Type": "application/json",
        "X-LINE-ChannelId": channelId,
        "X-LINE-Authorization-Nonce": nonce,
        "X-LINE-Authorization": LinePayService.encrypt(
          channelSecret,
          headerData
        )
      };

      return await rp({
        method: "POST",
        uri: `${this._uri}/v3/payments/request`,
        body: this._payload,
        headers: headers,
        json: true
      });
    } catch (exception) {
      throw exception;
    }
  }

  async confirmPayment() {
    try {
      // แต่ละ request nonce ต้องเป็นค่าใหม่เสมอ
      const nonce = LinePayService.randomNonce();
      const channelId = process.env.LINE_PAY_CHANNEL_ID;
      const channelSecret = process.env.LINE_PAY_CHANNEL_SECRET;
      const headerData = `${channelSecret}/v3/payments/${
        this._payload.transactionId
      }/confirm${JSON.stringify(this._payload.data)}${nonce}`;

      const headers = {
        "Content-Type": "application/json",
        "X-LINE-ChannelId": channelId,
        "X-LINE-Authorization-Nonce": nonce,
        "X-LINE-Authorization": LinePayService.encrypt(
          channelSecret,
          headerData
        )
      };

      return await rp({
        method: "POST",
        uri: `${this._uri}/v3/payments/${this._payload.transactionId}/confirm`,
        body: this._payload.data,
        headers: headers,
        json: true
      });
    } catch (exception) {
      throw exception;
    }
  }
}

module.exports = LinePayService;