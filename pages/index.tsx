"use client";

import React from "react";
import styles from "../styles/index.module.css";
import Chat from "../app/components/chat";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";

const FunctionCalling = () => {
  const functionCallHandler = async (call: RequiredActionFunctionToolCall) => {
    try {
      if (call?.function?.name !== "getProducts") {
        console.error("Unexpected function call:", call?.function?.name);
        return JSON.stringify({ error: "Unexpected function call" });
      }

      const { keywords, site } = JSON.parse(call.function.arguments);
      console.log('Keywords:', keywords, 'Site:', site);

      const products = await callLazadaApi(keywords, site);

      if (products && products.length > 0) {
        //const topProducts = products.slice(0, 3);
        // const productInfo = topProducts.map((product) => ({
        //   title: product.title,
        //   price: product.price_info,
        //   link: product.product_url,
        // }));
        return JSON.stringify({ top_products: products });
      } else {
        return JSON.stringify({ message: "No products found." });
      }
    } catch (error) {
      console.error("Error in functionCallHandler:", error);
      return JSON.stringify({ error: error.message });
    }
  };

  const callLazadaApi = async (keywords: string, site: string) => {
    const apiKey = process.env.NEXT_PUBLIC_RAPID_API_KEY;
    const url = 'https://lazada-api.p.rapidapi.com/lazada/search/items';

    // Construct the URL with query parameters
    const urlWithParams = new URL(url);
    urlWithParams.searchParams.append('keywords', keywords);
    urlWithParams.searchParams.append('site', site);
    urlWithParams.searchParams.append('sort', 'pop');
    urlWithParams.searchParams.append('page', '1');

    try {
      const headers: HeadersInit = {
        'x-rapidapi-host': 'lazada-api.p.rapidapi.com',
      };

      if (apiKey) {
        headers['x-rapidapi-key'] = apiKey;
      } else {
        console.warn('API key is undefined');
      }

      const response = await fetch(urlWithParams, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Lazada API Response:', data);
      return data.data.items;
    } catch (error) {
      console.error('Error calling Lazada API:', error);
      throw error;
    }
  };


  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.column}>
          <h2 className={styles.welcomeTitle}>Welcome to the Gift Shopping Assistant</h2>
          <p className={styles.welcomeText}>
            Discover the perfect gifts effortlessly with our AI-powered
            assistant. Simply interact with the chat to receive personalized
            recommendations based on your preferences and needs. Whether you're
            shopping for a special occasion or just exploring options, our
            assistant is here to help you find the best products.
          </p>
        </div>
        <div className={styles.chatContainer}>
          <div className={styles.chat}>
            <Chat functionCallHandler={functionCallHandler} />
          </div>
        </div>
      </div>
    </main>
  );
};

export default FunctionCalling;