/**
 * Copyright (C) 2026 Raul Sousa
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import {
  applyTranslations,
  t,
} from './i18n.js';

import {
  userPreferences,
} from './preferences.js';

let excludedSiteTemplate = null;

function getExcludedSites() {
  const sites = userPreferences.textExpansion.excludedSites;

  return Array.isArray(sites)
    ? sites.filter(site => typeof site === 'string' && site)
    : [];
}

function getExcludedSiteTemplate() {
  if (!excludedSiteTemplate) {
    excludedSiteTemplate = document.getElementById('excluded-site-template');
    applyTranslations(excludedSiteTemplate.content);
  }

  return excludedSiteTemplate;
}

function normalizeSite(value) {
  if (typeof value !== 'string') return null;

  const input = value.trim().toLowerCase().replace(/^\*\./, '');

  if (!input) return null;

  try {
    const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(input);
    const url = new URL(hasScheme ? input : `https://${input}`);

    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.username || url.password) return null;

    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');

    if (!hostname || hostname.length > 253) return null;

    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      return hostname;
    }

    const labels = hostname.split('.');

    const isValid = labels.every(label =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    );

    return isValid ? hostname : null;
  } catch {
    return null;
  }
}

export function createExcludedSiteElement(site, index) {
  const template = getExcludedSiteTemplate();
  const item = template.content.firstElementChild.cloneNode(true);
  const title = item.querySelector('.title');
  const titleId = `excluded-site-title-${index}`;
  const moreButton = item.querySelector('[aria-haspopup]');
  const menu = item.querySelector('.menu');
  const editButton = item.querySelector('[data-action="editExcludedSite"]');
  const removeButton = item.querySelector('[data-action="removeExcludedSite"]');
  const menuId = `excluded-site-menu-${index}`;
  const anchorName = `--excluded-site-menu-${index}`;

  title.textContent = site;
  title.id = titleId;

  item.setAttribute('aria-labelledby', titleId);

  moreButton.setAttribute('popovertarget', menuId);
  moreButton.setAttribute('aria-describedby', titleId);
  moreButton.style.anchorName = anchorName;

  menu.id = menuId;
  menu.style.positionAnchor = anchorName;
  menu.setAttribute('aria-label', t('siteMenuOptions', site));

  editButton.setAttribute('popovertarget', menuId);
  editButton.dataset.target = site;

  removeButton.setAttribute('popovertarget', menuId);
  removeButton.dataset.target = site;

  return item;
}

export function renderExcludedSites() {
  const group = document.getElementById('excluded-sites');
  const template = getExcludedSiteTemplate();

  if (!group || !template) return;

  const addRow = group.querySelector('[data-action="addExcludedSite"]');
  if (!addRow) return;

  const sites = getExcludedSites()
    .sort((a, b) => a.localeCompare(b));

  group.replaceChildren(
    ...sites.map((site, index) => createExcludedSiteElement(site, index)),
    addRow
  );
}

function setExcludedSites(sites) {
  userPreferences.textExpansion.excludedSites = sites;
  renderExcludedSites();
}

function removeSite(site) {
  setExcludedSites(getExcludedSites().filter(item => item !== site));
}

function restoreSite(site) {
  const sites = getExcludedSites();

  if (!sites.includes(site)) setExcludedSites([...sites, site]);
}

function replaceSite(from, to) {
  setExcludedSites([
    ...new Set(getExcludedSites().map(item => item === from ? to : item)),
  ]);
}

export function addExcludedSite() {
  const dialog = document.getElementById('excluded-site-dialog');
  const form = dialog.querySelector('form');
  const saveButton = dialog.querySelector('button[type="submit"]');

  form.reset();
  form.elements['original'].value = '';

  dialog.heading = t('addSite');
  dialog.subtitle = '';

  if (saveButton) saveButton.textContent = t('add');

  dialog.showModal();
}

export function editExcludedSite(element) {
  const site = element?.dataset?.target;
  if (!site) return;

  const dialog = document.getElementById('excluded-site-dialog');
  const form = dialog.querySelector('form');
  const saveButton = dialog.querySelector('button[type="submit"]');

  form.elements['site'].value = site;
  form.elements['original'].value = site;

  dialog.heading = t('editSite');
  dialog.subtitle = site;

  if (saveButton) saveButton.textContent = t('edit');

  dialog.showModal();
}

export function saveExcludedSite() {
  const dialog = document.getElementById('excluded-site-dialog');
  const form = dialog.querySelector('form');
  const original = form.elements['original'].value;
  const site = normalizeSite(form.elements['site'].value);

  if (!site) {
    const toast = document.createElement('smb-toast');

    toast.message = t('siteInvalid');
    toast.show('excluded-site-dialog-toast');
    return;
  }

  const sites = getExcludedSites();

  if (site !== original && sites.includes(site)) {
    const toast = document.createElement('smb-toast');

    toast.message = t('siteDuplicate');
    toast.show('excluded-site-dialog-toast');
    return;
  }

  dialog.close();

  if (!original) {
    setExcludedSites([...sites, site]);

    const toast = document.createElement('smb-toast');

    toast.message = t('siteAdded', site);
    toast.addAction(t('undo'), () => {
      try {
        removeSite(site);
      } catch (error) {
        console.error(error);
      }
    });

    toast.show('preferences-dialog-toast');
    return;
  }

  if (site === original) return;

  replaceSite(original, site);

  const toast = document.createElement('smb-toast');

  toast.message = t('siteEdited', site);
  toast.addAction(t('undo'), () => {
    try {
      replaceSite(site, original);
    } catch (error) {
      console.error(error);
    }
  });

  toast.show('preferences-dialog-toast');
}

export function removeExcludedSite(element) {
  const site = element?.dataset?.target;
  if (!site) return;

  const group = document.getElementById('excluded-sites');
  const addRow = group.querySelector('[data-action="addExcludedSite"]');
  const index = [...group.children].indexOf(element.closest('.list-row'));

  removeSite(site);

  const rows = [...group.children].filter(child => child !== addRow);
  const adjacent = rows[index] ?? rows[index - 1];
  const target = adjacent?.querySelector('[aria-haspopup]') ?? addRow;

  target?.focus();

  const toast = document.createElement('smb-toast');

  toast.message = t('siteRemoved', site);
  toast.addAction(t('undo'), () => {
    try {
      restoreSite(site);
    } catch (error) {
      console.error(error);
    }
  });

  toast.show('preferences-dialog-toast');
}
