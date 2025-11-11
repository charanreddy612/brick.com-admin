// dynamicScraper.js
import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import axios from "axios";
import XLSX from "xlsx";
import { convertToWebP } from "./imageUtils.js";
import { uploadToSupabase } from "./supabaseUploadWrapper.js";
import "dotenv/config";

async function main() {
  // Launch a single browser instance
  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  console.log("Browser launched successfully");

  async function downloadImage(url, dest) {
    const writer = fs.createWriteStream(dest);
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  }

  async function scrapeCouponsSite(url) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const data = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("a")).map((a) => ({
        text: a.innerText.trim(),
        href: a.href,
      }));
      const images = Array.from(document.querySelectorAll("img")).map(
        (img) => ({
          src: img.src,
          alt: img.alt,
        })
      );
      return { anchors, images };
    });

    const storesMap = new Map();
    const coupons = [];
    const categoriesSet = new Set();

    // Extract stores & coupons
    data.anchors.forEach((a) => {
      const text = a.text.toLowerCase();
      if (
        text.includes("coupon") ||
        text.includes("offer") ||
        text.includes("deal")
      ) {
        coupons.push({ title: a.text, link: a.href });
      } else if (text.length > 0 && !a.href.includes("javascript")) {
        storesMap.set(a.href, { name: a.text, web_url: a.href });
      }
    });

    // Associate images
    data.images.forEach((img) => {
      const alt = img.alt.toLowerCase();
      if (alt.includes("logo")) {
        storesMap.forEach((store) => (store.logo_src = img.src));
      } else if (alt.includes("coupon") || alt.includes("offer")) {
        coupons.forEach((c) => (c.image_src = img.src));
      }
    });

    // Process stores
    const stores = [];
    for (const [href, store] of storesMap.entries()) {
      let logo_url = "";
      if (store.logo_src) {
        const localLogoPath = path.join("temp", `logo_${Date.now()}.webp`);
        await downloadImage(store.logo_src, localLogoPath);
        const webpPath = await convertToWebP(localLogoPath, localLogoPath);
        logo_url = await uploadToSupabase(
          webpPath,
          "merchant-images",
          "merchants"
        );
      }
      stores.push({ name: store.name, web_url: href, logo_url });
    }

    // Process coupons
    for (let i = 0; i < coupons.length; i++) {
      if (coupons[i].image_src) {
        const localCouponPath = path.join(
          "temp",
          `coupon_${i}_${Date.now()}.webp`
        );
        await downloadImage(coupons[i].image_src, localCouponPath);
        const webpPath = await convertToWebP(localCouponPath, localCouponPath);
        coupons[i].image_url = await uploadToSupabase(
          webpPath,
          "coupon-images",
          "coupons"
        );
      }
    }

    // Export Excel
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(stores),
      "stores"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(coupons),
      "coupons"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(Array.from(categoriesSet)),
      "categories"
    );

    const filePath = path.join("output", `scrape_${Date.now()}.xlsx`);
    XLSX.writeFile(wb, filePath);

    return filePath;
  }

  // Run the scraper
  try {
    const file = await scrapeCouponsSite("https://www.grabon.in/");
    console.log("Excel exported at:", file);
  } catch (err) {
    console.error("Error scraping site:", err);
  } finally {
    await browser.close();
    console.log("Browser closed");
  }
}

main().catch((err) => console.error("Fatal error:", err));
