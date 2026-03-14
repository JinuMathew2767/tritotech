import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import authRoutes from './routes/auth'
import ticketRoutes from './routes/tickets'
import commentRoutes from './routes/comments'
import userRoutes from './routes/users'
import companyRoutes from './routes/companies'
import categoryRoutes from './routes/categories'
import subcategoryRoutes from './routes/subcategories'
import departmentRoutes from './routes/departments'
import brandingRoutes from './routes/branding'
import routingRuleRoutes from './routes/routingRules'
import assetRoutes from './routes/assets'
import { ensureBrandingSettingsTable } from './services/brandingService'
import { ensureRoutingRulesTable } from './services/routingRulesService'
import { ensureAssetTables } from './services/assetService'
import { ensureUserDepartmentAccessTable } from './services/userDepartmentAccessService'

dotenv.config()
dotenv.config({ path: path.resolve(process.cwd(), 'sendgrid.env'), override: true })

const app = express()
const defaultAllowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']
const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const allowedOrigins = new Set([...defaultAllowedOrigins, ...configuredOrigins])

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true)
        return
      }

      const isAllowed =
        allowedOrigins.has(origin) ||
        /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)

      if (isAllowed) {
        callback(null, true)
        return
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`))
    },
    credentials: true,
  })
)
app.use(express.json())

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', server: 'Triton IT Support API' })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/companies', companyRoutes)
app.use('/api/branding', brandingRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/subcategories', subcategoryRoutes)
app.use('/api/departments', departmentRoutes)
app.use('/api/routing-rules', routingRuleRoutes)
app.use('/api/assets', assetRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/tickets/:ticketId/comments', commentRoutes)

const PORT = process.env.PORT || 8000
Promise.all([ensureRoutingRulesTable(), ensureAssetTables(), ensureBrandingSettingsTable(), ensureUserDepartmentAccessTable()])
  .catch((error) => {
    console.error('Failed to ensure startup tables exist', error)
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`API Server running on port ${PORT}`)
    })
  })
