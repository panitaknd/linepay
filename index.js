require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const LinePayService = require("./services/linePayService");

const generateRandomKey = (length = 16) => {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let retVal = "";

  for (var i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }

  return retVal;
};

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port = process.env.PORT || 8080;

const Order = require("./models/order");

app.post("/api/payment/reservepayment", async (req, res, next) => {
  try {
    const { productName, amount } = req.body;

    const amountToInt = parseInt(amount, 10);
    const paymentKey = generateRandomKey(32);
    const orderId = generateRandomKey(8);

    const payload = {
      amount: amountToInt,
      currency: "THB",
      orderId,
      packages: [
        {
          id: 1,
          amount: amountToInt,
          products: [
            {
              id: "WASH-1",
              name: productName,
              imageUrl:
                "https://www.vippng.com/png/detail/5-56096_dragon-ball-z-logo-png-transparent-goku-dragon.png",
              quantity: 1,
              price: amountToInt
            }
          ]
        }
      ],
      redirectUrls: {
        confirmUrl: `myexappjeerawatdev://?myexappjeerawatdev.com/order/payment/authorize?confirm=true&orderId=${orderId}&amount=${amountToInt}&name=${productName}&keys=${paymentKey}`,
        cancelUrl: `myexappjeerawatdev://?myexappjeerawatdev.com/order/payment/cancel?confirm=false&orderId=${orderId}&keys=${paymentKey}`,
        confirmUrlType: "CLIENT"
      },
      options: {
        display: {
          locale: "th",
          checkConfirmUrlBrowser: true
        }
      }
    };

    const linePayResult = await new LinePayService(payload).reservePayment();

    if (
      linePayResult &&
      linePayResult.returnCode === "0000" &&
      linePayResult.info
    ) {
      const order = new Order({
        productName: productName,
        amount: amountToInt,
        orderId,
        currency: "THB",
        paymentKey
      });

      const orderInfo = await order.save();
      const result = orderInfo.toJSON();
      return res.status(200).json({
        success: true,
        message: "successfully",
        result: {
          ...result,
          ...{ paymentUrl: linePayResult.info.paymentUrl }
        }
      });
    }

    throw new Error(linePayResult.returnMessage);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message, result: null });
  }
});

app.post("/api/payment/confirm", async (req, res, next) => {
  try {
    // transactionId ที่ได้มาตอนทำการ reservePayment จะได้ค่าคนละค่าจำเป็นต้องส่งเข้ามาตอน confirm ด้วย
    const { transactionId, orderId, paymentKey } = this._reqBody;

    const getOrder = await Order.findOne({ paymentKey, orderId }).exec();

    if (!getOrder) {
      throw new Error("Payment order not success!");
    }

    const payload = {
      data: {
        amount: getOrder.amount,
        currency: getOrder.currency
      },
      transactionId
    };

    const confirmLinePayment = await new LinePayService(
      payload
    ).confirmPayment();

    if (
      confirmLinePayment &&
      confirmLinePayment.returnCode === "0000" &&
      confirmLinePayment.info
    ) {
      return res.status(200).json({
        success: true,
        message: "Payment order successfully",
        result: getOrder.toJSON()
      });
    } else {
      throw new Error(confirmLinePayment.returnMessage);
    }
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message, result: null });
  }
});

app.post("/api/payment/cancel", async (req, res, next) => {
  try {
    const { paymentKey, orderId } = req.body;
    const res = await Order.findOneAndDelete({ paymentKey, orderId }).exec();
    return res
      .status(200)
      .json({ success: true, message: "Successfully", result: res });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message, result: null });
  }
});

app.listen(port, async () => {
  console.log(`Server is running on port: ${port}`);

  mongoose.connect(
    `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}/linepay?retryWrites=true&w=majority`,
    { useNewUrlParser: true, useUnifiedTopology: true
        // , useCreateIndex: true 
    }
  );
  console.log("Connect mongodb is successfully...");
});