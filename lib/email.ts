import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export type AlertEmailData = {
  to: string
  companyName: string
  alerts: Array<{
    substanceName: string
    casNumber: string | null
    ingredientName: string
    reason: string | null
    source: 'ECHA_SVHC' | 'EUR_LEX' | 'ANSM'
  }>
}

export async function sendAlertEmail(data: AlertEmailData): Promise<void> {
  const { to, companyName, alerts } = data
  const count = alerts.length
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/dashboard`

  const echaCount = alerts.filter((a) => a.source === 'ECHA_SVHC').length
  const eurlexCount = alerts.filter((a) => a.source === 'EUR_LEX').length
  const ansmCount = alerts.filter((a) => a.source === 'ANSM').length

  const sourceParts: string[] = []
  if (echaCount > 0) sourceParts.push(`${echaCount} ECHA`)
  if (eurlexCount > 0) sourceParts.push(`${eurlexCount} EUR-Lex`)
  if (ansmCount > 0) sourceParts.push(`${ansmCount} ANSM`)
  const sourceSummary = sourceParts.join(', ')

  const { error } = await resend.emails.send({
    from: 'ReglementAlert <onboarding@resend.dev>',
    to,
    subject: `⚠️ ${count} new regulatory alert${count !== 1 ? 's' : ''} for ${companyName} (${sourceSummary})`,
    html: buildHtml({ companyName, alerts, dashboardUrl }),
  })

  if (error) {
    throw new Error(error.message)
  }
}

// ---------------------------------------------------------------------------
// HTML template — uses inline styles for email client compatibility
// ---------------------------------------------------------------------------

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sourceLabel(source: string): string {
  if (source === 'EUR_LEX') return 'EUR-Lex'
  if (source === 'ANSM') return 'ANSM'
  return 'ECHA SVHC'
}

function sourceBorderColor(source: string): string {
  if (source === 'EUR_LEX') return '#3b82f6' // blue-500
  if (source === 'ANSM') return '#f43f5e'    // rose-500
  return '#f59e0b'                            // amber-500 (ECHA)
}

function sourceBadgeStyle(source: string): string {
  if (source === 'EUR_LEX')
    return 'background:#dbeafe;color:#1d4ed8;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;'
  if (source === 'ANSM')
    return 'background:#ffe4e6;color:#be123c;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;'
  return 'background:#fef3c7;color:#b45309;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;'
}

function buildHtml({
  companyName,
  alerts,
  dashboardUrl,
}: {
  companyName: string
  alerts: AlertEmailData['alerts']
  dashboardUrl: string
}): string {
  const count = alerts.length

  const echaCount = alerts.filter((a) => a.source === 'ECHA_SVHC').length
  const eurlexCount = alerts.filter((a) => a.source === 'EUR_LEX').length
  const ansmCount = alerts.filter((a) => a.source === 'ANSM').length

  const sourceSummaryPills = [
    echaCount > 0
      ? `<span style="${sourceBadgeStyle('ECHA_SVHC')}">${echaCount} ECHA SVHC</span>`
      : '',
    eurlexCount > 0
      ? `<span style="${sourceBadgeStyle('EUR_LEX')}">${eurlexCount} EUR-Lex</span>`
      : '',
    ansmCount > 0
      ? `<span style="${sourceBadgeStyle('ANSM')}">${ansmCount} ANSM</span>`
      : '',
  ]
    .filter(Boolean)
    .join('&nbsp;&nbsp;')

  const alertRows = alerts
    .map(
      (a) => `
      <table width="100%" cellpadding="0" cellspacing="0"
        style="margin-bottom:12px;border:1px solid #e4e4e7;border-radius:8px;border-left:4px solid ${sourceBorderColor(a.source)};">
        <tr>
          <td style="padding:16px;">
            <p style="margin:0 0 6px;">
              <span style="font-size:14px;font-weight:600;color:#18181b;">${esc(a.substanceName)}</span>
              &nbsp;
              <span style="${sourceBadgeStyle(a.source)}">${sourceLabel(a.source)}</span>
            </p>
            <p style="margin:0;font-size:12px;color:#71717a;">
              Your ingredient: <strong style="color:#3f3f46;">${esc(a.ingredientName)}</strong>
              ${a.casNumber ? ` &middot; CAS&nbsp;${esc(a.casNumber)}` : ''}
            </p>
            ${
              a.reason
                ? `<p style="margin:6px 0 0;font-size:12px;color:#71717a;">${esc(a.reason)}</p>`
                : ''
            }
          </td>
        </tr>
      </table>`
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>New Regulatory Alerts — ReglementAlert</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="max-width:560px;background-color:#ffffff;border-radius:12px;
                 border:1px solid #e4e4e7;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:28px 40px 24px;border-bottom:1px solid #f4f4f5;">
              <span style="font-size:18px;font-weight:700;color:#18181b;">
                ReglementAlert
              </span>
            </td>
          </tr>

          <!-- Alert banner -->
          <tr>
            <td style="padding:20px 40px;background-color:#fef2f2;border-bottom:1px solid #fecaca;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#991b1b;">
                ⚠️ ${count} new regulatory alert${count !== 1 ? 's' : ''} detected
              </p>
              <p style="margin:8px 0 0;">${sourceSummaryPills}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 8px;font-size:15px;color:#3f3f46;">
                Hi ${esc(companyName)},
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6;">
                We found <strong>${count} match${count !== 1 ? 'es' : ''}</strong> between
                your ingredient watch list and EU regulatory databases
                (ECHA SVHC, EUR-Lex Cosmetics Regulation, ANSM safety alerts).
                Immediate review is recommended.
              </p>

              ${alertRows}

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="margin-top:32px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}"
                      style="display:inline-block;padding:13px 32px;
                             background-color:#2563eb;color:#ffffff;
                             font-size:14px;font-weight:600;
                             text-decoration:none;border-radius:8px;">
                      View alerts in dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f4f4f5;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                You're receiving this because you have active ingredient monitoring on
                ReglementAlert. Data sources: ECHA SVHC Candidate List, EUR-Lex Regulation (EC) 1223/2009 and amendments, ANSM cosmetics safety alerts.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
