const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: String,

    amount: {
        type: Number,
        required: true
    },


    message: String,


    proofScreenshotUrl: {
        type: String,
        required: true
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    community: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Community",
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Payment", paymentSchema);
