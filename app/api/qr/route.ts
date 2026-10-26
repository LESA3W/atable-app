import QRCode from "qrcode";

export const dynamic = "force-dynamic";

// Returns a PNG QR code for the given ?data= URL. Used by the /print page so
// the printed code always points at wherever the app is actually deployed.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const data = searchParams.get("data");
  if (!data) {
    return new Response("missing data param", { status: 400 });
  }

  const png = await QRCode.toBuffer(data, {
    width: 720,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#1f2937", light: "#ffffff" },
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
