# Engine Blog - Frontend

Modern React frontend for the Engine Blog, built with Vite, TypeScript, Tailwind CSS, and shadcn/ui.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI components
- **React Router** - Client-side routing

## Getting Started

### Install Dependencies

```bash
cd web
npm install
```

### Development Server

```bash
npm run dev
```

The frontend will run on http://localhost:5173 and proxy API requests to http://localhost:3000.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
web/
├── src/
│   ├── components/
│   │   ├── blog/           # Blog-specific components
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostList.tsx
│   │   │   ├── PostContent.tsx
│   │   │   ├── CommentSection.tsx
│   │   │   ├── CommentForm.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── layout/         # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── BlogLayout.tsx
│   │   │   └── AdminLayout.tsx
│   │   └── ui/             # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── card.tsx
│   │       └── ...
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts      # Authentication hook
│   │   └── useApi.ts       # API data fetching hooks
│   ├── lib/                # Utility libraries
│   │   ├── api.ts          # API client
│   │   └── utils.ts        # Utility functions
│   ├── pages/              # Page components
│   │   ├── Home.tsx
│   │   ├── Post.tsx
│   │   ├── Category.tsx
│   │   ├── Tag.tsx
│   │   ├── Search.tsx
│   │   ├── Login.tsx
│   │   └── admin/          # Admin pages
│   │       ├── Dashboard.tsx
│   │       ├── Posts.tsx
│   │       ├── PostEdit.tsx
│   │       ├── Categories.tsx
│   │       ├── Tags.tsx
│   │       ├── Comments.tsx
│   │       ├── Media.tsx
│   │       ├── AI.tsx
│   │       └── Settings.tsx
│   ├── App.tsx             # Main app component with routes
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## Routes

### Public Routes

- `/` - Home page with post listing
- `/post/:slug` - Single post view
- `/category/:slug` - Category archive
- `/tag/:slug` - Tag archive
- `/search` - Search posts
- `/login` - Admin login

### Admin Routes (Protected)

- `/admin` - Dashboard with stats
- `/admin/posts` - Post management
- `/admin/posts/new` - Create new post
- `/admin/posts/:id/edit` - Edit post
- `/admin/categories` - Category management
- `/admin/tags` - Tag management
- `/admin/comments` - Comment moderation
- `/admin/media` - Media library
- `/admin/ai` - AI content generation
- `/admin/settings` - Blog settings

## Features

### Public Features

- Responsive blog layout
- Post listing with pagination
- Single post view with comments
- Category and tag filtering
- Full-text search
- Comment submission
- Dark mode support (via CSS variables)

### Admin Features

- Protected admin panel with authentication
- Rich post editor
- Category and tag management
- Comment moderation
- Media library with upload
- AI-powered content generation
- Site settings configuration
- Dashboard with statistics

## Authentication

The frontend uses JWT token-based authentication:

1. Login via `/login` with email and password
2. Token stored in localStorage
3. Token sent with all API requests via Authorization header
4. Protected routes automatically redirect to login if not authenticated

## API Integration

The API client (`src/lib/api.ts`) handles all API communication:

- Automatic token management
- Error handling
- Request/response interceptors
- Type-safe API calls

API proxy configuration in `vite.config.ts` forwards `/api` requests to `http://localhost:3000`.

## Styling

### Tailwind CSS

Utility-first CSS framework with custom configuration for shadcn/ui compatibility.

### CSS Variables

HSL-based color system with dark mode support:

- Primary, secondary, accent colors
- Muted, destructive variants
- Border, input, ring colors

### shadcn/ui Components

Pre-built, accessible components using Radix UI primitives:

- Consistent design system
- Full TypeScript support
- Customizable via Tailwind

## Development Tips

1. **Hot Module Replacement (HMR)**: Changes reflect instantly during development
2. **Type Safety**: TypeScript catches errors before runtime
3. **Path Aliases**: Use `@/` to import from `src/`
4. **Component Library**: Extend shadcn/ui components as needed
5. **API Types**: Consider creating shared types between frontend and backend

## Environment Variables

No environment variables required for development. The Vite proxy handles API routing.

For production, configure the API base URL in `src/lib/api.ts`.
