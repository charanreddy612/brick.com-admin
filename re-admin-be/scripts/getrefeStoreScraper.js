// getrefeStoreScraper.js - Updated Version
import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import axios from "axios";
import XLSX from "xlsx";
import { convertToWebP } from "./imageUtils.js";
import { uploadToSupabase } from "./supabaseUploadWrapper.js";
import "dotenv/config";

// Ensure directories exist
if (!fs.existsSync("temp")) fs.mkdirSync("temp");
if (!fs.existsSync("output")) fs.mkdirSync("output");

// ============================================
// UTILITY FUNCTIONS
// ============================================

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadImage(url, dest) {
  try {
    if (!url || url === "") return null;

    const writer = fs.createWriteStream(dest);
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    console.error(`Failed to download image: ${url}`, error.message);
    return null;
  }
}

function cleanText(text) {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

async function processStoreLogo(logoUrl, storeName) {
  if (!logoUrl) return "";

  try {
    console.log(`   → Processing store logo...`);
    const timestamp = Date.now();
    const ext = path.extname(new URL(logoUrl).pathname) || ".png";
    const localPath = path.join("temp", `logo_${storeName}_${timestamp}${ext}`);

    await downloadImage(logoUrl, localPath);

    if (fs.existsSync(localPath)) {
      const webpPath = localPath.replace(ext, ".webp");
      await convertToWebP(localPath, webpPath);

      if (fs.existsSync(webpPath)) {
        const uploadedUrl = await uploadToSupabase(
          webpPath,
          "merchant-images",
          "merchants"
        );

        // Clean up temp files
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);

        console.log(`   ✓ Logo uploaded successfully`);
        return uploadedUrl;
      }
    }
  } catch (error) {
    console.error(`   ✗ Error processing logo:`, error.message);
  }

  return logoUrl; // Return original URL if processing fails
}

// Extract actual store URL from schema.org JSON-LD
async function extractStoreUrlFromSchema(page) {
  try {
    const storeUrl = await page.evaluate(() => {
      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]'
      );
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent);
          if (data["@graph"]) {
            for (const item of data["@graph"]) {
              if (
                item["@type"] === "Brand" ||
                item["@type"] === "Organization"
              ) {
                if (item.sameAs) {
                  return item.sameAs;
                }
              }
            }
          }
        } catch (e) {
          // Continue to next script
        }
      }
      return null;
    });
    const buttonLink = await page
      .$eval("a.show-code, a.get-deal", (el) => el.href)
      .catch(() => null);
    return storeUrl || buttonLink;
  } catch (error) {
    console.error("Error extracting store URL from schema:", error.message);
    return null;
  }
}

// Try to reveal and capture coupon code (including redirect-based ones)
async function getCouponCode(page, couponBox, index) {
  try {
    // First, check for hidden code in data attributes or hidden elements
    const hiddenCode = await page.evaluate((box) => {
      const dataCode = box.querySelector("[data-code]");
      if (dataCode && dataCode.dataset.code) return dataCode.dataset.code;

      const codeElements = box.querySelectorAll(
        ".coupon-code, code, .promo-code, .discount-code"
      );
      for (const el of codeElements) {
        const text = el.innerText || el.textContent;
        if (text && text.length > 2 && text.length < 30) {
          return text
            .trim()
            .replace(
              /CODE:|COPY|GET CODE|SHOW CODE|REVEAL CODE|USE CODE|ACTIVATE/gi,
              ""
            )
            .trim();
        }
      }
      return null;
    }, couponBox);

    if (hiddenCode) {
      console.log(`      ✓ Found hidden code: ${hiddenCode}`);
      return hiddenCode;
    }

    // Try clicking reveal/get-deal button
    console.log(`      → Attempting to reveal code by clicking...`);
    const revealButton = await couponBox.$(
      ".reveal_btn, .show-code, .get-deal, button"
    );

    if (revealButton) {
      // Capture potential new tab (some sites open redirect tab)
      const newPagePromise = new Promise((resolve) =>
        page.browser().once("targetcreated", async (target) => {
          const newPage = await target.page();
          resolve(newPage);
        })
      );

      await revealButton.click();
      await page.waitForTimeout(1500);

      // If new tab opened, handle it
      const newPage = await Promise.race([
        newPagePromise,
        new Promise((r) => setTimeout(() => r(null), 3000)),
      ]);

      if (newPage) {
        await newPage.bringToFront();
        await newPage.waitForTimeout(2000);

        // Try extracting store URL from redirection
        const storeUrl = newPage.url();
        console.log(`      ✓ Store URL (from redirect): ${storeUrl}`);

        // Some redirect pages display coupon code in modal or body
        const redirectedCode = await newPage.evaluate(() => {
          const el = document.querySelector(
            ".coupon-code, code, .promo-code, .revealed-code, [data-code]"
          );
          if (!el) return null;
          const text = el.innerText || el.textContent || el.dataset.code;
          if (text && text.length > 2 && text.length < 30) {
            return text
              .trim()
              .replace(
                /CODE:|COPY|GET CODE|SHOW CODE|REVEAL CODE|USE CODE|ACTIVATE/gi,
                ""
              )
              .trim();
          }
          return null;
        });

        if (redirectedCode) {
          console.log(`      ✓ Captured redirected code: ${redirectedCode}`);
          await newPage.close().catch(() => {});
          return redirectedCode;
        }

        await newPage.close().catch(() => {});
      }

      // Try checking again in same tab (if no redirect)
      const revealedCode = await page.evaluate((box) => {
        const el = box.querySelector(
          ".coupon-code, code, .promo-code, .revealed-code, [data-code]"
        );
        if (!el) return null;
        const text = el.innerText || el.textContent || el.dataset.code;
        if (text && text.length > 2 && text.length < 30) {
          return text
            .trim()
            .replace(
              /CODE:|COPY|GET CODE|SHOW CODE|REVEAL CODE|USE CODE|ACTIVATE/gi,
              ""
            )
            .trim();
        }
        return null;
      }, couponBox);

      if (revealedCode) {
        console.log(`      ✓ Revealed code: ${revealedCode}`);
        return revealedCode;
      }
    }

    return null;
  } catch (error) {
    console.error(`      ✗ Error getting coupon code:`, error.message);
    return null;
  }
}

// ============================================
// MAIN SCRAPING FUNCTION
// ============================================

async function scrapeStorePage(storeUrl, options = {}) {
  const { downloadImages = true, uploadToCloud = true } = options;

  console.log("\n" + "=".repeat(70));
  console.log("🚀 GetRefe Store Scraper Started");
  console.log("=".repeat(70));
  console.log(`📍 Target URL: ${storeUrl}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1920,1080",
    ],
  });

  console.log("✓ Browser launched\n");

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1920, height: 1080 });

    console.log("📥 Loading store page...");
    await page.goto(storeUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    await delay(3000); // Wait for dynamic content
    console.log("✓ Page loaded\n");

    // Scroll to load lazy content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await delay(1500);

    console.log("📊 Extracting store data...\n");

    // Extract actual store website URL from schema.org
    console.log("   → Extracting actual store URL from schema.org...");
    const actualStoreUrl = await extractStoreUrlFromSchema(page);
    console.log(
      `   ${actualStoreUrl ? "✓" : "✗"} Store URL: ${
        actualStoreUrl || "Not found"
      }\n`
    );

    // Extract all data from the page
    const pageData = await page.evaluate(() => {
      const data = {
        store: {},
        coupons: [],
        faqs: [],
      };

      // ==================== STORE INFORMATION ====================

      // Store name from title
      const titleEl = document.querySelector("h1.store-title");
      data.store.name = titleEl
        ? titleEl.innerText
            .replace("Coupons", "")
            .replace(/OCT \d{4}/i, "")
            .trim()
        : "";

      // SEO Title
      const seoTitleEl = document.querySelector("title");
      data.store.seo_title = seoTitleEl ? seoTitleEl.innerText : "";

      // SEO Description
      const seoDescEl = document.querySelector('meta[name="description"]');
      data.store.seo_description = seoDescEl
        ? seoDescEl.getAttribute("content")
        : "";

      // Keywords
      const keywordsEl = document.querySelector('meta[name="keywords"]');
      data.store.keywords = keywordsEl
        ? keywordsEl.getAttribute("content")
        : "";

      // Store logo URL
      const logoMetaEl = document.querySelector('meta[property="og:image"]');
      const logoImgEl = document.querySelector(".store-logo-block img");
      data.store.logo_url = logoMetaEl
        ? logoMetaEl.getAttribute("content")
        : logoImgEl
        ? logoImgEl.src
        : "";

      // Canonical URL (getrefe page)
      const canonicalEl = document.querySelector('link[rel="canonical"]');
      data.store.canonical_url = canonicalEl
        ? canonicalEl.getAttribute("href")
        : window.location.href;

      // Store description with HTML tags preserved
      const descEl = document.querySelector(".long_desc");
      if (descEl) {
        data.store.description = descEl.innerHTML.trim();
      } else {
        data.store.description = "";
      }

      // ==================== FAQs ====================

      const faqBlocks = document.querySelectorAll(
        ".faq_block h3, .faq_block h2"
      );
      faqBlocks.forEach((heading) => {
        const question = heading.innerText.trim();
        // Get the next sibling paragraph as answer
        let answer = "";
        let nextEl = heading.nextElementSibling;
        if (nextEl && nextEl.tagName === "P") {
          answer = nextEl.innerText.trim();
        }

        if (question && answer && !question.toLowerCase().includes("faqs")) {
          data.faqs.push({
            question: question,
            answer: answer,
          });
        }
      });

      // ==================== COUPONS/DEALS - Basic Info ====================

      const couponBoxes = document.querySelectorAll(".cb-coupon-boxes");

      couponBoxes.forEach((box, index) => {
        try {
          const coupon = {};

          // Coupon title
          const titleEl = box.querySelector(".coupon-title");
          coupon.title = titleEl ? titleEl.innerText.trim() : "";

          // Discount amount
          const discountEl = box.querySelector(".offer-tye-ln1");
          coupon.discount = discountEl ? discountEl.innerText.trim() : "";

          // Coupon type (deal or coupon)
          const typeEl = box.querySelector(".offer-tye-ln2");
          const typeText = typeEl ? typeEl.innerText.trim().toLowerCase() : "";
          const buttonText =
            box.querySelector(".show-code")?.innerText.toLowerCase() || "";

          // Check if it's a deal or coupon
          if (typeText.includes("deal") || buttonText.includes("show deal")) {
            coupon.type = "deal";
            coupon.code = "DEAL";
            coupon.needsCodeExtraction = false;
          } else {
            coupon.type = "coupon";
            coupon.needsCodeExtraction = true;
            coupon.code = ""; // Will be filled later
          }

          // Coupon description
          const descEl = box.querySelector(".expandDiv, .coupon_desc");
          coupon.description = descEl ? descEl.innerText.trim() : "";

          // Coupon link (will be replaced with actual store URL later)
          const linkEl = box.querySelector("a[data-dloc]");
          coupon.link = linkEl ? linkEl.getAttribute("data-dloc") : "";

          // Store box index for code extraction
          coupon.boxIndex = index;

          // Add to coupons array if we have essential data
          if (coupon.title && coupon.title.length > 3) {
            data.coupons.push(coupon);
          }
        } catch (err) {
          console.error("Error parsing coupon:", err.message);
        }
      });

      return data;
    });

    // Set actual store URL for all coupons
    if (actualStoreUrl) {
      pageData.store.store_url = actualStoreUrl;
      pageData.coupons.forEach((coupon) => {
        coupon.link = actualStoreUrl;
      });
    } else {
      pageData.store.store_url = "";
    }

    // Log extracted data counts
    console.log(`✓ Store Info Extracted:`);
    console.log(`   - Store Name: ${pageData.store.name}`);
    console.log(`   - Store URL: ${pageData.store.store_url || "Not found"}`);
    console.log(`   - SEO Title: ${pageData.store.seo_title ? "Yes" : "No"}`);
    console.log(
      `   - Description: ${
        pageData.store.description ? "Yes (with HTML)" : "No"
      }`
    );
    console.log(`   - Logo URL: ${pageData.store.logo_url ? "Yes" : "No"}`);
    console.log(`   - FAQs: ${pageData.faqs.length}`);

    console.log(`\n✓ Coupons Found: ${pageData.coupons.length}`);
    console.log(
      `   - Deals: ${pageData.coupons.filter((c) => c.type === "deal").length}`
    );
    console.log(
      `   - Coupons: ${
        pageData.coupons.filter((c) => c.type === "coupon").length
      }\n`
    );

    // Extract coupon codes for type=coupon
    console.log("🔍 Extracting coupon codes...\n");

    const couponBoxElements = await page.$$(".cb-coupon-boxes");

    for (let i = 0; i < pageData.coupons.length; i++) {
      const coupon = pageData.coupons[i];

      if (coupon.needsCodeExtraction && coupon.type === "coupon") {
        console.log(
          `   [${i + 1}/${pageData.coupons.length}] ${coupon.title.substring(
            0,
            50
          )}...`
        );

        const couponBox = couponBoxElements[coupon.boxIndex];
        if (couponBox) {
          const code = await getCouponCode(page, couponBox, i);
          coupon.code = code || "CODE REQUIRED";
        } else {
          coupon.code = "CODE REQUIRED";
        }
      } else {
        console.log(
          `   [${i + 1}/${pageData.coupons.length}] ${coupon.title.substring(
            0,
            50
          )}... (Deal - No code needed)`
        );
      }

      // Clean up temporary fields
      delete coupon.needsCodeExtraction;
      delete coupon.boxIndex;
    }

    console.log("\n✓ Coupon code extraction completed\n");

    // Process store logo
    if (downloadImages && pageData.store.logo_url) {
      if (uploadToCloud) {
        const uploadedLogoUrl = await processStoreLogo(
          pageData.store.logo_url,
          pageData.store.name.replace(/[^a-zA-Z0-9]/g, "_")
        );
        pageData.store.logo_uploaded_url = uploadedLogoUrl;
      } else {
        pageData.store.logo_uploaded_url = pageData.store.logo_url;
      }
    }

    // Export to Excel
    console.log("\n📄 Exporting to Excel...");

    const wb = XLSX.utils.book_new();

    // Store Information Sheet
    const storeData = [
      {
        Store_Name: pageData.store.name,
        Store_URL: pageData.store.store_url,
        Category: "", // Placeholder for future category scraping
        SEO_Title: pageData.store.seo_title,
        SEO_Description: pageData.store.seo_description,
        Keywords: pageData.store.keywords,
        Description: pageData.store.description,
        FAQs: JSON.stringify(pageData.faqs),
        Logo_Original_URL: pageData.store.logo_url,
        Logo_Uploaded_URL:
          pageData.store.logo_uploaded_url || pageData.store.logo_url,
        Total_Coupons: pageData.coupons.length,
        Scraped_Date: new Date().toISOString(),
      },
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(storeData),
      "Store Info"
    );

    // Coupons Sheet
    if (pageData.coupons.length > 0) {
      const couponsData = pageData.coupons.map((c, idx) => ({
        Sl_No: idx + 1,
        Store_Name: pageData.store.name,
        Title: cleanText(c.title),
        Type: c.type,
        Code: c.code,
        Discount: c.discount,
        Description: cleanText(c.description),
        Link: c.link,
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(couponsData),
        "Coupons"
      );
    }

    // Summary Sheet
    const summaryData = [
      {
        Store_Name: pageData.store.name,
        Store_URL: pageData.store.store_url,
        Total_Coupons: pageData.coupons.length,
        Total_Deals: pageData.coupons.filter((c) => c.type === "deal").length,
        Total_Coupon_Codes: pageData.coupons.filter((c) => c.type === "coupon")
          .length,
        Codes_Extracted: pageData.coupons.filter(
          (c) => c.type === "coupon" && c.code !== "CODE REQUIRED"
        ).length,
        Total_FAQs: pageData.faqs.length,
        Has_Logo: pageData.store.logo_url ? "Yes" : "No",
        Has_Description: pageData.store.description ? "Yes" : "No",
        Scraped_At: new Date().toISOString(),
      },
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(summaryData),
      "Summary"
    );

    // Generate filename
    const storeName = pageData.store.name
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
    const timestamp = new Date().toISOString().split("T")[0];
    const filePath = path.join("output", `${storeName}_${timestamp}.xlsx`);

    XLSX.writeFile(wb, filePath);

    console.log("\n" + "=".repeat(70));
    console.log("✅ SCRAPING COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(70));
    console.log(`📊 Store: ${pageData.store.name}`);
    console.log(`🌐 Store URL: ${pageData.store.store_url || "Not found"}`);
    console.log(`🎟️  Total Coupons: ${pageData.coupons.length}`);
    console.log(
      `   - Deals: ${pageData.coupons.filter((c) => c.type === "deal").length}`
    );
    console.log(
      `   - Coupon Codes: ${
        pageData.coupons.filter((c) => c.type === "coupon").length
      }`
    );
    console.log(
      `   - Codes Extracted: ${
        pageData.coupons.filter(
          (c) => c.type === "coupon" && c.code !== "CODE REQUIRED"
        ).length
      }`
    );
    console.log(`❓ FAQs: ${pageData.faqs.length}`);
    console.log(`📄 Excel File: ${filePath}`);
    console.log("=".repeat(70) + "\n");

    return {
      success: true,
      store: pageData.store,
      coupons: pageData.coupons,
      faqs: pageData.faqs,
      filePath: filePath,
    };
  } catch (error) {
    console.error("\n❌ ERROR:", error);
    return {
      success: false,
      error: error.message,
    };
  } finally {
    await browser.close();
    console.log("✓ Browser closed\n");
  }
}

// ============================================
// EXECUTION
// ============================================

async function main() {
  try {
    const sitemapPath = "./scripts/sitemap.xml";
    const data = fs.readFileSync(sitemapPath, "utf-8");
    const urls = [...data.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

    for (const storeUrl of urls) {
      console.log(`🕷️ Scraping: ${storeUrl}`);
      const result = await scrapeStorePage(storeUrl, {
        downloadImages: true,
        uploadToCloud: true,
      });

      if (result.success) console.log(`✅ Done: ${storeUrl}`);
      else console.log(`❌ Failed: ${storeUrl} - ${result.error}`);
    }

    console.log("🎉 All URLs processed!");
  } catch (err) {
    console.error("💥 Fatal error:", err);
    process.exit(1);
  }
}

// Run the scraper
main();
