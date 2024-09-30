const puppeteer = require("puppeteer");
const fs = require("fs"); //file system

//cek folder data ada atau tidak
if (!fs.existsSync("./data")) fs.mkdirSync("./data");

//cek file json ada atau tidak
const dataPath = "./data/theme_forest.json";
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, "[]");

async function pushData(data) {
  const file = fs.readFileSync(dataPath, "utf-8");
  const dataTheme = JSON.parse(file);
  dataTheme.push(...data);
  fs.writeFileSync(dataPath, JSON.stringify(dataTheme, null, 2));
}

const url =
  "https://themeforest.net/category/ui-templates/figma?sort=sales#content";
// per page 30

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: false,
    userDataDir: "./tmp",
  });
  let dataUrl = [];

  async function processItem(item) {
    return new Promise(async (resolve, reject) => {
      // Tambahkan reject untuk error handling
      setTimeout(async () => {
        // setTimeout tetap asynchronous, tapi fungsi callback tetap butuh async
        try {
          const url = item;
          const page = await browser.newPage();
          await page.goto(url, {
            waitUntil: "networkidle0",
            timeout: 60000,
          });

          const selector =
            "a.shared-item_cards-list-image_card_component__itemLinkOverlay";
          await page.waitForSelector(selector, { timeout: 30000 });
          const elements = await page.$$(selector);
          const data = [];
          if (elements.length > 0) {
            for (const element of elements) {
              let dataObj = {};
              let data_analitic = await element.evaluate((el) =>
                el.getAttribute("data-analytics-click-payload")
              );
              let json_data = JSON.parse(data_analitic);
              let dataJson = json_data.ecommerce.items[0];
              dataObj.title = dataJson.itemName;
              dataObj.price = Number(dataJson.price);
              dataObj.author = dataJson.itemBrand;
              dataObj.categories = [
                dataJson.itemCategory,
                dataJson.itemCategory2,
                dataJson.itemCategory3,
              ];
              data.push(dataObj);
            }
          }
          await page.close();
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
  async function processDataInBatches(data, batchSize) {
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize); // Ambil batch
      await processBatch(batch); // Proses batch
    }
  }

  async function loadData(lengthData) {
    let result = Math.ceil(lengthData / 30);
    console.log(result);
    let i = 1;
    while (i <= result) {
      let url;
      if (i == 1) {
        url =
          "https://themeforest.net/category/ui-templates/figma?sort=sales#content";
      } else {
        url = `https://themeforest.net/category/ui-templates/figma?page=${i}&sort=sales#content`;
      }
      dataUrl.push(url);

      i++;
    }
  }
  await loadData(1000);
  // berapa page yang akan diproses
  await processDataInBatches(dataUrl, 7).then(() => {
    console.log("Semua data telah diproses");
  });
  await browser.close();
})();
