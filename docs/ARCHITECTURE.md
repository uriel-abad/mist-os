# Architecture

The storefront and Admin Portal are static GitHub Pages applications. They communicate with one Apps Script Web App.

- Public GET `?action=catalog`: active storefront catalog and website settings
- Public POST `createOrder`: validated customer order submission
- Admin POST actions: protected by the private admin key
- Google Sheets: persistent Products, Website Catalog, Orders, Order Items, Inventory, Customers, Settings, Dashboard, and Error Log data

The backend returns stable camelCase API objects. Spreadsheet headers are normalized inside Apps Script, preventing UI bugs caused by spaces or legacy names such as `ProductID`.
