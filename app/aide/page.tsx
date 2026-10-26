import Link from "next/link";

export const metadata = {
  title: "Aide et support — À table !",
  description:
    "Page d'aide de l'application À table : comment ça marche, compte, suppression des données et contact.",
};

// Public support page, served as a plain standalone web document (no app chrome — see AppChrome's
// PUBLIC_BARE). The App Store requires a reachable "Support URL"; this is it. Static server component,
// no auth, so anyone (and the reviewer) can open it in a browser.
const FAQ = [
  {
    q: "C'est quoi À table ?",
    a: "Une application qui aide ta famille ou ton groupe à décider quoi manger. Chacun indique ses goûts, et l'app propose des repas qui plaisent à tout le monde, puis construit la liste de courses.",
  },
  {
    q: "Comment je crée un compte ?",
    a: "Avec ton adresse email, ou en un tap avec Google ou Apple. Pas de carte bancaire demandée.",
  },
  {
    q: "Est-ce que c'est payant ?",
    a: "L'application est gratuite. Aucune donnée n'est vendue et il n'y a aucune publicité.",
  },
  {
    q: "Comment j'ajoute les membres de ma famille ?",
    a: "Depuis l'onglet Famille, tu ajoutes chaque membre et tu renseignes ses goûts. Tu peux aussi partager un lien pour qu'ils rejoignent le groupe eux-mêmes.",
  },
  {
    q: "Comment je supprime mon compte et mes données ?",
    a: "Dans l'application : Réglages → Mon compte → Supprimer mon compte. Tout est effacé définitivement (profil, goûts, participations). L'action est irréversible.",
  },
];

export default function AidePage() {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-white text-stone-700">
      <article className="mx-auto max-w-2xl px-6 pb-20 pt-[max(2.5rem,calc(env(safe-area-inset-top)+1.5rem))]">
        <header className="border-b border-stone-200 pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">Aide et support</h1>
          <p className="mt-2 text-sm text-stone-500">
            À table — application de planification des repas en famille.
          </p>
        </header>

        <section className="mt-8 flex flex-col gap-6">
          {FAQ.map((item) => (
            <div key={item.q}>
              <h2 className="text-lg font-bold text-stone-900">{item.q}</h2>
              <p className="mt-1.5 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-2xl bg-stone-50 p-6">
          <h2 className="text-lg font-bold text-stone-900">Une question, un souci ?</h2>
          <p className="mt-2 leading-relaxed">
            Écris-nous, on répond&nbsp;:{" "}
            <a
              href="mailto:ataaable.contact@gmail.com"
              className="font-semibold text-orange-700 underline decoration-orange-300 underline-offset-2"
            >
              ataaable.contact@gmail.com
            </a>
          </p>
        </section>

        <footer className="mt-12 border-t border-stone-200 pt-6 text-sm text-stone-500">
          <Link href="/confidentialite" className="underline underline-offset-2 hover:text-stone-700">
            Politique de confidentialité
          </Link>
        </footer>
      </article>
    </div>
  );
}
