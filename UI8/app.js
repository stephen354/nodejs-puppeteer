const puppeteer = require("puppeteer");
const fs = require("fs"); //file system

//cek folder data ada atau tidak
if (!fs.existsSync("./data")) fs.mkdirSync("./data");

//cek file json ada atau tidak
const dataPath = "./data/ui8.json";
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, "[]");

async function pushData(data) {
  const file = fs.readFileSync(dataPath, "utf-8");
  const dataUI = JSON.parse(file);
  dataUI.push(...data);
  fs.writeFileSync(dataPath, JSON.stringify(dataUI, null, 2));
}

async function processItem(item) {
  return new Promise(async (resolve, reject) => {
    // Tambahkan reject untuk error handling
    setTimeout(async () => {
      // setTimeout tetap asynchronous, tapi fungsi callback tetap butuh async
      try {
        let data = {};
        const selectItem = "div > div.product__inner > div.product__head > a";
        const selectPrice =
          "div > div.product__inner > div.product__head > div > span";
        const selectAuthor =
          "div > div.product__inner > div.product__meta > div.product__author > a:nth-child(2)";
        const selectCategory =
          "div > div.product__inner > div.product__meta > div.product__category > a";

        const [titleElements, priceElement, authorElement, categoryElement] =
          await Promise.all([
            item.$(selectItem), // Ambil semua elemen span yang cocok
            item.$(selectPrice), // Ambil elemen harga
            item.$(selectAuthor), // Ambil elemen author
            item.$(selectCategory),
          ]);

        if (titleElements) {
          const title = await titleElements.evaluate((el) => el.innerText);
          data.title = title;
        }
        if (priceElement) {
          const price = await priceElement.evaluate((el) => el.innerText);
          data.price = price;
        }
        if (authorElement) {
          const author = await authorElement.evaluate((el) => el.innerText);
          data.author = author;
        }
        if (categoryElement) {
          const category = await categoryElement.evaluate((el) => el.innerText);
          data.category = category;
        }

        resolve(data);
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
  const url = "https://ui8.net/category/ui-kits";

  // ------------------Mengatasi Captcha
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36"
  );
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
  });
  // ------------------END Mengatasi Captcha

  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

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
  await loadData(1000); //

  //-----------------------Ambil Selector Product
  const productSelector = "div.page__catalog.catalog > product-card";
  await page.waitForSelector(
    productSelector,
    { visible: true },
    { timeout: 60000 }
  );

  const productElement = await page.$$(productSelector);
  console.log(productElement.length);

  await processDataInBatches(productElement.slice(0, 999), 200).then(() => {
    console.log("Semua data telah diproses");
  });

  console.log("Done");
  await browser.close();
})();
