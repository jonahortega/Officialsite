# Greek Life Connect Website

A professional marketing website for the Greek Life Connect platform that showcases your app and collects leads from universities and organizations interested in using your platform.

## Features

- **Professional Landing Page**: Beautiful, modern design showcasing your Greek life app
- **Lead Generation**: Contact form for universities and organizations to submit their information
- **Admin Dashboard**: View and manage submissions from potential customers
- **Analytics Tracking**: Monitor website performance and user interactions
- **Mobile Responsive**: Works perfectly on all devices
- **Real-time Updates**: Socket.IO integration for live data updates

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Frontend**: HTML5, CSS3 (SCSS), JavaScript
- **Real-time**: Socket.IO
- **Styling**: Custom SCSS with modern design system

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Clone and navigate to the website directory**
   ```bash
   cd website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/greek-life-website
   PORT=3001
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000
   API_KEY=your-secret-api-key-for-app-communication
   ```

4. **Build CSS**
   ```bash
   npm run build
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the website**
   - Main website: http://localhost:3001
   - Admin dashboard: http://localhost:3001/dashboard

## Project Structure

```
website/
├── public/                 # Static files
│   ├── index.html         # Main landing page
│   ├── dashboard.html     # Admin dashboard
│   ├── css/              # Compiled CSS
│   └── js/               # JavaScript files
├── src/
│   └── styles/           # SCSS source files
├── models/               # Database models
├── routes/               # API routes
├── server.js            # Main server file
├── package.json         # Dependencies
└── README.md           # This file
```

## API Endpoints

### Data Collection
- `POST /api/data/user` - Submit university/organization information
- `POST /api/data/analytics` - Track website analytics
- `GET /api/data/users` - Get all submissions (admin)
- `GET /api/data/user/:id` - Get specific submission (admin)

### Analytics
- `GET /api/analytics/stats` - Get overall statistics
- `GET /api/analytics/events` - Get analytics events
- `GET /api/analytics/real-time` - Get real-time activity

### Health Check
- `GET /api/health` - Server health status

## Customization

### Branding
1. Update colors in `src/styles/main.scss`:
   ```scss
   $primary-color: #667eea;
   $secondary-color: #764ba2;
   $accent-color: #f093fb;
   ```

2. Update logo and branding in `public/index.html`

### Content
1. Edit the hero section in `public/index.html`
2. Update features and benefits
3. Modify contact form fields as needed

### Styling
1. Edit `src/styles/main.scss` for design changes
2. Run `npm run watch:css` to auto-compile changes

## Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Deployment Options

#### Heroku
1. Create a Heroku app
2. Add MongoDB add-on
3. Set environment variables
4. Deploy with Git

#### Vercel
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

#### DigitalOcean App Platform
1. Connect your repository
2. Set environment variables
3. Deploy with one click

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/greek-life-website` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `API_KEY` | API key for security | `your-secret-api-key` |

## Database Models

### UserData
Stores submissions from the contact form:
- Basic user info (name, email, university)
- Role and organization details
- Submission metadata
- Analytics data

### Analytics
Tracks website interactions:
- Page views and events
- User interactions
- Device and browser info
- Timestamps and metadata

## Admin Dashboard

Access the admin dashboard at `/dashboard` to:
- View all submissions
- See analytics and statistics
- Manage leads and contacts
- Export data

## Integration with Your App

To connect this website with your Greek life app:

1. **API Integration**: Your app can send data to the website's API endpoints
2. **Shared Database**: Use the same MongoDB instance for both applications
3. **Real-time Updates**: Use Socket.IO for live data synchronization
4. **Analytics**: Track user behavior across both platforms

## Security Features

- Rate limiting on API endpoints
- CORS protection
- Input validation and sanitization
- API key authentication (optional)
- Helmet.js security headers

## Performance Optimization

- Static file serving
- CSS minification
- Image optimization
- Database indexing
- Caching strategies

## Monitoring and Analytics

- Real-time user tracking
- Form submission analytics
- Page view tracking
- Error monitoring
- Performance metrics

## Support and Maintenance

### Regular Tasks
- Monitor server logs
- Check database performance
- Update dependencies
- Backup data regularly
- Monitor analytics

### Troubleshooting

**Common Issues:**
1. **MongoDB connection failed**: Check connection string and network
2. **CSS not updating**: Run `npm run build` to compile SCSS
3. **Form submissions not working**: Check API key and CORS settings
4. **Dashboard not loading**: Verify database connection and API endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Contact

For support or questions:
- Email: hello@greeklifeconnect.com
- Phone: (555) 123-4567

---

**Greek Life Connect** - Transforming Greek life management for the modern university. 