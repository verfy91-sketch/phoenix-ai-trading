# Phoenix Trading System - Frontend

A modern, responsive trading dashboard built with Next.js 14, TypeScript, and Tailwind CSS. This frontend application provides a comprehensive interface for the Phoenix AI Trading System, featuring real-time market data, order management, portfolio tracking, and strategy automation.

## 🚀 Features

### Core Functionality
- **Authentication** - Secure login, registration, and password management
- **Real-time Trading** - Place and manage orders with live market data
- **Portfolio Management** - Track positions, P&L, and performance metrics
- **Strategy Automation** - Create and manage automated trading strategies
- **Admin Panel** - User management and system monitoring (admin only)
- **WebSocket Integration** - Real-time updates for market data and orders

### Technical Features
- **Modern Stack** - Next.js 14 (App Router), TypeScript, Tailwind CSS
- **State Management** - Zustand for UI state, TanStack Query for server state
- **Real-time Updates** - Socket.io client for live data streaming
- **Form Validation** - React Hook Form with Zod schemas
- **Responsive Design** - Mobile-first design with dark/light theme support
- **Type Safety** - Full TypeScript implementation with strict mode
- **Testing** - Jest and React Testing Library setup
- **Error Handling** - Comprehensive error boundaries and user feedback

## 🛠️ Tech Stack

### Framework & Language
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **React 18** - UI library

### Styling & UI
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **Framer Motion** - Animation library
- **Class Variance Authority** - Component styling variants

### State Management
- **Zustand** - Lightweight state management
- **TanStack Query** - Server state management and caching
- **React Hook Form** - Form state management
- **Zod** - Schema validation

### Data & Communication
- **Axios** - HTTP client with interceptors
- **Socket.io Client** - Real-time WebSocket communication
- **React Hot Toast** - Notification system

### Development & Testing
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **React Testing Library** - Component testing

## 📁 Project Structure

```
phoenix-frontend/
├── public/                 # Static assets
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── auth/         # Authentication pages
│   │   ├── dashboard/    # Main dashboard
│   │   ├── trading/      # Trading interface
│   │   ├── portfolio/    # Portfolio management
│   │   ├── strategies/   # Strategy management
│   │   ├── account/      # User account settings
│   │   └── admin/        # Admin panel
│   ├── components/       # Reusable components
│   │   ├── ui/          # Base UI components
│   │   ├── layout/      # Layout components
│   │   ├── auth/        # Authentication components
│   │   ├── trading/     # Trading components
│   │   ├── portfolio/   # Portfolio components
│   │   ├── strategies/  # Strategy components
│   │   ├── admin/       # Admin components
│   │   └── common/      # Common utilities
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and configurations
│   │   ├── api/         # API client setup
│   │   ├── socket/      # WebSocket client
│   │   ├── store/       # Zustand stores
│   │   └── utils/       # Helper functions
│   ├── styles/           # Global styles
│   └── types/            # TypeScript type definitions
├── tests/                # Test files
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Phoenix Backend API running on port 3001

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd phoenix-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run format` - Format code with Prettier

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file from `.env.local.example` and configure the following variables:

```bash
# Backend API Configuration
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api
NEXT_PUBLIC_WS_URL=wss://your-backend-url.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Production Environment Variables

For production deployment, update the values:

```bash
# Production Backend URLs
NEXT_PUBLIC_API_URL=https://api.phoenix-trading.ai/api
NEXT_PUBLIC_WS_URL=wss://api.phoenix-trading.ai

# Production Supabase
NEXT_PUBLIC_SUPABASE_URL=https://pfnqoozpgqebsjqysuxz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### CORS Configuration

Ensure your backend CORS configuration includes your frontend domain:
- Development: `http://localhost:3000`
- Production: `https://your-frontend-domain.com`

#### **Production Configuration**

For production deployment, update these variables to point to your deployed backend:

```bash
# Example for production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
```

#### **Environment Variable Notes**

- Variables must start with `NEXT_PUBLIC_` to be exposed to the browser
- The API URL should include the `/api` path
- Use `https://` and `wss://` for production deployments
- Ensure CORS is configured on the backend to allow your frontend domain

### Theme Configuration

The application supports light, dark, and system themes. Theme preference is automatically persisted in localStorage.

### API Configuration

The API client is configured with:
- Automatic JWT token injection
- Request/response interceptors
- Error handling with toast notifications
- Automatic token refresh on 401 errors

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Test Structure

- **Unit Tests** - Individual component and hook tests
- **Integration Tests** - Component interaction tests
- **E2E Tests** - Full user workflow tests (planned)

### Writing Tests

Tests are located in the `tests/` directory and follow the naming convention:
- `components/` - Component tests
- `hooks/` - Custom hook tests

## 📱 Responsive Design

The application is fully responsive and optimized for:
- **Mobile** (< 768px) - Collapsible sidebar, touch-friendly UI
- **Tablet** (768px - 1024px) - Adapted layouts
- **Desktop** (> 1024px) - Full-featured interface

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **XSS Protection** - Content Security Policy headers
- **CSRF Protection** - SameSite cookie attributes
- **Input Validation** - Zod schema validation
- **Error Handling** - Secure error message display

## 📊 Performance Optimization

- **Code Splitting** - Automatic route-based splitting
- **Image Optimization** - Next.js Image component
- **Caching** - TanStack Query intelligent caching
- **Bundle Analysis** - Webpack Bundle Analyzer support
- **Lazy Loading** - Dynamic imports for heavy components

## 🚀 Deployment

### Production Build

```bash
npm run build
npm run start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment-Specific Builds

- **Development** - Hot reload, debugging tools
- **Production** - Optimized bundles, minification
- **Testing** - Mock data, test utilities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [documentation](./docs/)
- Open an [issue](https://github.com/your-repo/issues)
- Contact the development team

## 🔗 Related Projects

- [Phoenix Backend](../phoenix-backend) - Node.js API server
- [Phoenix Engine](../phoenix-engine) - C++ trading engine
- [Phoenix Strategies](../phoenix-python) - Python strategy framework

---

Built with ❤️ by the Phoenix Trading Team
