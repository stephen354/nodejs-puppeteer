const puppeteer = require("puppeteer");
const fs = require("fs"); //file system

//cek folder data ada atau tidak
if (!fs.existsSync("./data")) fs.mkdirSync("./data");

//cek file json ada atau tidak
const dataPath = "./data/ui8_main.json";
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, "[]");

async function pushData(data) {
  const file = fs.readFileSync(dataPath, "utf-8");
  const dataUI = JSON.parse(file);
  dataUI.push(...data);
  fs.writeFileSync(dataPath, JSON.stringify(dataUI, null, 2));
}

async function run(path, data_start, data_end, load) {
  const browser = await puppeteer.launch({
    headless: true, // Set ke false jika ingin melihat browser
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
            timeout: 60000,
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
      const batch = data.slice(i, i + batchSize);
      // Ambil batch
      await processBatch(batch); // Proses batch
    }
  }
  const file = fs.readFileSync(path, "utf-8");
  const dataFile = JSON.parse(file).flat();
  console.log(dataFile);

  if (data_start && data_end) {
    await processDataInBatches(dataFile.slice(data_start, data_end), load).then(
      () => {
        console.log("Semua data telah diproses");
      }
    );
  } else {
    await processDataInBatches(dataFile, load).then(() => {
      console.log("Semua data telah diproses");
    });
  }

  await browser.close();
}
// payload (url, data_start , data_end , load)
run("./data/ui8_url.json", null, null, 20);
