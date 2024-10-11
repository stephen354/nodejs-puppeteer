Note : 
> app.js (Scraping Home Page + Detail Data):
This file is responsible for scraping data from both the homepage and product detail pages.
For example, app.js will collect a list of products from the homepage and then connect or navigate to each product's detail page to scrape more specific information.

> main.js (Scraping 1 Product Detail):
This file is dedicated solely to scraping one product detail page. When a product is selected,
main.js will scrape detailed information such as the description, price, reviews, and other relevant data available on that specific page.

> url.js (Fetching Detail Product URLs):
This file is used to manage and retrieve URLs of each product detail page to be scraped.
It might be responsible for collecting or storing the URLs of products, which are gathered from the homepage or other locations.

> main_url.js (Running URLs + Scraping Detail Data):
This file is tasked with running the URLs obtained from url.js and then scraping data from the detail pages.
This process includes accessing the URL, loading the product page, and automatically extracting the required data.