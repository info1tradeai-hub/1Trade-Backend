import puppeteer from "puppeteer";
// (async () => {
//   const browser = await puppeteer.launch({ headless: false });
//   const page = await browser.newPage();
//   await page.goto("https://1trade.ai/login");
//   await page.screenshot({ path: "example.png" });
//   await browser.close();
// })();

// (async () => {
//   // Launch browser
//   const browser = await puppeteer.launch({ headless: false });
//   const page = await browser.newPage();
//   await page.setViewport({ width: 1280, height: 800 });

//   // Go to login page
//   await page.goto("https://1trade.ai/login", { waitUntil: "networkidle2" });

//   // Type credentials
//   await page.type('input[type="email"]', "sidd5"); // email input selector
//   await page.type('input[type="password"]', "1234"); // password input selector

//   // Click Sign In button
//   await Promise.all([
//     page.click(".Button2"),
//     page.waitForNavigation({ waitUntil: "networkidle2" }),
//   ]);

//   // Navigate to wallet page
//   await page.goto("https://1trade.ai/wallet-first-part", {
//     waitUntil: "networkidle2",
//   });

//   // Capture screenshot
//   await page.screenshot({ path: "dashboard.png" });
//   console.log("✅ Screenshot captured successfully");

//   // Close browser
//   await browser.close();
// })();

// import cron from "node-cron";
// const contactName = "💫 𝙿𝚛𝚒𝚢𝚊 💫";
// const message = "Good afternoon ❤️";

// async function sendWhatsApp() {
//   const browser = await puppeteer.launch({ headless: false });
//   const page = await browser.newPage();
//   await page.goto("https://web.whatsapp.com", { waitUntil: "networkidle2" });

//   await page.waitForSelector(`span[title='${contactName}']`, { timeout: 0 });
//   await page.click(`span[title='${contactName}']`);

//   const inputSelector = 'div[data-tab="10"]';
//   await page.waitForSelector(inputSelector);
//   await page.type(inputSelector, message);
//   await page.keyboard.press("Enter");

//   console.log("✅ Message sent!");
//   await browser.close();
// }

// cron.schedule("* * * * * *", sendWhatsApp);
