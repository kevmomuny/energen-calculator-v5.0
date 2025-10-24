/**
 * QUOTE MANAGEMENT ENDPOINTS
 * Email and revision functionality for quotes
 */

const nodemailer = require('nodemailer')
const path = require('path')
const fs = require('fs')

// Email transporter singleton
let emailTransporter = null

/**
 * Initialize email transporter lazily
 */
function initEmailTransporter(logger) {
  if (emailTransporter) return emailTransporter

  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })

  if (logger) {
    logger.info('[EMAIL] Transporter initialized')
  }
  return emailTransporter
}

/**
 * Email quote endpoint handler
 */
async function emailQuote(req, res, logger) {
  try {
    const { quote, recipients, ccMyself, trackInZoho, emailBody, emailSubject } = req.body

    // Validate inputs
    if (!recipients || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No recipients specified'
      })
    }

    if (!emailBody || !emailSubject) {
      return res.status(400).json({
        success: false,
        error: 'Email subject and body are required'
      })
    }

    // Check SMTP configuration
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('[EMAIL] SMTP credentials not configured')
      return res.status(503).json({
        success: false,
        error: 'Email service not configured. Please set SMTP_USER and SMTP_PASS environment variables.',
        needsConfiguration: true
      })
    }

    // Build email content
    let htmlContent = emailBody

    // Add custom message if provided
    if (quote.customMessage) {
      htmlContent += `
        <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
          <p style="margin: 0; color: #374151;"><strong>Additional Note:</strong></p>
          <p style="margin: 5px 0 0 0; color: #6b7280;">${quote.customMessage}</p>
        </div>
      `
    }

    // Prepare attachments
    const attachments = []
    if (quote.pdfPath) {
      const pdfFullPath = path.resolve(__dirname, '../..', quote.pdfPath)

      if (fs.existsSync(pdfFullPath)) {
        attachments.push({
          filename: path.basename(quote.pdfPath),
          path: pdfFullPath
        })
        logger.info('[EMAIL] Attaching PDF:', path.basename(quote.pdfPath))
      } else {
        logger.warn('[EMAIL] PDF not found:', pdfFullPath)
      }
    }

    // CC myself if requested
    const ccList = []
    if (ccMyself && process.env.SMTP_USER) {
      ccList.push(process.env.SMTP_USER)
    }

    // Initialize transporter
    const transporter = initEmailTransporter(logger)

    // Send email
    logger.info('[EMAIL] Sending quote to:', recipients.join(', '))
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipients.join(', '),
      cc: ccList.length > 0 ? ccList.join(', ') : undefined,
      subject: emailSubject,
      html: htmlContent,
      attachments: attachments
    })

    logger.info('[EMAIL] Quote sent successfully:', info.messageId)

    // Track in Zoho if requested
    let zohoActivityId = null
    if (trackInZoho && quote.customer?.zohoAccountId) {
      try {
        // TODO: Create activity in Zoho CRM
        // This would use Zoho API to log the email activity
        logger.info('[EMAIL] Zoho tracking requested for account:', quote.customer.zohoAccountId)
        // When implemented, this would create an activity record in Zoho
      } catch (zohoError) {
        logger.warn('[EMAIL] Zoho tracking failed:', zohoError.message)
        // Don't fail the email if Zoho tracking fails
      }
    }

    res.json({
      success: true,
      messageId: info.messageId,
      recipientCount: recipients.length,
      zohoActivityId: zohoActivityId,
      message: 'Quote email sent successfully'
    })

  } catch (error) {
    logger.error('[EMAIL] Error sending quote:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    })
  }
}

/**
 * Create quote revision endpoint handler
 */
async function createRevision(req, res, logger) {
  try {
    const { currentQuote, revision, options, quoteData } = req.body

    // Validate inputs
    if (!currentQuote || !currentQuote.bidNumber) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quote: must have bid number'
      })
    }

    if (!revision) {
      return res.status(400).json({
        success: false,
        error: 'Revision data is required'
      })
    }

    // Create new revision object
    const newRevision = {
      ...currentQuote,
      ...revision,
      bidNumber: currentQuote.bidNumber, // Keep same bid number for revisions
      revisionOf: currentQuote.quoteId || currentQuote.bidNumber,
      previousVersion: currentQuote.version,
      createdAt: new Date().toISOString(),
      status: options.isMajor ? 'draft' : currentQuote.status
    }

    logger.info('[REVISION] Creating revision:', {
      bidNumber: currentQuote.bidNumber,
      type: options.isMajor ? 'major' : 'minor',
      version: revision.version
    })

    // Track operations performed
    const operations = {
      supersededPDF: null,
      zohoQuoteId: null,
      zohoActivityId: null,
      regeneratedPDF: null
    }

    // Apply superseded watermark to original PDF if major revision
    if (options.applySupersededWatermark && options.isMajor && currentQuote.pdfPath) {
      try {
        // TODO: Apply watermark to existing PDF
        logger.info('[REVISION] Superseding PDF:', currentQuote.pdfPath)
        operations.supersededPDF = currentQuote.pdfPath
        // Would call PDF watermarking service here
        // Example: await applyWatermark(currentQuote.pdfPath, 'SUPERSEDED')
      } catch (pdfError) {
        logger.warn('[REVISION] Failed to apply watermark:', pdfError.message)
      }
    }

    // Clone in Zoho if major revision
    if (options.cloneInZoho && options.isMajor) {
      try {
        // TODO: Clone quote in Zoho CRM
        logger.info('[REVISION] Cloning quote in Zoho, original ID:', currentQuote.zohoQuoteId)
        // Would call Zoho API to create new quote record
        // Example: operations.zohoQuoteId = await zohoIntegration.cloneQuote(currentQuote.zohoQuoteId)
      } catch (zohoError) {
        logger.warn('[REVISION] Zoho clone failed:', zohoError.message)
      }
    }

    // Update existing Zoho quote if minor revision
    if (options.updateExistingZoho && !options.isMajor) {
      try {
        // TODO: Update existing Zoho quote
        logger.info('[REVISION] Updating Zoho quote:', currentQuote.zohoQuoteId)
        // Would call Zoho API to update quote record
        // Example: await zohoIntegration.updateQuote(currentQuote.zohoQuoteId, newRevision)
      } catch (zohoError) {
        logger.warn('[REVISION] Zoho update failed:', zohoError.message)
      }
    }

    // Regenerate PDF if requested
    if (options.regeneratePDF) {
      try {
        // TODO: Generate new PDF for revision
        logger.info('[REVISION] Regenerating PDF for revision:', revision.version)
        // Would call PDF generation service
        // Example: operations.regeneratedPDF = await generatePDF(newRevision, quoteData)
      } catch (pdfError) {
        logger.warn('[REVISION] PDF regeneration failed:', pdfError.message)
      }
    }

    // Notify customer if requested
    if (options.notifyCustomer && currentQuote.customer?.email) {
      try {
        // TODO: Send notification email to customer
        logger.info('[REVISION] Sending notification to customer:', currentQuote.customer.email)
        // Would call email service
        // Example: await sendRevisionNotification(currentQuote.customer.email, newRevision)
      } catch (emailError) {
        logger.warn('[REVISION] Customer notification failed:', emailError.message)
      }
    }

    logger.info('[REVISION] Revision created successfully:', revision.version)

    res.json({
      success: true,
      revision: newRevision,
      operations: operations,
      message: `${options.isMajor ? 'Major' : 'Minor'} revision created successfully`
    })

  } catch (error) {
    logger.error('[REVISION] Error creating revision:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create revision'
    })
  }
}

module.exports = {
  emailQuote,
  createRevision
}
