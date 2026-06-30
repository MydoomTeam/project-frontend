from pathlib import Path

root = Path(r'd:\SantiiPC\Documents\Universidad\Quinto_Semestre\IngenieríaSoftwareI\Proyecto\project-frontend\src\assets')
source = root / 'styles.css'
out_dir = root / 'styles'
out_dir.mkdir(exist_ok=True)

text = source.read_text(encoding='utf-8')

markers = [
    '/* Avatar — right side */',
    '/* ── Profile page (pr-) ── */',
    '/* ════════════════════════════════════════',
]

parts = []
start = 0
for marker in markers:
    idx = text.find(marker)
    if idx == -1:
        raise SystemExit(f'Marker not found: {marker}')
    parts.append(text[start:idx].rstrip() + '\n')
    start = idx
parts.append(text[start:].rstrip() + '\n')

(root / 'styles' / 'base.css').write_text(parts[0], encoding='utf-8')
(root / 'styles' / 'components.css').write_text(parts[1], encoding='utf-8')
(root / 'styles' / 'profile.css').write_text(parts[2], encoding='utf-8')
(root / 'styles' / 'pages.css').write_text(parts[3], encoding='utf-8')

(root / 'styles' / 'index.css').write_text(
    "@import './base.css';\n"
    "@import './components.css';\n"
    "@import './profile.css';\n"
    "@import './pages.css';\n",
    encoding='utf-8'
)

source.write_text("@import './styles/index.css';\n", encoding='utf-8')
