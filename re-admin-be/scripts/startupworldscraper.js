// startupworldScraper.js - Fixed for subdomain structure
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

async function processImage(
  imageSrc,
  prefix,
  index,
  uploadFolder,
  uploadPrefix
) {
  if (!imageSrc) return "";

  try {
    const ext = path.extname(new URL(imageSrc).pathname) || ".jpg";
    const localPath = path.join(
      "temp",
      `${prefix}_${index}_${Date.now()}${ext}`
    );

    await downloadImage(imageSrc, localPath);

    if (fs.existsSync(localPath)) {
      const webpPath = localPath.replace(ext, ".webp");
      await convertToWebP(localPath, webpPath);

      if (fs.existsSync(webpPath)) {
        const uploadedUrl = await uploadToSupabase(
          webpPath,
          uploadFolder,
          uploadPrefix
        );

        // Clean up temp files
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);

        return uploadedUrl;
      }
    }
  } catch (error) {
    console.error(`Error processing image:`, error.message);
  }

  return "";
}

// ============================================
// SCRAPING FUNCTIONS
// ============================================

async function scrapeStoresFromAlphabetPage(page, letter) {
  console.log(`   → Scraping stores starting with "${letter}"...`);

  try {
    await page.goto(`https://startupworld.com/stores/${letter}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    await delay(3000);

    // Scroll to load any lazy content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await delay(1500);

    const stores = await page.evaluate(() => {
      const storesData = [];
      const seen = new Set();

      // Try multiple selector patterns for store links
      const selectors = [
        'a[href*=".startupworld.com"]', // Subdomain links
        ".store-item a",
        ".store-card a",
        ".brand-item a",
        ".merchant-card a",
        "article a",
        ".card a",
        'a[href*="/store/"]',
      ];

      let allLinks = [];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          allLinks = Array.from(elements);
          console.log(
            `Found ${elements.length} links with selector: ${selector}`
          );
          break;
        }
      }

      // If no specific selectors work, get all links
      if (allLinks.length === 0) {
        allLinks = Array.from(document.querySelectorAll("a"));
        console.log(`Using all links fallback: ${allLinks.length} links`);
      }

      allLinks.forEach((el) => {
        const href = el.href;

        // Check if it's a subdomain or store page
        const isSubdomain =
          href.includes(".startupworld.com") &&
          !href.includes("www.startupworld.com");
        const isStorePage =
          href.includes("/store/") ||
          href.includes("/brand/") ||
          href.includes("/merchant/");

        if (!isSubdomain && !isStorePage) return;
        if (seen.has(href)) return;

        // Get store name
        let name = el.innerText?.trim() || el.textContent?.trim();

        // Try to get name from parent or nearby elements
        if (!name || name.length < 2) {
          const parent = el.closest(
            '.store-item, .brand-item, .card, .merchant, article, li, div[class*="store"], div[class*="brand"]'
          );
          if (parent) {
            const heading = parent.querySelector(
              "h2, h3, h4, h5, .name, .title, strong, b"
            );
            name = heading?.innerText?.trim() || heading?.textContent?.trim();
          }
        }

        // Extract from subdomain if still no name
        if ((!name || name.length < 2) && isSubdomain) {
          const subdomain = href.split(".startupworld.com")[0].split("//")[1];
          name = subdomain.replace(/-/g, " ").replace(/_/g, " ");
          name = name.charAt(0).toUpperCase() + name.slice(1);
        }

        // Get logo
        const parent = el.closest(
          ".store-item, .brand-item, .card, article, li, div"
        );
        const img = el.querySelector("img") || parent?.querySelector("img");
        const logoSrc =
          img?.src ||
          img?.dataset?.src ||
          img?.getAttribute("data-lazy-src") ||
          "";

        if (
          name &&
          name.length > 1 &&
          !name.toLowerCase().includes("see all") &&
          !name.toLowerCase().includes("view all")
        ) {
          seen.add(href);
          storesData.push({
            name: name,
            web_url: href,
            logo_src: logoSrc,
          });
        }
      });

      return storesData;
    });

    console.log(`      ✓ Found ${stores.length} stores`);
    return stores;
  } catch (error) {
    console.error(`      ✗ Error scraping letter ${letter}:`, error.message);
    return [];
  }
}

async function getAllStores(page, maxLetters = 5) {
  console.log("\n📍 Step 1: Scraping stores from alphabet pages...\n");

  // Common letters with most stores
  const letters = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
  ];

  const allStores = [];
  const storeUrls = new Set();

  for (let i = 0; i < Math.min(maxLetters, letters.length); i++) {
    const letter = letters[i];
    const stores = await scrapeStoresFromAlphabetPage(page, letter);

    // Deduplicate
    stores.forEach((store) => {
      if (!storeUrls.has(store.web_url)) {
        storeUrls.add(store.web_url);
        allStores.push(store);
      }
    });

    await delay(2000); // Be polite
  }

  console.log(`\n✓ Total unique stores found: ${allStores.length}\n`);
  return allStores;
}

async function scrapeCategories(page) {
  console.log("\n📍 Scraping categories...\n");

  try {
    // Go to homepage to find category links
    await page.goto("https://startupworld.com/", {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    await delay(2000);

    const categories = await page.evaluate(() => {
      const categoriesData = [];
      const seen = new Set();

      // Look for category links
      const catSelectors = [
        'a[href*="/category/"]',
        'a[href*="/categories/"]',
        ".category a",
        ".cat-item a",
        "nav a",
        ".menu a",
      ];

      for (const selector of catSelectors) {
        const elements = document.querySelectorAll(selector);

        elements.forEach((el) => {
          const href = el.href;
          const name = el.innerText?.trim() || el.textContent?.trim();

          if (!href || !name || seen.has(href)) return;
          if (href.includes("/store/") || href.includes("/brand/")) return;
          if (name.length < 2) return;

          seen.add(href);
          categoriesData.push({
            name: name,
            link: href,
            slug: href.split("/").filter(Boolean).pop(),
          });
        });

        if (categoriesData.length > 0) break;
      }

      return categoriesData;
    });

    console.log(`   ✓ Found ${categories.length} categories\n`);
    return categories;
  } catch (error) {
    console.error(`   ✗ Error scraping categories:`, error.message);
    return [];
  }
}

async function scrapeStorePage(page, storeUrl, storeName) {
  console.log(`   → Scraping: ${storeName}...`);

  try {
    await page.goto(storeUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    await delay(3000);

    // Scroll to load lazy content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await delay(1500);

    const pageData = await page.evaluate((storeName) => {
      const result = {
        coupons: [],
        storeInfo: {
          description: "",
          website: "",
          logo: "",
          totalCoupons: 0,
        },
      };

      // Extract store info
      const descEl = document.querySelector(
        '.description, .about, .store-description, .store-info, .info p, meta[name="description"]'
      );
      result.storeInfo.description =
        descEl?.content ||
        descEl?.innerText?.trim() ||
        descEl?.textContent?.trim() ||
        "";

      const logoEl = document.querySelector(
        ".store-logo img, .brand-logo img, .logo img, header img"
      );
      result.storeInfo.logo = logoEl?.src || logoEl?.dataset?.src || "";

      // Try to find external website link
      const websiteEl = document.querySelector(
        'a[href*="http"]:not([href*="startupworld.com"])'
      );
      result.storeInfo.website = websiteEl?.href || "";

      // Find all coupon/offer elements - try MANY selector patterns
      const couponSelectors = [
        ".coupon",
        ".offer",
        ".deal",
        ".promo",
        ".code",
        ".coupon-item",
        ".offer-item",
        ".deal-item",
        ".promo-item",
        ".coupon-card",
        ".offer-card",
        ".deal-card",
        ".code-card",
        '[class*="coupon"]',
        '[class*="offer"]',
        '[class*="deal"]',
        "[data-coupon]",
        "[data-offer]",
        "[data-code]",
        "article",
        ".card",
        ".item",
        ".box",
        'div[class*="Code"]',
        'div[class*="Offer"]',
        'div[class*="Deal"]',
      ];

      let couponElements = [];
      let usedSelector = "";

      for (const selector of couponSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          // Filter out navigation/header elements
          couponElements = Array.from(elements).filter((el) => {
            const text = el.innerText || el.textContent || "";
            return text.length > 20 && !el.closest("nav, header, footer");
          });

          if (couponElements.length > 0) {
            usedSelector = selector;
            console.log(
              `Found ${couponElements.length} coupons with selector: ${selector}`
            );
            break;
          }
        }
      }

      // If still nothing found, try to find any structured content
      if (couponElements.length === 0) {
        const allDivs = document.querySelectorAll("div, article, section");
        couponElements = Array.from(allDivs).filter((el) => {
          const text = el.innerText || "";
          const hasCode =
            text.toLowerCase().includes("code") ||
            text.toLowerCase().includes("coupon") ||
            text.toLowerCase().includes("offer") ||
            text.toLowerCase().includes("deal");
          const hasButton = el.querySelector("button, .button, .btn");
          return hasCode && hasButton && text.length > 30 && text.length < 1000;
        });
        console.log(
          `Fallback found ${couponElements.length} potential coupons`
        );
      }

      couponElements.forEach((el, index) => {
        try {
          // Extract title
          const titleEl = el.querySelector(
            "h1, h2, h3, h4, h5, h6, .title, .heading, strong, b"
          );
          let title =
            titleEl?.innerText?.trim() || titleEl?.textContent?.trim();

          if (!title) {
            // Try to get first significant text
            const textNodes = el.childNodes;
            for (const node of textNodes) {
              if (node.nodeType === 3 && node.textContent.trim().length > 10) {
                title = node.textContent.trim();
                break;
              }
            }
          }

          if (!title) title = `Offer ${index + 1}`;

          // Extract coupon code
          let code = "";
          const codePatterns = [
            ".code",
            ".coupon-code",
            ".promo-code",
            "code",
            "[data-code]",
            ".discount-code",
            "button",
            ".btn",
            ".button",
            "span.code",
          ];

          for (const pattern of codePatterns) {
            const codeEl = el.querySelector(pattern);
            if (codeEl) {
              code =
                codeEl.innerText?.trim() ||
                codeEl.textContent?.trim() ||
                codeEl.dataset?.code ||
                codeEl.value ||
                "";

              if (code) {
                code = code
                  .replace(
                    /CODE:|COPY|GET CODE|SHOW CODE|REVEAL CODE|USE CODE|ACTIVATE/gi,
                    ""
                  )
                  .trim();
                if (code.length > 2 && code.length < 30) break;
              }
            }
          }

          // Check for "no code needed" deals
          const fullText = el.innerText?.toLowerCase() || "";
          const isNoCo =
            fullText.includes("no code") ||
            fullText.includes("auto") ||
            fullText.includes("automatic");

          if (!code || code === "") {
            code = isNoCo ? "DEAL" : "GETCODE";
          }

          // Extract description
          const descEl = el.querySelector(
            "p, .description, .desc, .details, .text"
          );
          const description =
            descEl?.innerText?.trim() || descEl?.textContent?.trim() || "";

          // Extract discount
          const discountRegex =
            /(\d+%\s*off|save\s*\$?\d+|up to\s*\d+%|\$\d+\s*off)/gi;
          const discountMatch = fullText.match(discountRegex);
          const discount = discountMatch ? discountMatch[0] : "";

          // Extract expiry
          const expiryRegex =
            /(expires?:?\s*\w+\s*\d+|valid till:?\s*\w+\s*\d+|\d{1,2}\/\d{1,2}\/\d{2,4})/gi;
          const expiryMatch = fullText.match(expiryRegex);
          const expiry = expiryMatch
            ? expiryMatch[0].replace(/expires?:?|valid till:?/gi, "").trim()
            : "";

          // Extract link
          const linkEl = el.querySelector("a") || el.closest("a");
          const link = linkEl?.href || window.location.href;

          // Extract image
          const imgEl = el.querySelector("img");
          const imageSrc = imgEl?.src || imgEl?.dataset?.src || "";

          // Determine type
          const type = code === "DEAL" || code === "NOCODE" ? "Deal" : "Coupon";

          // Check if verified
          const isVerified =
            fullText.includes("verified") ||
            el.querySelector('.verified, [class*="verified"]')
              ? "Yes"
              : "No";

          if (
            title.length > 3 &&
            !title.toLowerCase().includes("advertisement")
          ) {
            result.coupons.push({
              store_name: storeName,
              title: title.substring(0, 200),
              code: code,
              description: description.substring(0, 500),
              discount: discount,
              expiry: expiry,
              link: link,
              image_src: imageSrc,
              type: type,
              verified: isVerified,
              raw_text_preview: fullText.substring(0, 100),
            });
          }
        } catch (err) {
          console.error("Error parsing coupon element:", err.message);
        }
      });

      result.storeInfo.totalCoupons = result.coupons.length;
      return result;
    }, storeName);

    console.log(`      ✓ Found ${pageData.coupons.length} coupons`);

    return pageData;
  } catch (error) {
    console.error(`      ✗ Error scraping ${storeName}:`, error.message);
    return { coupons: [], storeInfo: {} };
  }
}

// async function scrapeCategories(page) {
//   console.log("\n📍 Step 2: Scraping categories...\n");

//   try {
//     // Go to homepage to find category links
//     await page.goto("https://startupworld.com/", {
//       waitUntil: "domcontentloaded",
//       timeout: 45000,
//     });

//     await delay(2000);

//     const categories = await page.evaluate(() => {
//       const categoriesData = [];
//       const seen = new Set();

//       // Look for category links
//       const catSelectors = [
//         'a[href*="/category/"]',
//         'a[href*="/categories/"]',
//         ".category a",
//         ".cat-item a",
//         "nav a",
//         ".menu a",
//       ];

//       for (const selector of catSelectors) {
//         const elements = document.querySelectorAll(selector);

//         elements.forEach((el) => {
//           const href = el.href;
//           const name = el.innerText?.trim() || el.textContent?.trim();

//           if (!href || !name || seen.has(href)) return;
//           if (href.includes("/store/") || href.includes("/brand/")) return;
//           if (name.length < 2) return;

//           seen.add(href);
//           categoriesData.push({
//             name: name,
//             link: href,
//             slug: href.split("/").filter(Boolean).pop(),
//           });
//         });

//         if (categoriesData.length > 0) break;
//       }

//       return categoriesData;
//     });

//     console.log(`   ✓ Found ${categories.length} categories\n`);
//     return categories;
//   } catch (error) {
//     console.error(`   ✗ Error scraping categories:`, error.message);
//     return [];
//   }
// }

// ============================================
// MAIN SCRAPER
// ============================================

async function scrapeStartupWorld(options = {}) {
  const {
    maxLetters = 3, // How many alphabet pages to scrape
    maxStores = 10,
    maxCouponsPerStore = 100,
    downloadImages = false,
    uploadToCloud = false,
    scrapeCategories = true,
  } = options;

  console.log("\n" + "=".repeat(60));
  console.log("🚀 StartupWorld.com Deep Scraper Started");
  console.log("=".repeat(60));
  console.log(`Settings:`);
  console.log(`  - Alphabet Pages: ${maxLetters}`);
  console.log(`  - Max Stores: ${maxStores}`);
  console.log(`  - Download Images: ${downloadImages}`);
  console.log(`  - Scrape Categories: ${scrapeCategories}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--window-size=1920,1080",
    ],
  });

  console.log("✓ Browser launched successfully\n");

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1920, height: 1080 });

    // Step 1: Get all stores from alphabet pages
    const allStores = await getAllStores(page, maxLetters);

    if (allStores.length === 0) {
      console.log("\n⚠️  WARNING: No stores found!");
      console.log(
        "   The page structure might have changed. Check the browser window."
      );
      await delay(30000); // Keep browser open for inspection
      await browser.close();
      return;
    }

    // Step 2: Get categories
    let categories = [];
    if (scrapeCategories) {
      categories = await scrapeCategories(page);
    }

    // Step 3: Scrape coupons from stores
    console.log(
      `\n📍 Step 3: Scraping coupons from ${Math.min(
        maxStores,
        allStores.length
      )} stores...\n`
    );

    const allCoupons = [];
    const storesToScrape = allStores.slice(0, maxStores);
    const storesWithInfo = [];

    for (let i = 0; i < storesToScrape.length; i++) {
      const store = storesToScrape[i];
      console.log(`[${i + 1}/${storesToScrape.length}]`);

      const pageData = await scrapeStorePage(page, store.web_url, store.name);

      storesWithInfo.push({
        ...store,
        ...pageData.storeInfo,
      });

      allCoupons.push(...pageData.coupons.slice(0, maxCouponsPerStore));

      await delay(2000);
    }

    console.log(`\n✓ Total coupons scraped: ${allCoupons.length}`);

    // Step 4: Process images (if enabled)
    if (downloadImages && allCoupons.length > 0) {
      console.log("\n📍 Step 4: Processing images...\n");

      for (let i = 0; i < storesWithInfo.length; i++) {
        if (storesWithInfo[i].logo_src || storesWithInfo[i].logo) {
          const logoSrc = storesWithInfo[i].logo_src || storesWithInfo[i].logo;
          if (uploadToCloud) {
            storesWithInfo[i].logo_url = await processImage(
              logoSrc,
              "logo",
              i,
              "merchant-images",
              "merchants"
            );
          } else {
            storesWithInfo[i].logo_url = logoSrc;
          }
        }
      }

      for (let i = 0; i < allCoupons.length; i++) {
        if (allCoupons[i].image_src) {
          if (uploadToCloud) {
            allCoupons[i].image_url = await processImage(
              allCoupons[i].image_src,
              "coupon",
              i,
              "coupon-images",
              "coupons"
            );
          } else {
            allCoupons[i].image_url = allCoupons[i].image_src;
          }
        }
      }
    }

    // Step 5: Export to Excel
    console.log("\n📍 Step 5: Exporting to Excel...");

    const wb = XLSX.utils.book_new();

    // Stores sheet
    const storesData = storesWithInfo.map((s) => ({
      Store_Name: s.name,
      Store_URL: s.web_url,
      Website: s.website || "",
      Description: cleanText(s.description || ""),
      Logo_URL: s.logo_url || s.logo_src || s.logo || "",
      Total_Coupons:
        s.totalCoupons ||
        allCoupons.filter((c) => c.store_name === s.name).length,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(storesData),
      "Stores"
    );

    // Coupons sheet
    if (allCoupons.length > 0) {
      const couponsData = allCoupons.map((c) => ({
        Store: c.store_name,
        Title: cleanText(c.title),
        Code: c.code,
        Type: c.type,
        Description: cleanText(c.description),
        Discount: c.discount,
        Expiry: c.expiry,
        Verified: c.verified,
        Link: c.link,
        Image_URL: c.image_url || c.image_src || "",
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(couponsData),
        "Coupons"
      );
    }

    // Categories sheet
    if (categories.length > 0) {
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(categories),
        "Categories"
      );
    }

    // Summary
    const summaryData = [
      {
        Total_Stores_Found: allStores.length,
        Stores_Scraped: storesToScrape.length,
        Total_Coupons: allCoupons.length,
        Coupon_Codes: allCoupons.filter((c) => c.type === "Coupon").length,
        Deals: allCoupons.filter((c) => c.type === "Deal").length,
        Categories: categories.length,
        Scrape_Date: new Date().toISOString(),
        Alphabet_Pages_Scraped: maxLetters,
      },
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(summaryData),
      "Summary"
    );

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")[0];
    const filePath = path.join(
      "output",
      `startupworld_${timestamp}_${Date.now()}.xlsx`
    );
    XLSX.writeFile(wb, filePath);

    console.log("\n" + "=".repeat(60));
    console.log("✅ SCRAPING COMPLETED!");
    console.log("=".repeat(60));
    console.log(`📊 Stores Found:    ${allStores.length}`);
    console.log(`📊 Stores Scraped:  ${storesToScrape.length}`);
    console.log(`🎟️  Total Coupons:   ${allCoupons.length}`);
    console.log(
      `💰 Coupon Codes:    ${
        allCoupons.filter((c) => c.type === "Coupon").length
      }`
    );
    console.log(
      `🏷️  Deals:           ${
        allCoupons.filter((c) => c.type === "Deal").length
      }`
    );
    console.log(`📁 Categories:      ${categories.length}`);
    console.log(`📄 Excel File:      ${filePath}`);
    console.log("=".repeat(60) + "\n");

    return {
      stores: storesWithInfo,
      coupons: allCoupons,
      categories,
      filePath,
    };
  } catch (error) {
    console.error("\n❌ FATAL ERROR:", error);
    throw error;
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
    await scrapeStartupWorld({
      maxLetters: 2, // Scrape first 2 alphabet pages (A, B)
      maxStores: 5, // Scrape 5 stores
      maxCouponsPerStore: 100,
      downloadImages: false,
      uploadToCloud: false,
      scrapeCategories: false,
    });

    console.log("🎉 Done! Check the output folder.");
  } catch (err) {
    console.error("💥 Fatal error:", err);
    process.exit(1);
  }
}

main();
