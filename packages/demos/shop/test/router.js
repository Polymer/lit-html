/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

const puppeteer = require('puppeteer');
const expect = require('chai').expect;
const {startServer} = require('polyserve');
const path = require('path');
const appUrl = 'http://127.0.0.1:4444';

describe('routing tests', function() {
  let polyserve, browser, page;

  before(async function() {
    polyserve = await startServer({port:4444, root:path.join(__dirname, '..'), moduleResolution:'node'});
  });

  after((done) => polyserve.close(done));

  beforeEach(async function() {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  afterEach(() => browser.close());

  it('should navigate to and render list page from home page', async function() {
    await page.goto(`${appUrl}`);
    const listLink = await page.waitFor(() => {
      const app = document.querySelector('shop-app');
      if (!app || !app.shadowRoot) return false;

      const home = app.shadowRoot.querySelector('shop-home');
      if (!home || !home.shadowRoot) return false;

      return home.shadowRoot.querySelector('a[href="/list/mens_outerwear"]');
    });

    expect(listLink).to.be.ok;

    await page.evaluate(el => el.click(), listLink);
    const newUrl = await page.evaluate('window.location.pathname');

    expect(newUrl).equal('/list/mens_outerwear');

    const detailLink = await page.waitFor(() => {
      const app = document.querySelector('shop-app');
      if (!app || !app.shadowRoot) return false;

      const list = app.shadowRoot.querySelector('shop-list');
      if (!list || !list.shadowRoot) return false;

      return list.shadowRoot.querySelector('a[href="/detail/mens_outerwear/Men+s+Tech+Shell+Full-Zip"]');
    });

    expect(detailLink).to.be.ok;
  });

  it('should navigate to and render detail page from list page', async function() {
    await page.goto(`${appUrl}/list/mens_outerwear`);
    const detailLink = await page.waitFor(() => {
      const app = document.querySelector('shop-app');
      if (!app || !app.shadowRoot) return false;

      const list = app.shadowRoot.querySelector('shop-list');
      if (!list || !list.shadowRoot) return false;

      return list.shadowRoot.querySelector('a[href="/detail/mens_outerwear/Men+s+Tech+Shell+Full-Zip"]');
    });

    expect(detailLink).to.be.ok;

    await page.evaluate(el => el.click(), detailLink);
    const newUrl = await page.evaluate('window.location.pathname');

    expect(newUrl).equal('/detail/mens_outerwear/Men+s+Tech+Shell+Full-Zip');

    const addToCartButton = await page.waitFor(() => {
      const app = document.querySelector('shop-app');
      if (!app || !app.shadowRoot) return false;

      const detail = app.shadowRoot.querySelector('shop-detail');
      if (!detail || !detail.shadowRoot) return false;

      return detail.shadowRoot.querySelector('button');
    });

    expect(addToCartButton).to.be.ok;
  });
});
