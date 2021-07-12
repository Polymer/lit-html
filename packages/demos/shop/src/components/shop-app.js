/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {LitElement, html} from 'lit';
import {repeat} from 'lit/directives/repeat.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-scroll-effects/effects/waterfall.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import {scroll} from '@polymer/app-layout/helpers/helpers.js';
import {setPassiveTouchGestures} from '@polymer/polymer/lib/utils/settings.js';

import {connect} from 'pwa-helpers/connect-mixin.js';
import {installRouter} from 'pwa-helpers/router.js';
import {updateMetadata} from 'pwa-helpers/metadata.js';
import {installOfflineWatcher} from 'pwa-helpers/network.js';
import {installMediaQueryWatcher} from 'pwa-helpers/media-query.js';

import {store} from '../store.js';
import {metaSelector} from '../reducers/app.js';
import {
  updateLocation,
  updateNetworkStatus,
  updateDrawerState,
} from '../actions/app.js';

import './shop-home.js';

class ShopApp extends connect(store)(LitElement) {
  render() {
    const categoryNames = Object.keys(this._categories);
    const categoriesList = categoryNames.map((key) => this._categories[key]);
    const selectedTabIndex = categoryNames.indexOf(this._categoryName);

    return html` <style>
        :host {
          display: block;
          position: relative;
          padding-top: 130px;
          padding-bottom: 64px;
          min-height: 100vh;
          --app-primary-color: #202020;
          --app-secondary-color: #757575;
          --app-accent-color: #172c50;
          --paper-button-ink-color: var(--app-accent-color);
          --paper-icon-button-ink-color: var(--app-accent-color);
          --paper-spinner-color: var(--app-accent-color);
          -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
          color: var(--app-primary-color);
        }

        app-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1;
          background-color: rgba(255, 255, 255, 0.95);
          --app-header-shadow: {
            box-shadow: inset 0px 5px 6px -3px rgba(0, 0, 0, 0.2);
            height: 10px;
            bottom: -10px;
          }
        }

        paper-icon-button {
          color: var(--app-primary-color);
        }

        .logo {
          text-align: center;
        }

        .logo a {
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.3em;
          color: var(--app-primary-color);
          text-decoration: none;
          /* required for IE 11, so this <a> can receive pointer events */
          display: inline-block;
          pointer-events: auto;
        }

        .left-bar-item {
          width: 40px;
        }

        shop-cart-button {
          display: block;
          width: 40px;
        }

        .announcer {
          position: fixed;
          height: 0;
          overflow: hidden;
        }

        #tabContainer {
          position: relative;
          height: 66px;
        }

        shop-tabs {
          height: 100%;
        }

        shop-tab {
          margin: 0 10px;
        }

        shop-tab a {
          display: inline-block;
          outline: none;
          padding: 9px 5px;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          color: var(--app-primary-color);
        }

        .drawer-list {
          margin: 20px 0;
        }

        .drawer-list a {
          display: block;
          padding: 0 16px;
          line-height: 40px;
          text-decoration: none;
          color: var(--app-secondary-color);
        }

        .drawer-list a.active {
          color: black;
          font-weight: bold;
        }

        shop-cart-modal {
          z-index: 2;
        }

        app-drawer {
          z-index: 3;
        }

        main {
          max-width: 1440px;
          margin: 0 auto;
        }

        main > * {
          display: none;
        }

        main > [active] {
          display: block;
        }

        footer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          text-align: center;
          margin-top: 20px;
          line-height: 24px;
        }

        footer > a {
          color: var(--app-secondary-color);
          text-decoration: none;
        }

        footer > a:hover {
          text-decoration: underline;
        }

        .demo-label {
          box-sizing: border-box;
          width: 120px;
          padding: 6px;
          margin: 8px auto 0;
          background-color: var(--app-primary-color);
          color: white;
          text-transform: uppercase;
        }

        /* small screen */
        @media (max-width: 767px) {
          :host {
            padding-top: 64px;
          }
        }
      </style>

      <shop-analytics key="UA-39334307-16"></shop-analytics>

      <app-header
        role="navigation"
        id="header"
        effects="waterfall"
        condenses
        reveals
      >
        <app-toolbar>
          <div class="left-bar-item">
            <paper-icon-button
              class="menu-btn"
              icon="menu"
              @click="${this._menuButtonClicked}"
              aria-label="Categories"
              ?hidden="${!this._smallScreen || this._page === 'detail'}"
            >
            </paper-icon-button>
            <a
              class="back-btn"
              href="/list/${this._categoryName}"
              tabindex="-1"
              ?hidden="${this._page !== 'detail'}"
            >
              <paper-icon-button
                icon="arrow-back"
                aria-label="Go back"
              ></paper-icon-button>
            </a>
          </div>
          <div class="logo" main-title>
            <a href="/" aria-label="SHOP Home">SHOP</a>
          </div>
          <shop-cart-button></shop-cart-button>
        </app-toolbar>

        <!-- Lazy-create the tabs for larger screen sizes. -->
        ${['home', 'list', 'detail'].indexOf(this._page) !== -1 &&
        !this._smallScreen &&
        this._lazyResourcesLoaded
          ? html`
              <div id="tabContainer" sticky>
                <shop-tabs .selectedIndex="${selectedTabIndex}">
                  ${repeat(
                    categoriesList,
                    (category) => html`
                      <shop-tab name="${category.name}">
                        <a href="/list/${category.name}">${category.title}</a>
                      </shop-tab>
                    `
                  )}
                </shop-tabs>
              </div>
            `
          : null}
      </app-header>

      <!-- Lazy-create the drawer for small screen sizes. -->
      ${this._smallScreen && this._lazyResourcesLoaded
        ? html`
            <app-drawer
              .opened="${this._drawerOpened}"
              tabindex="0"
              @opened-changed="${this._drawerOpenedChanged}"
            >
              <nav class="drawer-list">
                ${repeat(categoriesList, (category) => {
                  const cssClass =
                    category.name === this._categoryName ? 'active' : '';
                  return html`
                    <a class="${cssClass}" href="/list/${category.name}">
                      ${category.title}
                    </a>
                  `;
                })}
              </nav>
            </app-drawer>
          `
        : null}

      <main>
        <!-- home view -->
        <shop-home ?active="${this._page === 'home'}"></shop-home>
        <!-- list view of items in a category -->
        <shop-list ?active="${this._page === 'list'}"></shop-list>
        <!-- detail view of one item -->
        <shop-detail ?active="${this._page === 'detail'}"></shop-detail>
        <!-- cart view -->
        <shop-cart ?active="${this._page === 'cart'}"></shop-cart>
        <!-- checkout view -->
        <shop-checkout ?active="${this._page === 'checkout'}"></shop-checkout>

        <shop-404-warning ?active="${this._page === '404'}"></shop-404-warning>
      </main>

      <footer>
        <a href="https://www.polymer-project.org/3.0/toolbox/"
          >Made by Polymer</a
        >
        <div class="demo-label">Demo Only</div>
      </footer>

      <!-- a11y announcer -->
      <div class="announcer" aria-live="assertive">${this._a11yLabel}</div>

      ${this._modalOpened ? html`<shop-cart-modal></shop-cart-modal>` : null}
      ${this._lazyResourcesLoaded
        ? html`
            <shop-snackbar class="${this._snackbarOpened ? 'opened' : ''}">
              ${this._offline ? 'You are offline' : 'You are online'}
            </shop-snackbar>
          `
        : null}`;
  }

  static get properties() {
    return {
      _page: {type: String},

      _offline: {type: Boolean},

      _snackbarOpened: {type: Boolean},

      _meta: {type: Object},

      _modalOpened: {type: Object},

      _categories: {type: Object},

      _categoryName: {type: String},

      _a11yLabel: {type: String},

      _lazyResourcesLoaded: {type: Boolean},

      _drawerOpened: {type: Boolean},

      _smallScreen: {type: Boolean},
    };
  }

  updated(changedProps) {
    if (changedProps.has('_page') || changedProps.has('_categoryName')) {
      // TODO: For list view, scroll to the last saved position only if the category has not changed
      scroll({top: 0, behavior: 'silent'});
    }
    if (changedProps.has('_page')) {
      // TODO: Remove this when app-header updated to use ResizeObserver so we can avoid this bit.
      // The size of the header depends on the page (e.g. on some pages the tabs
      // do not appear), so reset the header's layout when switching pages.
      const header = this.shadowRoot.querySelector('#header');
      header.resetLayout();
    }
    if (changedProps.has('_meta')) {
      if (this._meta) {
        updateMetadata({
          title: this._meta.title,
          description: this._meta.description || this._meta.title,
          image: this._meta.image || this.baseURI + 'images/shop-icon-128.png',
        });
      }
    }
  }

  constructor() {
    super();
    // To force all event listeners for gestures to be passive.
    // See https://www.polymer-project.org/2.0/docs/devguide/gesture-events#use-passive-gesture-listeners
    setPassiveTouchGestures(true);
  }

  firstUpdated() {
    installRouter((location) => store.dispatch(updateLocation(location)));
    installOfflineWatcher((offline) =>
      store.dispatch(updateNetworkStatus(offline))
    );
    installMediaQueryWatcher(
      '(max-width: 767px)',
      (matches) => (this._smallScreen = matches)
    );

    // Custom elements polyfill safe way to indicate an element has been upgraded.
    this.removeAttribute('unresolved');
  }

  stateChanged(state) {
    this._page = state.app.page;
    this._categories = state.categories;
    this._categoryName = state.app.categoryName;
    this._meta = metaSelector(state);
    this._modalOpened = state.app.cartModalOpened;
    this._lazyResourcesLoaded = state.app.lazyResourcesLoaded;
    this._a11yLabel = state.app.announcerLabel;
    this._offline = state.app.offline;
    this._snackbarOpened = state.app.snackbarOpened;
    this._drawerOpened = state.app.drawerOpened;
  }

  _menuButtonClicked() {
    store.dispatch(updateDrawerState(true));
  }

  _drawerOpenedChanged(e) {
    store.dispatch(updateDrawerState(e.target.opened));
  }
}

customElements.define('shop-app', ShopApp);
