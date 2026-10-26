import Link from "next/link";

export const metadata = {
  title: "Confidentialité — À table !",
  description:
    "Politique de confidentialité de l'application À table : données collectées, usage, conservation et suppression.",
};

// Public privacy policy, served as a plain standalone web document (no app chrome — see AppChrome's
// PUBLIC_BARE). App Store submission needs this URL reachable without an account, and Apple checks that
// account deletion is available in-app. Static server component, no auth: the reviewer and any user can
// open it in a browser.
export default function ConfidentialitePage() {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-white text-stone-700">
      <article className="mx-auto max-w-2xl px-6 pb-20 pt-[max(2.5rem,calc(env(safe-area-inset-top)+1.5rem))]">
        <header className="border-b border-stone-200 pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
            Politique de confidentialité
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            À table — application de planification des repas en famille. Dernière mise à jour : 23
            juillet 2026.
          </p>
        </header>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-stone-900">En résumé</h2>
          <p className="mt-2 leading-relaxed">
            À table collecte le strict minimum pour fonctionner. On ne vend rien à personne, il n&apos;y
            a aucune publicité ni traceur tiers, et tu peux supprimer ton compte et toutes tes données à
            tout moment depuis l&apos;application.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-stone-900">Les données qu&apos;on collecte</h2>
          <ul className="mt-3 flex flex-col gap-3 leading-relaxed">
            <li>
              <strong className="text-stone-900">Compte</strong> : ton adresse email et un identifiant
              de compte. Si tu crées ton compte par email, ton mot de passe est stocké chiffré (haché),
              jamais en clair. Si tu te connectes avec Google ou Apple, on reçoit uniquement ton email et
              ton identifiant, jamais ton mot de passe.
            </li>
            <li>
              <strong className="text-stone-900">Profil</strong> : ton prénom, ta couleur ou photo
              d&apos;avatar, et éventuellement ton âge et tes restrictions alimentaires si tu les
              renseignes.
            </li>
            <li>
              <strong className="text-stone-900">Goûts</strong> : ce que tu aimes, n&apos;aimes pas ou
              ne connais pas parmi les aliments proposés.
            </li>
            <li>
              <strong className="text-stone-900">Famille ou groupe</strong> : les membres que tu
              ajoutes, les repas planifiés, la liste de courses associée.
            </li>
            <li>
              <strong className="text-stone-900">Localisation (optionnelle)</strong> : uniquement si tu
              utilises le bouton «&nbsp;Utiliser ma position&nbsp;» pour trouver les magasins autour de
              toi, on utilise la position de ton appareil à ce moment précis pour afficher les enseignes
              proches. C&apos;est ponctuel et déclenché par toi ; on ne suit jamais ta position en
              continu ni en arrière-plan.
            </li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-stone-900">À quoi elles servent</h2>
          <p className="mt-2 leading-relaxed">
            Uniquement à faire fonctionner l&apos;app : te connecter, générer des repas adaptés aux
            goûts de ta famille ou de ton groupe, construire la liste de courses et te synchroniser
            entre tes appareils. Rien d&apos;autre. On ne suit pas ta navigation à des fins
            publicitaires et il n&apos;y a aucun traceur tiers de ce type.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-stone-900">Où elles sont stockées</h2>
          <p className="mt-2 leading-relaxed">
            Tes données sont hébergées sur une base de données sécurisée (Neon, région Europe) et
            transitent en HTTPS chiffré. On ne les vend pas, on ne les loue pas et on ne les partage pas
            avec des annonceurs.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-stone-900">Supprimer ton compte et tes données</h2>
          <p className="mt-2 leading-relaxed">
            Tu peux supprimer ton compte à tout moment depuis l&apos;application, dans{" "}
            <strong className="text-stone-900">Réglages → Mon compte → Supprimer mon compte</strong>.
            Cette action efface définitivement ton identifiant, ton profil, tes goûts et tes
            participations aux familles ou groupes. Elle est irréversible.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-stone-900">Contact</h2>
          <p className="mt-2 leading-relaxed">
            Une question sur tes données&nbsp;?{" "}
            <a
              href="mailto:ataaable.contact@gmail.com"
              className="font-semibold text-orange-700 underline decoration-orange-300 underline-offset-2"
            >
              ataaable.contact@gmail.com
            </a>
          </p>
        </section>

        <footer className="mt-12 border-t border-stone-200 pt-6 text-sm text-stone-500">
          <Link href="/aide" className="underline underline-offset-2 hover:text-stone-700">
            Aide et support
          </Link>
        </footer>
      </article>
    </div>
  );
}
