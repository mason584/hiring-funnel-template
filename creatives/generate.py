#!/usr/bin/env python3
"""
Créatives Meta de recrutement — générateur.

    python3 creatives/generate.py                                   # closer, variantes typographiques
    python3 creatives/generate.py --role <poste>                  # un autre poste du bloc ROLES
    python3 creatives/generate.py --role <poste> --photo photo/marvin.jpg   # + variantes avec photo
    python3 creatives/generate.py --only photo --photo-y 30

Le process complet est décrit dans creatives/README.md. En résumé :
  · tout le contenu tient dans le carré central de 1080 × 1080 — le 9:16 se
    recadre en 4:5 et en 1:1 sans rien perdre, et les versions 4:5 et 1:1
    sont rendues avec exactement le même cadrage ;
  · hiérarchie fixe : logo centré, mention, POSTE en très grand, accroche,
    filet, bénéfices, ligne de conditions, adresse du site ;
  · pas de bouton : Meta ajoute le sien sous le visuel ;
  · aucun chiffre de rémunération (catégorie spéciale Emploi).

La marque vit dans BRAND ci-dessous ; les textes de chaque poste dans ROLES
(bénéfices, ligne de conditions, variantes). Rendu par Chrome headless via
shot.js.
"""
import argparse, base64, os, shutil, subprocess, tempfile
from pathlib import Path
from string import Template

HERE = Path(__file__).resolve().parent

# ── La marque ──────────────────────────────────────────────────────────────
BRAND = dict(
    bg="#FEFAEB",            # fond — la crème Savoire
    line="#E9E4D8",          # grille discrète en fond
    text="#221F1B",          # titres et bénéfices
    muted="#5A5248",         # texte secondaire
    dim="#8A7E6E",           # adresse du site
    accent="#E35A2E",        # mention, mots forts, puces
    accent2="#926850",       # ligne de conditions, fin du filet
    glow="rgba(227,90,46,.16)",
    display_font=HERE.parent / "public/brand/fonts/the-seasons-bold.ttf",  # titres (TTF/OTF)
    display_uppercase=False,
    display_tracking="-.02em",
    wordmark_svg=None,       # None → wordmark_text
    wordmark_text="Savoire",
    site_url="recrutement.savoire.io",
)

# ── Les textes, par poste ──────────────────────────────────────────────────
# Une variante = une accroche ; `typo` et `photo` surchargent les réglages
# typographiques (un titre sur deux lignes demande un corps plus petit).
ROLES = {
    "closer": dict(
        benefits=[
            "Des rendez-vous qualifiés, fournis",
            "Une offre qui se vend parce qu’elle marche",
            "Une équipe qui forme, pas qui surveille",
        ],
        tag="Rémunération attractive · Sans plafond",
        variants={
            "1-experimente": dict(eyebrow="Recrutement", title="Closer",
                                  hook='Expérimenté ? Savoire <span>ouvre un poste.</span>'),
            "2-meilleurs":   dict(eyebrow="Savoire recrute", title="Closer high ticket",
                                  hook='Les meilleurs closers ont une place <span>chez Savoire.</span>'),
        },
    ),
    # Un autre poste : un bloc de plus, même forme. `typo` et `photo` surchargent
    # les réglages typographiques — un titre sur deux lignes demande un corps
    # plus petit (ex. typo=dict(titleSize=104, hookSize=50, tagSize=24)).
}

FORMATS = {"9x16": (1080, 1920), "4x5": (1080, 1350), "1x1": (1080, 1080)}

# Réglages typographiques : sans photo, tout l'espace est au texte ; avec
# photo, le texte descend sous le visage et se resserre.
TYPO  = dict(pad=88, justify="center",   wmH=64, wmGap=44, titleSize=124, hookSize=58, hookGap=26, ruleGap=34, liSize=33, liGap=12, tagGap=34, tagSize=26)
PHOTO = dict(pad=60, justify="flex-end", wmH=54, wmGap=26, titleSize=106, hookSize=47, hookGap=18, ruleGap=22, liSize=29, liGap=8,  tagGap=22, tagSize=26)

TEMPLATE = Template("""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap">
<style>
@font-face{font-family:'Display';src:url(data:font/ttf;base64,$font) format('truetype')}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:$bg}
body{font-family:'Inter',Helvetica,Arial,sans-serif;color:$text;position:relative}
.grid{position:absolute;inset:0;background-image:linear-gradient($line 1px,transparent 1px),linear-gradient(90deg,$line 1px,transparent 1px);background-size:72px 72px;opacity:.2}
.glow{position:absolute;inset:0;background:radial-gradient(circle at 50% 28%, $glow 0%, transparent 48%)}
.safe{position:absolute;left:0;top:50%;transform:translateY(-50%);width:1080px;height:1080px;box-sizing:border-box;padding:${pad}px 84px;display:flex;flex-direction:column;align-items:center;justify-content:$justify;text-align:center}
.photo{position:absolute;left:0;top:-420px;width:1080px;height:1330px;object-fit:cover;object-position:50% ${photoY}%;filter:saturate(.82) contrast(1.06)}
.shade{position:absolute;left:0;top:-420px;width:1080px;height:1330px;background:linear-gradient(180deg, ${bgA30} 0%, ${bgA0} 20%, ${bgA4} 54%, ${bgA60} 61%, ${bgA90} 67%, $bg 73%)}
.block{position:relative;display:flex;flex-direction:column;align-items:center}
.wm{height:${wmH}px;width:auto;display:block;margin-bottom:${wmGap}px}
.wm-text{font-family:'Display';font-size:${wmH}px;line-height:1;letter-spacing:.06em;text-transform:uppercase;color:$text;margin-bottom:${wmGap}px}
.eyebrow{font-size:28px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:$accent;margin-bottom:18px}
.title{font-family:'Display';text-transform:$transform;letter-spacing:$tracking;font-size:${titleSize}px;line-height:.95;color:$text;margin:0}
.hook{font-family:'Display';text-transform:$transform;letter-spacing:-.01em;font-size:${hookSize}px;line-height:1.04;color:$text;margin:${hookGap}px 0 0;max-width:840px}
.hook span{color:$accent}
.rule{width:120px;height:4px;background:linear-gradient(90deg,$accent,$accent2);border-radius:2px;margin:${ruleGap}px 0}
.benefits{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:${liGap}px}
.benefits li{font-size:${liSize}px;line-height:1.25;color:$text;font-weight:500}
.benefits li::before{content:"";display:inline-block;width:12px;height:12px;border-radius:3px;background:$accent;margin:0 16px 4px 0;vertical-align:middle}
.tag{margin-top:${tagGap}px;font-size:${tagSize}px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:$accent2}
.url{margin-top:22px;font-size:24px;color:$dim}
</style></head><body>
<div class="grid"></div><div class="glow"></div>
<div class="safe">
  $photoTags
  <div class="block">
    $wordmark
    <div class="eyebrow">$eyebrow</div>
    <h1 class="title">$title</h1>
    <p class="hook">$hook</p>
    <div class="rule"></div>
    <ul class="benefits">$benefits</ul>
    <div class="tag">$tag</div>
    <div class="url">$site_url</div>
  </div>
</div>
</body></html>""")


def rgba(hex_color: str, alpha: float) -> str:
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return f"rgba({r},{g},{b},{alpha})"


def brand_params() -> dict:
    b = BRAND
    if b.get("wordmark_svg") and Path(b["wordmark_svg"]).exists():
        svg = base64.b64encode(Path(b["wordmark_svg"]).read_bytes()).decode()
        wordmark = f'<img class="wm" src="data:image/svg+xml;base64,{svg}" alt="">'
    else:
        wordmark = f'<div class="wm-text">{b["wordmark_text"]}</div>'
    return dict(
        bg=b["bg"], line=b["line"], text=b["text"], muted=b["muted"], dim=b["dim"],
        accent=b["accent"], accent2=b["accent2"], glow=b["glow"],
        font=base64.b64encode(Path(b["display_font"]).read_bytes()).decode(),
        transform="uppercase" if b["display_uppercase"] else "none",
        tracking=b["display_tracking"], wordmark=wordmark, site_url=b["site_url"],
        bgA0=rgba(b["bg"], 0), bgA4=rgba(b["bg"], .04), bgA30=rgba(b["bg"], .30),
        bgA60=rgba(b["bg"], .60), bgA90=rgba(b["bg"], .90),
    )


def render(name, role, variant, settings, extra):
    common = brand_params()
    for fmt, (W, H) in FORMATS.items():
        html = HERE / "html" / f"{name}-{fmt}.html"
        params = dict(common, **settings, **variant, **extra, W=W, H=H, tag=role["tag"],
                      benefits="".join(f"<li>{b}</li>" for b in role["benefits"]))
        params.setdefault("photoTags", ""); params.setdefault("photoY", 0)
        html.write_text(TEMPLATE.substitute(params))
        out = HERE / "png" / f"{name}-{fmt}.png"
        out.unlink(missing_ok=True)
        # Profil Chrome jetable, hors du dépôt : un profil dans creatives/ ferait
        # scanner les extensions de Chrome par eslint.
        profile = tempfile.mkdtemp(prefix="creatives-chrome-")
        try:
            r = subprocess.run(["node", str(HERE / "shot.js"), str(out), f"file://{html}", f"{W},{H}"],
                               env=dict(os.environ, SCR=profile), capture_output=True, text=True)
        finally:
            shutil.rmtree(profile, ignore_errors=True)
        print(f"{out.name:44s} {r.stdout.strip() or r.stderr.strip()[:80]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--role", choices=sorted(ROLES), default="closer", help="le poste, clé du bloc ROLES")
    ap.add_argument("--photo", type=Path, help="photo (jpg/webp) pour les variantes photo")
    ap.add_argument("--photo-y", type=int, default=30, help="position verticale de la photo, en %% (0 = haut)")
    ap.add_argument("--only", choices=["typo", "photo"])
    ap.add_argument("--prefix", help="préfixe des fichiers produits (défaut : le poste)")
    args = ap.parse_args()
    role = ROLES[args.role]
    prefix = args.prefix or args.role
    typo = dict(TYPO, **role.get("typo", {}))
    photo = dict(PHOTO, **role.get("photo", {}))
    for d in ("html", "png"):
        (HERE / d).mkdir(exist_ok=True)
    for name, v in role["variants"].items():
        if args.only != "photo":
            render(f"{prefix}-{name}", role, v, typo, {})
        if args.photo and args.only != "typo":
            mime = "image/webp" if args.photo.suffix.lower() == ".webp" else "image/jpeg"
            data = base64.b64encode(args.photo.read_bytes()).decode()
            tags = f'<img class="photo" src="data:{mime};base64,{data}" alt=""><div class="shade"></div>'
            render(f"{prefix}-{name}-photo", role, v, photo, {"photoTags": tags, "photoY": args.photo_y})


if __name__ == "__main__":
    main()
