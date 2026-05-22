import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState >= 1) return;

  const conn = await mongoose.connect(process.env.MONGODB_URI as string, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`MongoDB Connected: ${conn.connection.host}`);
};

export default connectDB;
