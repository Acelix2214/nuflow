# NU Flow - React/Next.js Migration

Your NU Flow application has been successfully converted to React with Next.js!

## Project Structure

```
src/
├── app/
│   ├── page.js              # Login page (home)
│   ├── register/page.js     # Register page
│   ├── dashboard/page.js    # Dashboard page
│   ├── layout.js            # Root layout
│   ├── globals.css          # Global styles
│   └── login.module.css     # Login page styles
├── components/
│   ├── DashboardLayout.js   # Navbar & layout wrapper
│   ├── EventsList.js        # Events display
│   ├── AnnouncementsList.js # Announcements display
│   └── FacilitiesList.js    # Facilities display
└── lib/
    └── api.js               # API utilities & functions

php/                          # Your PHP backend (unchanged)
public/                       # Static files (move images here)
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Images
Copy your images folder to the `public` directory:
```bash
# Move images to public folder so they're accessible
cp -r images/* public/images/
# OR manually copy images/ folder contents to public/images/
```

### 3. Run Development Server
```bash
npm run dev
```

The app will start at `http://localhost:3000`

### 4. Build for Production
```bash
npm run build
npm start
```

## Key Changes from Vanilla JS

### ✅ What's Changed
- **HTML → JSX**: Pages are now React components
- **Vanilla JS → React Hooks**: State management with `useState`, `useEffect`
- **Global state → Component state**: Using React context (can upgrade to Redux/Zustand later)
- **DOM manipulation → Re-renders**: React handles the UI updates

### ✅ What's the Same
- **PHP backend**: Your `php/` folder works exactly the same
- **Database**: No changes needed
- **CSS**: Styles adapted to work with React components (using CSS Modules)
- **API calls**: Still using `fetch` to call your PHP endpoints

## Available Pages

| URL | Component | Purpose |
|-----|-----------|---------|
| `/` | Login Page | User login |
| `/register` | Register Page | New account creation |
| `/dashboard` | Dashboard | Main app (events, announcements, facilities) |

## Next Steps

### To Extend the App:
1. **Create event form**: Add a modal/page for creating events
2. **Add approvals view**: Create approval dashboard for SDAO Office role
3. **Add facility booking**: Implement facility booking system
4. **State management**: Consider adding Zustand or Redux for complex state
5. **API integration**: Gradually replace PHP endpoints with more pages

### Important Notes:
- The app calls your PHP endpoints at `php/*.php` paths
- Make sure PHP server is running (or use a local development server)
- Images must be in the `public/` folder to be served correctly
- Environment variables can be added to `.env.local`

## Troubleshooting

**Images not showing?**
- Make sure images are in `public/images/` directory
- Check browser console for 404 errors

**PHP endpoints returning 404?**
- Ensure PHP server is running
- Check CORS if running separately

**Session not persisting?**
- Check localStorage in browser DevTools
- Verify PHP session management

Need to revert? Your old HTML files are still in the root directory.
