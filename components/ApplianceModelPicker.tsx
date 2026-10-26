"use client";

import { useState } from "react";
import { APPLIANCE_DETAILS, APPLIANCES } from "@/data/appliances";
import { Icon } from "./Icon";

type Step = "brand" | "brandOther" | "model" | "modelOther";

// Two-step centered picker for an appliance's brand then model. "Quelle marque ?" (tiles + Autre
// free text) -> "Quel modèle ?" (the brand's models + Autre free text). Saves "Marque · Modèle".
// Used both in the Repas flow (opens when the appliance is selected) and the profile card.
export function ApplianceModelPicker({
  applianceKey,
  initialValue,
  onSave,
  onClose,
}: {
  applianceKey: string;
  initialValue?: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const det = APPLIANCE_DETAILS[applianceKey];
  const saved = (initialValue ?? "").trim();
  const [savedBrand, savedModel] = saved.includes(" · ") ? (saved.split(" · ") as [string, string]) : [saved, ""];
  const icon = APPLIANCES.find((a) => a.key === applianceKey)?.icon ?? "cooker";

  const [step, setStep] = useState<Step>("brand");
  const [brand, setBrand] = useState("");
  const [brandText, setBrandText] = useState(savedBrand && !det?.brands.some((b) => b.name === savedBrand) ? savedBrand : "");
  const [modelText, setModelText] = useState(savedModel);

  if (!det) return null;

  const knownBrand = det.brands.find((b) => b.name === brand);
  const title = step === "brand" || step === "brandOther" ? "Quelle marque ?" : "Quel modèle ?";

  function chooseBrand(name: string) {
    setBrand(name);
    setModelText(name === savedBrand ? savedModel : "");
    setStep("model");
  }
  function saveOtherBrand() {
    const b = brandText.trim();
    if (!b) return;
    setBrand(b);
    setStep("modelOther"); // a custom brand has no model list -> go straight to free text
  }
  function saveOtherModel() {
    const m = modelText.trim();
    onSave(m ? `${brand} · ${m}` : brand);
  }

  const dashedTile =
    "col-span-2 flex items-center justify-center gap-2 rounded-[var(--radius-btn)] border-2 border-dashed border-stone-300 bg-stone-50 py-3 text-sm font-extrabold text-stone-500 transition active:scale-[0.97]";
  const input =
    "rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-3 text-base font-semibold text-stone-800 outline-none transition focus:border-[var(--primary)]";

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-stone-900/45 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div className="modal-in w-full max-w-sm rounded-3xl bg-white p-6 shadow-[0_24px_60px_-12px_rgba(43,30,20,0.45)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Icon name={icon} size={34} strokeWidth={2} />
          </span>
          <h2 className="mt-3 text-balance text-xl font-extrabold text-stone-900">{title}</h2>
          <p className="mt-1 text-sm font-semibold text-stone-400">{step.startsWith("model") ? (brand === det.label ? brand : `${det.label} · ${brand}`) : det.label}</p>
        </div>

        {step === "brand" && (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {det.brands.map((b) => (
                <button key={b.name} type="button" onClick={() => chooseBrand(b.name)} className={`btn-3d py-3.5 text-base ${savedBrand === b.name ? "btn-primary" : "btn-neutral"}`}>
                  {b.name}
                </button>
              ))}
              <button type="button" onClick={() => setStep("brandOther")} className={dashedTile}>
                <Icon name="edit" size={16} strokeWidth={2.2} /> Autre marque
              </button>
            </div>
            <button type="button" onClick={onClose} className="mt-4 w-full py-1 text-sm font-bold text-stone-400">
              Plus tard
            </button>
          </>
        )}

        {step === "brandOther" && (
          <form
            className="mt-5 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              saveOtherBrand();
            }}
          >
            <label className="flex flex-col gap-1 text-left">
              <span className="text-sm font-bold text-stone-500">Marque</span>
              <input autoFocus value={brandText} onChange={(e) => setBrandText(e.target.value)} placeholder="Ex. Klarstein" className={input} />
            </label>
            <button type="submit" disabled={!brandText.trim()} className="btn-3d btn-primary mt-1 w-full py-3.5 text-base">
              Continuer
            </button>
            <button type="button" onClick={() => setStep("brand")} className="w-full py-1 text-sm font-bold text-stone-400">
              &larr; Retour
            </button>
          </form>
        )}

        {step === "model" && (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {(knownBrand?.models ?? []).map((m) => (
                <button key={m} type="button" onClick={() => onSave(`${brand} · ${m}`)} className={`btn-3d py-3.5 text-base ${savedModel === m ? "btn-primary" : "btn-neutral"}`}>
                  {m}
                </button>
              ))}
              <button type="button" onClick={() => setStep("modelOther")} className={dashedTile}>
                <Icon name="edit" size={16} strokeWidth={2.2} /> Autre modèle
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button type="button" onClick={() => setStep("brand")} className="py-1 text-sm font-bold text-stone-400">
                &larr; Marque
              </button>
              <button type="button" onClick={() => onSave(brand)} className="py-1 text-sm font-bold text-stone-400">
                Plus tard
              </button>
            </div>
          </>
        )}

        {step === "modelOther" && (
          <form
            className="mt-5 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              saveOtherModel();
            }}
          >
            <label className="flex flex-col gap-1 text-left">
              <span className="text-sm font-bold text-stone-500">Modèle</span>
              <input autoFocus value={modelText} onChange={(e) => setModelText(e.target.value)} placeholder="Ex. Cookit" className={input} />
            </label>
            <button type="submit" className="btn-3d btn-primary mt-1 w-full py-3.5 text-base">
              Valider
            </button>
            <button type="button" onClick={() => setStep(knownBrand ? "model" : "brand")} className="w-full py-1 text-sm font-bold text-stone-400">
              &larr; Retour
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
