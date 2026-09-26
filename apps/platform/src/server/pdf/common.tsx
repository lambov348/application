/**
 * Общее для PDF-документов: стили, шапка с реквизитами, подвал.
 *
 * Шрифт — встроенный Helvetica. Умлауты и «ß» он содержит (кодировка
 * WinAnsi), поэтому внешние файлы шрифтов не нужны: в контейнере их пришлось
 * бы держать и обновлять.
 *
 * Документы всегда по-немецки, независимо от языка интерфейса: их читает
 * клиент и бухгалтер, а не сотрудник.
 */
import { StyleSheet, Text, View } from "@react-pdf/renderer";

export const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 45,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#1A1F22",
    lineHeight: 1.45,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#D7DBDD",
    paddingBottom: 10,
    marginBottom: 18,
  },
  company: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  small: { fontSize: 8, color: "#5A6366" },
  h1: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  h2: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 5 },
  bold: { fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row" },
  label: { width: 130, color: "#5A6366" },
  block: { marginBottom: 10 },
  box: {
    borderWidth: 1,
    borderColor: "#D7DBDD",
    padding: 8,
    marginTop: 6,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 45,
    right: 45,
    fontSize: 7.5,
    color: "#5A6366",
    borderTopWidth: 1,
    borderTopColor: "#D7DBDD",
    paddingTop: 6,
  },
});

export type CompanyData = {
  companyName: string;
  companyStreet: string;
  companyZip: string;
  companyCity: string;
  companyEmail: string;
  companyPhone: string;
  taxNumber: string | null;
  vatId: string | null;
};

export function Header({
  company,
  title,
  subtitle,
}: {
  company: CompanyData;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.company}>{company.companyName}</Text>
        <Text style={styles.small}>
          {company.companyStreet}, {company.companyZip} {company.companyCity}
        </Text>
        <Text style={styles.small}>
          {company.companyPhone}
          {company.companyEmail ? ` · ${company.companyEmail}` : ""}
        </Text>
      </View>
      <View>
        <Text style={styles.h1}>{title}</Text>
        {subtitle ? <Text style={styles.small}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

/**
 * Подвал с реквизитами. §14 UStG требует их на счёте; в протоколе и
 * предложении они тоже уместны — документ должен отвечать на вопрос
 * «кто это выдал», без обращения к сайту.
 */
export function Footer({ company }: { company: CompanyData }) {
  const parts = [
    `${company.companyName}, ${company.companyStreet}, ${company.companyZip} ${company.companyCity}`,
    company.taxNumber ? `Steuernummer ${company.taxNumber}` : null,
    company.vatId ? `USt-IdNr. ${company.vatId}` : null,
  ].filter(Boolean);

  return (
    <View style={styles.footer} fixed>
      <Text>{parts.join(" · ")}</Text>
    </View>
  );
}

/** Строка «подпись: значение» — основа всех таблиц в документах. */
export function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}
