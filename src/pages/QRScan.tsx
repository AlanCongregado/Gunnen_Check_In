import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import TopNav from "../components/TopNav";
import { signOut } from "../lib/auth";

export default function QRScan() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    function onScanSuccess(decodedText: string) {
      // 1. Check if it's the general "Box QR" (the app URL itself)
      // The Box QR generated in QrCodeCard.tsx points to origin + /scan
      const appUrl = window.location.origin;
      const scanUrl = `${appUrl}/scan`;
      const isBoxQR = decodedText === appUrl || decodedText === scanUrl || decodedText === `${appUrl}/`;

      if (isBoxQR) {
        scanner.clear().then(() => {
          navigate("/select-class");
        });
        return;
      }

      // 2. Otherwise expect a URL like: https://app.gunnen.com/confirm?classId=UUID
      try {
        const url = new URL(decodedText);
        const classId = url.searchParams.get("classId");
        if (classId) {
          scanner.clear().then(() => {
            navigate(`/confirm?classId=${classId}`);
          });
        } else {
          setError("QR no contiene ID de clase. Redirigiendo a selección manual...");
          setTimeout(() => {
            scanner.clear().then(() => navigate("/select-class"));
          }, 2000);
        }
      } catch (e) {
        // If not a URL, maybe it's just the ID
        if (decodedText.length > 20) { // Simple UUID check
          scanner.clear().then(() => {
            navigate(`/confirm?classId=${decodedText}`);
          });
        } else {
          setError("Código QR no reconocido. Redirigiendo a selección manual...");
          setTimeout(() => {
            scanner.clear().then(() => navigate("/select-class"));
          }, 2000);
        }
      }
    }

    function onScanFailure(error: any) {
      // ignore failures (constant scanning)
    }

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear().catch(err => console.error("Failed to clear scanner", err));
    };
  }, [navigate]);

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-md mx-auto space-y-6">
        <TopNav role="athlete" onSignOut={() => signOut()} />
        <div className="rounded-2xl card p-6 space-y-3">
          <h1 className="text-2xl font-semibold">Escanear QR del box</h1>
          <p className="text-sm text-[#6a6f57]">
            Apunta tu cámara al código QR en recepción para hacer check-in.
          </p>
          
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div id="reader" className="overflow-hidden rounded-xl border border-[rgba(49,71,11,0.15)]"></div>
          
          <button
            onClick={() => navigate("/select-class")}
            className="inline-flex w-full justify-center rounded-lg btn-outline py-2 font-medium"
          >
            Seleccionar clase manualmente
          </button>
        </div>
      </div>
    </div>
  );
}
