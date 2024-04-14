'use server';

import { revalidatePath } from "next/cache";
import Product from "../models/product.model";
import { connectToDB } from "../mongoose";
import { scrapeAmazonproduct } from "../scrapper";
import { getAveragePrice, getHighestPrice, getLowestPrice } from "../utils";
import { User } from "@/types";
import { generateEmailBody, sendEmail } from "../nodemailer";
import { exit } from "process";


export async function scrapeAndStoreProduct(productUrl: string) {
    if (!productUrl) return;

    try {
        connectToDB();

        const scrapedProduct = await scrapeAmazonproduct(productUrl);

        if (!scrapedProduct) return;

        let product = scrapedProduct;

        const existingProduct = await Product.findOne({ url: scrapedProduct.url });

        if (existingProduct) {
            const updatePriceHistory: any = [
                ...existingProduct.priceHistory,
                { price: scrapedProduct.currentPrice }
            ]
            product = {
                ...scrapedProduct,
                priceHistory: updatePriceHistory,
                lowestPrice: getLowestPrice(updatePriceHistory),
                highestPrice: getHighestPrice(updatePriceHistory),
                averagePrice: getAveragePrice(updatePriceHistory),
            }
        }
        const newProduct = await Product.findOneAndUpdate({ url: scrapedProduct.url }, product, { upsert: true });

        revalidatePath(`/product/${newProduct?._id}`);

    } catch (error: any) {
        throw new Error("Failed to create/update product: " + error.message);
    }
}


export async function getProductById(productId: string) {
    try {
        connectToDB();

        const product = Product.findOne({ _id: productId });

        if (!product) return null;

        return product;
    } catch (error) {

    }
}

export async function getAllProducts() {
    try {
        connectToDB();

        const products = await Product.find();

        return products;
    } catch (error) {
        console.log(error);

    }


}


export async function getSimilarProducts(productId: string) {
    try {
        connectToDB();
        const currentProduct = await Product.findById(productId);

        if (!currentProduct) return null;

        const similarProduct = await Product.find({
            _id: {
                $ne: productId
            },
        }).limit(3);

        return similarProduct;
    } catch (error) {
        console.log(error);

    }


}


export async function addUserEmailToProduct(productId: string, userEmail: string) {
    try {
        //Send our first email
        const product = await Product.findById(productId);
        const image = product?.image;
        if (!product) return;

        const userExists = product.user.some((user: User) => user.email === userEmail);

        if (!userExists) {

            product.user.push({ email: userEmail });

            await product.save();

            const emailContent = await generateEmailBody(product, "WELCOME", image);

            await sendEmail(emailContent, [userEmail]);

        }

    } catch (error) {
        console.log(error);

    }
}


