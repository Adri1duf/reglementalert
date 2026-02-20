import {
  Document,
  Page,
  View,
  Text,
  Link,
  StyleSheet,
} from '@react-pdf/renderer'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReportAlert = {
  id: string
  substance_name: string
  cas_number: string | null
  source: string
  regulation: string
  reason: string | null
  echa_url: string | null
  is_read: boolean
  created_at: string
  monitored_ingredients: { ingredient_name: string } | null
}

type Props = {
  alerts: ReportAlert[]
  companyName: string
  date: string
}

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
  teal: '#0d9488',
  amber: '#d97706',
  amberBg: '#fef3c7',
  neutral900: '#171717',
  neutral700: '#404040',
  neutral500: '#737373',
  neutral400: '#a3a3a3',
  neutral200: '#e5e5e5',
  neutral100: '#f5f5f5',
  red500: '#ef4444',
  white: '#ffffff',
} as const

const ECHA_FALLBACK = 'https://echa.europa.eu/candidate-list-table'

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.neutral900,
    backgroundColor: C.white,
    paddingTop: 44,
    paddingBottom: 64,
    paddingHorizontal: 44,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.neutral200,
    borderBottomStyle: 'solid',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.teal,
    marginRight: 6,
  },
  brandName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: C.neutral900,
  },
  reportTitle: {
    fontSize: 9,
    color: C.neutral500,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  companyName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: C.neutral900,
    marginBottom: 2,
  },
  generatedLabel: {
    fontSize: 8,
    color: C.neutral500,
  },

  // Summary row
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 28,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.neutral100,
    borderRadius: 6,
    padding: 12,
    marginRight: 8,
  },
  summaryCardLast: {
    flex: 1,
    backgroundColor: C.neutral100,
    borderRadius: 6,
    padding: 12,
  },
  summaryValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    color: C.neutral900,
    marginBottom: 3,
  },
  summaryLabel: {
    fontSize: 7.5,
    color: C.neutral500,
    letterSpacing: 0.3,
  },

  // Section heading
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: C.neutral500,
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  // Alert item
  alertItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.neutral200,
    borderBottomStyle: 'solid',
  },
  alertItemLast: {
    flexDirection: 'row',
  },
  dotCol: {
    width: 14,
    paddingTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  alertBody: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 3,
  },
  substanceName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: C.neutral900,
    marginRight: 6,
  },
  badge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.amber,
    backgroundColor: C.amberBg,
    paddingLeft: 4,
    paddingRight: 4,
    paddingTop: 2,
    paddingBottom: 2,
    borderRadius: 3,
  },
  casNumber: {
    fontFamily: 'Courier',
    fontSize: 8,
    color: C.neutral500,
    marginBottom: 3,
  },
  matched: {
    fontSize: 8.5,
    color: C.neutral500,
    marginBottom: 3,
  },
  matchedBold: {
    fontFamily: 'Helvetica-Bold',
    color: C.neutral700,
  },
  reason: {
    fontSize: 8.5,
    color: C.neutral500,
    lineHeight: 1.5,
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaDate: {
    fontSize: 8,
    color: C.neutral400,
    marginRight: 10,
  },
  echaLink: {
    fontSize: 8,
    color: C.teal,
  },

  // Footer (fixed = repeats on every page)
  footer: {
    position: 'absolute',
    bottom: 26,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: C.neutral200,
    borderTopStyle: 'solid',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7.5,
    color: C.neutral400,
  },
  pageNum: {
    fontSize: 7.5,
    color: C.neutral400,
  },
})

// ── Component ─────────────────────────────────────────────────────────────────

export default function AlertsReport({ alerts, companyName, date }: Props) {
  const unreadCount = alerts.filter((a) => !a.is_read).length

  return (
    <Document
      title={`ReglementAlert Report — ${companyName}`}
      author="ReglementAlert"
      subject="Regulatory Alerts Report"
    >
      <Page size="A4" style={s.page}>
        {/* ── Header (repeats on every page) ─────────────────────────────── */}
        <View style={s.header} fixed>
          <View>
            <View style={s.brandRow}>
              <View style={s.brandDot} />
              <Text style={s.brandName}>ReglementAlert</Text>
            </View>
            <Text style={s.reportTitle}>Regulatory Alerts Report</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.companyName}>{companyName}</Text>
            <Text style={s.generatedLabel}>Generated {date}</Text>
          </View>
        </View>

        {/* ── Summary cards (first page only) ────────────────────────────── */}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryValue}>{alerts.length}</Text>
            <Text style={s.summaryLabel}>TOTAL ALERTS</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryValue}>{unreadCount}</Text>
            <Text style={s.summaryLabel}>UNREAD</Text>
          </View>
          <View style={s.summaryCardLast}>
            <Text style={s.summaryValue}>1</Text>
            <Text style={s.summaryLabel}>SOURCE (ECHA SVHC)</Text>
          </View>
        </View>

        {/* ── Alert list ──────────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>REGULATORY ALERTS</Text>

        {alerts.map((alert, i) => {
          const isLast = i === alerts.length - 1
          const dotColor = alert.is_read ? C.neutral200 : C.red500
          const dateStr = new Date(alert.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
          const echaHref = alert.echa_url ?? ECHA_FALLBACK

          return (
            <View
              key={alert.id}
              style={isLast ? s.alertItemLast : s.alertItem}
              wrap={false}
            >
              {/* Dot indicator */}
              <View style={s.dotCol}>
                <View style={[s.dot, { backgroundColor: dotColor }]} />
              </View>

              {/* Content */}
              <View style={s.alertBody}>
                <View style={s.titleRow}>
                  <Text style={s.substanceName}>{alert.substance_name}</Text>
                  <Text style={s.badge}>ECHA SVHC</Text>
                </View>

                {alert.cas_number && (
                  <Text style={s.casNumber}>CAS {alert.cas_number}</Text>
                )}

                {alert.monitored_ingredients && (
                  <Text style={s.matched}>
                    {'Matched: '}
                    <Text style={s.matchedBold}>
                      {alert.monitored_ingredients.ingredient_name}
                    </Text>
                  </Text>
                )}

                {alert.reason && (
                  <Text style={s.reason}>{alert.reason}</Text>
                )}

                <View style={s.metaRow}>
                  <Text style={s.metaDate}>{dateStr}</Text>
                  <Link src={echaHref} style={s.echaLink}>
                    View on ECHA
                  </Link>
                </View>
              </View>
            </View>
          )
        })}

        {/* ── Footer (repeats on every page) ──────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generated by ReglementAlert</Text>
          <Text
            style={s.pageNum}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}
