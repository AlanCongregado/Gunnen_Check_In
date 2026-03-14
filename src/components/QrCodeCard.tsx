import { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function QrCodeCard() {
  const url = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/scan`;
  }, []);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl card p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">QR de check-in</h2>
        <p className="text-sm text-[#6a6f57]">
          Imprime y coloca este QR en recepción. Al escanearlo se abre el flujo
          de check-in.
        </p>
      </div>

      <div className="flex justify-center">
        {url ? (
          <div className="rounded-xl border border-[rgba(49,71,11,0.15)] p-4 bg-white">
            <QRCodeCanvas value={url} size={200} includeMargin />
          </div>
        ) : (
          <div className="rounded-xl border border-[rgba(49,71,11,0.15)] p-6 text-[#6a6f57]">
            Cargando QR...
          </div>
        )}
      </div>

      {url && (
        <div className="print-only text-center py-8">
          <div className="inline-block rounded-xl border border-[rgba(49,71,11,0.15)] p-4 bg-white">
            <QRCodeCanvas value={url} size={320} includeMargin />
          </div>
          <p className="mt-4 text-sm text-[#31470b]">Escanea para hacer check-in</p>
        </div>
      )}

      <div className="rounded-lg bg-[#f1eddf] p-3 text-sm text-[#31470b] break-all">
        {url}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 rounded-lg border border-[#31470b] px-3 py-2 text-sm font-medium text-[#31470b]"
        >
          {copied ? "Copiado" : "Copiar link"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 rounded-lg btn-primary px-3 py-2 text-sm font-medium"
        >
          Imprimir QR
        </button>
      </div>
    </div>
  );
}
