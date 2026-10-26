<div align="center">

<img src="public/logo.png" alt="À table" width="120" />

# À table !

**Les goûts de chacun, et des idées de repas qui plaisent à toute la famille.**

Une app familiale de planification des repas : chacun règle ses goûts, l'app
propose des repas qui conviennent à tout le monde selon qui mange ce soir,
puis construit la liste de courses.

[**→ Voir l'app en ligne**](https://a-taaaable.vercel.app) · PWA · application iOS (Capacitor + TestFlight)

</div>

---

## Aperçu

<p align="center">
  <img src="docs/screenshots/1-semaine.png"  width="19%" alt="Planning des repas" />
  <img src="docs/screenshots/2-gouts.png"    width="19%" alt="Deck de goûts" />
  <img src="docs/screenshots/4-repas.png"    width="19%" alt="Composer un repas" />
  <img src="docs/screenshots/3-courses.png"  width="19%" alt="Liste de courses" />
  <img src="docs/screenshots/5-recette.png"  width="19%" alt="Recette pas à pas" />
</p>

## Fonctionnalités

- 👨‍👩‍👧‍👦 **Famille / groupe** — plusieurs membres, chacun avec son profil et ses goûts, invitations par code.
- 👍 **Deck de goûts** — on swipe les aliments (aime / moyen / n'aime pas / coup de cœur) ; interface façon cartes.
- 🍽️ **Génération de repas** — on coche qui mange, l'app propose entrées / plats / desserts en priorisant ce qui plaît à **tout le monde**.
- 🛒 **Liste de courses** — générée depuis les repas de la semaine, avec **estimation du prix par enseigne** et cases à cocher.
- 👨‍🍳 **Mode cuisine** — recettes pas à pas, étapes cochables, un peu de gamification pour aller au bout.
- 🥦 **Régimes** — sans gluten, sans lactose, végétarien, vegan, pescétarien… filtrent automatiquement les aliments.
- 🔐 **Connexion** — e-mail ou **Sign in with Google / Apple** (natif iOS + web).
- 📱 **Multi-plateforme** — PWA installable + application iOS native via Capacitor (coquille qui charge l'app hébergée).
- 🖼️ **166 photos de plats** générées pour rendre le catalogue appétissant.

## Stack

| | |
|---|---|
| **Framework** | Next.js 16 (App Router, SSR) · React 19 |
| **Style** | Tailwind CSS v4 · `motion` (animations) |
| **Base de données** | Neon Postgres (serverless) |
| **Auth social** | `@capgo/capacitor-social-login` + vérification des ID tokens côté serveur (`jose`, JWKS) |
| **iOS** | Capacitor 8 (SPM) · build cloud Codemagic · TestFlight |

## Note d'architecture

L'app est **SSR** (routes serveur sur Neon), donc la coquille iOS ne bundle pas un build statique :
elle charge l'URL hébergée dans une WebView. Résultat : les changements d'UI sont **instantanés**
côté natif (déploiement web), seuls les changements natifs (plugins, `Info.plist`, entitlements)
demandent un nouveau build. Les ID tokens Google/Apple sont vérifiés par signature JWKS côté serveur
(aucun client secret nécessaire).

## Développement

```bash
npm install
cp .env.example .env.local   # colle ta DATABASE_URL Neon
npm run dev
```

Les tables sont créées automatiquement à la première requête.

## Licence

© 2026 — Tous droits réservés.

Ce dépôt est **public à des fins de démonstration** (portfolio). Le code n'est **pas** sous licence
open-source : pas d'autorisation de réutilisation, de redistribution ou de déploiement, et les
contributions ne sont pas ouvertes.
