const puppeteer = require("puppeteer");
const fs = require("fs"); //file system

//cek folder data ada atau tidak
if (!fs.existsSync("./data")) fs.mkdirSync("./data");

//cek file json ada atau tidak
const dataPath = "./data/framer.json";
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, "[]");

async function pushData(data) {
  const file = fs.readFileSync(dataPath, "utf-8");
  const dataFramer = JSON.parse(file);
  dataFramer.push(...data);
  fs.writeFileSync(dataPath, JSON.stringify(dataFramer, null, 2));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true, // untuk menampilkan GUI
    defaultViewport: false, // mengatur ukuran Mobile Desktop GUI
    userDataDir: "./tmp", // menyimpan data session cookies
  });
  const page = await browser.newPage();
  await page.goto("https://www.framer.com/marketplace/?query=paid&page=24", {
    waitUntil: "networkidle0",
    timeout: 60000,
  });

  const selector = "div:nth-of-type(3).grid.grid-cols-2.gap-5 > div";
  await page.waitForSelector(selector, { timeout: 60000 });

  const elements = await page.$$(selector);

  // Fungsi untuk memproses satu item

  async function processItem(item) {
    return new Promise(async (resolve, reject) => {
      // Tambahkan reject untuk error handling
      setTimeout(async () => {
        // setTimeout tetap asynchronous, tapi fungsi callback tetap butuh async
        try {
          let data = {};
          const selectItem = "div > div > a > span";
          const selectPrice = "div > div > div > span:first-of-type";
          const selectAuthor = "div > div > div > a.transition-opacity";
          const selectNewPage = "div > div > a";

          const [titleElements, priceElement, authorElement, newPageElement] =
            await Promise.all([
              item.$$(selectItem), // Ambil semua elemen span yang cocok
              item.$(selectPrice), // Ambil elemen harga
              item.$(selectAuthor), // Ambil elemen author
              item.$(selectNewPage),
            ]);
          // Tunggu elemen terambil
          if (titleElements) {
            let title = "";
            for (const e of titleElements) {
              title += await e.evaluate((el) => el.innerText);
            }
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
          if (newPageElement) {
            const a = await newPageElement.evaluate((el) =>
              el.getAttribute("href")
            );
            console.log(a);
            const pageDetail = await browser.newPage();
            await pageDetail.goto("https://www.framer.com" + a, {
              waitUntil: "networkidle0",
              timeout: 60000,
            });

            const selectorDetail =
              "div.w-full.space-y-10:nth-of-type(2) > div:nth-of-type(2) > div > a";
            await pageDetail.waitForSelector(selectorDetail, {
              timeout: 30000,
            });
            const elementDetail = await pageDetail.$$(selectorDetail);
            const dataDetail = [];
            for (const e of elementDetail) {
              const a = await e.evaluate((el) => el.innerText);
              dataDetail.push(a);
            }
            data.categories = dataDetail;
            await pageDetail.close();
          }

          resolve(data);
        } catch (error) {
          reject(error); // Jika ada error, reject Promise
        }
      }, 1000);
    });
  }

  // Fungsi untuk memproses batch data
  async function processBatch(batch) {
    const promises = batch.map((item) => processItem(item)); // Membuat array promise
    const result = await Promise.all(promises);
    pushData(result); // Tunggu semua promise selesai
  }

  // Fungsi untuk membagi data menjadi batch dan memprosesnya
  async function processDataInBatches(data, batchSize) {
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize); // Ambil batch
      await processBatch(batch); // Proses batch
    }
  }

  // const data = Array.from({ length: 100 }, (v, i) => i + 1);
  await processDataInBatches(elements, 25).then(() => {
    console.log("Semua data telah diproses");
  });

  console.log(elements.length);

  await browser.close();
})();
