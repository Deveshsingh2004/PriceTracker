import mongoose from "mongoose";

let isConnected = false; //variable to track connection status

export const connectToDB = async () => {
    mongoose.set('strictQuery', true);

    if (!process.env.MONGO_URI) return console.log('Mongo URI is not defined');

    if (isConnected) return console.log('Using existing database connection');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;

        console.log('Connected to MongoDB database');

    } catch (error) {
        console.log(error);

    }


}

