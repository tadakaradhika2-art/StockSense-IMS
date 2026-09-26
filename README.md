# StockSense
A web-based Inventory Management System for managing products, stock movements, warehouse locations, and inventory history in one centralized platform.

## 📌 Overview
StockSense replaces manual registers, Excel sheets, and scattered inventory records with a centralized digital inventory system.
The system allows authorized users to:
- Manage products
- Manage warehouse locations
- Record incoming stock through Receipts
- Record outgoing stock through Delivery Orders
- Transfer stock between locations
- Perform Inventory Adjustments
- Track complete stock movement history through the Stock Ledger
- Monitor inventory through a Dashboard
- Identify low-stock products
- Maintain an audit trail of inventory changes

### Core Principle
REAL-WORLD OPERATION
        ↓
   STOCK CHANGES
        ↓
   LEDGER RECORD
        ↓
   CURRENT STOCK
        ↓
DASHBOARD / ALERTS

**🚀 Features**
🔐 Authentication
- User login
- JWT-based authentication
- Password hashing using bcrypt
- Role-based authorization
  
📊 Dashboard
- Current stock overview
- Low-stock alerts
- Out-of-stock status
- Inventory monitoring
  
📦 Product Management
- Add products
- View products
- Update products
- Delete products
- Configure minimum stock levels
  
📥 Receipts
- Used to record incoming stock.
  Receipt
    ↓
  Validate
    ↓
  Increase Stock
    ↓
  Create Ledger Entry
  
📤 Delivery Orders
- Used to record outgoing stock.
  Delivery
   ↓
  Pick
   ↓
  Pack
   ↓
  Validate
   ↓
  Decrease Stock
   ↓
  Create Ledger Entry
  
🔄 Internal Transfers
Allows stock to be moved between warehouse locations.

Location A
    ↓
Transfer
    ↓
Location B



**📁 Project Structure**
stocksense/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── App.jsx
│   │
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── validators/
│   │   └── app.js
│   │
│   └── package.json
│
├── database/
│   ├── migrations/
│   └── seed/
│
├── README.md
└── .gitignore


**🌿 Git Workflow**
- Each team member works on their own branch.
 main
 │
 ├── Radhika
 ├── Sarika
 └── Sirivallika

- Development workflow:
 Create / switch branch
        ↓
 Develop feature
        ↓
 Test feature
        ↓
 git add .
        ↓
 git commit
        ↓
 git push
        ↓
 Create Pull Request
        ↓
 Code Review
        ↓
 Merge into main

- Branches represent individual development work, while the project folders organize the application:
 frontend/
 backend/
 database/
