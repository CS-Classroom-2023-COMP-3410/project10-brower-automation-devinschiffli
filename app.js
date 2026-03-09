const puppeteer = require('puppeteer');
const fs = require('fs');

// TODO: Load the credentials from the 'credentials.json' file
// HINT: Use the 'fs' module to read and parse the file
const credentials = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));

(async () => {
  // TODO: Launch a browser instance and open a new page
  const browser = await puppeteer.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();

  // Navigate to GitHub login page
  await page.goto('https://github.com/login');

  // TODO: Login to GitHub using the provided credentials
  // HINT: Use the 'type' method to input username and password, then click on the submit button
  await page.type('#login_field', credentials.username);
  await page.type('#password', credentials.password);
  await page.click('[name="commit"]');

  //Original selector '.avatar.circle' no longer exists in GitHub's UI
  //Using waitForNavigation instead to detect successful login
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // Extract the actual GitHub username to be used later
  const actualUsername = await page.$eval('meta[name="octolytics-actor-login"]', meta => meta.content);

  const repositories = ["cheeriojs/cheerio", "axios/axios", "puppeteer/puppeteer"];

  //page.waitForTimeout was removed in newer versions of Puppeteer
  // Using a custom sleep function instead
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  for (const repo of repositories) {
    await page.goto(`https://github.com/${repo}`);

    // TODO: Star the repository
    // HINT: Use selectors to identify and click on the star button
    await page.waitForSelector('.js-toggler-target.BtnGroup-item');
    await page.click('.js-toggler-target.BtnGroup-item');
    await sleep(1000);
  }

  // TODO: Navigate to the user's starred repositories page
  await page.goto(`https://github.com/${actualUsername}?tab=stars`);

  // TODO: Click on the "Create list" button
  await page.waitForSelector('.Button--primary.Button--medium.Button');
  await page.click('.Button--primary.Button--medium.Button');

  // TODO: Create a list named "Node Libraries"
  // HINT: Wait for the input field and type the list name
  await page.waitForSelector('#user_list_name');
  await page.type('#user_list_name', 'Node Libraries');
  await sleep(2000);

  // Identify and click the "Create" button
  const buttons = await page.$$('.Button--primary.Button--medium.Button');
  for (const button of buttons) {
    const buttonText = await button.evaluate(node => node.textContent.trim());
    if (buttonText === 'Create') {
      await button.evaluate(btn => btn.click());
      break;
    }
  }

  // Allow some time for the list creation process
  await sleep(2000);

  const dropdownSelector = 'details.js-user-list-menu summary';

  for (const repo of repositories) {
    await page.goto(`https://github.com/${repo}`);

    // TODO: Add this repository to the "Node Libraries" list
    // HINT: Open the dropdown, wait for it to load, and find the list by its name
    await page.waitForSelector(dropdownSelector);
    await page.click(dropdownSelector);
    await page.waitForSelector('.SelectMenu');
    const lists = await page.$$('.js-user-list-menu-item');

    for (const list of lists) {
      const label = await list.evaluateHandle(el => el.closest('label'));
      const text = await label.evaluate(el => el.innerText);
      if (text.includes('Node Libraries')) {
        await label.evaluate(el => el.click());
        break;
      }
    }

    // Allow some time for the action to process
    await sleep(1000);

    // Close the dropdown to finalize the addition to the list
    await page.evaluate((selector) => {
      document.querySelector(selector).closest('details').removeAttribute('open');
    }, dropdownSelector);
  }

  // Close the browser
  await browser.close();
})();