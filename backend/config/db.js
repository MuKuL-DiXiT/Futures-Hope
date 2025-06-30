const mongoose = require('mongoose');

const dropMobileIndexIfNotSparse = async () => {
  try {
    const collection = mongoose.connection.collection('users');
    const indexes = await collection.indexes();
    const mobileIndex = indexes.find(idx => idx.key.mobile === 1);

    if (mobileIndex && !mobileIndex.sparse) {
      await collection.dropIndex('mobile_1');
      console.log('✅ Dropped old non-sparse mobile index');
    } else {
      console.log('✅ Mobile index is already sparse or does not exist');
    }
  } catch (err) {
    console.error('❌ Error while checking/dropping mobile index:', err.message);
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB connected");

    await dropMobileIndexIfNotSparse(); // 👈 Important fix
  } catch (err) {
    console.error("❌ DB connection error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
