import { pdf } from "@react-pdf/renderer";
import FAESPdfPage from "./faespdfPage";
import type { FaesPrintable } from "@/api/hooks/useFaes";

export async function downloadFAESPdf(printable: FaesPrintable) {
  const blob = await pdf(<FAESPdfPage printable={printable} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const code =
    printable?.faes?.public_code || `FAES-${printable?.faes?.id ?? ""}`;
  a.download = `${code}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3_000);
}
