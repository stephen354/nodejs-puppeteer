const puppeteer = require("puppeteer");
const fs = require("fs"); //file system

async function scrappingData(path, url) {
  //cek folder data ada atau tidak
  if (!fs.existsSync("./data")) fs.mkdirSync("./data");

  //cek file json ada atau tidak
  const dataPath = "./data/" + path;
  const initialData = [
    {
      posts: 0,
      followers: 0,
      following: 0,
    },
  ];
  if (!fs.existsSync(dataPath))
    fs.writeFileSync(dataPath, JSON.stringify(initialData, null, 2));

  async function pushData(data) {
    const file = fs.readFileSync(dataPath, "utf-8");
    const instagram = JSON.parse(file);
    data.forEach((d, index) => {
      switch (index) {
        case 0:
          instagram[0].posts = d;
          break;
        case 1:
          instagram[0].followers = d;
          break;
        case 2:
          instagram[0].following = d;
          break;
        default:
          break;
      }
    });
    console.log(instagram);

    fs.writeFileSync(dataPath, JSON.stringify(instagram, null, 2));
  }

  (async () => {
    const browser = await puppeteer.launch({
      headless: false, // untuk menampilkan GUI
      defaultViewport: false, // mengatur ukuran Mobile Desktop GUI
      userDataDir: "./tmp", // menyimpan data session cookies
      args: ["--lang=en-US"], // terjemahan browser
    });

    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: "networkidle0",
    });
    const selector =
      "span.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1hl2dhg.x16tdsg8.x1vvkbs";

    const followers = "span.x5n08af.x1s688f[title]";
    await Promise.all([
      page.waitForSelector(selector, { timeout: 30000 }),
      page.waitForSelector(followers, { timeout: 30000 }),
    ]);
    const elements = await page.$$(selector);
    console.log(elements.length); // cek data
    const follower = await page.$(followers);
    const data = []; // tmp untuk menampung data
    if (elements.length > 0) {
      for (const [index, element] of elements.entries()) {
        let d;
        if (index == 1 && follower) {
          d = await page.evaluate(
            (el) => el.getAttribute("title").replace(/[.,]/g, ""),
            follower
          );
        } else {
          d = await page.evaluate(
            (el) => el.innerText.replace(/[.,]/g, ""),
            element
          );
        }
        console.log(d);
        data.push(parseInt(d, 10)); // data dimasukkan ke dalam array
      }
    } else {
      console.log("Tidak ada elemen yang ditemukan dengan selector tersebut.");
    }
    pushData(data);
    await browser.close(); //close browser
  })();
}

// path : .json dan url
scrappingData("ig_cristiano.json", "https://www.instagram.com/cristiano");
