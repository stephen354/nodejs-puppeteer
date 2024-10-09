const puppeteer = require("puppeteer");
const fs = require("fs"); //file system

//cek folder data ada atau tidak
if (!fs.existsSync("./data")) fs.mkdirSync("./data");

//cek file json ada atau tidak
const dataPath = "./data/ui8_product_not_featured.json";
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, "[]");

async function pushData(data) {
  const file = fs.readFileSync(dataPath, "utf-8");
  const dataUI = JSON.parse(file);
  dataUI.push(data);
  fs.writeFileSync(dataPath, JSON.stringify(dataUI, null, 2));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true, // Set ke false jika ingin melihat browser
    defaultViewport: {
      width: 1920, // Lebar viewport
      height: 1080, // Tinggi viewport
      deviceScaleFactor: 1, // Skala perangkat
    }, // mengatur ukuran Mobile Desktop GUI
    userDataDir: "./tmp",
  });
  const page = await browser.newPage();

  // Ganti URL ini dengan halaman targetmu
  const url =
    "https://ui8.net/finterface-1ade8a/products/finpal-ai-finance-assisstant-app-ui-kit";
  // ------------------Mengatasi Captcha
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36"
  );
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
  });
  // ------------------END Mengatasi Captcha

  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

  await page.waitForSelector(
    "div.body-container > div.body-content > div > div[ng-init]"
  );

  const initData = await page.$(
    "div.body-container > div.body-content > div > div[ng-init]"
  );
  const data = await initData.evaluate((el) => el.getAttribute("ng-init"));

  const jsonString = data
    .replace(/^init\(|\)$/g, "")
    .trim()
    .replace(/, undefined, false$/, "");
  // Ambil bagian dalam kurung
  const jsonData = JSON.parse(jsonString); // Ganti &quot; dengan tanda kutip yang benar

  const dataUI = {
    Name: jsonData.subtitle,
    Author: jsonData.product.author.display_name,
    Price: jsonData.product.seasonal_promo_enabled ?? jsonData.product.price,
    Likes: jsonData.product.likes ?? 0,
    Comment: jsonData.product.discussion.total_comments,
    Featured: jsonData.product.previously_featured,
    Published: jsonData.product.created_at,
    Type: jsonData.product.tags,
  };
  await pushData(dataUI);
  await browser.close();
})();
