/**
 * Angebot в PDF (глава 5.4 ТЗ: «вывод в двух форматах — текст для WhatsApp
 * и PDF»).
 *
 * Суммы и правовые блоки берутся из самого предложения, а не из настроек:
 * предложение — снимок на момент отправки, и документ должен показывать
 * ровно то, что получил клиент, даже если настройки потом поправили.
 */
import {
  Document,
  Page,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { Footer, Header, styles, type CompanyData } from "./common";

export type OfferPdfLine = {
  position: number;
  description: string;
  qty: string;
  unitLabel: string;
  unitPrice: string;
  lineNet: string;
};

export type OfferPdfData = {
  company: CompanyData;
  offerNumber: string;
  version: number;
  date: string;
  customerName: string;
  customerAddress: string[];
  dealTitle: string;
  greeting: string;
  lines: OfferPdfLine[];
  totalNet: string;
  vatLabel: string | null;
  vatAmount: string | null;
  totalGross: string;
  kleinunternehmerNote: string | null;
  scopeText: string;
  warrantyText: string;
  parkingText: string;
  validUntil: string | null;
};

const col = {
  pos: { width: 26 },
  desc: { flexGrow: 1, paddingRight: 8 },
  qty: { width: 62, textAlign: "right" as const },
  price: { width: 70, textAlign: "right" as const },
  sum: { width: 70, textAlign: "right" as const },
};

function OfferDocument({ data }: { data: OfferPdfData }) {
  return (
    <Document
      title={`Angebot ${data.offerNumber}`}
      author={data.company.companyName}
    >
      <Page size="A4" style={styles.page}>
        <Header
          company={data.company}
          title="Angebot"
          subtitle={`Nr. ${data.offerNumber}${data.version > 1 ? ` · Version ${data.version}` : ""} · ${data.date}`}
        />

        {/* Адрес получателя — там, где его ищут в немецком письме. */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.bold}>{data.customerName}</Text>
          {data.customerAddress.map((line) => (
            <Text key={line}>{line}</Text>
          ))}
        </View>

        <Text style={{ marginBottom: 10 }}>{data.greeting}</Text>
        <Text style={{ ...styles.bold, marginBottom: 8 }}>{data.dealTitle}</Text>

        {/* Позиции. */}
        <View
          style={{
            flexDirection: "row",
            borderBottomWidth: 1,
            borderBottomColor: "#1A1F22",
            paddingBottom: 3,
            fontFamily: "Helvetica-Bold",
          }}
        >
          <Text style={col.pos}>Pos.</Text>
          <Text style={col.desc}>Leistung</Text>
          <Text style={col.qty}>Menge</Text>
          <Text style={col.price}>Einzel</Text>
          <Text style={col.sum}>Summe</Text>
        </View>

        {data.lines.map((line) => (
          <View
            key={line.position}
            style={{
              flexDirection: "row",
              borderBottomWidth: 0.5,
              borderBottomColor: "#D7DBDD",
              paddingVertical: 4,
            }}
            wrap={false}
          >
            <Text style={col.pos}>{line.position}</Text>
            <Text style={col.desc}>{line.description}</Text>
            <Text style={col.qty}>
              {line.qty} {line.unitLabel}
            </Text>
            <Text style={col.price}>{line.unitPrice}</Text>
            <Text style={col.sum}>{line.lineNet}</Text>
          </View>
        ))}

        {/* Итоги. */}
        <View style={{ marginTop: 10, alignItems: "flex-end" }}>
          <View style={{ width: 240 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text>Netto</Text>
              <Text>{data.totalNet}</Text>
            </View>
            {data.vatLabel && data.vatAmount && (
              <View
                style={{ flexDirection: "row", justifyContent: "space-between" }}
              >
                <Text>{data.vatLabel}</Text>
                <Text>{data.vatAmount}</Text>
              </View>
            )}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                borderTopWidth: 1,
                borderTopColor: "#1A1F22",
                marginTop: 3,
                paddingTop: 3,
                fontFamily: "Helvetica-Bold",
              }}
            >
              <Text>Gesamt</Text>
              <Text>{data.totalGross}</Text>
            </View>
          </View>
        </View>

        {data.kleinunternehmerNote && (
          <Text style={{ ...styles.small, marginTop: 8 }}>
            {data.kleinunternehmerNote}
          </Text>
        )}

        {/* Правовые блоки — снимок из предложения (правило 9.2). */}
        <Text style={styles.h2}>Leistungsumfang</Text>
        <Text>{data.scopeText}</Text>

        <Text style={styles.h2}>Gewährleistung</Text>
        <Text>{data.warrantyText}</Text>

        <Text style={styles.h2}>Parken und Zugang</Text>
        <Text>{data.parkingText}</Text>

        {data.validUntil && (
          <Text style={{ marginTop: 12 }}>
            {`Dieses Angebot ist gültig bis ${data.validUntil}.`}
          </Text>
        )}

        <Text style={{ marginTop: 14 }}>Mit freundlichen Grüßen</Text>
        <Text>{data.company.companyName}</Text>

        <Footer company={data.company} />
      </Page>
    </Document>
  );
}

export function renderOfferPdf(data: OfferPdfData): Promise<Buffer> {
  return renderToBuffer(<OfferDocument data={data} />);
}
