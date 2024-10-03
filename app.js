const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const FilePath = path.join(
  __dirname + "/static files" + "/downloaded_page.html"
);

async function fetchHTMLFileFromAmazonAndProcess(searchQuery) {
  const url = createAmazonURL(searchQuery);
  await makeFetchRequest(url);
  const relevantContent = await parseHTMLStringAndFetchRelevantContent();
  const jsonData = processProductString(relevantContent, searchQuery);
  console.log(jsonData);
}

function createAmazonURL(searchQuery) {
  const searchQueryArray = searchQuery.split(" ");
  console.log(searchQueryArray);
  var searchURL = "https://www.amazon.in/s?k=";
  for (word of searchQueryArray) {
    console.log(word);
    searchURL = searchURL.concat(word);
    searchURL = searchURL.concat("+");
  }
  searchURL = searchURL.slice(0, -1);
  console.log(searchURL);
  return searchURL;
}

async function makeFetchRequest(URL) {
  try {
    const response = await fetch(URL);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const textContent = await response.text();
    await fs.promises.mkdir(path.dirname(FilePath), { recursive: true });
    await fs.promises.writeFile(FilePath, textContent, "utf8");
  } catch (error) {
    console.error("Error fetching the HTML:", error);
  }
}

async function parseHTMLStringAndFetchRelevantContent() {
  try {
    const textContent = await fs.promises.readFile(FilePath, "utf8");
    const dom = new JSDOM(textContent);
    const doc = dom.window.document;
    const searchResults = doc.querySelectorAll(
      '[data-component-type="s-search-result"]'
    );
    let dataString = "";
    for (i = 0; i < 10; i++) {
      dataString += searchResults[i].textContent.trim();
      dataString += "\n";
      dataString +=
        "-------------------------------------------------------------------------------------------------------";
      dataString += "\n";
    }
    console.log(dataString);
    return dataString;
  } catch (error) {
    console.log("something went wrong " + error.message);
  }
}

function processProductString(inputString, title) {
  const products = inputString.split(
    "-------------------------------------------------------------------------------------------------------"
  );

  const productList = [];

  products.forEach((product) => {
    let trimmedProduct = product.trim();

    const sponsoredMessage =
      "SponsoredSponsored You are seeing this ad based on the product’s relevance to your search query.Let us know";
    if (trimmedProduct.includes(sponsoredMessage)) {
      trimmedProduct = trimmedProduct.replace(sponsoredMessage, "").trim();
      if (!trimmedProduct.toLowerCase().includes(title.toLowerCase())) {
        return;
      }
    }

    const firstRupeeIndex = trimmedProduct.indexOf("₹");
    if (firstRupeeIndex === -1) return;

    const costStartIndex = firstRupeeIndex + 1;
    const costEndIndex = trimmedProduct.indexOf("₹", costStartIndex);

    let cost;
    if (costEndIndex === -1) {
      const costEndCharacterIndex = trimmedProduct.search(
        /[^0-9,]/,
        costStartIndex
      );

      if (costEndCharacterIndex === -1) {
        cost = trimmedProduct.slice(costStartIndex).trim();
      } else {
        cost = trimmedProduct
          .slice(costStartIndex, costEndCharacterIndex)
          .trim();
      }
    } else {
      cost = trimmedProduct.slice(costStartIndex, costEndIndex).trim();
    }

    const starsIndex = trimmedProduct.indexOf("stars");
    const description =
      starsIndex === -1
        ? trimmedProduct.slice(0, firstRupeeIndex).trim()
        : trimmedProduct.slice(0, starsIndex + 5).trim();

    const productObject = {
      title: title,
      description: description,
      cost: cost,
    };

    productList.push(productObject);
  });

  return productList[0];
}

fetchHTMLFileFromAmazonAndProcess("m audio midi controller");
