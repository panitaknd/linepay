
const mongoose = require("mongoose");

const model = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    orderId: {
      type: String,
      required: true
    },
    currency: {
      type: String,
      required: true
    },
    paymentKey: {
      type: String,
      unique: true,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "complete", "canceled"],
      default: "pending"
    }
  },
  { timestamps: true }
);

model.methods.toJSON = function() {
  const order = this;
  return {
    productName: order.productName,
    amount: order.amount,
    status: order.status
  };
};

module.exports = mongoose.model("order", model);