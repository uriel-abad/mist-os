# Exact Deployment Order

## 1. Use a separate Google Sheet

Create a new blank Google Sheet, for example `MIST OS Production`.

Open **Extensions → Apps Script** from that sheet.

## 2. Install Apps Script

### Easiest method

Open:

`backend/apps-script/single-file/Code.gs`

Delete the default Apps Script code and paste the complete file into `Code.gs`.

### Modular method

Create the `.gs` files shown in `backend/apps-script/` and paste each corresponding file. Do not install the modular and single-file versions together.

### Optional manifest

In Apps Script, open **Project Settings** and enable **Show appsscript.json manifest file in editor**. Replace its content with `backend/apps-script/appsscript.json`.

## 3. Initialize and repair the sheets

Save the project and run:

```js
setupMistOS()
```

Approve permissions. The setup creates or repairs:

- Products
- Website Catalog
- Orders
- Order Items
- Inventory
- Customers
- Website Settings
- Dashboard
- Error Log

If old headers such as `ProductID` or `ProductName` are detected, setup creates a hidden timestamped backup and migrates the active sheet to the canonical schema.

Run:

```js
runSystemCheck()
```

Confirm `ok: true`.

Run:

```js
getAdminKey()
```

Keep the returned key private.

## 4. Add stock

Open Inventory and edit only the **Stock** column. Reserved and Available are calculated and protected by workflow logic.

## 5. Deploy Apps Script as a Web App

Choose **Deploy → New deployment → Web app**.

- Execute as: **Me**
- Who has access: **Anyone**

Deploy and copy the URL ending in `/exec`.

Open the URL in a browser. It should return JSON containing `MIST OS API is running`.

## 6. Connect the storefront

Edit `store/js/config.js` and replace the placeholder `gasEndpoint` with the `/exec` URL.

## 7. Create a separate GitHub repository

Create a new repository, for example `mist-os-production`.

Upload the contents of the `MIST-OS-PRODUCTION` folder to the repository root.

Enable GitHub Pages:

- Branch: `main`
- Folder: `/root`

URLs:

- Storefront: `https://USERNAME.github.io/REPOSITORY/store/`
- Admin: `https://USERNAME.github.io/REPOSITORY/admin/`

The repository root redirects to the storefront.

## 8. Connect the Admin Portal

Open `/admin/`, choose Connection, and enter:

- Apps Script `/exec` URL
- Private admin key

Click **Save and test connection**.

## Updating Apps Script later

1. Save the new code.
2. Run `runSystemCheck()`.
3. Go to **Deploy → Manage deployments**.
4. Edit the current Web App deployment.
5. Select **New version**.
6. Deploy.

The `/exec` URL normally remains unchanged. If it changes, update `store/js/config.js` and the Admin connection.

## Updating the website later

Commit changed files to GitHub. GitHub Pages redeploys automatically. Hard refresh with `Ctrl + Shift + R` or test in a private browser tab.
