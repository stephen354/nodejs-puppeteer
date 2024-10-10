const puppeteer = require("puppeteer");
const fs = require("fs"); //file system

//cek folder data ada atau tidak
if (!fs.existsSync("./data")) fs.mkdirSync("./data");

//cek file json ada atau tidak
const dataPath = "./data/ui8_all2.json";
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, "[]");

async function pushData(data) {
  const file = fs.readFileSync(dataPath, "utf-8");
  const dataUI = JSON.parse(file);
  dataUI.push(...data);
  fs.writeFileSync(dataPath, JSON.stringify(dataUI, null, 2));
}

async function run(data, load) {
  const browser = await puppeteer.launch({
    headless: true, // Set ke false jika ingin melihat browser
    defaultViewport: {
      width: 1920, // Lebar viewport
      height: 1080, // Tinggi viewport
      deviceScaleFactor: 1, // Skala perangkat
    }, // mengatur ukuran Mobile Desktop GUI
    userDataDir: "./tmp",
  });

  async function processItem(item) {
    return new Promise(async (resolve, reject) => {
      // Tambahkan reject untuk error handling
      setTimeout(async () => {
        // setTimeout tetap asynchronous, tapi fungsi callback tetap butuh async
        try {
          const page = await browser.newPage();
          const url = item;

          // Ganti URL ini dengan halaman targetmu
          // const url =
          //   "https://ui8.net/finterface-1ade8a/products/finpal-ai-finance-assisstant-app-ui-kit";
          // ------------------Mengatasi Captcha
          await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36"
          );
          await page.setExtraHTTPHeaders({
            "Accept-Language": "en-US,en;q=0.9",
          });
          // ------------------END Mengatasi Captcha

          await page.goto(url, {
            waitUntil: "domcontentloaded",
          });

          await page.waitForSelector(
            "div.body-container > div.body-content > div > div[ng-init]"
          );

          const initData = await page.$(
            "div.body-container > div.body-content > div > div[ng-init]"
          );
          const data = await initData.evaluate((el) =>
            el.getAttribute("ng-init")
          );

          const jsonString = data
            .replace(/^init\(|\)$/g, "")
            .trim()
            .replace(/, undefined, false$/, "");
          // Ambil bagian dalam kurung
          const jsonData = JSON.parse(jsonString); // Ganti &quot; dengan tanda kutip yang benar

          const dataUI = {
            Name: jsonData.subtitle,
            Author: jsonData.product.author.display_name,
            Price: jsonData.product.seasonal_promo_price
              ? jsonData.product.seasonal_promo_price / 100
              : jsonData.product.price / 100,
            Likes: jsonData.product.likes ?? 0,
            Comment: jsonData.product.discussion.total_comments,
            Featured: jsonData.product.previously_featured,
            Published: jsonData.product.created_at,
            Type: jsonData.product.tags,
          };
          await page.close();
          resolve(dataUI);
        } catch (error) {
          reject(error); // Jika ada error, reject Promise
        }
      }, 1000);
    });
  }

  async function processBatch(batch) {
    const promises = batch.map((item) => processItem(item)); // Membuat array promise
    const result = await Promise.all(promises);
    console.log(result);
    pushData(result); // Tunggu semua promise selesai
  }

  // Fungsi untuk membagi data menjadi batch dan memprosesnya 100
  async function processDataInBatches(data, batchSize) {
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize); // Ambil batch
      await processBatch(batch); // Proses batch
    }
  }
  const page = await browser.newPage();
  // Ganti URL ini dengan halaman targetmu
  const url = "https://ui8.net/category/ui-kits";
  // ------------------Mengatasi Captcha
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36"
  );
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
  });
  // ------------------END Mengatasi Captcha

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // --------------------Format  Figma
  const figmaButton =
    "software-filter > div.filters__select > div.filters__dropdown.isWide.isWider> button:nth-of-type(2)";
  const dropdownFigma = "software-filter > div.filters__select ";
  await page.waitForSelector(dropdownFigma, {
    visible: true,
    timeout: 5000,
  });

  await page.click(dropdownFigma); // click dropdown
  await page.waitForSelector(figmaButton, {
    visible: true,
    timeout: 5000,
  });
  await page.click(figmaButton);

  // --------------------Filter  Popularity
  const popularityButton =
    "div.filters__sorting > product-filter > div.filters__select > div > button:nth-of-type(2)";
  const dropdown =
    "div.filters__sorting > product-filter > div.filters__select ";
  await page.waitForSelector(dropdown, {
    visible: true,
    timeout: 5000,
  });
  await page.click(dropdown); // click dropdown
  await page.waitForSelector(
    popularityButton,
    { visible: true },
    { timeout: 5000 }
  );
  await page.click(popularityButton); // pilih filter popularity
  if (data) {
    // Limit
    //------------------------- Load Data
    async function loadData(lengthData) {
      let result = Math.ceil(lengthData / 48); // pembagian bulat ke atas
      console.log(result);
      const viewMore = "div.page__foot > button";
      let i = 1;
      while (i < result) {
        await page.waitForSelector(viewMore, { timeout: 5000 });
        await page.click(viewMore);
        // untuk memastikan konten baru termuat
        await page.evaluate(
          () => new Promise((resolve) => setTimeout(resolve, 2000))
        );
        i++;
      }
    }
    await loadData(data); //
  } else {
    //------------ ALL Data
    let buttonExist = true;
    let i = 1;
    while (buttonExist) {
      console.log(i++);
      try {
        const viewMore = "div.page__foot > button";
        await page.waitForSelector(viewMore, { timeout: 10000 });
        const button = await page.$(viewMore);
        if (button) {
          await page.click(viewMore);
          await page.evaluate(
            () => new Promise((resolve) => setTimeout(resolve, 2000))
          );
        } else {
          buttonExist = false;
        }
      } catch (error) {
        // Jika ada error, misalnya karena timeout, keluar dari loop
        console.log("Elemen view more tidak ditemukan atau timeout:", error);
        buttonExist = false;
      }
    }
  }

  await page.waitForNetworkIdle({ idleTime: 1000, timeout: 30000 });
  //-----------------------Ambil Selector Product
  const productSelector = "a.product__link";
  await page.waitForSelector(
    productSelector,
    { visible: true },
    { timeout: 60000 }
  );

  const productElement = await page.$$(productSelector);
  let productUrl = [];
  for (const p of productElement) {
    let url = await p.evaluate((el) => el.getAttribute("href"));
    productUrl.push("https://ui8.net" + url);
  }

  console.log(productUrl);
  if (data) {
    await processDataInBatches(productUrl.slice(0, data), load).then(() => {
      console.log("Semua data telah diproses");
    });
  } else {
    await processDataInBatches(productUrl, load).then(() => {
      console.log("Semua data telah diproses");
    });
  }

  console.log("Done");
  await browser.close();
}
// run (data , data per load)
// Note : data per load max 10 (network and device can > 10)
// data null to pull all data; data type number, ex : 1000

run(null, 5);
