# NU Flow - Deployment Guide

## Quick Setup (5 minutes)

### Step 1: Create MongoDB Atlas Account (FREE)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up with Google/GitHub (free)
3. Create a **Free Tier Cluster** (M0)
4. Click "Connect" → Choose "Drivers" → Copy the connection string
5. Replace `<password>` and `<username>` with your database credentials

Example: `mongodb+srv://user:pass@cluster0.mongodb.net/nuflow?retryWrites=true&w=majority`

### Step 2: Set Up Environment Variables

Create `.env.local` in the project root:

```
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/nuflow?retryWrites=true&w=majority
NEXTAUTH_SECRET=your-super-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

To generate a secret:
```bash
openssl rand -base64 32
```

### Step 3: Test Locally

```bash
npm run dev
```

Visit http://localhost:3000 and try:
- **Register** a new account
- **Login** with your credentials
- **Check Dashboard**

All data saves to MongoDB automatically! ✅

### Step 4: Deploy to Vercel (FREE)

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Add MongoDB setup"
   git push
   ```

2. Go to [vercel.com](https://vercel.com)
3. Sign in with GitHub
4. Click "New Project" → Select your repo
5. Add Environment Variables:
   - `MONGODB_URI` = your MongoDB connection string
   - `NEXTAUTH_SECRET` = your secret key
   - `NEXTAUTH_URL` = your-app.vercel.app

6. Click "Deploy" ✅

### Your App is Live!

- **Frontend**: https://your-app.vercel.app (on Vercel)
- **Database**: MongoDB Atlas (cloud)
- **Cost**: $0/month

## Data Structure

All data is stored in MongoDB with these collections:

**users**
```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "hashed_password",
  "role": "SDAO Office",
  "createdAt": "2026-05-24T..."
}
```

**events**
```json
{
  "title": "Club Meeting",
  "description": "Annual meeting",
  "date": "2026-05-25",
  "time": "14:00",
  "location": "Library",
  "status": "approved",
  "createdBy": "user_id",
  "createdAt": "2026-05-24T..."
}
```

**announcements**
```json
{
  "title": "New Event",
  "content": "We have a new event coming up",
  "status": "approved",
  "createdBy": "user_id",
  "createdAt": "2026-05-24T..."
}
```

## Features Ready to Deploy

✅ User authentication (register/login)
✅ MongoDB database (cloud-hosted)
✅ Events management
✅ Announcements
✅ Facilities listing
✅ Vercel deployment ready

## Predefined Test Accounts

The app currently supports registration. Once deployed, you can:
1. Register new accounts at `/register`
2. Login with your credentials
3. View/manage events and announcements

## Troubleshooting

**"Connection refused" error?**
- Check your MongoDB URI in `.env.local`
- Make sure IP is whitelisted in MongoDB Atlas (or use 0.0.0.0/0 for development)

**"Cannot find module 'mongodb'"?**
- Run: `npm install bcryptjs mongodb --legacy-peer-deps`

**Data not saving?**
- Check browser console for errors (F12)
- Verify `.env.local` is correct
- Test connection at MongoDB Atlas dashboard

## Next Steps

1. **Seed database** with facilities:
   - Add facilities to MongoDB via MongoDB Atlas UI
   - Or create an API endpoint for it

2. **Add more features**:
   - Event approvals
   - Facility bookings
   - User roles management

3. **Custom domain**:
   - Add your domain in Vercel settings

## Support

For MongoDB help: https://docs.mongodb.com
For Vercel help: https://vercel.com/docs
For Next.js help: https://nextjs.org/docs
