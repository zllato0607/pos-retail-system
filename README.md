# Point of Sale (POS) Retail Management System

A comprehensive web-based Point of Sale system designed for local retail businesses, featuring sales processing, inventory management, customer management, and financial reporting.

## 🚀 Features

### Sales Processing
- **Barcode Scanning**: Quick product lookup using barcode scanner or manual entry
- **Real-time Cart Management**: Add, remove, and modify items in the cart
- **Multiple Payment Methods**: Support for cash, card, mobile, and other payment types
- **Customer Integration**: Link sales to registered customers for loyalty tracking
- **Tax & Discount Calculation**: Automatic tax calculation with customizable discount options

### Inventory Management
- **Real-time Stock Tracking**: Monitor inventory levels across all products
- **Low Stock Alerts**: Automatic notifications when products reach minimum levels
- **Stock Movements**: Track all inventory changes with detailed movement history
- **Bulk Stock Operations**: Add stock in bulk or adjust inventory levels
- **Category Management**: Organize products by categories for better organization

### Customer Management
- **Customer Database**: Maintain detailed customer records with contact information
- **Loyalty Program**: Track customer loyalty points and purchase history
- **Purchase History**: View complete transaction history for each customer

### Financial Reporting
- **Sales Reports**: Daily, monthly, and yearly sales analytics
- **Product Performance**: Track best-selling products and categories
- **Profit Analysis**: Calculate gross and net profit margins
- **Export Capabilities**: Export reports to CSV and PDF formats
- **Interactive Charts**: Visual representation of sales data and trends

### Receipt & Printing
- **Professional Receipts**: Generate detailed receipts for all transactions
- **Print Support**: Print receipts directly from the browser
- **Customizable Format**: Configure business information and receipt footer

### Security & User Management
- **Role-based Access**: Admin, Manager, and Cashier roles with different permissions
- **Secure Authentication**: JWT-based authentication with password hashing
- **User Management**: Create and manage user accounts (Admin only)

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js framework
- **SQLite** database with better-sqlite3
- **JWT** for authentication
- **bcryptjs** for password hashing
- **CORS** and security middleware

### Frontend
- **React 18** with modern hooks
- **React Router** for navigation
- **Zustand** for state management
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Lucide React** for icons

## 📋 Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager
- Modern web browser

## 🚀 Installation & Setup

### 1. Clone or Download the Project
```bash
# If using git
git clone <repository-url>
cd pos-retail-system

# Or extract the downloaded files
cd pos-retail-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy the example environment file
copy .env.example .env

# Edit the .env file with your settings (optional)
# Default values work for development
```

### 4. Initialize Database
```bash
npm run init-db
```

This will create the SQLite database with sample data and a default admin user:
- **Username**: `admin`
- **Password**: `admin123`

### 5. Start the Application
```bash
# Start both backend and frontend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## 📱 Usage Guide

### First Login
1. Open http://localhost:3000 in your browser
2. Login with the default credentials:
   - Username: `admin`
   - Password: `admin123`
3. You'll be redirected to the dashboard

### Basic Operations

#### Making a Sale
1. Navigate to **POS** from the sidebar
2. Scan or manually enter product barcodes
3. Products will be added to the cart automatically
4. Select customer (optional) and payment method
5. Apply discounts if needed
6. Click **Complete Sale** to process the transaction
7. Print the receipt if required

#### Managing Products
1. Go to **Products** section
2. Click **Add Product** to create new products
3. Fill in product details including barcode, price, and stock
4. Use the search and filter options to find products
5. Edit or delete products as needed

#### Inventory Management
1. Visit **Inventory** section
2. View current stock levels and movement history
3. Click **Add Stock** to increase inventory
4. Use **Adjust Inventory** for stock corrections
5. Monitor low stock alerts

#### Customer Management
1. Access **Customers** section
2. Add new customers with contact details
3. View customer purchase history and loyalty points
4. Edit customer information as needed

#### Reports & Analytics
1. Navigate to **Reports** section
2. Select date ranges for analysis
3. View sales trends, product performance, and profit reports
4. Export data to CSV or PDF formats

#### System Settings
1. Go to **Settings** (Admin/Manager only)
2. Configure business information
3. Set tax rates and currency
4. Manage user accounts (Admin only)
5. Customize receipt settings

## 🔧 Configuration

### Business Settings
Configure your business information in the Settings page:
- Business name and contact details
- Tax rates and currency settings
- Receipt footer message
- Low stock alert preferences

### User Roles
- **Admin**: Full access to all features including user management
- **Manager**: Access to all features except user management
- **Cashier**: Limited to POS, basic product viewing, and customer management

### Database
The system uses SQLite for data storage. The database file (`database.db`) is created automatically and contains:
- Products and inventory data
- Sales transactions and history
- Customer information
- User accounts and settings

## 📊 Sample Data

The system comes with sample data including:
- 5 sample products across different categories
- Default business settings
- Admin user account

## 🔒 Security Features

- Password hashing using bcryptjs
- JWT token-based authentication
- Role-based access control
- SQL injection prevention
- CORS protection
- Rate limiting on API endpoints

## 🚀 Production Deployment

For production deployment:

1. **Environment Variables**:
   ```bash
   NODE_ENV=production
   JWT_SECRET=your-secure-secret-key
   PORT=3001
   ```

2. **Build Frontend**:
   ```bash
   npm run build
   ```

3. **Database Backup**: Regularly backup the `database.db` file

4. **SSL Certificate**: Use HTTPS in production

5. **Reverse Proxy**: Consider using nginx or Apache as a reverse proxy

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Register new user (Admin only)

### Product Endpoints
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/barcode/:barcode` - Get product by barcode
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Sales Endpoints
- `GET /api/sales` - Get all sales
- `GET /api/sales/:id` - Get sale details
- `POST /api/sales` - Create new sale
- `POST /api/sales/:id/refund` - Refund sale

### Additional endpoints available for inventory, customers, reports, and settings.

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Ensure the database is initialized: `npm run init-db`
   - Check file permissions for the database file

2. **Port Already in Use**:
   - Change the PORT in `.env` file
   - Or kill the process using the port

3. **Login Issues**:
   - Verify credentials: admin/admin123
   - Clear browser cache and cookies

4. **Build Errors**:
   - Delete `node_modules` and run `npm install` again
   - Ensure Node.js version is 16 or higher

## 🤝 Support

For support and questions:
1. Check the troubleshooting section above
2. Review the console logs for error messages
3. Ensure all dependencies are properly installed

## 📄 License

This project is licensed under the MIT License.

---

**Happy Selling! 🛍️**
