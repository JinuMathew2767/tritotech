import sgMail from '@sendgrid/mail'

const getConfig = () => {
  const apiKey = process.env.SENDGRID_API_KEY?.trim()
  const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim() || 'admin@tritongroup.com'
  const fromName = process.env.SENDGRID_FROM_NAME?.trim() || 'Triton IT Support'
  const dataResidency = process.env.SENDGRID_DATA_RESIDENCY?.trim().toLowerCase()
  const adminEmails = (process.env.SENDGRID_ADMIN_EMAILS || fromEmail)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (apiKey) {
    sgMail.setApiKey(apiKey)
    if (dataResidency === 'eu') {
      ;(sgMail as any).setDataResidency?.('eu')
    }
  }

  return {
    apiKey,
    fromEmail,
    fromName,
    adminEmails,
  }
}

const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string | string[]
  subject: string
  text: string
  html: string
}): Promise<boolean> => {
  const config = getConfig()

  if (!config.apiKey) {
    console.warn('[EMAIL] SENDGRID_API_KEY is not configured. Email delivery is disabled.')
    return false
  }

  try {
    await sgMail.send({
      to,
      from: {
        email: config.fromEmail,
        name: config.fromName,
      },
      subject,
      text,
      html,
    })
    return true
  } catch (error: any) {
    console.error('[EMAIL] SendGrid delivery failed:', error?.response?.body || error)
    return false
  }
}

export const emailService = {
  isConfigured(): boolean {
    return Boolean(getConfig().apiKey)
  },

  async sendPasswordResetEmail({
    to,
    fullName,
    resetUrl,
  }: {
    to: string
    fullName: string
    resetUrl: string
  }): Promise<boolean> {
    const subject = 'Reset your Triton IT Support password'
    const text = [
      `Hi ${fullName || 'there'},`,
      '',
      'We received a request to reset your Triton IT Support password.',
      `Use this link to choose a new password: ${resetUrl}`,
      '',
      'This link expires in 15 minutes. If you did not request a reset, you can ignore this email.',
    ].join('\n')

    const html = `
      <p>Hi ${fullName || 'there'},</p>
      <p>We received a request to reset your Triton IT Support password.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 15 minutes. If you did not request a reset, you can ignore this email.</p>
    `

    return sendEmail({ to, subject, text, html })
  },

  async sendApprovalRequestEmail({
    fullName,
    email,
    role,
    company,
    department,
  }: {
    fullName: string
    email: string
    role: string
    company?: string
    department?: string
  }): Promise<boolean> {
    const { adminEmails } = getConfig()
    const subject = `New user awaiting approval: ${fullName}`
    const text = [
      'A new user has registered and is awaiting admin approval.',
      '',
      `Name: ${fullName}`,
      `Email: ${email}`,
      `Role: ${role}`,
      `Company: ${company || 'Not provided'}`,
      `Department: ${department || 'Not provided'}`,
    ].join('\n')

    const html = `
      <p>A new user has registered and is awaiting admin approval.</p>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Role:</strong> ${role}</p>
      <p><strong>Company:</strong> ${company || 'Not provided'}</p>
      <p><strong>Department:</strong> ${department || 'Not provided'}</p>
    `

    return sendEmail({ to: adminEmails, subject, text, html })
  },

  async sendAccountApprovedEmail({
    to,
    fullName,
  }: {
    to: string
    fullName: string
  }): Promise<boolean> {
    const subject = 'Your Triton IT Support account has been approved'
    const text = [
      `Hi ${fullName || 'there'},`,
      '',
      'Your account has been approved. You can now sign in to the Triton IT Support portal.',
    ].join('\n')

    const html = `
      <p>Hi ${fullName || 'there'},</p>
      <p>Your account has been approved. You can now sign in to the Triton IT Support portal.</p>
    `

    return sendEmail({ to, subject, text, html })
  },

  async sendAccountDeniedEmail({
    to,
    fullName,
  }: {
    to: string
    fullName: string
  }): Promise<boolean> {
    const subject = 'Your Triton IT Support account request was denied'
    const text = [
      `Hi ${fullName || 'there'},`,
      '',
      'Your account request was denied. Please contact your administrator if you believe this was a mistake.',
    ].join('\n')

    const html = `
      <p>Hi ${fullName || 'there'},</p>
      <p>Your account request was denied. Please contact your administrator if you believe this was a mistake.</p>
    `

    return sendEmail({ to, subject, text, html })
  },
}
