const puppeteer = require("puppeteer");
const fs = require("fs"); //file system

//cek folder data ada atau tidak
if (!fs.existsSync("./data")) fs.mkdirSync("./data");

//cek file json ada atau tidak
const dataPath = "./data/element_4.json";
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, "[]");

async function pushData(data) {
  const file = fs.readFileSync(dataPath, "utf-8");
  const contacts = JSON.parse(file);

  contacts.push(data);
  console.log(contacts);

  fs.writeFileSync(dataPath, JSON.stringify(contacts, null, 2));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: false,
    userDataDir: "./tmp",
  });
  const page = await browser.newPage();
  await page.goto(
    "https://www.tokopedia.com/search?navsource=&page=2&q=tas&search_id=20240924061143663D5C8060A0260F2D0E&srp_component_id=02.01.00.00&srp_page_id=&srp_page_title=&st=",
    { waitUntil: "networkidle0" }
  );

  await autoScroll(page);

  // const selector =
  //   "div.css-jza1fo > div.css-5wh65g > a > div > div > div > span:first-of-type";
  const selector = "div.css-5wh65g";
  // Cek apakah selector ada di halaman
  await page.waitForSelector(selector, { timeout: 30000 });
  const elements = await page.$$(selector);
  console.log("data : " + elements.length);

  console.log(elements[50]);
  const data = [];

  // Ambil title produk
  if (elements.length > 0) {
    // Loop melalui elemen dan ambil teks dari masing-masing
    for (const element of elements) {
      const dataProduct = {};
      const spanSelectorName =
        "a > div > div:nth-of-type(2) > div > span:first-of-type"; // Ganti dengan selector yang sesuai
      await page.waitForSelector(spanSelectorName, { timeout: 30000 });
      const spanName = await element.$(spanSelectorName);

      if (spanName) {
        // Ambil teks dari span pertama
        const productName = await page.evaluate((el) => el.innerText, spanName);
        dataProduct.productName = productName;
        console.log("Product Name:", productName);
      } else {
        console.log(
          "Tidak ada elemen span yang ditemukan di dalam div tersebut."
        );
      }

      const spanSelectorPrice =
        "a > div > div:nth-of-type(2) > div:nth-of-type(2) > div"; // Ganti dengan selector yang sesuai
      await page.waitForSelector(spanSelectorPrice, { timeout: 30000 });
      const spanPrice = await element.$(spanSelectorPrice);

      if (spanPrice) {
        // Ambil teks dari span pertama
        const productPrice = await page.evaluate(
          (el) => el.innerText,
          spanPrice
        );
        dataProduct.price = productPrice;
        console.log("Price:", productPrice);
      } else {
        console.log(
          "Tidak ada elemen span yang ditemukan di dalam div tersebut."
        );
      }

      data.push(dataProduct);
    }
  } else {
    console.log("Tidak ada elemen yang ditemukan dengan selector tersebut.");
  }
  pushData(data);
  // await page.screenshot({ path: "example.png" });
  // Lakukan tugas lainnya
  await browser.close();
})();

// Fungsi untuk menggulir ke bawah secara otomatis
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
