/**
 * Abnahmeprotokoll — протокол приёмки работ (глава 5.6.5 ТЗ).
 *
 * Документ подтверждает, что работа сдана и принята. На него ссылаются при
 * претензиях, поэтому он содержит подпись клиента, дату, состав бригады и
 * согласие на фотофиксацию (глава 3 ТЗ).
 *
 * Язык немецкий: читает клиент.
 */
import {
  Document,
  Image,
  Page,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { Footer, Header, Line, styles, type CompanyData } from "./common";

/** Пункты чек-листа по-немецки. Ключи — из @/lib/job. */
export const HANDOVER_LABELS: Record<string, string> = {
  montage_vollstaendig: "Montage vollständig ausgeführt",
  funktion_geprueft: "Funktion geprüft (Türen, Schubladen, Geräte)",
  keine_schaeden: "Keine Schäden an Möbeln, Wänden, Böden",
  arbeitsplatz_gereinigt: "Arbeitsplatz gereinigt",
  verpackung_entsorgt: "Verpackung entsorgt bzw. mitgenommen",
};

export type HandoverPdfData = {
  company: CompanyData;
  dealNumber: number;
  dealTitle: string;
  services: string[];
  customerName: string;
  street: string;
  zip: string;
  city: string;
  floor: string | null;
  appointmentDate: string;
  appointmentTime: string;
  monteure: string[];
  workedMinutes: number | null;
  checklist: Record<string, boolean>;
  remarks: string | null;
  photoConsent: boolean;
  photosBefore: number;
  photosAfter: number;
  /** Подпись клиента, PNG. */
  signature: Buffer;
  signedAt: string;
  signedBy: string;
};

function HandoverDocument({ data }: { data: HandoverPdfData }) {
  return (
    <Document
      title={`Abnahmeprotokoll ${data.dealNumber}`}
      author={data.company.companyName}
    >
      <Page size="A4" style={styles.page}>
        <Header
          company={data.company}
          title="Abnahmeprotokoll"
          subtitle={`Auftrag ${data.dealNumber} · ${data.appointmentDate}`}
        />

        <View style={styles.block}>
          <Line label="Auftraggeber" value={data.customerName} />
          <Line
            label="Einsatzort"
            value={
              `${data.street}, ${data.zip} ${data.city}` +
              (data.floor ? ` (${data.floor})` : "")
            }
          />
          <Line label="Leistung" value={data.dealTitle} />
          {data.services.length > 0 && (
            <Line label="Art der Arbeiten" value={data.services.join(", ")} />
          )}
          <Line
            label="Termin"
            value={`${data.appointmentDate}, ${data.appointmentTime}`}
          />
          <Line label="Monteure" value={data.monteure.join(", ")} />
          {data.workedMinutes !== null && (
            <Line
              label="Arbeitszeit"
              value={`${Math.floor(data.workedMinutes / 60)} Std. ${data.workedMinutes % 60} Min.`}
            />
          )}
        </View>

        <Text style={styles.h2}>Abnahme</Text>
        <View>
          {Object.keys(HANDOVER_LABELS).map((key) => (
            <View key={key} style={styles.row}>
              {/* Галочка рисуется знаком, а не картинкой: шрифт Helvetica
                  символа ☑ не содержит. */}
              <Text style={{ width: 16, fontFamily: "Helvetica-Bold" }}>
                {data.checklist[key] ? "[x]" : "[  ]"}
              </Text>
              <Text>{HANDOVER_LABELS[key]}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Anmerkungen</Text>
        <View style={styles.box}>
          <Text>{data.remarks?.trim() ? data.remarks : "Keine Anmerkungen."}</Text>
        </View>

        <Text style={styles.h2}>Fotodokumentation</Text>
        <Text>
          {`Vorher: ${data.photosBefore} Foto(s), nachher: ${data.photosAfter} Foto(s).`}
        </Text>
        <Text style={{ marginTop: 4 }}>
          {data.photoConsent
            ? "Der Auftraggeber willigt ein, dass die Fotos zur Dokumentation der Leistung gespeichert werden."
            : "Der Auftraggeber willigt einer Speicherung der Fotos nicht ein. Die Fotos dienen ausschließlich der internen Nachweisführung im Rahmen der Auftragsabwicklung."}
        </Text>

        <View style={{ marginTop: 22 }}>
          <Text style={styles.bold}>Unterschrift Auftraggeber</Text>
          <Image
            src={{ data: data.signature, format: "png" }}
            style={{ width: 200, height: 70, marginTop: 4 }}
          />
          <View
            style={{
              width: 220,
              borderTopWidth: 1,
              borderTopColor: "#1A1F22",
              paddingTop: 3,
            }}
          >
            <Text style={styles.small}>
              {data.customerName} · {data.signedAt}
            </Text>
          </View>
          <Text style={{ ...styles.small, marginTop: 10 }}>
            {`Aufgenommen von: ${data.signedBy}`}
          </Text>
        </View>

        <Text style={{ ...styles.small, marginTop: 18 }}>
          Mit der Unterschrift bestätigt der Auftraggeber die Abnahme der oben
          beschriebenen Leistung. Sichtbare Mängel sind unter „Anmerkungen“
          festgehalten.
        </Text>

        <Footer company={data.company} />
      </Page>
    </Document>
  );
}

export function renderHandoverPdf(data: HandoverPdfData): Promise<Buffer> {
  return renderToBuffer(<HandoverDocument data={data} />);
}
