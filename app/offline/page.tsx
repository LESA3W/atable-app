export const metadata = { title: "Hors ligne — À table !" };

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="text-5xl" aria-hidden>
        📡
      </div>
      <h1 className="text-2xl font-extrabold">Pas de connexion</h1>
      <p className="max-w-xs text-stone-600">
        L&apos;app a besoin d&apos;internet pour charger les goûts et les repas. Reconnecte-toi et
        réessaie.
      </p>
    </div>
  );
}
