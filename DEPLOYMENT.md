# Deployment Guide

## Quick Deploy to Vercel

### 1. One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/evasearchgpt)

### 2. Manual Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production  
vercel --prod
```

### 3. Environment Variables

Set these in your Vercel dashboard:

```env
GEMINI_API_KEY=your_google_ai_api_key
BRAVE_API_KEY=your_brave_search_api_key
SERPAPI_KEY=your_serpapi_key
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
NEXT_PUBLIC_ANALYTICS_ENABLED=true
```

## Alternative Deployment Options

### Netlify

1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variables in site settings

### Railway

1. Connect GitHub repository
2. Railway will auto-detect Next.js
3. Add environment variables
4. Deploy automatically on push

### Docker Deployment

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### Build and run:

```bash
docker build -t evasearchgpt .
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key evasearchgpt
```

## Production Checklist

- [ ] All API keys configured
- [ ] Environment variables set
- [ ] Health checks passing (`/api/health`)
- [ ] Analytics enabled (`/analytics`)
- [ ] Performance monitoring active
- [ ] Domain configured (optional)
- [ ] HTTPS enabled
- [ ] Error tracking setup
- [ ] Rate limiting configured

## Monitoring & Maintenance

### Health Checks
- **Endpoint**: `/api/health`
- **Expected Response**: `{"status": "ok", "timestamp": "..."}`

### Analytics Dashboard
- **URL**: `/analytics`
- **Metrics**: Response times, success rates, usage patterns

### Performance
- Monitor Vercel analytics
- Check Core Web Vitals
- Review error logs

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Verify all keys are set in environment variables
   - Check API key permissions and quotas

2. **Build Failures**
   - Run `npm run type-check` locally
   - Check for TypeScript errors

3. **Runtime Errors**
   - Check Vercel function logs
   - Verify environment variables

4. **Slow Response Times**
   - Monitor API response times
   - Check external service status

### Support

- Check Vercel deployment logs
- Review API endpoint health
- Monitor error rates in analytics dashboard
