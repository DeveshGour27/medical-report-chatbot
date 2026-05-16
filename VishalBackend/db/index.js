import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGO_DB_URI);
    console.log(`Successfully connected at ${connectionInstance.connection.host}`);
  } catch (error) {
    console.log("Mongo DB connection error", error);
    process.exit(1);
  }
};

export default connectDB;
